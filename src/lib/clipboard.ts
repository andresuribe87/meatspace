/** Copy text to clipboard with a legacy fallback for non-secure contexts. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    /* fall through to legacy path */
  }
  const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
  const ta = document.createElement('textarea')
  try {
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.top = '0'
    ta.style.left = '0'
    ta.style.opacity = '0'
    // An open modal <dialog> makes the rest of the document inert: a textarea outside it cannot be selected,
    // and execCommand would report success after copying nothing.
    const host = previous?.closest('dialog[open]') ?? document.querySelector('dialog[open]') ?? document.body
    host.appendChild(ta)
    ta.focus({ preventScroll: true })
    ta.select()
    return document.execCommand('copy')
  } catch {
    return false
  } finally {
    ta.remove()
    previous?.focus({ preventScroll: true })
  }
}
