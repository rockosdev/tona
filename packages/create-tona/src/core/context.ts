import spawn from 'cross-spawn'
import type {
  CliArgs,
  PackageManager,
  ProjectContext,
  Template,
} from '../types.js'
import { formatTargetDir, pkgFromUserAgent } from '../utils/index.js'

export class ProjectContextImpl implements ProjectContext {
  targetDir: string
  packageName: string
  template: Template
  pkgManager: PackageManager
  initGit: boolean
  shouldInstall: boolean
  shouldStart: boolean
  registry?: string
  interactive: boolean
  overwrite: 'yes' | 'no' | 'ignore'

  private readonly argv: CliArgs
  private readonly cwd: string

  constructor(argv: CliArgs) {
    this.argv = argv
    this.cwd = process.cwd()

    this.targetDir = this.initTargetDir()
    this.packageName = ''
    this.template = this.initTemplate()
    this.pkgManager = this.initPkgManager()
    this.initGit = argv.git
    this.shouldInstall = argv.install || argv.immediate
    this.shouldStart = argv.immediate
    this.registry = undefined
    this.interactive = argv.interactive ?? process.stdin.isTTY ?? false
    this.overwrite = 'no'
  }

  setTargetDir(dir: string): void {
    this.targetDir = dir
  }

  setPackageName(name: string): void {
    this.packageName = name
  }

  setTemplate(template: Template): void {
    this.template = template
  }

  setInitGit(init: boolean): void {
    this.initGit = init
  }

  setShouldInstall(should: boolean): void {
    this.shouldInstall = should
  }

  setShouldStart(should: boolean): void {
    this.shouldStart = should
  }

  setRegistry(registry?: string): void {
    this.registry = registry
  }

  setOverwrite(overwrite: 'yes' | 'no' | 'ignore'): void {
    this.overwrite = overwrite
  }

  getRoot(): string {
    return this.cwd
  }

  getArgv(): CliArgs {
    return this.argv
  }

  private initTargetDir(): string {
    const argTargetDir = this.argv._[0]
    return argTargetDir ? formatTargetDir(String(argTargetDir)) : ''
  }

  private initTemplate(): Template {
    const argTemplate = this.argv.template
    if (argTemplate && ['minimal', 'preact'].includes(argTemplate)) {
      return argTemplate
    }
    return 'minimal'
  }

  private initPkgManager(): PackageManager {
    const pkgInfo = pkgFromUserAgent(process.env.npm_config_user_agent)
    let pkgManager: PackageManager = pkgInfo ? pkgInfo.name : 'npm'

    const hasPnpm =
      spawn.sync('pnpm', ['--version'], { stdio: 'ignore' }).status === 0
    if (hasPnpm) {
      pkgManager = 'pnpm'
    }

    return pkgManager
  }
}
