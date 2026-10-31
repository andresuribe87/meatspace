import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

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

  it.each(['stdin', 'file'] as const)('the handoff one-liner (%s) reports and exits 0 without touching the host', (mode) => {
    const r = run(shell, mode, ['--protocol=mavlink', '--rtk-verify'])
    expect(r.stderr).toBe('')
    expect(r.status).toBe(0)
    expect(readdirSync(sandbox)).toEqual([])
    expect(readdirSync(scripts)).toEqual(mode === 'file' ? ['install.sh'] : [])

    const lines = r.stdout.split('\n')
    expect(lines[0]).toBe('meatspace.sh // meatspaced installer v0.1.4-alpha')
    expect(lines).toContain(`  os          ${uname('-s')}`)
    expect(lines).toContain(`  arch        ${uname('-m')}`)
    expect(lines).toContain('  protocol    mavlink')
    expect(lines).toContain('  rtk-verify  requested')
    expect(lines).toContain('    - start the MAVLink v2 bridge on udp:14550')
    expect(lines).toContain('    - verify the RTK-GPS fix before registering')
    expect(lines).toContain('WARN  meatspaced is not yet released.')
    expect(lines).toContain('WARN  NO changes were made to this system.')
    expect(lines.at(-2)).toBe('register interest: https://meatspace.sh/#connect')
    // Not a TTY: no ANSI colour.
    expect(r.stdout).not.toContain('\u001b')
  })

  it('defaults to mavlink with rtk-verify skipped', () => {
    const r = run(shell, 'stdin', [])
    expect(r.status).toBe(0)
    expect(r.stdout).toContain('  protocol    mavlink\n')
    expect(r.stdout).toContain('  rtk-verify  skipped\n')
    expect(r.stdout).not.toContain('RTK-GPS fix')
  })

  it.each([
    ['ros2', 'ROS 2 Humble DDS bridge on domain 0'],
    ['vda5050', 'VDA 5050 MQTT bridge on tcp:1883'],
    ['opcua', 'OPC UA client on opc.tcp:4840'],
  ])('--protocol=%s', (protocol, bridge) => {
    const r = run(shell, 'stdin', [`--protocol=${protocol}`])
    expect(r.status).toBe(0)
    expect(r.stdout).toContain(`  protocol    ${protocol}\n`)
    expect(r.stdout).toContain(`    - start the ${bridge}\n`)
  })

  it.each([['-h'], ['--help']])('%s prints usage and exits 0', (flag) => {
    const r = run(shell, 'stdin', ['--protocol=mavlink', flag])
    expect(r.status).toBe(0)
    expect(r.stdout.split('\n')[0]).toBe('usage: install.sh [--protocol=NAME] [--rtk-verify] [-h | --help]')
    expect(r.stdout).toContain('meatspaced is not yet released. This script makes no changes to the system.')
  })

  it.each([
    [['--protocol=canbus'], "install.sh: invalid protocol: 'canbus' (expected mavlink, ros2, vda5050 or opcua)"],
    [['--protocol='], "install.sh: invalid protocol: '' (expected mavlink, ros2, vda5050 or opcua)"],
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

  it('runs no external command other than uname', () => {
    const substitutions = [...INSTALL_SH.matchAll(/\$\(([^)]*)\)/g)].map((m) => m[1].split(' ')[0])
    expect(new Set(substitutions)).toEqual(new Set(['printf', 'uname']))
  })
})
