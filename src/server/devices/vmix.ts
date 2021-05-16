import * as request from 'request'
import * as xml from 'xml-js'
import {
    VMixOptions,
    VMixTransitionType,
    VMixInputType,
    VMixTransform,
    VMixInputOverlays,
    VMixTransition,
    TimelineObjAtemME,
    TimelineObjAtemAUX,
} from 'timeline-state-resolver-types'
import * as _ from 'underscore'

const PING_INTERVAL = 10 * 1000

//VideoFOS Hack - these layers should come from timeline-state-resolver-types?
export enum AtemLLayer {
    AtemMEProgram = 'atem_me_program',
    AtemMEAuxLookahead = 'atem_aux_lookahead',
}

export class VMix {
    public state: VMixState
    public pingInterval = PING_INTERVAL

    private _options: VMixOptions
    private _connected: boolean = false
    private _disposed: boolean = false
    private _currentPvwSource = 1

    private _socketKeepAliveTimeout: NodeJS.Timer | null = null

    connect(options: VMixOptions): Promise<boolean> {
        return this._connectHTTP(options)
    }

    public get connected(): boolean {
        return this._connected
    }

    public dispose(): Promise<void> {
        return new Promise((resolve) => {
            this._connected = false
            this._disposed = true
            if (this._socketKeepAliveTimeout) {
                clearTimeout(this._socketKeepAliveTimeout)
                this._socketKeepAliveTimeout = null
            }
            resolve()
        })
    }

    private _connectHTTP(options?: VMixOptions): Promise<boolean> {
        if (options) {
            if (
                !(
                    options.host.startsWith('http://') ||
                    options.host.startsWith('https://')
                )
            ) {
                options.host = `http://${options.host}`
            }
            this._options = options
        }

        return new Promise((resolve) => {
            this.getVMixState()
        })
    }

    private setConnected(connected: boolean) {
        if (connected !== this._connected) {
            this._connected = connected
            if (connected) {
                console.log('connected')
            } else {
                console.log('disconnected')
            }
        }
    }

    private _stillAlive() {
        if (this._socketKeepAliveTimeout) {
            clearTimeout(this._socketKeepAliveTimeout)
            this._socketKeepAliveTimeout = null
        }
        if (!this._disposed) {
            this._socketKeepAliveTimeout = setTimeout(() => {
                this.getVMixState()
            }, this.pingInterval)
        }
    }

    /**
     * Convert a timeline state into an Vmix command.
     * @param tlCommand The tlObjectCommand to be converted to Vmix
     */
    public sendTlCmdToVmix(tlObject: any, layer: string) {
        console.log(layer)
        switch (layer) {
            case AtemLLayer.AtemMEProgram:
                let atemObjMe = tlObject as TimelineObjAtemME
                console.log('ME PGM SOURCE :', atemObjMe)
                this.setVmixPgm(atemObjMe)
                break
                case AtemLLayer.AtemMEAuxLookahead:
                let atemObjAux = tlObject as TimelineObjAtemAUX
                this.setVmixPreview(atemObjAux)
                break
            default:
                console.log('Unhandled Layer : ', tlObject)
                break
        }
    }

    private setVmixPgm(atemObjAux: TimelineObjAtemME) {
        const vMixSrc = atemObjAux.content.me.input
        //this.setVmixPreview(atemObjAux)
        this.sendCommandFunction(`Fade`, { input: vMixSrc, duration:  atemObjAux.content.me.transition || 0})
        setTimeout(() => {
            this.sendCommandFunction('PreviewInput', { input: this._currentPvwSource})
            console.log(`Set next - source: ${this._currentPvwSource} in Pvw after transistion`)
        }, 200)
        console.log(
            'PGM Atem Input : ',
            atemObjAux.content.me.input,
            ' VMix Input :',
            vMixSrc
        )
    }

    private setVmixPreview(atemObjAux: TimelineObjAtemAUX) {
        const vMixSrc = atemObjAux.content.aux.input
        this._currentPvwSource = vMixSrc
        this.sendCommandFunction('PreviewInput', { input: vMixSrc})
        console.log(
            'Preview Atem Input : ',
            atemObjAux.content.aux.input,
            ' VMix Input :',
            vMixSrc
        )
    }

    public sendCommandFunction (func: string, args: { input?: string | number, value?: string | number, extra?: string, duration?: number, mix?: number }): Promise<any> {
		const inp = args.input !== undefined ? `&Input=${args.input}` : ''
		const val = args.value !== undefined ? `&Value=${args.value}` : ''
		const dur = args.duration !== undefined ? `&Duration=${args.duration}` : ''
		const mix = args.mix !== undefined ? `&Mix=${args.mix}` : ''
		const ext = args.extra !== undefined ? args.extra : ''

		const command = `${this._options.host}:${this._options.port}/api/?Function=${func}${inp}${val}${dur}${mix}${ext}`

		console.log('debug', `Sending command: ${command}`)

		return new Promise((resolve, reject) => {
			request.get(command, {}, (error) => {
				if (error) {
					this.setConnected(false)
					reject(error)
				} else {
					this._stillAlive()
					this.setConnected(true)
					resolve(null)
				}
			})
		})
	}

    public getVMixState() {
        request.get(
            `${this._options.host}:${this._options.port}/api`,
            {},
            (error, res) => {
                if (error) {
                    this.setConnected(false)
                } else {
                    this.parseVMixState(res.body)
                    console.log('Connection to vMix established')
                    this.setConnected(true)
                }
                this._stillAlive()
            }
        )
    }

    public parseVMixState(responseBody: any) {
        // Instead of converting it to a vmix state the layers should be converted and returned as TimelineObjects current time state.
        // (compatible with state in abstract )
        const preParsed = xml.xml2json(responseBody, {
            compact: true,
            spaces: 4,
        })
        const xmlState = JSON.parse(preParsed)
        let mixes = xmlState['vmix']['mix']
        mixes = Array.isArray(mixes) ? mixes : mixes ? [mixes] : []
        let fixedInputsCount = 0
        // For what lies ahead I apologise - Tom
        let state: VMixState = {
            version: xmlState['vmix']['version']['_text'],
            edition: xmlState['vmix']['edition']['_text'],
            inputs: _.indexBy(
                (xmlState['vmix']['inputs']['input'] as Array<any>).map(
                    (input): VMixInput => {
                        if (!(input['_attributes']['type'] in VMixInputType)) {
                            fixedInputsCount++
                        }
                        return {
                            number: Number(input['_attributes']['number']),
                            type: input['_attributes']['type'],
                            state: input['_attributes']['state'],
                            position:
                                Number(input['_attributes']['position']) || 0,
                            duration:
                                Number(input['_attributes']['duration']) || 0,
                            loop:
                                input['_attributes']['loop'] === 'False'
                                    ? false
                                    : true,
                            muted:
                                input['_attributes']['muted'] === 'False'
                                    ? false
                                    : true,
                            volume: Number(
                                input['_attributes']['volume'] || 100
                            ),
                            balance: Number(
                                input['_attributes']['balance'] || 0
                            ),
                            audioBuses: input['_attributes']['audiobusses'],
                            transform: {
                                panX: Number(
                                    input['position']
                                        ? input['position']['_attributes'][
                                              'panX'
                                          ] || 0
                                        : 0
                                ),
                                panY: Number(
                                    input['position']
                                        ? input['position']['_attributes'][
                                              'panY'
                                          ] || 0
                                        : 0
                                ),
                                alpha: -1, // unavailable
                                zoom: Number(
                                    input['position']
                                        ? input['position']['_attributes'][
                                              'zoomX'
                                          ] || 1
                                        : 1
                                ), // assume that zoomX==zoomY
                            },
                        }
                    }
                ),
                'number'
            ),
            overlays: (
                xmlState['vmix']['overlays']['overlay'] as Array<any>
            ).map((overlay) => {
                return {
                    number: Number(overlay['_attributes']['number']),
                    input: overlay['_text'],
                }
            }),
            mixes: [
                {
                    number: 1,
                    program: Number(xmlState['vmix']['active']['_text']),
                    preview: Number(xmlState['vmix']['preview']['_text']),
                    transition: { effect: VMixTransitionType.Cut, duration: 0 },
                },
                ...mixes.map((mix): VMixMix => {
                    return {
                        number: Number(mix['_attributes']['number']),
                        program: Number(mix['active']['_text']),
                        preview: Number(mix['preview']['_text']),
                        transition: {
                            effect: VMixTransitionType.Cut,
                            duration: 0,
                        },
                    }
                }),
            ],
            fadeToBlack:
                xmlState['vmix']['fadeToBlack']['_text'] === 'True'
                    ? true
                    : false,
            recording:
                xmlState['vmix']['recording']['_text'] === 'True'
                    ? true
                    : false,
            external:
                xmlState['vmix']['external']['_text'] === 'True' ? true : false,
            streaming:
                xmlState['vmix']['streaming']['_text'] === 'True'
                    ? true
                    : false,
            playlist:
                xmlState['vmix']['playList']['_text'] === 'True' ? true : false,
            multiCorder:
                xmlState['vmix']['multiCorder']['_text'] === 'True'
                    ? true
                    : false,
            fullscreen:
                xmlState['vmix']['fullscreen']['_text'] === 'True'
                    ? true
                    : false,
            audio: [
                {
                    volume: Number(
                        xmlState['vmix']['audio']['master']['_attributes'][
                            'volume'
                        ]
                    ),
                    muted:
                        xmlState['vmix']['audio']['master']['_attributes'][
                            'muted'
                        ] === 'True'
                            ? true
                            : false,
                    meterF1: Number(
                        xmlState['vmix']['audio']['master']['_attributes'][
                            'meterF1'
                        ]
                    ),
                    meterF2: Number(
                        xmlState['vmix']['audio']['master']['_attributes'][
                            'meterF2'
                        ]
                    ),
                    headphonesVolume: Number(
                        xmlState['vmix']['audio']['master']['_attributes'][
                            'headphonesVolume'
                        ]
                    ),
                },
            ],
            fixedInputsCount,
        }
        this.setState(state)
    }

    public setState(state: VMixState): void {
        this.state = state
    }
}

export class VMixState {
    version: string
    edition: string // TODO: Enuum, need list of available editions: Trial
    fixedInputsCount: number
    inputs: { [key: string]: VMixInput }
    overlays: VMixOverlay[]
    mixes: VMixMix[]
    fadeToBlack: boolean
    faderPosition?: number
    recording: boolean
    external: boolean
    streaming: boolean
    playlist: boolean
    multiCorder: boolean
    fullscreen: boolean
    audio: VMixAudioChannel[]
}

interface VMixMix {
    number: number
    program: string | number | undefined
    preview: string | number | undefined
    transition: VMixTransition
    layerToProgram?: boolean
}

interface VMixInput {
    number?: number
    type?: VMixInputType | string
    name?: string
    filePath?: string
    state?: 'Paused' | 'Running' | 'Completed'
    playing?: boolean
    position?: number
    duration?: number
    loop?: boolean
    muted?: boolean
    volume?: number
    balance?: number
    fade?: number
    solo?: boolean
    audioBuses?: string
    audioAuto?: boolean
    transform?: VMixTransform
    overlays?: VMixInputOverlays
}

interface VMixOverlay {
    number: number
    input: string | number | undefined
}

interface VMixAudioChannel {
    volume: number
    muted: boolean
    meterF1: number
    meterF2: number
    headphonesVolume: number
}
