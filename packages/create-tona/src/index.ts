import type { SpawnOptions } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as prompts from '@clack/prompts'
import spawn from 'cross-spawn'
import mri from 'mri'
import colors from 'picocolors'

import { DEFAULT_APP_NAME } from './consts.js'
import { renderTitle } from './utils/renderTitle.js'

const { blue, yellow, red, cyan } = colors

const argv = mri<{
  template?: string
  help?: boolean
  overwrite?: boolean
  immediate?: boolean
  interactive?: boolean
  git?: boolean
  install?: boolean
}>(process.argv.slice(2), {
  boolean: ['help', 'overwrite', 'immediate', 'interactive', 'git', 'install'],
  alias: { h: 'help', t: 'template', i: 'immediate', g: 'git' },
  string: ['template'],
})
const cwd = process.cwd()

// prettier-ignore
const helpMessage = `\
Usage: create-tona [OPTION]... [DIRECTORY]

Create a new Tona theme project with TypeScript.
When running in TTY, the CLI will start in interactive mode.

Options:
  -t, --template NAME                   use a specific template (minimal or preact)
  -i, --immediate                       install dependencies and start dev
  -g, --git                             initialize git repository and stage changes
  --install                             install dependencies only
  --interactive / --no-interactive      force interactive / non-interactive mode

Available templates:
${cyan('preact              Preact + TypeScript (recommended)')}
${blue('minimal             Minimal TypeScript')}`

const renameFiles: Record<string, string | undefined> = {
  _gitignore: '.gitignore',
}

function run([command, ...args]: string[], options?: SpawnOptions) {
  const { status, error } = spawn.sync(command, args, options)
  if (status != null && status > 0) {
    process.exit(status)
  }

  if (error) {
    console.error(`\n${command} ${args.join(' ')} error!`)
    console.error(error)
    process.exit(1)
  }
}

function install(root: string, agent: string, registry?: string) {
  if (process.env._VITE_TEST_CLI) {
    prompts.log.step(
      `Installing dependencies with ${agent}... (skipped in test)`,
    )
    return
  }
  const registryInfo = registry ? ` (${registry})` : ''
  prompts.log.step(`Installing dependencies with ${agent}${registryInfo}...`)
  run(getInstallCommand(agent, registry), {
    stdio: 'inherit',
    cwd: root,
  })
}

function start(root: string, agent: string) {
  if (process.env._VITE_TEST_CLI) {
    prompts.log.step('Starting dev server... (skipped in test)')
    return
  }
  prompts.log.step('Starting dev server...')
  run(getRunCommand(agent, 'dev'), {
    stdio: 'inherit',
    cwd: root,
  })
}

async function init() {
  renderTitle()

  const argTargetDir = argv._[0]
    ? formatTargetDir(String(argv._[0]))
    : undefined
  const argTemplate = argv.template
  const argOverwrite = argv.overwrite
  const argImmediate = argv.immediate
  const argInteractive = argv.interactive
  const argGit = argv.git
  const argInstall = argv.install

  const help = argv.help
  if (help) {
    console.log(helpMessage)
    return
  }

  const interactive = argInteractive ?? process.stdin.isTTY

  const pkgInfo = pkgFromUserAgent(process.env.npm_config_user_agent)
  const cancel = () => prompts.cancel('Operation cancelled')

  // 1. Get project name and target dir
  let targetDir = argTargetDir
  if (!targetDir) {
    if (interactive) {
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
      if (prompts.isCancel(projectName)) return cancel()
      targetDir = formatTargetDir(projectName)
    } else {
      targetDir = DEFAULT_APP_NAME
    }
  }

  // 2. Handle directory if exist and not empty
  if (fs.existsSync(targetDir) && !isEmpty(targetDir)) {
    let overwrite: 'yes' | 'no' | 'ignore' | undefined = argOverwrite
      ? 'yes'
      : undefined
    if (!overwrite) {
      if (interactive) {
        const res = await prompts.select({
          message:
            (targetDir === '.'
              ? 'Current directory'
              : `Target directory "${targetDir}"`) +
            ` is not empty. Please choose how to proceed:`,
          options: [
            {
              label: 'Cancel operation',
              value: 'no',
            },
            {
              label: 'Remove existing files and continue',
              value: 'yes',
            },
            {
              label: 'Ignore files and continue',
              value: 'ignore',
            },
          ],
        })
        if (prompts.isCancel(res)) return cancel()
        overwrite = res
      } else {
        overwrite = 'no'
      }
    }

    if (overwrite === 'yes') {
      emptyDir(targetDir)
    } else if (overwrite === 'no') {
      cancel()
      return
    }
  }

  // 3. Get package name
  let packageName = path.basename(path.resolve(targetDir))
  if (!isValidPackageName(packageName)) {
    if (interactive) {
      const packageNameResult = await prompts.text({
        message: 'Package name:',
        defaultValue: toValidPackageName(packageName),
        placeholder: toValidPackageName(packageName),
        validate(dir) {
          if (!dir || !isValidPackageName(dir)) {
            return 'Invalid package.json name'
          }
        },
      })
      if (prompts.isCancel(packageNameResult)) return cancel()
      packageName = packageNameResult
    } else {
      packageName = toValidPackageName(packageName)
    }
  }

  // 4. Choose language (typescript/javascript) - javascript auto-switches to typescript
  if (interactive) {
    const languageResult = await prompts.select({
      message: 'Select language:',
      options: [
        {
          label: blue('TypeScript (recommended)'),
          value: 'ts',
        },
        {
          label: yellow('JavaScript'),
          value: 'js',
        },
      ],
    })
    if (prompts.isCancel(languageResult)) return cancel()

    if (languageResult === 'js') {
      prompts.log.warn(red('Wrong answer, using TypeScript instead'))
    }
  }

  // 5. Choose template
  let template = argTemplate
  let hasInvalidArgTemplate = false
  if (argTemplate && !['minimal', 'preact'].includes(argTemplate)) {
    template = undefined
    hasInvalidArgTemplate = true
  }
  if (!template) {
    if (interactive) {
      const templateResult = await prompts.select({
        message: hasInvalidArgTemplate
          ? `"${argTemplate}" isn't a valid template. Please choose from below: `
          : 'Select a template:',
        options: [
          {
            label: cyan('preact (recommended)'),
            value: 'preact',
          },
          {
            label: blue('minimal'),
            value: 'minimal',
          },
        ],
      })
      if (prompts.isCancel(templateResult)) return cancel()
      template = templateResult
    } else {
      template = 'minimal'
    }
  }

  let pkgManager = pkgInfo ? pkgInfo.name : 'npm'

  const hasPnpm =
    spawn.sync('pnpm', ['--version'], { stdio: 'ignore' }).status === 0
  if (hasPnpm) {
    pkgManager = 'pnpm'
  }

  // 6. Ask about git initialization
  let initGit = argGit
  if (initGit === undefined) {
    if (interactive) {
      const gitResult = await prompts.confirm({
        message: 'Initialize a Git repository and stage the changes?',
      })
      if (prompts.isCancel(gitResult)) return cancel()
      initGit = gitResult
    } else {
      initGit = false
    }
  }

  // 7. Ask about installing dependencies
  let registry: string | undefined
  let shouldInstall = argInstall || argImmediate
  if (!shouldInstall) {
    if (interactive) {
      const installResult = await prompts.select({
        message: 'Install dependencies?',
        options: [
          {
            label: cyan('Yes, via Taobao mirror (recommended)'),
            value: 'taobao',
          },
          {
            label: blue('Yes, via official registry'),
            value: 'official',
          },
          {
            label: 'No',
            value: 'no',
          },
        ],
      })
      if (prompts.isCancel(installResult)) return cancel()
      if (installResult === 'no') {
        shouldInstall = false
      } else {
        shouldInstall = true
        registry = installResult === 'taobao' ? 'taobao' : undefined
      }
    } else {
      shouldInstall = false
    }
  }

  // 8. Ask about starting dev server
  let shouldStart = argImmediate
  if (shouldStart === undefined && shouldInstall) {
    if (interactive) {
      const startResult = await prompts.confirm({
        message: 'Start dev server?',
      })
      if (prompts.isCancel(startResult)) return cancel()
      shouldStart = startResult
    } else {
      shouldStart = false
    }
  }

  const root = path.join(cwd, targetDir)
  fs.mkdirSync(root, { recursive: true })

  prompts.log.step(`Scaffolding project in ${root}...`)

  const templateDir = path.resolve(
    fileURLToPath(import.meta.url),
    '../..',
    `template-${template}`,
  )

  const write = (file: string, content?: string) => {
    const targetPath = path.join(root, renameFiles[file] ?? file)
    if (content) {
      fs.writeFileSync(targetPath, content)
    } else if (file === 'index.html') {
      const templatePath = path.join(templateDir, file)
      const templateContent = fs.readFileSync(templatePath, 'utf-8')
      const updatedContent = templateContent.replace(
        /<title>.*?<\/title>/,
        `<title>${packageName}</title>`,
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

  pkg.name = packageName

  write('package.json', JSON.stringify(pkg, null, 2) + '\n')

  if (initGit) {
    prompts.log.step('Initializing Git repository...')
    run(['git', 'init', '-b', 'main'], { stdio: 'inherit', cwd: root })
    run(['git', 'add', '.'], { stdio: 'inherit', cwd: root })
  }

  if (shouldInstall) {
    install(root, pkgManager, registry)
    if (shouldStart) {
      start(root, pkgManager)
    } else {
      const cdProjectName = path.relative(cwd, root)
      let doneMessage = `Done. Now run:\n`
      if (root !== cwd) {
        doneMessage += `\n  cd ${cdProjectName.includes(' ') ? `"${cdProjectName}"` : cdProjectName}`
      }
      doneMessage += `\n  ${getRunCommand(pkgManager, 'dev').join(' ')}`
      prompts.outro(doneMessage)
    }
  } else {
    let doneMessage = ''
    const cdProjectName = path.relative(cwd, root)
    doneMessage += `Done. Now run:\n`
    if (root !== cwd) {
      doneMessage += `\n  cd ${
        cdProjectName.includes(' ') ? `"${cdProjectName}"` : cdProjectName
      }`
    }
    doneMessage += `\n  ${getInstallCommand(pkgManager).join(' ')}`
    doneMessage += `\n  ${getRunCommand(pkgManager, 'dev').join(' ')}`
    prompts.outro(doneMessage)
  }
}

function formatTargetDir(targetDir: string) {
  return targetDir.trim().replace(/\/+$/g, '')
}

function copy(src: string, dest: string) {
  const stat = fs.statSync(src)
  if (stat.isDirectory()) {
    copyDir(src, dest)
  } else {
    fs.copyFileSync(src, dest)
  }
}

function isValidPackageName(projectName: string) {
  return /^(?:@[a-z\d\-*~][a-z\d\-*._~]*\/)?[a-z\d\-~][a-z\d\-._~]*$/.test(
    projectName,
  )
}

function toValidPackageName(projectName: string) {
  return projectName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/^[._]/, '')
    .replace(/[^a-z\d\-~]+/g, '-')
}

function copyDir(srcDir: string, destDir: string) {
  fs.mkdirSync(destDir, { recursive: true })
  for (const file of fs.readdirSync(srcDir)) {
    const srcFile = path.resolve(srcDir, file)
    const destFile = path.resolve(destDir, file)
    copy(srcFile, destFile)
  }
}

function isEmpty(path: string) {
  const files = fs.readdirSync(path)
  return files.length === 0 || (files.length === 1 && files[0] === '.git')
}

function emptyDir(dir: string) {
  if (!fs.existsSync(dir)) {
    return
  }
  for (const file of fs.readdirSync(dir)) {
    if (file === '.git') {
      continue
    }
    fs.rmSync(path.resolve(dir, file), { recursive: true, force: true })
  }
}

interface PkgInfo {
  name: string
  version: string
}

function pkgFromUserAgent(userAgent: string | undefined): PkgInfo | undefined {
  if (!userAgent) return undefined
  const pkgSpec = userAgent.split(' ')[0]
  const pkgSpecArr = pkgSpec.split('/')
  return {
    name: pkgSpecArr[0],
    version: pkgSpecArr[1],
  }
}

function getInstallCommand(agent: string, registry?: string) {
  const registryUrl =
    registry === 'taobao' ? 'https://registry.npmmirror.com' : undefined

  if (agent === 'yarn') {
    if (registryUrl) {
      return [agent, '--registry', registryUrl]
    }
    return [agent]
  }

  if (registryUrl) {
    return [agent, 'install', '--registry', registryUrl]
  }
  return [agent, 'install']
}

function getRunCommand(agent: string, script: string) {
  if (agent === 'yarn' || agent === 'pnpm' || agent === 'bun') {
    return [agent, script]
  }
  if (agent === 'deno') {
    return [agent, 'task', script]
  }
  return [agent, 'run', script]
}

init().catch((e) => {
  console.error(e)
})
