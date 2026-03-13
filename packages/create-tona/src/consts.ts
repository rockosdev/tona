import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const distPath = path.dirname(__filename)
export const PKG_ROOT = path.join(distPath, '../')

export const TITLE_TEXT = `
   _____ ___  _   _    _    
  |_   _/ _ \\| \\ | |  / \\   
    | || | | |  \\| | / _ \\  
    | || |_| | |\\  |/ ___ \\ 
    |_| \\___/|_| \\_/_/   \\_\\
`

export const DEFAULT_APP_NAME = 'tona-theme'
export const CREATE_TONA_APP = 'create-tona'
