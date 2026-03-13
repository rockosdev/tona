import path from 'node:path'
import { fileURLToPath } from 'node:url'

import type { RegistryConfig, TemplateConfig } from './types.js'

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

export const TEMPLATES: TemplateConfig[] = [
  { name: 'preact', label: 'preact (recommended)', color: 'cyan' },
  { name: 'minimal', label: 'minimal', color: 'blue' },
]

export const REGISTRIES: RegistryConfig[] = [
  {
    name: 'taobao',
    label: 'Yes, via Taobao mirror (recommended)',
    color: 'cyan',
    url: 'https://registry.npmmirror.com',
  },
  {
    name: 'official',
    label: 'Yes, via official registry',
    color: 'blue',
    url: undefined,
  },
  { name: 'no', label: 'No', color: 'blue', url: undefined },
]

export const RENAME_FILES: Record<string, string | undefined> = {
  _gitignore: '.gitignore',
}
