export type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun' | 'deno'

export type Template = 'minimal' | 'preact'

export type Registry = 'taobao' | 'official'

export type OverwriteOption = 'yes' | 'no' | 'ignore'

export interface CliArgs {
  _: string[]
  template?: Template
  help: boolean
  overwrite: boolean
  immediate: boolean
  interactive?: boolean
  git?: boolean
  install: boolean
}

export interface PkgInfo {
  name: PackageManager
  version: string
}

export interface ProjectContext {
  targetDir: string
  packageName: string
  template: Template
  pkgManager: PackageManager
  initGit: boolean
  shouldInstall: boolean
  shouldStart: boolean
  registry?: string
  interactive: boolean
  overwrite: OverwriteOption
}

export interface TemplateConfig {
  name: Template
  label: string
  color: 'cyan' | 'blue'
}

export interface RegistryConfig {
  name: Registry | 'no'
  label: string
  color: 'cyan' | 'blue'
  url?: string
}
