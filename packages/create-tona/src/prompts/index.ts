import fs from 'node:fs'
import path from 'node:path'
import * as prompts from '@clack/prompts'
import colors from 'picocolors'
import { DEFAULT_APP_NAME, REGISTRIES, TEMPLATES } from '../consts.js'
import { ProjectCreator } from '../core/creator.js'
import type { OverwriteOption, Template } from '../types.js'
import { emptyDir, formatTargetDir, isEmpty } from '../utils/index.js'

const { blue, yellow, red, cyan } = colors

export class InteractiveProjectCreator extends ProjectCreator {
  protected async collectProjectName(): Promise<void> {
    if (this.context.targetDir) return

    if (this.context.interactive) {
      const projectName = await prompts.text({
        message: 'Project name:',
        defaultValue: DEFAULT_APP_NAME,
        placeholder: DEFAULT_APP_NAME,
        validate: (value) => {
          if (!value) return 'Invalid project name'
          return value.length === 0 || formatTargetDir(value).length > 0
            ? undefined
            : 'Invalid project name'
        },
      })
      if (prompts.isCancel(projectName)) {
        this.cancel()
        return
      }
      this.context.setTargetDir(formatTargetDir(projectName))
    } else {
      this.context.setTargetDir(DEFAULT_APP_NAME)
    }
  }

  protected async handleDirectory(): Promise<void> {
    const targetDir = this.context.targetDir
    if (!fs.existsSync(targetDir) || isEmpty(targetDir)) return

    let overwrite: OverwriteOption | undefined = this.context.getArgv()
      .overwrite
      ? 'yes'
      : undefined

    if (!overwrite) {
      if (this.context.interactive) {
        const res = await prompts.select({
          message:
            (targetDir === '.'
              ? 'Current directory'
              : `Target directory "${targetDir}"`) +
            ` is not empty. Please choose how to proceed:`,
          options: [
            { label: 'Cancel operation', value: 'no' },
            { label: 'Remove existing files and continue', value: 'yes' },
            { label: 'Ignore files and continue', value: 'ignore' },
          ],
        })
        if (prompts.isCancel(res)) {
          this.cancel()
          return
        }
        overwrite = res as OverwriteOption
      } else {
        overwrite = 'no'
      }
    }

    this.context.setOverwrite(overwrite)

    if (overwrite === 'yes') {
      emptyDir(targetDir)
    } else if (overwrite === 'no') {
      this.cancel()
    }
  }

  protected async collectPackageName(): Promise<void> {
    const targetDir = this.context.targetDir
    let packageName = path.basename(path.resolve(targetDir))

    if (!this.isValidPackageName(packageName)) {
      if (this.context.interactive) {
        const packageNameResult = await prompts.text({
          message: 'Package name:',
          defaultValue: this.toValidPackageName(packageName),
          placeholder: this.toValidPackageName(packageName),
          validate(dir) {
            if (
              !dir ||
              !/^(?:@[a-z\d\-*~][a-z\d\-*._~]*\/)?[a-z\d\-~][a-z\d\-._~]*$/.test(
                dir,
              )
            ) {
              return 'Invalid package.json name'
            }
          },
        })
        if (prompts.isCancel(packageNameResult)) {
          this.cancel()
          return
        }
        packageName = packageNameResult
      } else {
        packageName = this.toValidPackageName(packageName)
      }
    }

    this.context.setPackageName(packageName)
  }

  protected async collectLanguage(): Promise<void> {
    if (!this.context.interactive) return

    const languageResult = await prompts.select({
      message: 'Select language:',
      options: [
        { label: blue('TypeScript (recommended)'), value: 'ts' },
        { label: yellow('JavaScript'), value: 'js' },
      ],
    })
    if (prompts.isCancel(languageResult)) {
      this.cancel()
      return
    }

    if (languageResult === 'js') {
      prompts.log.warn(red('Wrong answer, using TypeScript instead'))
    }
  }

  protected async collectTemplate(): Promise<void> {
    const argv = this.context.getArgv()
    let template = argv.template
    let hasInvalidArgTemplate = false

    if (argv.template && !['minimal', 'preact'].includes(argv.template)) {
      template = undefined
      hasInvalidArgTemplate = true
    }

    if (!template) {
      if (this.context.interactive) {
        const templateResult = await prompts.select({
          message: hasInvalidArgTemplate
            ? `"${argv.template}" isn't a valid template. Please choose from below: `
            : 'Select a template:',
          options: TEMPLATES.map((t) => ({
            label: t.color === 'cyan' ? cyan(t.label) : blue(t.label),
            value: t.name,
          })),
        })
        if (prompts.isCancel(templateResult)) {
          this.cancel()
          return
        }
        template = templateResult as Template
      } else {
        template = 'minimal'
      }
    }

    this.context.setTemplate(template)
  }

  protected async collectGitOption(): Promise<void> {
    const argv = this.context.getArgv()
    let initGit = argv.git

    if (initGit === undefined) {
      if (this.context.interactive) {
        const gitResult = await prompts.confirm({
          message: 'Initialize a Git repository and stage the changes?',
        })
        if (prompts.isCancel(gitResult)) {
          this.cancel()
          return
        }
        initGit = gitResult
      } else {
        initGit = false
      }
    }

    this.context.setInitGit(initGit)
  }

  protected async collectInstallOption(): Promise<void> {
    const argv = this.context.getArgv()
    let registry: string | undefined
    let shouldInstall = argv.install || argv.immediate

    if (!shouldInstall) {
      if (this.context.interactive) {
        const installResult = await prompts.select({
          message: 'Install dependencies?',
          options: REGISTRIES.map((r) => ({
            label: r.color === 'cyan' ? cyan(r.label) : blue(r.label),
            value: r.name,
          })),
        })
        if (prompts.isCancel(installResult)) {
          this.cancel()
          return
        }
        if (installResult === 'no') {
          shouldInstall = false
        } else {
          shouldInstall = true
          const selected = REGISTRIES.find((r) => r.name === installResult)
          registry = selected?.url
        }
      } else {
        shouldInstall = false
      }
    }

    this.context.setShouldInstall(shouldInstall)
    this.context.setRegistry(registry)
  }

  protected async collectStartOption(): Promise<void> {
    const argv = this.context.getArgv()
    let shouldStart = argv.immediate

    if (shouldStart === undefined && this.context.shouldInstall) {
      if (this.context.interactive) {
        const startResult = await prompts.confirm({
          message: 'Start dev server?',
        })
        if (prompts.isCancel(startResult)) {
          this.cancel()
          return
        }
        shouldStart = startResult
      } else {
        shouldStart = false
      }
    }

    this.context.setShouldStart(shouldStart)
  }
}
