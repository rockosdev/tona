import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as prompts from '@clack/prompts'
import colors from 'picocolors'
import { RENAME_FILES, TEMPLATES } from '../consts.js'
import { getPackageManagerStrategy } from '../strategies/package-manager.js'
import type { CliArgs, Template } from '../types.js'
import { copy, run } from '../utils/index.js'
import { ProjectContextImpl } from './context.js'

const { blue, cyan } = colors

export abstract class ProjectCreator {
  protected context: ProjectContextImpl
  protected readonly cwd: string

  constructor(argv: CliArgs) {
    this.context = new ProjectContextImpl(argv)
    this.cwd = process.cwd()
  }

  async create(): Promise<void> {
    await this.collectProjectName()
    await this.handleDirectory()
    await this.collectPackageName()
    await this.collectLanguage()
    await this.collectTemplate()
    await this.collectGitOption()
    await this.collectInstallOption()
    await this.collectStartOption()

    await this.scaffoldProject()

    if (this.context.initGit) {
      await this.initializeGit()
    }

    if (this.context.shouldInstall) {
      await this.installDependencies()
      if (this.context.shouldStart) {
        await this.startDevServer()
      } else {
        this.showCompletionMessage()
      }
    } else {
      this.showCompletionMessage()
    }
  }

  protected abstract collectProjectName(): Promise<void>
  protected abstract handleDirectory(): Promise<void>
  protected abstract collectPackageName(): Promise<void>
  protected abstract collectLanguage(): Promise<void>
  protected abstract collectTemplate(): Promise<void>
  protected abstract collectGitOption(): Promise<void>
  protected abstract collectInstallOption(): Promise<void>
  protected abstract collectStartOption(): Promise<void>

  protected async scaffoldProject(): Promise<void> {
    const root = path.join(this.cwd, this.context.targetDir)
    fs.mkdirSync(root, { recursive: true })

    prompts.log.step(`Scaffolding project in ${root}...`)

    const templateDir = path.resolve(
      fileURLToPath(import.meta.url),
      '../..',
      `template-${this.context.template}`,
    )

    const write = (file: string, content?: string) => {
      const targetPath = path.join(root, RENAME_FILES[file] ?? file)
      if (content) {
        fs.writeFileSync(targetPath, content)
      } else if (file === 'index.html') {
        const templatePath = path.join(templateDir, file)
        const templateContent = fs.readFileSync(templatePath, 'utf-8')
        const updatedContent = templateContent.replace(
          /<title>.*?<\/title>/,
          `<title>${this.context.packageName}</title>`,
        )
        fs.writeFileSync(targetPath, updatedContent)
      } else {
        copy(path.join(templateDir, file), targetPath)
      }
    }

    const files = fs.readdirSync(templateDir)
    for (const file of files.filter((f) => f !== 'package.json')) {
      write(file)
    }

    const pkg = JSON.parse(
      fs.readFileSync(path.join(templateDir, `package.json`), 'utf-8'),
    )

    pkg.name = this.context.packageName

    write('package.json', JSON.stringify(pkg, null, 2) + '\n')
  }

  protected async initializeGit(): Promise<void> {
    const root = path.join(this.cwd, this.context.targetDir)
    prompts.log.step('Initializing Git repository...')
    run(['git', 'init', '-b', 'main'], { stdio: 'inherit', cwd: root })
    run(['git', 'add', '.'], { stdio: 'inherit', cwd: root })
  }

  protected async installDependencies(): Promise<void> {
    const root = path.join(this.cwd, this.context.targetDir)
    if (process.env._VITE_TEST_CLI) {
      prompts.log.step(
        `Installing dependencies with ${this.context.pkgManager}... (skipped in test)`,
      )
      return
    }
    const registryInfo = this.context.registry
      ? ` (${this.context.registry})`
      : ''
    prompts.log.step(
      `Installing dependencies with ${this.context.pkgManager}${registryInfo}...`,
    )
    const strategy = getPackageManagerStrategy(this.context.pkgManager)
    run(strategy.getInstallCommand(this.context.registry), {
      stdio: 'inherit',
      cwd: root,
    })
  }

  protected async startDevServer(): Promise<void> {
    const root = path.join(this.cwd, this.context.targetDir)
    if (process.env._VITE_TEST_CLI) {
      prompts.log.step('Starting dev server... (skipped in test)')
      return
    }
    prompts.log.step('Starting dev server...')
    const strategy = getPackageManagerStrategy(this.context.pkgManager)
    run(strategy.getRunCommand('dev'), {
      stdio: 'inherit',
      cwd: root,
    })
  }

  protected showCompletionMessage(): void {
    const root = path.join(this.cwd, this.context.targetDir)
    const cdProjectName = path.relative(this.cwd, root)
    const strategy = getPackageManagerStrategy(this.context.pkgManager)

    let doneMessage = 'Done. Now run:\n'
    if (root !== this.cwd) {
      doneMessage += `\n  cd ${cdProjectName.includes(' ') ? `"${cdProjectName}"` : cdProjectName}`
    }

    if (!this.context.shouldInstall) {
      doneMessage += `\n  ${strategy.getInstallCommand().join(' ')}`
    }

    doneMessage += `\n  ${strategy.getRunCommand('dev').join(' ')}`
    prompts.outro(doneMessage)
  }

  protected cancel(): void {
    prompts.cancel('Operation cancelled')
  }

  protected isValidPackageName(projectName: string): boolean {
    return /^(?:@[a-z\d\-*~][a-z\d\-*._~]*\/)?[a-z\d\-~][a-z\d\-._~]*$/.test(
      projectName,
    )
  }

  protected toValidPackageName(projectName: string): string {
    return projectName
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/^[._]/, '')
      .replace(/[^a-z\d\-~]+/g, '-')
  }

  protected getTemplateLabel(template: Template): string {
    const config = TEMPLATES.find((t) => t.name === template)
    if (!config) return template
    const colorFn = config.color === 'cyan' ? cyan : blue
    return colorFn(config.label)
  }
}
