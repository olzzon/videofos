//Node Modules:
import osc from 'osc'
import { logger } from './utils/logger'

import { VMix } from './devices/vmix'

export const OscConnection = (port: number) => {
    const vmix = new VMix()
    vmix.connect({ host: '192.168.0.12', port: 8088 })


    const oscConnection = new osc.UDPPort({
        localAddress: '0.0.0.0',
        localPort: port,
    })
    oscConnection
        .on('ready', () => {
            logger.info('Listening for Automation via OSC over UDP.', {})
        })
        .on('connected', () => {
            logger.info('Playout Gateway connected')
        })
        .on(
            'message',
            (message: any, timetag: number | undefined, info: any) => {
                let tlObjCmd = JSON.parse(message.args[0])
                console.log('---------------Message : --------------')
                vmix.sendTlCmdToVmix({ content: tlObjCmd.content}, tlObjCmd.layer)
            }
        )

    oscConnection.open()
    logger.info('OSC Automation listening on port ' + String(port))
}
