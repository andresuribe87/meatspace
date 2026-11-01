import { ORIGIN, VERSION } from './meta'

/**
 * GET /install.sh. POSIX sh only, no bashisms (tested under dash and bash --posix). Someone may pipe it into `sh` (or
 * `sudo sh`), so it is strictly inert: the only external command is uname; everything else is shell builtins and printf.
 * meatspaced (a local evaluation runner and safety supervisor for robots you own) is PLANNED: the script says so and exits.
 * v0.1 flags are accepted and ignored, so old copies of the one-liner still exit 0.
 * Inside this template literal, shell expansions are written \${...} and backslashes are doubled.
 */
export const INSTALL_SH = `#!/bin/sh
# meatspaced installer v${VERSION} (inert).
# meatspaced, a local evaluation runner and safety supervisor for robots you own, is
# planned and not released. This script parses flags, prints what it detected
# and what it would do, then exits. It writes nothing, downloads nothing and
# starts nothing.
set -eu

usage() {
	printf '%s\\n' \\
		'usage: install.sh [-h | --help]' \\
		'' \\
		'  -h, --help   print this help and exit' \\
		'' \\
		'meatspaced is not released. This script makes no changes to the system.' \\
		'v0.1 flags (--protocol, --rtk-verify) are accepted and ignored.'
}

fail() {
	printf 'install.sh: %s\\n' "$1" >&2
	printf '%s\\n' "try 'install.sh --help'" >&2
	exit 2
}

for arg in "$@"; do
	case $arg in
	--protocol=* | --rtk-verify) ;;
	-h | --help)
		usage
		exit 0
		;;
	*) fail "unknown option: $arg" ;;
	esac
done

if [ -t 1 ]; then
	esc=$(printf '\\033')
	ok="$esc[32m" warn="$esc[33m" off="$esc[0m"
else
	ok='' warn='' off=''
fi

os=$(uname -s)
arch=$(uname -m)

printf '%s\\n\\n' 'meatspace.sh // meatspaced installer v${VERSION}'
printf '  %-12s%s%s%s\\n' detected "$ok" "$os/$arch" "$off"
printf '\\n  %s\\n' 'plan (dry run, nothing executed):'
printf '    - %s\\n' "install meatspaced v${VERSION} for $os/$arch" 'run it as a local evaluation runner and safety supervisor for robots you own'
printf '\\n%sWARN%s  %s\\n' "$warn" "$off" 'meatspaced is not released.'
printf '%sWARN%s  %s\\n' "$warn" "$off" 'NO changes were made to this system.'
printf '\\n%s\\n' 'tell us what it would have to do: ${ORIGIN}/#own-robot'
`
