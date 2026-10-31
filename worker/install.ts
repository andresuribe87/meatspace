import { ORIGIN, VERSION } from './meta'

/**
 * GET /install.sh. POSIX sh only, no bashisms (tested under dash and bash --posix). It is piped into `sudo sh`, so it is
 * strictly inert: the only external command is uname; everything else is shell builtins and printf.
 * Inside this template literal, shell expansions are written \${...} and backslashes are doubled.
 */
export const INSTALL_SH = `#!/bin/sh
# meatspaced installer v${VERSION} (preview build).
# Inert by design: it parses flags, reports what it detected and what it would
# do, then exits. It writes nothing, downloads nothing and starts nothing.
set -eu

protocol=mavlink
rtk_verify=skipped

usage() {
	printf '%s\\n' \\
		'usage: install.sh [--protocol=NAME] [--rtk-verify] [-h | --help]' \\
		'' \\
		'  --protocol=NAME  bridge for this node: mavlink (default), ros2, vda5050, opcua' \\
		'  --rtk-verify     require a verified RTK-GPS fix before the node registers' \\
		'  -h, --help       print this help and exit' \\
		'' \\
		'meatspaced is not yet released. This script makes no changes to the system.'
}

fail() {
	printf 'install.sh: %s\\n' "$1" >&2
	printf '%s\\n' "try 'install.sh --help'" >&2
	exit 2
}

for arg in "$@"; do
	case $arg in
	--protocol=*) protocol=\${arg#--protocol=} ;;
	--rtk-verify) rtk_verify=requested ;;
	-h | --help)
		usage
		exit 0
		;;
	*) fail "unknown option: $arg" ;;
	esac
done

case $protocol in
mavlink) bridge='MAVLink v2 bridge on udp:14550' ;;
ros2) bridge='ROS 2 Humble DDS bridge on domain 0' ;;
vda5050) bridge='VDA 5050 MQTT bridge on tcp:1883' ;;
opcua) bridge='OPC UA client on opc.tcp:4840' ;;
*) fail "invalid protocol: '$protocol' (expected mavlink, ros2, vda5050 or opcua)" ;;
esac

if [ -t 1 ]; then
	esc=$(printf '\\033')
	ok="$esc[32m" warn="$esc[33m" off="$esc[0m"
else
	ok='' warn='' off=''
fi

os=$(uname -s)
arch=$(uname -m)

field() {
	printf '  %-12s%s%s%s\\n' "$1" "$ok" "$2" "$off"
}

printf '%s\\n\\n' 'meatspace.sh // meatspaced installer v${VERSION}'
field os "$os"
field arch "$arch"
field protocol "$protocol"
field rtk-verify "$rtk_verify"
printf '\\n  %s\\n' 'plan (dry run, nothing executed):'
printf '    - %s\\n' "install meatspaced v${VERSION} for $os/$arch" "start the $bridge"
if [ "$rtk_verify" = requested ]; then
	printf '    - %s\\n' 'verify the RTK-GPS fix before registering'
fi
printf '    - %s\\n\\n' 'register this node with the clearinghouse'
printf '%sWARN%s  %s\\n' "$warn" "$off" 'meatspaced is not yet released.' "$warn" "$off" 'NO changes were made to this system.'
printf '\\n%s\\n' 'register interest: ${ORIGIN}/#connect'
`
