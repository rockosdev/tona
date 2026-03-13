import type { PackageManager } from '../types.js'

export interface PackageManagerStrategy {
  getInstallCommand(registry?: string): string[]
  getRunCommand(script: string): string[]
}

export class NpmStrategy implements PackageManagerStrategy {
  getInstallCommand(registry?: string): string[] {
    const cmd = ['npm', 'install']
    if (registry) {
      cmd.push('--registry', registry)
    }
    return cmd
  }

  getRunCommand(script: string): string[] {
    return ['npm', 'run', script]
  }
}

export class PnpmStrategy implements PackageManagerStrategy {
  getInstallCommand(registry?: string): string[] {
    const cmd = ['pnpm', 'install']
    if (registry) {
      cmd.push('--registry', registry)
    }
    return cmd
  }

  getRunCommand(script: string): string[] {
    return ['pnpm', script]
  }
}

export class YarnStrategy implements PackageManagerStrategy {
  getInstallCommand(registry?: string): string[] {
    if (registry) {
      return ['yarn', '--registry', registry]
    }
    return ['yarn']
  }

  getRunCommand(script: string): string[] {
    return ['yarn', script]
  }
}

export class BunStrategy implements PackageManagerStrategy {
  getInstallCommand(registry?: string): string[] {
    const cmd = ['bun', 'install']
    if (registry) {
      cmd.push('--registry', registry)
    }
    return cmd
  }

  getRunCommand(script: string): string[] {
    return ['bun', script]
  }
}

export class DenoStrategy implements PackageManagerStrategy {
  getInstallCommand(_registry?: string): string[] {
    return ['deno', 'install']
  }

  getRunCommand(script: string): string[] {
    return ['deno', 'task', script]
  }
}

const strategies: Record<PackageManager, PackageManagerStrategy> = {
  npm: new NpmStrategy(),
  pnpm: new PnpmStrategy(),
  yarn: new YarnStrategy(),
  bun: new BunStrategy(),
  deno: new DenoStrategy(),
}

export function getPackageManagerStrategy(
  agent: PackageManager,
): PackageManagerStrategy {
  return strategies[agent] ?? strategies.npm
}
