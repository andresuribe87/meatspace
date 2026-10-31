// STUB — replaced by the docs implementation. Keep exported names/signatures.
export interface ManSection {
  /** Uppercase section heading, e.g. "SYNOPSIS". */
  title: string
  /** Section body as plain text; lines are pre-wrapped at <= 72 columns, indentation preserved. */
  body: string
}

export const MAN_TITLE = 'MEATSPACE(1)'
export const MAN_SECTIONS: readonly ManSection[] = [{ title: 'NAME', body: 'meatspace - dispatch tasks to physical hardware' }]

/** Plain-text man page served by `curl https://meatspace.sh/docs`. */
export function renderManText(): string {
  return `${MAN_TITLE}\n\n${MAN_SECTIONS.map((s) => `${s.title}\n${s.body.replace(/^/gm, '       ')}`).join('\n\n')}\n`
}
