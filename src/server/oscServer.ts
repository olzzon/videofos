//Node Modules:
import osc from 'osc'
import { logger } from './utils/logger'

export const OscConnection = (port: number) => {
    const oscConnection = new osc.UDPPort({
        localAddress: '0.0.0.0',
        localPort: port,
    })
    oscConnection
        .on('ready', () => {
            logger.info('Listening for Automation via OSC over UDP.', {})
        })
        .on(
            'message',
            (message: any, timetag: number | undefined, info: any) => {
                logger.info(
                    'RECIEVED SOFIE MESSAGE :' +
                        message.address +
                        message.args[0],
                    {}
                )
            }
        )

    oscConnection.open()
    logger.info('OSC Automation listening on port ' + String(port))
}
