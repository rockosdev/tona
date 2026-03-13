import type { SpawnOptions } from 'node:child_process'
import spawn from 'cross-spawn'

export function run(
  [command, ...args]: string[],
  options?: SpawnOptions,
): void {
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
