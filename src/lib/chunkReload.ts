/**
 * Stale-chunk recovery for lazy routes: after a deploy the old hashed chunks are gone, and a tab that was open
 * across it fails to import them. Reload once (a sessionStorage guard stops a loop during a real outage).
 */
const FLAG = 'ms:chunk-reload'

export function isChunkError(e: unknown): boolean {
  const m = e instanceof Error ? `${e.name} ${e.message}` : String(e)
  return /dynamically imported module|Importing a module script failed|error loading dynamically imported|ChunkLoadError|Unable to preload CSS/i.test(m)
}

export function reloadOnce(): boolean {
  try {
    if (sessionStorage.getItem(FLAG)) return false
    sessionStorage.setItem(FLAG, String(Date.now()))
  } catch {
    return false
  }
  window.location.reload()
  return true
}

/** Clear the guard once a page has rendered, so the next deploy can reload again. */
export function clearChunkReloadFlag(): void {
  try {
    sessionStorage.removeItem(FLAG)
  } catch {
    /* storage blocked: nothing to clear */
  }
}
