import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { VERSION } from '../../shared/constants'
import { INSTALL_SH } from '../../worker/install'

/** Every POSIX shell available here; /bin/sh is dash on Debian, bash --posix is what macOS ships as sh. */
const SHELLS: [string, string[]][] = (
  [
    ['/bin/sh', []],
    ['/usr/bin/dash', []],
    ['/bin/bash', ['--posix']],
    ['/bin/busybox', ['sh']],
  ] satisfies [string, string[]][]
).filter(([bin]) => existsSync(bin))

const uname = (flag: string) => spawnSync('uname', [flag], { encoding: 'utf8' }).stdout.trim()

/** cwd, HOME and TMPDIR for the script: must still be empty afterwards. */
let sandbox: string
/** Holds the script file for "file" mode, outside the sandbox. */
let scripts: string

beforeEach(() => {
  sandbox = mkdtempSync(join(tmpdir(), 'meatspace-sandbox-'))
  scripts = mkdtempSync(join(tmpdir(), 'meatspace-script-'))
})

afterEach(() => {
  rmSync(sandbox, { recursive: true, force: true })
  rmSync(scripts, { recursive: true, force: true })
})

function run(shell: [string, string[]], mode: 'stdin' | 'file', args: string[]) {
  const [bin, shellArgs] = shell
  const opts = { cwd: sandbox, env: { PATH: process.env.PATH, HOME: sandbox, TMPDIR: sandbox }, encoding: 'utf8' } as const
  if (mode === 'stdin') return spawnSync(bin, [...shellArgs, '-s', '--', ...args], { ...opts, input: INSTALL_SH })
  const file = join(scripts, 'install.sh')
  writeFileSync(file, INSTALL_SH)
  return spawnSync(bin, [...shellArgs, file, ...args], opts)
}

describe.each(SHELLS)('install.sh under %s %j', (bin, shellArgs) => {
  const shell: [string, string[]] = [bin, shellArgs]

  it.each(['stdin', 'file'] as const)('reports a dry-run plan (%s) and exits 0 without touching the host', (mode) => {
    const r = run(shell, mode, [])
    expect(r.stderr).toBe('')
    expect(r.status).toBe(0)
    expect(readdirSync(sandbox)).toEqual([])
    expect(readdirSync(scripts)).toEqual(mode === 'file' ? ['install.sh'] : [])

    const lines = r.stdout.split('\n')
    expect(lines[0]).toBe(`meatspace.sh // meatspaced installer v${VERSION}`)
    expect(lines).toContain(`  detected    ${uname('-s')}/${uname('-m')}`)
    expect(lines).toContain('  plan (dry run, nothing executed):')
    expect(lines).toContain(`    - install meatspaced v${VERSION} for ${uname('-s')}/${uname('-m')}`)
    expect(lines).toContain('    - run it as a local evaluation runner and safety supervisor for robots you own')
    expect(lines).toContain('WARN  meatspaced is not released.')
    expect(lines).toContain('WARN  NO changes were made to this system.')
    expect(lines.at(-2)).toBe('tell us what it would have to do: https://meatspace.sh/#own-robot')
    // Not a TTY: no ANSI colour.
    expect(r.stdout).not.toContain('\u001b')
  })

  it('accepts and ignores the v0.1 flags, so the old one-liner still exits 0', () => {
    const plain = run(shell, 'stdin', [])
    for (const args of [['--protocol=mavlink', '--rtk-verify'], ['--protocol=ros2'], ['--rtk-verify']]) {
      const r = run(shell, 'stdin', args)
      expect(r.status, args.join(' ')).toBe(0)
      expect(r.stdout).toBe(plain.stdout)
    }
  })

  it.each([['-h'], ['--help']])('%s prints usage and exits 0', (flag) => {
    const r = run(shell, 'stdin', ['--protocol=mavlink', flag])
    expect(r.status).toBe(0)
    expect(r.stdout.split('\n')[0]).toBe('usage: install.sh [-h | --help]')
    expect(r.stdout).toContain('meatspaced is not released. This script makes no changes to the system.')
    expect(r.stdout).toContain('v0.1 flags (--protocol, --rtk-verify) are accepted and ignored.')
  })

  it.each([
    [['--rtk'], 'install.sh: unknown option: --rtk'],
    [['mavlink'], 'install.sh: unknown option: mavlink'],
  ])('%j exits 2 with a message on stderr', (args, message) => {
    const r = run(shell, 'stdin', args)
    expect(r.status).toBe(2)
    expect(r.stdout).toBe('')
    expect(r.stderr).toBe(`${message}\ntry 'install.sh --help'\n`)
  })
})

describe('install.sh source', () => {
  it('ran under at least dash', () => {
    expect(SHELLS.map(([bin]) => bin)).toContain('/usr/bin/dash')
  })

  it('is a POSIX sh script with strict mode', () => {
    expect(INSTALL_SH.startsWith('#!/bin/sh\n')).toBe(true)
    expect(INSTALL_SH).toMatch(/^set -eu$/m)
  })

  it('contains no command that could change the host', () => {
    for (const word of ['curl', 'wget', 'apt', 'apt-get', 'yum', 'dnf', 'apk', 'brew', 'systemctl', 'useradd', 'chmod', 'chown', 'mkdir', 'sudo', 'eval', 'exec']) {
      expect(INSTALL_SH, word).not.toMatch(new RegExp(`\\b${word}\\b`))
    }
    expect(INSTALL_SH).not.toMatch(/\brm\s/)
    // The only redirection is to stderr; nothing is ever written to a file.
    expect(INSTALL_SH).not.toMatch(/>(?!&2)/)
    expect(INSTALL_SH).toContain('>&2')
  })

  it('makes no claim the honesty rules forbid', () => {
    for (const word of ['node', 'nodes', 'fleet', 'clearinghouse', 'verified', 'escrow', 'attestation', 'TPM', 'USDC']) {
      expect(INSTALL_SH.toLowerCase(), word).not.toMatch(new RegExp(`\\b${word.toLowerCase()}\\b`))
    }
  })

  it('runs no external command other than uname', () => {
    const substitutions = [...INSTALL_SH.matchAll(/\$\(([^)]*)\)/g)].map((m) => m[1].split(' ')[0])
    expect(new Set(substitutions)).toEqual(new Set(['printf', 'uname']))
  })
})
