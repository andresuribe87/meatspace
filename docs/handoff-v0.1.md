# Project Handoff: `meatspace.sh` — Initial Web Application (v0.1)

> Original product handoff, preserved as the source of truth for v0.1 (only change: a pasted markdown-link artifact in the install URL was normalised).
> Implementation decisions taken on top of it are listed in [`DECISIONS.md`](./DECISIONS.md).

## 1. Product Overview & Core Copy
* **Domain / Brand:** `meatspace.sh`
* **Tagline:** `stdout to reality.` (Sub-tagline: `dispatch tasks to physical hardware.`)
* **Value Proposition (Exact Copy):** "Autonomous hardware sits idle in proprietary silos for most of its lifecycle, while software agents have zero native way to discover, rent, or task physical machines across vendor boundaries. `meatspace.sh` exposes idle robots and autonomous fleets as pay-per-minute API endpoints, handling cross-vendor command translation, safety sandboxing, and cryptographic proof of execution in a single call."

## 2. Aesthetic & Design System (CRITICAL)
* **Anti-Pattern Warning:** NO startup marketing fluff, NO purple/blue SaaS gradients, NO rounded bubbly cards, NO stock photos of robots, NO glowing AI sparkles.
* **Visual Language:** Brutalist Unix man-page meets industrial telemetry dashboard. Dark mode only.
* **Color Palette:**
  * Background Primary: `#090A0C` ( Matte carbon)
  * Background Secondary / Panels: `#111318`
  * Borders: `1px solid #222630` (Sharp `0px` border-radius everywhere)
  * Text Primary: `#E2E8F0`
  * Text Muted: `#64748B`
  * Accent / Active Telemetry: `#10B981` (Terminal Emerald) and `#F59E0B` (Amber warning/bidding state)
* **Typography:** 100% Monospace (`JetBrains Mono`, `Fira Code`, or `IBM Plex Mono`) for headers, tables, and code; clean grotesk (`Inter` or system sans) only for the 2-sentence body description.

## 3. Page Architecture & Interactive Components
Build a single-page application (React + Tailwind CSS + Lucide icons) structured like an active clearinghouse terminal with four distinct zones:

### Zone A: Minimal Top Status Bar
* Left: `meatspace.sh // v0.1.4-alpha`
* Center (Live simulated ticker): `ACTIVE NODES: 1,408 | AVAILABLE FLIGHT/ACTUATION HRS: 924.2 | 24H SETTLED VOLUME: $142,890 USDC | NETWORK LATENCY: 18ms`
* Right: `[ DOCS ]` `[ CONNECT HARDWARE (meatspaced) ]` `[ API KEYS ]`

### Zone B: Split Hero (Left: Thesis & Install / Right: Interactive API Sandbox)
* **Left Column:**
  * H1: `stdout to reality.`
  * Body: Insert the exact 2-sentence Value Proposition from Section 1.
  * Daemon Quick-Install Snippet (with one-click copy button):
    ```bash
    # Register idle ROS 2 / MAVLink hardware node to the clearinghouse
    curl -sSL https://meatspace.sh/install.sh | sudo sh -s -- --protocol=mavlink --rtk-verify
    ```
* **Right Column (Interactive `curl` / JSON Dispatch Console):**
  * Tabs for 3 real-world robotics primitives:
    1. `AERIAL_ISR_SORTIE` (VTOL / Fixed-Wing thermal + EO/IR corridor scan)
    2. `SUBSTATION_THERMAL_SWEEP` (Quadruped / ROS 2 industrial rover inspection)
    3. `AUTOMATED_CNC_SYNTHESIS` (G-code / STEP file robotic cell dispatch)
  * Interactive `[ EXECUTE CALL ]` button that simulates a live state machine in the output console:
    * `00ms`: Validating GeoJSON polygon against node firmware geofence... `PASS`
    * `140ms`: Locking escrow ($42.50 USDC) & bidding on Node `VTOL-260-TX-04`... `ACCEPTED`
    * `380ms`: Compiling intent to MAVLink waypoint primitive... `DISPATCHED`
    * `800ms`: Returning TPM-signed telemetry stream hash (`0x9f8c...3a1b`).

### Zone C: Live Hardware Orderbook (Interactive Filtering Table)
A dense, filterable data table showing live idle robotic nodes available for immediate API tasking:
* **Columns:**
  * `NODE_ID` (e.g., `ORK-VTOL-09`, `SPOT-SUB-44`, `ARM-CELL-12`)
  * `CHASSIS_CLASS` (`Hybrid VTOL Fixed-Wing`, `Quadruped Rover`, `6-DOF Manipulator`)
  * `INTERFACE` (`MAVLink v2`, `ROS 2 Humble`, `VDA 5050`)
  * `COORDINATES /SECTOR` (e.g., `31.9686° N, 99.9018° W [Permian Basin]`, `51.9244° N, 4.4777° E [Port of Rotterdam]`)
  * `PAYLOAD / SENSORS` (`EO/IR + RTK-GPS`, `FLIR Thermal + LiDAR`, `Optical Micrometer`)
  * `BATTERY / DUTY` (Progress bar, e.g., `94% [DOCKED]`, `78% [IDLE]`)
  * `SPOT_RATE` (`$3.40 / min`, `$1.85 / min`, `$0.90 / min`)
  * `ACTION` (`[ TASK NODE ]` button — clicking it populates the JSON payload in Zone B with that specific node's ID and coordinates).

### Zone D: Architecture Strip (3-Column Technical Spec)
Three compact, border-grid boxes at the bottom explaining the middleware mechanics (1-2 sentences each):
1. **Intent-to-Primitive Compilation:** Translates high-level agent JSON schemas (`SCAN_CORRIDOR`, `INSPECT_ASSET`) into deterministic MAVLink waypoints and ROS 2 action goals without exposing raw actuator controls.
2. **Firmware Safety Envelopes:** Enforces hard local geofences, minimum altitude floors, and battery RTL reserves at the edge daemon (`meatspaced`) before motor spin-up.
3. **Proof of Physical Work (PoPW):** Hardware TPM cryptographic signatures attached to raw MCAP/ROS bags, RTK-GPS flight logs, and sensor frames to guarantee zero synthetic spoofing.

## 4. Technical Deliverables Required
1. Complete, self-contained, runnable codebase (React + Tailwind CSS).
2. Mock dataset of 8–10 realistic industrial/aerial robotic nodes in the orderbook with working category filters (`All`, `Aerial/VTOL`, `Ground/Rover`, `Manipulator/CNC`).
3. Working interactive state between the Orderbook table (`[ TASK NODE ]`) and the Hero API Sandbox.
