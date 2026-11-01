/**
 * /concept: the v0.1 "middleware mechanics" strip, relabelled DESIGN IDEAS // NOT BUILT. Items 01 and 02 keep the
 * handoff copy and say what the simulator does; 03 (proof of physical work) is withdrawn and says so.
 */
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
        waypoints and ROS 2 action goals without exposing raw actuator controls. The simulator does the compile step; nothing is sent.
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
        motor spin-up. The simulator checks them at VALIDATE; no daemon was released.
      </>
    ),
  },
  {
    n: '03',
    title: 'Proof of Physical Work (PoPW): withdrawn',
    icon: Fingerprint,
    body: (
      <>
        v0.1 promised hardware TPM signatures on MCAP logs, flight logs and sensor frames, to &ldquo;guarantee zero synthetic spoofing&rdquo;. We never
        built it and withdrew the claim. The simulator&apos;s ATTEST step returns a hash of your request, nothing more.
      </>
    ),
  },
]

export function ArchitectureStrip() {
  return (
    <Panel id="architecture" title="DESIGN IDEAS // NOT BUILT">
      <ol className="grid grid-cols-1 gap-px bg-line md:grid-cols-3">
        {SPECS.map(({ n, title, icon: Icon, body }) => (
          <li key={n} className="bg-panel px-4 py-4 sm:px-5">
            <h3 className="flex items-start gap-2 text-[11px] leading-4 font-medium tracking-[0.14em] text-fg uppercase">
              <Icon size={14} strokeWidth={2} aria-hidden="true" className="mt-px shrink-0 text-muted" />
              <span>
                <span className="text-muted">{n} //</span> {title}
              </span>
            </h3>
            <p className="t-caption mt-3">{body}</p>
          </li>
        ))}
      </ol>
    </Panel>
  )
}
