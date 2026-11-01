import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type RefObject } from 'react'

/** Content-box width of an element, kept current with ResizeObserver. 0 until measured. */
export function useContainerWidth<T extends HTMLElement>(ref: RefObject<T | null>): number {
  const [w, setW] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => setW(Math.round(el.clientWidth))
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])
  return w
}

/**
 * A scroll container that overflows gets keyboard access and a name (WCAG 2.1.1): tabIndex 0,
 * role=region and an aria-label. When it stops overflowing the attributes go away again.
 */
export function useOverflowA11y<T extends HTMLElement>(ref: RefObject<T | null>, name: string, role: 'region' | null = 'region'): void {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => {
      const over = el.scrollWidth > el.clientWidth + 1
      if (over) {
        el.tabIndex = 0
        if (role) el.setAttribute('role', role)
        el.setAttribute('aria-label', name)
      } else {
        el.removeAttribute('tabindex')
        if (role) el.removeAttribute('role')
        el.removeAttribute('aria-label')
      }
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    for (const c of Array.from(el.children)) ro.observe(c)
    return () => ro.disconnect()
  }, [ref, name, role])
}

/** True while the user asks for reduced motion. */
export function useReducedMotion(): boolean {
  const [reduce, setReduce] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const on = () => setReduce(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return reduce
}

/**
 * Elapsed ms since `startedAt` (performance.now() or Date.now() epoch, see `clock`), updated while
 * visible. It measures something, so it may tick; it stops when the tab is hidden (WCAG 2.2.2).
 */
export function useElapsed(startedAt: number | null, clock: 'perf' | 'epoch' = 'perf', everyMs = 50): number {
  const now = useCallback(() => (clock === 'perf' ? performance.now() : Date.now()), [clock])
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    if (startedAt == null) return
    let id: number | undefined
    const tick = () => setElapsed(now() - startedAt)
    const start = () => {
      if (id === undefined) id = window.setInterval(tick, everyMs)
    }
    const stop = () => {
      window.clearInterval(id)
      id = undefined
    }
    const onVis = () => (document.hidden ? stop() : (tick(), start()))
    tick()
    if (!document.hidden) start()
    document.addEventListener('visibilitychange', onVis)
    return () => {
      stop()
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [startedAt, now, everyMs])
  return startedAt == null ? 0 : elapsed
}

export interface PlayheadGeometry {
  /** Left edge of the plotted time range, px from the playhead overlay's left edge. */
  x0: number
  /** Width of the full timebase in px (frame f sits at x0 + f / frames(full) * w). */
  w: number
  /** Frames that fit the full timebase (fullS * fps); may exceed the trace length. */
  fullFrames: number
}

export interface Playhead {
  idx: number
  setIdx: (i: number) => void
  /** Pointer is over the plot or keyboard focus is on the playhead: show the tooltip. */
  active: boolean
  focused: boolean
  bind: {
    onKeyDown: (e: KeyboardEvent<HTMLElement>) => void
    onPointerMove: (e: PointerEvent<HTMLElement>) => void
    onPointerDown: (e: PointerEvent<HTMLElement>) => void
    onPointerLeave: () => void
    onFocus: () => void
    onBlur: () => void
  }
}

/**
 * Playhead state for a plot: local to the figure, no global clock. Keys: ←/→ (and ↓/↑) one frame,
 * Shift ×15, PageUp/PageDown one second (fps frames), Home/End. Pointer hover and drag scrub;
 * leaving the plot returns the cursor to `home` unless the playhead has focus.
 */
export function usePlayhead(frames: number, fps: number, home: number, geom: RefObject<PlayheadGeometry | null>): Playhead {
  const clamp = useCallback((i: number) => Math.max(0, Math.min(frames - 1, Math.round(i))), [frames])
  const [raw, setRaw] = useState(home)
  // Derived, so a shorter trace after a data change never leaves the cursor out of range.
  const idx = clamp(raw)
  const [hover, setHover] = useState(false)
  const [focused, setFocused] = useState(false)
  const focusRef = useRef(false)
  const setIdx = useCallback((i: number) => setRaw(clamp(i)), [clamp])

  const fromPointer = useCallback(
    (e: PointerEvent<HTMLElement>) => {
      const g = geom.current
      if (!g || g.w <= 0) return
      const r = e.currentTarget.getBoundingClientRect()
      const x = e.clientX - r.left - g.x0
      setIdx((x / g.w) * (g.fullFrames - 1))
    },
    [geom, setIdx],
  )

  const bind = {
    onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
      const step = e.shiftKey ? 15 : 1
      let i = idx
      switch (e.key) {
        case 'ArrowLeft':
        case 'ArrowDown':
          i -= step
          break
        case 'ArrowRight':
        case 'ArrowUp':
          i += step
          break
        case 'PageUp':
          i += Math.round(fps)
          break
        case 'PageDown':
          i -= Math.round(fps)
          break
        case 'Home':
          i = 0
          break
        case 'End':
          i = frames - 1
          break
        default:
          return
      }
      e.preventDefault()
      setIdx(i)
    },
    onPointerMove: (e: PointerEvent<HTMLElement>) => {
      if (e.pointerType === 'mouse' || e.buttons) {
        setHover(true)
        fromPointer(e)
      }
    },
    onPointerDown: (e: PointerEvent<HTMLElement>) => {
      setHover(true)
      fromPointer(e)
    },
    onPointerLeave: () => {
      setHover(false)
      if (!focusRef.current) setIdx(home)
    },
    onFocus: () => {
      focusRef.current = true
      setFocused(true)
    },
    onBlur: () => {
      focusRef.current = false
      setFocused(false)
    },
  }
  return { idx, setIdx, active: hover || focused, focused, bind }
}

/** Remembers which element had focus when `open` turned true and puts focus back when it turns false. */
export function useFocusReturn(open: boolean): void {
  const opener = useRef<HTMLElement | null>(null)
  useEffect(() => {
    if (open) {
      opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
      return
    }
    const el = opener.current
    opener.current = null
    if (el && el.isConnected) el.focus({ preventScroll: true })
  }, [open])
}
