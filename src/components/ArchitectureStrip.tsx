/** Zone D: three-column technical spec of the middleware mechanics. Copy is verbatim from the handoff. */
import { Fingerprint, ShieldCheck, Workflow, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { Panel } from './ui'

/** A backticked term from the handoff. */
function Term({ children }: { children: string }) {
  return <code className="text-emerald">{children}</code>
}

interface Spec {
  n: string
  title: string
  icon: LucideIcon
  body: ReactNode
}

const SPECS: readonly Spec[] = [
  {
    n: '01',
    title: 'Intent-to-Primitive Compilation',
    icon: Workflow,
    body: (
      <>
        Translates high-level agent JSON schemas (<Term>SCAN_CORRIDOR</Term>, <Term>INSPECT_ASSET</Term>) into deterministic MAVLink
        waypoints and ROS 2 action goals without exposing raw actuator controls.
      </>
    ),
  },
  {
    n: '02',
    title: 'Firmware Safety Envelopes',
    icon: ShieldCheck,
    body: (
      <>
        Enforces hard local geofences, minimum altitude floors, and battery RTL reserves at the edge daemon (<Term>meatspaced</Term>) before
        motor spin-up.
      </>
    ),
  },
  {
    n: '03',
    title: 'Proof of Physical Work (PoPW)',
    icon: Fingerprint,
    body: (
      <>
        Hardware TPM cryptographic signatures attached to raw MCAP/ROS bags, RTK-GPS flight logs, and sensor frames to guarantee zero synthetic
        spoofing.
      </>
    ),
  },
]

export function ArchitectureStrip() {
  return (
    <Panel id="architecture" title="ARCHITECTURE // MIDDLEWARE MECHANICS">
      <ol className="grid grid-cols-1 gap-px bg-line md:grid-cols-3">
        {SPECS.map(({ n, title, icon: Icon, body }) => (
          <li key={n} className="bg-panel px-4 py-4 sm:px-5">
            <h3 className="flex items-start gap-2 text-[11px] leading-4 font-medium tracking-[0.14em] text-fg uppercase">
              <Icon size={14} strokeWidth={2} aria-hidden="true" className="mt-px shrink-0 text-muted" />
              <span>
                <span className="text-muted">{n} //</span> {title}
              </span>
            </h3>
            <p className="mt-3 text-[13px] leading-relaxed text-fg/80">{body}</p>
          </li>
        ))}
      </ol>
    </Panel>
  )
}
