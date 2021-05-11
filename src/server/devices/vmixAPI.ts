// This should be stored in Mongo Db
import * as conversion from '../../../storage/vmixConversionTable.json'
// -------------

import { EventEmitter } from 'events'
import * as request from 'request'
import * as xml from 'xml-js'
import {
    VMixOptions,
    VMixCommand,
    VMixTransitionType,
    VMixInputType,
    TimelineContentTypeAtem,
    VMixTransform,
    VMixInputOverlays,
    VMixTransition,
    TimelineObjAtemAny,
    TimelineObjAtemME,
    TimelineObjAtemDSK,
    TimelineObjAtemSsrc,
    TimelineObjAtemSsrcProps,
    TimelineObjAtemAUX,
    TimelineObjAtemMediaPlayer,
    TimelineObjAtemAudioChannel,
    TimelineObjAtemMacroPlayer,
} from 'timeline-state-resolver-types'
import * as _ from 'underscore'

const PING_INTERVAL = 10 * 1000

export class VMix extends EventEmitter {
    public state: VMixState
    public pingInterval = PING_INTERVAL

    private _options: VMixOptions
    private _connected: boolean = false
    private _disposed: boolean = false

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
            this.once('initialized', () => {
                this.emit('stateChanged', this.state)
                resolve(true)
            })

            this.getVMixState()
        })
    }

    private setConnected(connected: boolean) {
        if (connected !== this._connected) {
            this._connected = connected
            if (connected) {
                this.emit('connected')
            } else {
                this.emit('disconnected')
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
    public sendTlCmdToVmix(tlObject: any) {
        switch (tlObject.content.type) {
            case TimelineContentTypeAtem.ME:
                let atemObjMe = tlObject as any as TimelineObjAtemME
                this.setAtemMe(atemObjMe)
                /*
                    if (atemObjKeyers) {
                        _.each(atemObjKeyers, (objKey, i) => {
                            const keyer =
                                AtemConnection.AtemStateUtil.getUpstreamKeyer(
                                    me,
                                    i
                                )
                            deepExtend(keyer, objKey)
                        })
                    }
                    */
                break
                case TimelineContentTypeAtem.AUX:
                    let atemObjAux = tlObject as any as TimelineObjAtemAUX
                    this.setAtemAux(atemObjAux)
                    break
            case TimelineContentTypeAtem.DSK:
                let atemObjDsk = tlObject as any as TimelineObjAtemDSK
                console.log('DSK :', atemObjDsk.content.dsk)

                break
            case TimelineContentTypeAtem.SSRC:
                let atemObjSsrc = tlObject as any as TimelineObjAtemSsrc
                console.log('SuperSource :', atemObjSsrc.content.ssrc)

                /*
                    let atemObj = tlObject as any as TimelineObjAtemSsrc
                    if (ssrc) {
                        const objBoxes = atemObj.content.ssrc.boxes
                        _.each(objBoxes, (box, i) => {
                            if (ssrc.boxes[i]) {
                                deepExtend(ssrc.boxes[i], box)
                            } else {
                                ssrc.boxes[i] = {
                                    ...StateDefault.Video.SuperSourceBox,
                                    ...box,
                                }
                            }
                        })
                    }
                    */
                break
            case TimelineContentTypeAtem.SSRCPROPS:
                let atemObjSsrcProps =
                    tlObject as any as TimelineObjAtemSsrcProps
                console.log(
                    'SuperSource Props : ',
                    atemObjSsrcProps.content.ssrcProps
                )
                break
            case TimelineContentTypeAtem.MEDIAPLAYER:
                let atemObjMediaPlayer =
                    tlObject as any as TimelineObjAtemMediaPlayer
                console.log(
                    'Media Player : ',
                    atemObjMediaPlayer.content.mediaPlayer
                )
                break
            case TimelineContentTypeAtem.AUDIOCHANNEL:
                let atemObjAudioCh =
                    tlObject as any as TimelineObjAtemAudioChannel
                console.log(
                    'Audio Channel : ',
                    atemObjAudioCh.content.audioChannel
                )
                break
            case TimelineContentTypeAtem.MACROPLAYER:
                let atemObjMacro = tlObject as any as TimelineObjAtemMacroPlayer
                console.log('Macro : ', atemObjMacro.content.macroPlayer)
                break

            default:
                break
        }
    }

    private setAtemMe(atemObjMe: TimelineObjAtemME) {
        if (atemObjMe.content.me.previewInput) {
            const vMixSrc =
                conversion.input.find((item) => {
                    return item.atemSrc === atemObjMe.content.me.previewInput
                })?.vmixSrc || 1
            this.setPreviewInput(vMixSrc)
            console.log(
                'Preview Atem Input : ',
                atemObjMe.content.me.previewInput,
                ' VMix Input :',
                vMixSrc
            )
        } else {
            console.log('Unknown ME command : ', atemObjMe.content.me)
        }
    }

    private setAtemAux(atemObjAux: TimelineObjAtemAUX) {
            const vMixSrc =
                conversion.input.find((item) => {
                    return item.atemSrc === atemObjAux.content.aux.input
                })?.vmixSrc || 1
                let duration = 10
            this.cutDirect(vMixSrc)
            console.log(
                'PGM Atem Input : ',
                atemObjAux.content.aux.input,
                ' VMix Input :',
                vMixSrc
            )
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
                    this.emit('initialized')
                    this.setConnected(true)
                }
                this._stillAlive()
            }
        )
    }

    public parseVMixState(responseBody: any) {
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

    public setPreviewInput(input: number | string): Promise<any> {
        return this.sendCommandFunction('PreviewInput', { input })
    }

    public transition(
        input: number | string,
        effect: string,
        duration: number,
        mix: number
    ): Promise<any> {
        return this.sendCommandFunction(effect, { input, duration, mix })
    }

    public setAudioLevel(
        input: number | string,
        volume: number,
        fade?: number
    ): Promise<any> {
        let value: string = Math.min(Math.max(volume, 0), 100).toString()
        if (fade) {
            value += ',' + fade.toString()
        }
        return this.sendCommandFunction(`SetVolume${fade ? 'Fade' : ''}`, {
            input: input,
            value,
        })
    }

    public setAudioBalance(
        input: number | string,
        balance: number
    ): Promise<any> {
        return this.sendCommandFunction(`SetBalance`, {
            input,
            value: Math.min(Math.max(balance, -1), 1),
        })
    }

    public setAudioOn(input: number | string): Promise<any> {
        return this.sendCommandFunction(`AudioOn`, { input })
    }

    public setAudioOff(input: number | string): Promise<any> {
        return this.sendCommandFunction(`AudioOff`, { input })
    }

    public setAudioAutoOn(input: number | string): Promise<any> {
        return this.sendCommandFunction(`AudioAutoOn`, { input })
    }

    public setAudioAutoOff(input: number | string): Promise<any> {
        return this.sendCommandFunction(`AudioAutoOff`, { input })
    }

    public setAudioBusOn(input: number | string, value: string): Promise<any> {
        return this.sendCommandFunction(`AudioBusOn`, { input, value })
    }

    public setAudioBusOff(input: number | string, value: string): Promise<any> {
        return this.sendCommandFunction(`AudioBusOff`, { input, value })
    }

    public setFader(position: number): Promise<any> {
        return this.sendCommandFunction(`SetFader`, {
            value: Math.min(Math.max(position, 0), 255),
        })
    }

    public setPanX(input: number | string, value: number): Promise<any> {
        return this.sendCommandFunction(`SetPanX`, {
            input,
            value: Math.min(Math.max(value, -2), 2),
        })
    }

    public setPanY(input: number | string, value: number): Promise<any> {
        return this.sendCommandFunction(`SetPanY`, {
            input,
            value: Math.min(Math.max(value, -2), 2),
        })
    }

    public setZoom(input: number | string, value: number): Promise<any> {
        return this.sendCommandFunction(`SetZoom`, {
            input,
            value: Math.min(Math.max(value, 0), 5),
        })
    }

    public setAlpha(input: number | string, value: number): Promise<any> {
        return this.sendCommandFunction(`SetAlpha`, {
            input,
            value: Math.min(Math.max(value, 0), 255),
        })
    }

    public startRecording(): Promise<any> {
        return this.sendCommandFunction(`StartRecording`, {})
    }

    public stopRecording(): Promise<any> {
        return this.sendCommandFunction(`StopRecording`, {})
    }

    public startStreaming(): Promise<any> {
        return this.sendCommandFunction(`StartStreaming`, {})
    }

    public stopStreaming(): Promise<any> {
        return this.sendCommandFunction(`StopStreaming`, {})
    }

    public fadeToBlack(): Promise<any> {
        return this.sendCommandFunction(`FadeToBlack`, {})
    }

    public addInput(file: string): Promise<any> {
        return this.sendCommandFunction(`AddInput`, { value: file })
    }

    public removeInput(name: string): Promise<any> {
        return this.sendCommandFunction(`RemoveInput`, { input: name })
    }

    public playInput(input: number | string): Promise<any> {
        return this.sendCommandFunction(`Play`, { input: input })
    }

    public pauseInput(input: number | string): Promise<any> {
        return this.sendCommandFunction(`Pause`, { input: input })
    }

    public setPosition(input: number | string, value: number): Promise<any> {
        return this.sendCommandFunction(`SetPosition`, {
            input: input,
            value: value,
        })
    }

    public loopOn(input: number | string): Promise<any> {
        return this.sendCommandFunction(`LoopOn`, { input: input })
    }

    public loopOff(input: number | string): Promise<any> {
        return this.sendCommandFunction(`LoopOff`, { input: input })
    }

    public setInputName(input: number | string, value: string): Promise<any> {
        return this.sendCommandFunction(`SetInputName`, {
            input: input,
            value: value,
        })
    }

    public setOutput(
        name: string,
        value: string,
        input?: number | string
    ): Promise<any> {
        return this.sendCommandFunction(`SetOutput${name}`, { value, input })
    }

    public cutDirect(
        input: number | string
    ): Promise<any> {
        return this.sendCommandFunction(`CutDirect`, { input })
    }


    public startExternal(): Promise<any> {
        return this.sendCommandFunction(`StartExternal`, {})
    }

    public stopExternal(): Promise<any> {
        return this.sendCommandFunction(`StopExternal`, {})
    }

    public overlayInputIn(name: number, input: string | number): Promise<any> {
        return this.sendCommandFunction(`OverlayInput${name}In`, {
            input: input,
        })
    }

    public overlayInputOut(name: number): Promise<any> {
        return this.sendCommandFunction(`OverlayInput${name}Out`, {})
    }

    public setInputOverlay(
        input: string | number,
        index: number,
        value: string | number
    ): Promise<any> {
        let val = `${index},${value}`
        return this.sendCommandFunction(`SetMultiViewOverlay`, {
            input,
            value: val,
        })
    }

    public sendCommandFunction(
        func: string,
        args: {
            input?: string | number
            value?: string | number
            extra?: string
            duration?: number
            mix?: number
        }
    ): Promise<any> {
        const inp = args.input !== undefined ? `&Input=${args.input}` : ''
        const val = args.value !== undefined ? `&Value=${args.value}` : ''
        const dur =
            args.duration !== undefined ? `&Duration=${args.duration}` : ''
        const mix = args.mix !== undefined ? `&Mix=${args.mix}` : ''
        const ext = args.extra !== undefined ? args.extra : ''

        const command = `${this._options.host}:${this._options.port}/api/?Function=${func}${inp}${val}${dur}${mix}${ext}`

        this.emit('debug', `Sending command: ${command}`)
        console.log(`Sending command: ${command}`)

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
}

export interface VMixStateCommandBase {
    command: VMixCommand
}
export interface VMixStateCommandPreviewInput extends VMixStateCommandBase {
    command: VMixCommand.PREVIEW_INPUT
    input: number | string
    mix: number
}
export interface VMixStateCommandTransition extends VMixStateCommandBase {
    command: VMixCommand.TRANSITION
    input: number | string
    effect: string
    duration: number
    mix: number
}
export interface VMixStateCommandAudio extends VMixStateCommandBase {
    command: VMixCommand.AUDIO_VOLUME
    input: number | string
    value: number
    fade?: number
}
export interface VMixStateCommandAudioBalance extends VMixStateCommandBase {
    command: VMixCommand.AUDIO_BALANCE
    input: number | string
    value: number
}
export interface VMixStateCommandAudioOn extends VMixStateCommandBase {
    command: VMixCommand.AUDIO_ON
    input: number | string
}
export interface VMixStateCommandAudioOff extends VMixStateCommandBase {
    command: VMixCommand.AUDIO_OFF
    input: number | string
}
export interface VMixStateCommandAudioAutoOn extends VMixStateCommandBase {
    command: VMixCommand.AUDIO_AUTO_ON
    input: number | string
}
export interface VMixStateCommandAudioAutoOff extends VMixStateCommandBase {
    command: VMixCommand.AUDIO_AUTO_OFF
    input: number | string
}
export interface VMixStateCommandAudioBusOn extends VMixStateCommandBase {
    command: VMixCommand.AUDIO_BUS_ON
    input: number | string
    value: string
}
export interface VMixStateCommandAudioBusOff extends VMixStateCommandBase {
    command: VMixCommand.AUDIO_BUS_OFF
    input: number | string
    value: string
}
export interface VMixStateCommandFader extends VMixStateCommandBase {
    command: VMixCommand.FADER
    value: number
}
export interface VMixStateCommandSetPanX extends VMixStateCommandBase {
    command: VMixCommand.SET_PAN_X
    input: number | string
    value: number
}
export interface VMixStateCommandSetPanY extends VMixStateCommandBase {
    command: VMixCommand.SET_PAN_Y
    input: number | string
    value: number
}
export interface VMixStateCommandSetZoom extends VMixStateCommandBase {
    command: VMixCommand.SET_ZOOM
    input: number | string
    value: number
}
export interface VMixStateCommandSetAlpha extends VMixStateCommandBase {
    command: VMixCommand.SET_ALPHA
    input: number | string
    value: number
}
export interface VMixStateCommandStartStreaming extends VMixStateCommandBase {
    command: VMixCommand.START_STREAMING
}
export interface VMixStateCommandStopStreaming extends VMixStateCommandBase {
    command: VMixCommand.STOP_STREAMING
}
export interface VMixStateCommandStartRecording extends VMixStateCommandBase {
    command: VMixCommand.START_RECORDING
}
export interface VMixStateCommandStopRecording extends VMixStateCommandBase {
    command: VMixCommand.STOP_RECORDING
}
export interface VMixStateCommandFadeToBlack extends VMixStateCommandBase {
    command: VMixCommand.FADE_TO_BLACK
}
export interface VMixStateCommandAddInput extends VMixStateCommandBase {
    command: VMixCommand.ADD_INPUT
    value: string
}
export interface VMixStateCommandRemoveInput extends VMixStateCommandBase {
    command: VMixCommand.REMOVE_INPUT
    input: string
}
export interface VMixStateCommandPlayInput extends VMixStateCommandBase {
    command: VMixCommand.PLAY_INPUT
    input: number | string
}
export interface VMixStateCommandPauseInput extends VMixStateCommandBase {
    command: VMixCommand.PAUSE_INPUT
    input: number | string
}
export interface VMixStateCommandSetPosition extends VMixStateCommandBase {
    command: VMixCommand.SET_POSITION
    input: number | string
    value: number
}
export interface VMixStateCommandLoopOn extends VMixStateCommandBase {
    command: VMixCommand.LOOP_ON
    input: number | string
}
export interface VMixStateCommandLoopOff extends VMixStateCommandBase {
    command: VMixCommand.LOOP_OFF
    input: number | string
}
export interface VMixStateCommandSetInputName extends VMixStateCommandBase {
    command: VMixCommand.SET_INPUT_NAME
    input: number | string
    value: string
}
export interface VMixStateCommandSetOuput extends VMixStateCommandBase {
    command: VMixCommand.SET_OUPUT
    name: string
    value: string
    input?: number | string
}
export interface VMixStateCommandStartExternal extends VMixStateCommandBase {
    command: VMixCommand.START_EXTERNAL
}
export interface VMixStateCommandStopExternal extends VMixStateCommandBase {
    command: VMixCommand.STOP_EXTERNAL
}
export interface VMixStateCommandOverlayInputIn extends VMixStateCommandBase {
    command: VMixCommand.OVERLAY_INPUT_IN
    value: number
    input: string | number
}
export interface VMixStateCommandOverlayInputOut extends VMixStateCommandBase {
    command: VMixCommand.OVERLAY_INPUT_OUT
    value: number
}
export interface VMixStateCommandSetInputOverlay extends VMixStateCommandBase {
    command: VMixCommand.SET_INPUT_OVERLAY
    input: string | number
    index: number
    value: string | number
}
export type VMixStateCommand =
    | VMixStateCommandPreviewInput
    | VMixStateCommandTransition
    | VMixStateCommandAudio
    | VMixStateCommandAudioBalance
    | VMixStateCommandAudioOn
    | VMixStateCommandAudioOff
    | VMixStateCommandAudioAutoOn
    | VMixStateCommandAudioAutoOff
    | VMixStateCommandAudioBusOn
    | VMixStateCommandAudioBusOff
    | VMixStateCommandFader
    | VMixStateCommandSetZoom
    | VMixStateCommandSetPanX
    | VMixStateCommandSetPanY
    | VMixStateCommandSetAlpha
    | VMixStateCommandStartStreaming
    | VMixStateCommandStopStreaming
    | VMixStateCommandStartRecording
    | VMixStateCommandStopRecording
    | VMixStateCommandFadeToBlack
    | VMixStateCommandAddInput
    | VMixStateCommandRemoveInput
    | VMixStateCommandPlayInput
    | VMixStateCommandPauseInput
    | VMixStateCommandSetPosition
    | VMixStateCommandLoopOn
    | VMixStateCommandLoopOff
    | VMixStateCommandSetInputName
    | VMixStateCommandSetOuput
    | VMixStateCommandStartExternal
    | VMixStateCommandStopExternal
    | VMixStateCommandOverlayInputIn
    | VMixStateCommandOverlayInputOut
    | VMixStateCommandSetInputOverlay

interface VMixOutput {
    source: 'Preview' | 'Program' | 'MultiView' | 'Input'
    input?: number | string
}

export class VMixStateExtended {
    reportedState: VMixState
    outputs: {
        External2: VMixOutput

        '2': VMixOutput
        '3': VMixOutput
        '4': VMixOutput

        Fullscreen: VMixOutput
        Fullscreen2: VMixOutput
    }
    inputLayers: { [key: string]: string }
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

export interface VMixMix {
    number: number
    program: string | number | undefined
    preview: string | number | undefined
    transition: VMixTransition
    layerToProgram?: boolean
}

export interface VMixInput {
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

export interface VMixOverlay {
    number: number
    input: string | number | undefined
}

export interface VMixAudioChannel {
    volume: number
    muted: boolean
    meterF1: number
    meterF2: number
    headphonesVolume: number
}
