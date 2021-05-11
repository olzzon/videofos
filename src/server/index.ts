import { OscConnection } from './oscServer'
import { logger } from './utils/logger'

logger.info('VideoFOS Started')
OscConnection(9090)

