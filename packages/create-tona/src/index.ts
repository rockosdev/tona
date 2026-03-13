import mri from 'mri'
import colors from 'picocolors'
import { InteractiveProjectCreator } from './prompts/index.js'
import type { CliArgs } from './types.js'
import { renderTitle } from './utils/renderTitle.js'

const { cyan, blue } = colors

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

function parseArgs(args: string[]): CliArgs {
  const hasInteractiveFlag =
    args.includes('--interactive') || args.includes('--no-interactive')
  const hasGitFlag =
    args.includes('--git') || args.includes('-g') || args.includes('--no-git')

  const argv = mri<{
    template?: string
    help?: boolean
    overwrite?: boolean
    immediate?: boolean
    interactive?: boolean
    git?: boolean
    install?: boolean
  }>(args, {
    boolean: [
      'help',
      'overwrite',
      'immediate',
      'interactive',
      'git',
      'install',
    ],
    alias: { h: 'help', t: 'template', i: 'immediate', g: 'git' },
    string: ['template'],
  })

  return {
    _: argv._,
    template: argv.template as CliArgs['template'],
    help: argv.help ?? false,
    overwrite: argv.overwrite ?? false,
    immediate: argv.immediate ?? false,
    interactive: hasInteractiveFlag ? (argv.interactive ?? false) : undefined,
    git: hasGitFlag ? (argv.git ?? false) : undefined,
    install: argv.install ?? false,
  }
}

async function init() {
  renderTitle()

  const argv = parseArgs(process.argv.slice(2))

  if (argv.help) {
    console.log(helpMessage)
    return
  }

  const creator = new InteractiveProjectCreator(argv)
  await creator.create()
}

init().catch((e) => {
  console.error(e)
})
