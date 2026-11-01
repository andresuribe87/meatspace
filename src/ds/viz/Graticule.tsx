import type { ReactNode } from 'react'

const px = (v: number) => Math.round(v) + 0.5

export interface GraticuleProps {
  x0: number
  w: number
  y0: number
  h: number
  /** x divisions (10, or 5 on a small screen). */
  nx: number
  /** y divisions. */
  ny: number
  /** Draw centre axes with 5 minor ticks per division (scope style). */
  axes?: boolean
  /** Label for horizontal line i (0 = bottom). Return '' for none. */
  yLabel?: (i: number) => string
}

/**
 * Oscilloscope graticule: major lines in --grat, frame in --grat-frame, centre axes and 5 minor ticks
 * per division in --grat-axis. Decorative (aria-hidden by the parent SVG's role=img).
 */
export function Graticule({ x0, w, y0, h, nx, ny, axes = true, yLabel }: GraticuleProps) {
  const lines: ReactNode[] = []
  for (let i = 0; i <= nx; i++) {
    const x = px(x0 + (i * w) / nx)
    lines.push(<line key={`v${i}`} x1={x} x2={x} y1={y0} y2={y0 + h} className={i === 0 || i === nx ? 'g-frame' : 'g-grat'} />)
  }
  for (let i = 0; i <= ny; i++) {
    const y = px(y0 + (i * h) / ny)
    lines.push(<line key={`h${i}`} x1={x0} x2={x0 + w} y1={y} y2={y} className={i === 0 || i === ny ? 'g-frame' : 'g-grat'} />)
  }
  if (axes) {
    const cx = px(x0 + w / 2)
    const cy = px(y0 + h / 2)
    lines.push(<line key="cx" x1={cx} x2={cx} y1={y0} y2={y0 + h} className="g-axis" />)
    lines.push(<line key="cy" x1={x0} x2={x0 + w} y1={cy} y2={cy} className="g-axis" />)
    for (let i = 1; i < nx * 5; i++) {
      if (i % 5 === 0) continue
      const x = px(x0 + (i * w) / (nx * 5))
      lines.push(<line key={`tx${i}`} x1={x} x2={x} y1={cy - 3} y2={cy + 3} className="g-axis" />)
      lines.push(<line key={`bx${i}`} x1={x} x2={x} y1={y0 + h - 3} y2={y0 + h} className="g-axis" />)
    }
    for (let i = 1; i < ny * 5; i++) {
      if (i % 5 === 0) continue
      const y = px(y0 + (i * h) / (ny * 5))
      lines.push(<line key={`ty${i}`} x1={cx - 3} x2={cx + 3} y1={y} y2={y} className="g-axis" />)
      lines.push(<line key={`ly${i}`} x1={x0} x2={x0 + 3} y1={y} y2={y} className="g-axis" />)
    }
  }
  const labels: ReactNode[] = []
  if (yLabel) {
    for (let i = 0; i <= ny; i++) {
      const s = yLabel(i)
      if (!s) continue
      labels.push(
        <text key={`l${i}`} x={x0 - 7} y={y0 + h - (i * h) / ny + 3.5} textAnchor="end">
          {s}
        </text>,
      )
    }
  }
  return (
    <>
      <g shapeRendering="crispEdges">{lines}</g>
      {labels}
    </>
  )
}

/** Square cursor marker with a 2px screen-coloured ring. Drawn stock, then cal, then real. */
export function CursorDot({ x, y, channel, size = 7 }: { x: number; y: number; channel: 'real' | 'stock' | 'cal'; size?: number }) {
  if (!Number.isFinite(y)) return null
  const r = size / 2
  return (
    <>
      <rect x={x - r - 1.5} y={y - r - 1.5} width={size + 3} height={size + 3} className="f-screen" />
      <rect x={x - r} y={y - r} width={size} height={size} className={`f-${channel}`} />
    </>
  )
}
