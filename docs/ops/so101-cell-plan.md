# SO-101 physical cell plan: `so101-pick-v1`

**Status:** plan only. Nothing is purchased. Build starts only after **at least $3k is committed** (founder decision 2). A Franka waits for a $10k LOI.

**Prices** were checked on the linked pages on **2026-11-01**. They are in USD and exclude shipping and tax. Rows marked *unverified* are estimates; check them before ordering.


## 0. Check two alternatives before buying

The T1 outreach may make an owned cell unnecessary for the first pilots.

1. **Armnet** (armnet.dev) runs a cloud SO-101 arm farm for model evaluation (ArmnetBench v0.1, https://arxiv.org/abs/2607.24481, 2,518 rollouts).
2. **RobotReplica Site 01** (UT Dallas SO-101) accepts evaluation requests. It is non-commercial, so terms for a company are unknown.

**Rule:**
- If either quotes a 200-episode batch on a fixed scene within about 2 weeks, run the first paid pilots there.
- Buy our own cell only when (a) committed demand exceeds what they will sell, or (b) we need a scene and twin we control.

The twin-first story needs **our** twin to match **a** real cell. A cell we rent can work if we calibrate a twin for it.

## 1. Bill of materials

### 1a. Core, verified

| # | Item | Qty | Unit | Total | Link |
|---|---|---|---|---|---|
| 1 | **Seeed SO-101 Pro Unassembled Bundle**: 12 STS3215 servos (leader on 7.4V, follower on 12V), 3D-printed parts, RGB USB camera (100°, 720p, used as wrist camera), 5V and 12V supply cables, USB-C cable, 4 fixing clips (table clamps) | 1 | $309.80 | $309.80 | https://www.seeedstudio.com/SO-ARM101-Pro-Unassembled-Bundle.html |
| 2 | Spare Feetech ST3215-C047 12V servo (add-on on the bundle page) | 2 | $22.00 | $44.00 | same page, "Servo Motor" add-ons |
| 3 | Logitech C920s PRO webcam, for the overhead and side views. It allows manual focus and exposure, so lock both. | 2 | $69.99 | $139.98 | https://www.logitech.com/en-us/shop/p/c920s-pro-hd-webcam |
| 4 | Emergency stop: 22mm latching red mushroom switch, 2NC, wired in series with the follower's 12V supply | 1 | $49.98 | $49.98 | https://vxb.com/products/red-mushroom-emergency-stop-push-button-switch-22m |
| 5 | CyberPower SX650U UPS, so a brownout doesn't corrupt a run mid-episode | 1 | $84.99 | $84.99 | https://www.cyberpowersystems.com/product/ups/battery-backup/sx650u/ |
| 6 | IKEA LAGKAPTEN tabletop, 55 1/8 × 23 5/8 in, as the dedicated bench | 1 | $49.99 | $49.99 | https://www.ikea.com/us/en/p/lagkapten-tabletop-white-40460815/ |
| 7 | IKEA ADILS leg | 4 | $7.50 | $30.00 | https://www.ikea.com/us/en/p/adils-leg-black-70217973/ |
| 8 | IKEA TERTIAL work lamp, for fixed, repeatable lighting (bulb sold separately, price unverified) | 2 | $19.99 | $39.98 | https://www.ikea.com/us/en/p/tertial-work-lamp-dark-gray-20355434/ |
| | **Core subtotal** | | | **$748.72** | |

**Alternatives** on the same store:
- Motor-only Pro kit, $277.99 (https://www.seeedstudio.com/SO-101-Low-Cost-AI-Arm-Kit-Pro-p-6427.html), plus printed parts, $30.99 (https://www.seeedstudio.com/SO-101-3D-printed-Enclosure-p-6428.html). This option has no camera.
- Pre-assembled Pro arm, $315.99 (https://www.seeedstudio.com/SO-101-Assembled-Kit-Pro-p-6691.html). The page lists six servos and a BusLinker board, so treat it as a follower only. Buy it as a second follower when going to 3 cells.
- 1080p USB camera modules (ET-S231), $52 (90°) or $64 (120°), as add-ons on the bundle page. Use one if the 720p wrist camera is too soft.

**Kit pinouts and voltages** (from the Seeed wiki, https://wiki.seeedstudio.com/lerobot_so100m_new/):
- The leader uses C044, C001 and C046 7.4V servos on 5V.
- The Pro follower uses 12V servos (C018 or C047).
- Never connect 12V to the leader bus.

### 1b. Host computer (pick one)

The policy never runs on our machine: the customer hosts a policy server. The host computer only runs the robot client, the cameras, the recorder and the supervisor.

| Option | Price | Link | Note |
|---|---|---|---|
| A. Existing Linux laptop | $0 | — | Fine for weeks 1–3 |
| B. Raspberry Pi 5, 8 GB + official 27W PSU | $175.00 + $14.04 | https://www.pishop.us/product/raspberry-pi-5-8gb/ , https://www.adafruit.com/product/5814 | Tight for 3 cameras plus video encoding; microSD/SSD unverified |
| C. Beelink EQ14 (N150, 16 GB, 500 GB SSD) | $385.00 | https://www.bee-link.com/products/beelink-eq14-n150 | **Recommended** once paid pilots start. Note: 2026 memory prices make this cost more than its 2024 launch price |

### 1c. Small parts, unverified estimates (about $80–150)

- Single-hole 22mm pushbutton enclosure for the e-stop.
- 2 clamp-on camera arms.
- Powered USB 3 hub, since 3 cameras plus the servo bus is too many for one controller.
- Neoprene or foam bench mat.
- Cat6 cable.
- Filament for the reset funnel, tray and cubes.
- 2 LED bulbs.
- A ChArUco target: print it on foam board for about $0, or buy calib.io's 300×200 mm aluminium target for $120 if accuracy matters (https://calib.io/products/charuco-targets, verified).

### 1d. Totals

| Configuration | Total |
|---|---|
| **Minimal** (bundle + 2 spare servos + 1 webcam + e-stop; existing laptop and desk) | **$473.77** + small parts |
| **Recommended** (core + Pi 5 option B) | **$937.76** + about $100 small parts, roughly **$1.04k** |
| **Recommended with mini PC** (core + option C) | **$1,133.72** + about $100, roughly **$1.23k** |

The "~$250 cell" in the decision log covers the arm kit alone. A cell that can produce citable results costs about **$0.5–1.2k**, still well inside the $3k gate. Going to 3 identical cells for a noise floor adds roughly $500 per cell: a second follower arm, 2 webcams and a hub.

## 2. Fixturing and scene (`SO101_PICK_PLACE_CUBE`)

- **Bench:** clamp the follower with the kit's 4 fixing clips at a marked origin, 15 cm from the bench edge. Mark the base outline in tape, and photograph it at every recalibration.
- **Leader arm:** keep it on the same bench, clamped and **unpowered** during verification runs. It is used only for teleop demos and for authoring reset scripts.
- **Scene:**
  - A matte neoprene mat with a 20 × 20 cm printed start region, 1 cm grid.
  - One 3D-printed 25 mm cube in a saturated colour, with an ArUco marker on one face.
  - One target bin.
  - Everything that defines the scene goes into the twin package: all dimensions, colours, and the mat texture photo.
- **Lighting:** 2 lamps at fixed, marked positions, and blackout from windows. Daylight drift is the most common uncontrolled variable in tabletop vision.
- **Cameras:**
  - Overhead C920s on a clamp arm, about 70 cm above the start region.
  - Side C920s at 45°.
  - The kit's wrist camera.
  - Lock focus, exposure and white balance with `v4l2-ctl`, and store the settings in the cell manifest.
  - Run all cameras at 30 fps, 640×480 (the LeRobot default class), and record at that rate.

## 3. Reset approach (staged)

1. **Weeks 1–3: human reset (concierge).**
   - The operator places the cube at a start pose drawn from a seeded RNG, using the printed grid.
   - The supervisor shows the target pose overlaid on the overhead camera, and the operator confirms.
   - Measure the median reset time and the operator minutes per episode. This is our first real cost number.
2. **Week 4 onward: gravity funnel plus scripted reset.**
   - The bin is a 3D-printed funnel whose chute drops the cube into a fixed "home pocket" at a known pose.
   - A scripted, replayed joint trajectory picks the cube from the pocket. A known pose makes this grasp highly reliable.
   - The script places the cube at the next RNG-sampled start pose and logs it as the episode's initial state, which gives randomized initial states for the statistics.
   - If the cube is not in the pocket (a failed episode), the overhead camera locates it by colour or ArUco. If it is reachable, a scripted pick at the detected pose runs. If not, the queue pauses with `NEEDS_HUMAN`.
   - **Bar:** don't call it "auto-reset" publicly until it runs **at most 1 human intervention per 50 episodes over 200 consecutive episodes**. AutoEval's precedent is auto-reset plus a success detector, at about 500–850 episodes per 24 hours per cell.
3. **Success detection.**
   - The overhead camera checks for the cube inside the bin's region of interest at episode end, using ArUco pose plus colour, which is classical CV.
   - Validate against **200 human-labeled episodes** before trusting it, and report its confusion matrix in every report.
   - Audit a random 10% of episodes by a human each week.
   - Optionally use RoboJev (https://arxiv.org/abs/2610.33718), an open 27B SO-101 success judge, as an offline second opinion. It is not the primary scorer.
4. **Duty cycle.** Monitor servo `Present_Temperature`. Rest the arm on a fixed schedule; AutoEval rests 20 minutes every 6 hours. Start conservatively at 10 minutes per hour and loosen it based on temperature logs.

## 4. Safety

**The hazards.** STS3215 hobby servos are low force but still a hazard:
- Pinch points at the gripper and elbow.
- A dropped cube.
- Cable snag.
- Thermal faults in servos or supplies.

There are no lithium packs in the cell.

1. **Physical controls.**
   - Mark the work envelope in tape (about 45 cm radius). No hands inside it while the follower has torque.
   - The e-stop cuts the follower's 12V supply. The arm then goes limp and sags onto the mat, so keep the mat under the whole envelope.
   - Put a smoke detector in the room. Do not run unattended until two weeks of supervised runs show no fault.
2. **Firmware and driver limits.**
   - LeRobot's SO follower config has **`max_relative_target`**, a per-step cap on commanded motion (https://github.com/huggingface/lerobot/blob/main/src/lerobot/robots/so_follower/config_so_follower.py). Set it for every run, and log every clamp.
   - LeRobot already writes `Max_Torque_Limit`, `Protection_Current` and `Overload_Torque` on the gripper. Confirm those values per servo at startup, and record them in the cell manifest.
3. **Supervisor (`meatspaced`).**
   - Soft joint limits narrower than the MJCF ranges.
   - A policy heartbeat: if N consecutive action deadlines are missed, hold position, then release torque.
   - Trip on temperature and current thresholds.
   - A workspace box check on forward kinematics.
   - **Report every safety-clamp count** (memo section 5): clamps change outcomes.
4. **Network and IP.**
   - Outbound-only connections to customer policy servers. No inbound ports.
   - Ops access over Tailscale or Cloudflare Tunnel.
   - **No customer code or weights on our machines.**
   - Cameras see only the bench, and there is no audio.

## 5. Software stack

- **OS and runtime:** Ubuntu 24.04 LTS, Python 3.12.
- **LeRobot**, pinned to a commit:
  - `so101_follower` driver.
  - Calibration (`lerobot-calibrate`).
  - Recording to **LeRobotDataset v3**.
  - **Async inference**: `python -m lerobot.async_inference.robot_client` on our side, connecting to the customer's `PolicyServer` (https://huggingface.co/docs/lerobot/async). This matches the AutoEval, RoboArena and RoboChallenge pattern where the customer hosts the policy.
- **Twin:** the MuJoCo Menagerie `robotstudio_so101` scene, extended with our bench, cube and bin, plus the **calibrated twin package** from `lab/`. The same task ID and the same request schema run in `mode: sim` and `mode: real`.
- **`meatspaced` supervisor (Python):**
  - Job queue that pulls from the existing Cloudflare Worker API (`POST /v1/trials`).
  - Reset scripts and the success detector.
  - Clamps and watchdog.
  - MCAP and video capture.
  - Uploads to R2.
- **Reports:**
  - `lab/` metrics: Wilson CIs, sim-vs-real delta, MDE, lag histogram.
  - An **Ed25519-signed manifest** of artifact hashes, with no "TPM" language.
  - NDJSON progress events over the existing streaming API.

## 6. Calibration

1. **Motors.** Run `lerobot-calibrate` once at assembly. Hash the calibration JSON and publish it in the twin package. LeRobot writes a servo `P_Coefficient` (`position_p_coefficient`); record the actual value, because it is the real-side gain the twin's kp stands in for.
2. **Cameras.** Calibrate intrinsics per camera and extrinsics against the arm base with a ChArUco board (OpenCV). Redo extrinsics whenever a camera mount is touched.
3. **Twin system identification**, using the existing `lab/` pipeline on **our own** cell:
   - Record per-joint excitation (steps and chirps at 3 amplitudes) plus 50 replayed pick-place trajectories.
   - Fit kp, damping, armature, friction loss and delay on the train split. Report held-out RMSE and lag.
   - Publish `so101-pick-v1` twin package **v1** with its hash.
   - Compare the fitted parameters with the five public-dataset fits.
4. **Drift checks.**
   - Weekly: a 10-minute fixed-trajectory replay. Alert if held-out RMSE exceeds the published value by more than 50%. Also re-run after any servo swap.
   - Weekly: 50 episodes of a frozen reference policy (scripted plus one ACT checkpoint) to track the success-rate noise floor.
   - Bump the twin version on any recalibration. Reports cite the version they ran against.

## 7. Space and power

- **Footprint:** a 1.4 × 0.6 m bench plus 1 m of clear space around it, in a room with stable temperature and blackout.
- **Power draw** is well under 200 W in total:
  - Follower 12V at 2A.
  - Leader 5V at 4A (per Seeed), used only for teleop.
  - Host 10–25 W.
  - Two lamps.

  One ordinary 15A circuit is enough. Put everything except the lamps on the UPS.
- **Network:** wired Ethernet with at least 20 Mbps upstream for three camera previews. Measure round-trip time to each customer policy server, and report it, because latency is a reported field.
- **Location options:** the founder's home office, a coworking or makerspace bench, or a partner lab (memo phase 1, "managed cell"). Insurance cost and terms differ between these, so ask the broker before choosing.

## 8. Insurance and liability questions for a broker

1. If the cell is at home: does my homeowner's or renter's policy exclude business property and business activity? Do I need a home-business endorsement or a business owner's policy (BOP)?
2. **General liability:** am I covered for third-party bodily injury or property damage from a robot cell? For example, a visitor, or a partner's site if the cell moves there. Does the policy exclude "robotics" or "remote operation by third parties"?
3. **Professional liability / E&O:** what happens if a customer relies on a verification report (success rates, signed manifest) that turns out wrong, and claims financial loss? What limits and premiums apply at $1M/$1M?
4. **Tech E&O and cyber:** we accept remote jobs and connect out to customers' policy servers, and we store their videos and datasets. Is a breach, or a malicious job, covered?
5. **Equipment / inland marine:** is it worth insuring about $1–1.2k of hardware, or should we self-insure?
6. **Contracts:** which limitation-of-liability and indemnity clauses should the terms of service include, for example a cap at fees paid, no consequential damages, and "results are statistical estimates"? Will the insurer require specific wording?
7. **Hosting:** if a partner lab hosts the cell, who carries the risk, and do we need additional-insured endorsements?
8. **Employees:** if we hire a part-time operator, what do workers' comp and payroll require in our state?
9. **Specialists:** are there brokers or carriers who write specialty robotics general liability (memo cites Koop's 2022 product, which does not address shared robots)? Get at least 2 quotes before Gate 1 spend.

## 9. Week-by-week setup, after the gate

| Week | Work | Exit criterion |
|---|---|---|
| −1 (gate hit) | T1 answers in: decide own cell vs Armnet/RobotReplica capacity. Get 2 insurance quotes. Pick the location. Order items 1–8 (Seeed US warehouse) and the host computer. | Order placed; insurance bound or explicitly waived for the concierge phase |
| 1 | Assemble both arms, run motor setup and calibration, and do a teleop sanity check. Build the bench, tape the envelope, wire and test the e-stop. Mount and lock the cameras. | Teleop for 30 minutes with no faults; the e-stop cuts torque in under 1 s |
| 2 | Pin LeRobot. Get the async robot client running against our own test PolicyServer (ACT trained on 50 of our own demos). Get recording (LeRobotDataset v3, MCAP, video) and `meatspaced` v0 (watchdog, clamps, logs) working. Run 50 human-reset episodes. | Median reset time and operator minutes per episode measured |
| 3 | Twin calibration on our cell: excitation runs, sysid, held-out validation, camera extrinsics, and the MuJoCo scene of the bench. Publish twin package v1 and a gap report for **our** cell. | Held-out sim-vs-real RMSE published with CIs |
| 4 | Print the funnel and pocket. Write the scripted reset. Success detector v0, validated on 200 labeled episodes. Run 200 reference-policy episodes as the noise floor. | At most 1 intervention per 50 episodes over 200; detector accuracy and confusion matrix published |
| 5 | First concierge pilots for committed customers: 50-trial batches, 72-hour SLA, signed manifests, twin-vs-real delta. | Pilots delivered on time; customer feedback logged in the tracker |
| 6 | Review: cost per episode, operator minutes per episode, uptime, re-submission intent. Decide among: 3 identical cells (noise floor), staying at 1, or moving supply to a partner. | Written decision against the memo's day-90 bar |

**Stop rules during setup:**
- If the auto-reset can't meet its bar by week 6, keep selling concierge batches at human-reset cost and price them that way.
- If week-3 calibration shows our cell's twin gap is far larger than the public-dataset fits, publish that result. It is a finding, not a failure.
