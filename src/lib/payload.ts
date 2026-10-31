/** Pretty JSON body exactly as shown in the console and sent on [ EXECUTE CALL ]. */
export function formatPayload(value: unknown): string {
  return JSON.stringify(value, null, 2)
}

/** Public API origin shown in copyable curl commands (the SPA itself calls relative /v1 paths). */
export const PUBLIC_ORIGIN = 'https://meatspace.sh'

/** Shell-safe curl command for a JSON body. Single quotes inside the body are escaped for POSIX sh. */
export function curlCommand(body: string, path = '/v1/dispatch'): string {
  const quoted = `'${body.replace(/'/g, `'\\''`)}'`
  return [`curl -sN -X POST ${PUBLIC_ORIGIN}${path} \\`, `  -H 'content-type: application/json' \\`, `  -d ${quoted}`].join('\n')
}
