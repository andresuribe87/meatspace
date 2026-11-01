# meatspace lab: Twin Gap Report (v2)

Python tooling for sim-to-real verification. It is separate from the TypeScript app (`src/`, `worker/`, ...) and has no build-time coupling to it.

The **Twin Gap Report** answers one question for a public real-robot dataset: *how far does the robot's published MuJoCo twin diverge from the real robot, and how much of that gap does a calibrated twin close on episodes it never saw, compared with a model that has no physics at all?*

1. Load a LeRobot-format dataset from the Hugging Face Hub, pinned to a commit sha. Only the tabular data is downloaded, never the videos.
2. Split the episodes three ways: **fit**, **interleaved held-out** (random episodes from the same period) and **future block** (the last 20% by episode index, recorded after every fit episode).
3. Verify units and the joint mapping on the fit episodes only (see *Units*, *Mapping*), then check that the held-out episodes agree.
4. Replay every recorded command open-loop in the matching [MuJoCo Menagerie](https://github.com/google-deepmind/mujoco_menagerie) twin, pinned to a commit.
5. Fit a calibrated twin on the fit episodes (system identification), and a physics-free lag-filter baseline on the same episodes.
6. Report stock, aligned-stock, baseline and calibrated models on both held-out sets, with bootstrap CIs over episodes, plus identifiability, forward-kinematics and gravity-sag audits.

Results for every run: [`reports/INDEX.md`](reports/INDEX.md). The candidate pool and the selection rule: [`reports/candidates.json`](reports/candidates.json).

## v2 results (held-out; CIs, lags and fit diagnostics in INDEX.md)

All 23 compatible candidates were run with one configuration: 18 reported, 5 unsupported (below). Five large datasets were capped at their first 200 episodes (Chojins 577, Loki0929 800, VoicAndrei 1801, shylee 300, cagataydev 210). Values are held-out sim-vs-real joint RMSE in degrees (mean over the 5 arm joints, then over episodes). Change = calibrated/reference - 1, paired by episode, [95% bootstrap CI]; **negative = better**. "Baseline" is the physics-free lag filter. The verdict thresholds ("most" ≤ -50%, "part" ≤ -20%, CI must exclude 0) were fixed before the batch was run.

| dataset (twin) | future: stock / baseline / calibrated | change vs stock | vs baseline | interleaved: stock / baseline / calibrated | change vs stock | vs baseline |
|---|---|---|---|---|---|---|
| 00ri/so100_battery (so_arm100) | 0.57 / 0.49 / 0.34 | -41% [-43, -38] | -31% [-33, -28] | 0.56 / 0.49 / 0.33 | -41% [-44, -39] | -33% [-36, -29] |
| aaronsu11/so100_instrument (so_arm100) | 0.94 / 0.63 / 0.58 | -39% [-44, -33] | -8% [-11, -4] | 1.22 / 0.89 / 0.76 | -38% [-52, -18] | -15% [-20, -10] |
| Aneysait/so101_pick_red_all (so101) | 4.18 / 1.00 / 0.68 | -84% [-84, -83] | -32% [-34, -30] | 3.97 / 1.00 / 0.69 | -83% [-83, -82] | -31% [-32, -30] |
| apayan/so100_ball8 (so_arm100) | 0.71 / 0.70 / 0.48 | -33% [-37, -29] | -31% [-35, -28] | 0.69 / 0.66 / 0.43 | -38% [-39, -36] | -35% [-37, -33] |
| cagataydev/so101-tic-tac-toe (so101) | 2.82 / 0.69 / 0.38 | -87% [-88, -85] | -46% [-49, -43] | 2.66 / 0.64 / 0.39 | -85% [-87, -83] | -39% [-42, -35] |
| CarolinePascal/plug_socket_moved (so_arm100) | 3.39 / 3.30 / 3.42 | +1% [-1, +4] | +4% [+0, +7] | 3.38 / 3.30 / 3.39 | +0% [-3, +4] | +3% [+0, +5] |
| Chojins/chess_game_001_blue_stereo (so_arm100) | 1.12 / 1.18 / 1.10 | -2% [-21, +21] | -6% [-11, -3] | 1.07 / 0.96 / 0.90 | -16% [-21, -9] | -6% [-9, -4] |
| hungho77/so101_left_arm_pick_red_cube_into_pot (so101) | 3.02 / 0.77 / 0.47 | -84% [-88, -79] | -39% [-46, -31] | 2.85 / 0.73 / 0.45 | -84% [-87, -80] | -39% [-44, -32] |
| IlyaGusev/so101_pick_gum (so101) | 5.63 / 1.69 / 1.33 | -76% [-80, -72] | -21% [-25, -18] | 4.19 / 1.34 / 0.93 | -78% [-80, -75] | -30% [-34, -26] |
| jccj/so100_block_in_cup (so_arm100) | 0.90 / 0.76 / 0.62 | -31% [-36, -26] | -18% [-20, -16] | 0.81 / 0.64 / 0.48 | -41% [-48, -33] | -25% [-30, -21] |
| julyfun/so100_pick_and_place_v4_50 (so_arm100) | 1.64 / 0.52 / 0.37 | -77% [-79, -76] | -28% [-32, -25] | 1.67 / 0.55 / 0.38 | -77% [-79, -75] | -30% [-33, -27] |
| lerobot/svla_so101_pickplace (so101) | 5.35 / 0.63 / 0.46 | -91% [-92, -91] | -28% [-32, -24] | 5.00 / 0.64 / 0.43 | -91% [-92, -91] | -33% [-37, -29] |
| Loki0929/so100_lan (so_arm100) | 1.71 / 1.05 / 0.89 | -48% [-49, -46] | -15% [-17, -13] | 1.78 / 1.16 / 1.04 | -42% [-43, -40] | -11% [-12, -10] |
| samsitol/so100_PnPacorn (so_arm100) | 1.47 / 1.01 / 0.93 | -37% [-39, -34] | -8% [-9, -6] | 1.54 / 1.03 / 0.87 | -43% [-45, -41] | -15% [-17, -13] |
| shubham4413/so100_smolvla_rc (so_arm100) | 2.06 / 1.44 / 1.14 | -45% [-47, -42] | -21% [-24, -18] | 1.98 / 1.48 / 1.20 | -40% [-41, -38] | -19% [-20, -17] |
| shylee/so100_pengripG (so_arm100) | 1.18 / 0.83 / 0.62 | -47% [-49, -45] | -25% [-27, -23] | 1.16 / 0.82 / 0.62 | -46% [-48, -45] | -24% [-26, -23] |
| VoicAndrei/so100_kitchen (so_arm100) | 1.98 / 1.25 / 1.09 | -45% [-46, -44] | -13% [-14, -12] | 1.86 / 1.29 / 1.09 | -41% [-42, -40] | -16% [-16, -15] |
| xsatvik/mixer_on_off_new_1 (so_arm100) | 1.55 / 1.22 / 1.08 | -30% [-34, -27] | -11% [-14, -8] | 1.72 / 1.39 / 1.27 | -26% [-29, -23] | -8% [-11, -6] |

1. **The stock SO-101 twin is far too fast, and calibration fixes most of it on all 5 SO-101 datasets that passed the checks (5 owners).**
   - Stock `robotstudio_so101` (kp = 998 N m/rad) follows commands within about one frame (25-48 ms of measured lag), while the real arms lag 112-179 ms.
   - Calibration closes 76-91% of the future-block gap and beats the lag-filter baseline by 21-46%.
   - The largest per-joint lag mismatch drops from 101-152 ms to 5-15 ms.
   - The fitted servo bandwidth (natural frequency) is 2.2-4.0 Hz.
2. **The stock SO-100 twin (`trs_so_arm100`) is much closer, and calibration helps less.** Of 13 datasets:
   - It closes *part* of the future-block gap on 10 (-30% to -48%) and most of it on 1 (julyfun, -77%).
   - It makes **no clear change on 2**: CarolinePascal (+1% [-1, +4], and *worse* than the baseline), and Chojins (-2% [-21, +21]). On Chojins, 36 of 40 episodes improve (median -24%), but 3 get much worse (episode 193: 1.86° → 5.13°).
   - The margin over the baseline is modest: -6% to -31%, and +4% (worse) on CarolinePascal.
3. **Much of v1's "-50% to -92% vs stock" was lag that a black-box filter also captures.** The calibrated twin beats the 3-parameter-per-joint lag filter on 17 of 18 future blocks, but by only 6-46%. Where physics clearly earns its keep is quasi-static holds: on the static-frame metric the calibrated twin beats the baseline on 14 of the 15 datasets that have static frames, because gravity sag depends on pose.
4. **Negative and unresolved results.**
   - CarolinePascal/plug_socket_moved: frictionloss is pinned at its 1 N m bound on every joint, and the real robot's own command-tracking error is 4.8°. The arm is pushing against the world (plug insertion), which a contact-free replay cannot model.
   - Static sag is still a model failure. On the future block, the calibrated twin's final-pose elbow error is larger than stock on 12 of 18 datasets by point estimate, and the CIs separate on 5. Its static-frame error is larger than stock on 4.
   - Where the gravity audit is testable, the implied static shoulder_lift stiffness is 24-136 N m/rad, against fitted kp of 10-21: the ideal PD actuator cannot match dynamic lag and static sag at once.
5. **Individual gains are not the claim.** v1's "kp ≈ 4-51 N m/rad, the twins agree" is withdrawn. With armature fixed, kp and kv are identified on most joints, but on 11 of 18 datasets at least one gain is identified only in combination with others (marginal/conditional std ratio ≥ 10). That is mostly shoulder_pan and wrist_roll, whose gravity load barely varies. Read the natural frequency and damping ratio instead.
6. **lerobot/svla_so100_pickplace is no longer reported.**
   - It fails the unchanged mapping gate on its fit episodes: shoulder_lift exceeds the MJCF limit by 28° at p99, against a 20° tolerance.
   - It passes on all episodes (17°) and on the held-out ones (3°), so the gate is fragile for this dataset. v1 passed it with a different random subset (17°).
   - Independent evidence points the same way: under the documented mapping, forward kinematics put the gripper more than 2 cm below the base on 24% of frames (p1 -13 cm). v1's svla_so100 numbers therefore rest on an unverified mapping.
7. **Other unsupported datasets.** youliangtan/so100_strawberry_grape is still rejected (pan range 25° outside the convention). Three legacy-calibrated SO-101 datasets (Jeevesh2009, siyavash, sincostangerines) have no documented mapping onto `robotstudio_so101`.
8. **Units.** svla_so101's normalized units are recovered exactly as in v1 (2505 / 2388 / 2231 / 2359 / 4095 ticks). On every dataset the held-out episodes agree with the fit episodes on units, and the mapping gate agrees across subsets everywhere except svla_so100.

**v1 → v2 on the datasets in both** (future block, calibrated): svla_so101 0.41 → 0.46° (-91%), hungho77 0.43 → 0.47° (-84%), IlyaGusev 1.17 → 1.33° (-76%), 00ri 0.29 → 0.34° (-41%, was -50%). v1's numbers were interleaved-only, with 40 train episodes, fitted offsets and train-range limits. In the reviewer's chronological re-run of v1's code (last 10 episodes held out), svla_so101 reached 0.81°, mostly wrist_roll clipped at a train-range limit; v2's limit envelope removes that degradation.

## What changed in v2, and why

v1 was reviewed for methodology and reproducibility. Every finding below was checked before it was fixed; the reports were then regenerated with one configuration.

| review finding | what v2 does |
|---|---|
| Undisclosed dataset selection: 6 of 23 compatible datasets reported, no rule; one unreported dataset improves by only 11% | Every scan-ok candidate in the pool is run and listed in INDEX.md whatever its result (`reports/candidates.json`). The verdict is effect-size aware: "closes most / part of the gap", "small improvement; most of the gap remains", "no clear change", "WORSE". |
| Held-out episodes were interleaved with train only; on a chronological split the error doubled, because joint limits were set from the train motion | Every report has a **future block** (the last 20% of episodes) as well as an interleaved set. Limits the fit data falsify are released instead of being set to the train range. Workspace novelty and clipping are reported per held-out set. |
| kp, kv and armature were not individually identified; the one-at-a-time sensitivity table overstated them; svla_so101's fit had not converged | Armature is fixed at stock. An eigen/VIF analysis and a linearised episode bootstrap replace the sensitivity table, and natural frequency and damping ratio are reported with CIs. Convergence is recorded and flagged. The "kp ≈ 4-51, twins agree" claim is dropped. |
| Zero offsets were unidentified, stuck at ±20° unflagged, and worsened forward kinematics | Offsets are not fitted (documented convention). Bound flags use real tolerances. Every report includes an FK plausibility check. |
| No physics-free baseline | A per-joint lag filter (3 parameters per joint) is fitted on the same episodes, and "vs baseline" is reported everywhere, plus a static-frame (gravity-sag) metric that the baseline cannot fake. |
| The alignment convention was misstated for legacy data; the timestamp check was vacuous | The convention is stated per LeRobot generation (legacy: act-then-observe); timestamps are recorded as nominal. |
| Means hid outliers; lag was compared as a median over joints, in frames | The median and range of the per-episode change are shown, and lag is given per joint in ms with the largest mismatch. |
| The gravity audit mixed a centred correlation with an uncentred slope and included table-contact frames | Centred regression; frames within 3 cm of the base plane are excluded; power is reported; "not testable" when uninformative. |
| Minor leakage: units detected on all episodes; wrong "held-out" label; unused train episodes not evaluated | Units and the mapping are decided on the fit episodes, and held-out agreement is reported. Labels are per set. Unused train episodes join the interleaved held-out set. |
| lab/ not in git; no code identity in reports | `meatspace_lab` 2.0.0 writes schema `twin-gap-report/v2`, and `environment.code_sha256` (source hash) plus every package version, CPU and BLAS kernel. lab/ is still uncommitted: remove the temporary `lab/` line from `.git/info/exclude` and `git add lab` (lab/.gitignore keeps `.venv/` and `.cache/` out). |
| content_sha256 changed across CPUs and Python versions | Absolute-precision rounding; a separate env-independent `results_sha256`; a `verify` subcommand; measured cross-kernel behaviour (above). |
| Only direct dependencies pinned | `requirements.lock`: every package, exact version and sha256. |
| "Final pose worse on 3 datasets" (really 4/5 by point estimate); two sign conventions for "change"; inconsistent runtimes; README nits | The criterion is stated (point estimate and CI separation). "Change" is negative = better everywhere. One measured runtime with hardware. `render`/`verify` are documented. `fetch_menagerie.sh` fails loudly. |


## Layout

```
meatspace_lab/
  data.py        Hub loading at a pinned revision sha (LeRobot v2.0/v2.1/v3.0), per-file sha256, episode checks,
                 timestamp-vs-nominal record
  units.py       unit/convention detection from the encoder-tick lattice; conversion to physical degrees
  twin.py        twin registry + documented joint mappings, parameter overrides (MjModel and MjSpec),
                 calibrated-twin package (JSON + sha256), MJCF export, range-based sign checks
  replay.py      open-loop replay (batched mujoco.rollout + a plain mj_step reference implementation)
  metrics.py     RMSE, lag estimator, episode bootstrap, paired change (negative = better)
  sysid.py       fit / interleaved / future split, joint-limit envelope, bounded least-squares system
                 identification, identifiability analysis (eigen/VIF, linearised episode bootstrap)
  baseline.py    physics-free per-joint lag filter (3 parameters per joint)
  kinematics.py  forward-kinematics plausibility (table clearance, rest on a stop)
  audit.py       gravity-sag consistency check of the mapping
  report.py      pipeline + report.json / report.md writers, environment and code identity, hashes
  plots.py       dependency-free SVG plots (light/dark)
  index.py       reports/INDEX.md (all reports + the whole candidate pool)
  trace.py       per-frame trace of a report's representative held-out episode (re-runs and checks its replay)
  cli.py         python -m meatspace_lab {report,scan,export-twin,export-trace,render,index,verify}
tests/           pytest (toy twin; no network needed)
reports/         committed reports, one directory per dataset, INDEX.md, candidates.json
scripts/         fetch_menagerie.sh (pinned twins), run_all.sh (regenerate every report)
requirements.txt direct dependencies, exact pins; requirements.lock: every package, exact pins + sha256 hashes
```

## Reproduce

```bash
cd lab
python3 -m venv .venv && .venv/bin/pip install --require-hashes -r requirements.lock   # full lock (or requirements.txt)
scripts/fetch_menagerie.sh                 # Menagerie @ b0655057a9df2abe39ea7fc989914ba6f248301c -> .cache/menagerie
.venv/bin/python -m pytest -q              # all tests, ~30 s, no network
# one report, into a scratch directory (the committed one stays untouched), then compare:
.venv/bin/python -m meatspace_lab report \
    --dataset lerobot/svla_so101_pickplace --revision f641879e22172be7e8161d5e6c1503c2d2feb657 \
    --twin .cache/menagerie/robotstudio_so101 --out /tmp/repro/svla_so101/ --max-episodes 200
.venv/bin/python -m meatspace_lab verify reports/lerobot__svla_so101_pickplace/report.json /tmp/repro/svla_so101/report.json
scripts/run_all.sh                         # regenerates every committed report + INDEX.md IN PLACE (see timing below)
.venv/bin/python -m meatspace_lab scan some/dataset other/dataset     # quick compatibility check
.venv/bin/python -m meatspace_lab render reports/*/                   # re-render report.md from report.json (hash-checked)
.venv/bin/python -m meatspace_lab export-twin --twin .cache/menagerie/robotstudio_so101 \
    --package reports/lerobot__svla_so101_pickplace/calibrated_twin.json \
    --out .cache/so101_calibrated.xml      # calibrated MJCF (absolute mesh paths; keep it out of the twin dir)
.venv/bin/python -m meatspace_lab export-trace reports/*/   # trace.json per ok report (~1 min for all 18, cached data)
```

`requirements.lock` was generated with `uv pip compile requirements.txt --generate-hashes --python-version 3.13` and installs bit-for-bit the same 32 packages as the venv the reports were made with (checked in a fresh venv). `.venv/` and `.cache/` (Hub downloads, Menagerie clone, run log) are gitignored.

**Timing** (measured; a 4-vCPU Intel Xeon @ 2.80GHz with AVX-512, OpenBLAS SkylakeX kernel): `scripts/run_all.sh` takes 62-65 min for the 23 candidates (3710 s and 3897 s in two runs), and a single report takes 1.5-9 min (`volatile.runtime_s` in each report.json). The tests take about 30 s. Each report directory is under 0.5 MB; `reports/` totals about 6 MB.

### Determinism, hashes and cross-machine checks

The pipeline is deterministic: fit budgets are counted in evaluations, never in wall-clock time, and every random draw uses a fixed seed. Two complete `run_all.sh` batches on this machine produced identical numbers in all 23 reports: `verify --strict` with rtol = atol = 0 finds no difference, optimizer diagnostics included. Every `report.json` carries two hashes:

- `results_sha256` covers the results: metrics, CIs, fitted parameters, split and texts. It leaves out `environment`, `volatile` and the optimizer-path diagnostics (screen losses of non-selected delays, gain-grid losses, evaluation counts, scipy's status text). It is the same on any interpreter or CPU that produces the same results.
- `content_sha256` covers everything except `volatile`, including the diagnostics and `environment`: Python, every package version, the sha256 of the `meatspace_lab` source (`code_sha256`), the CPU model and the OpenBLAS kernel numpy/scipy dispatched to. It identifies one exact software+hardware setup.

`volatile` (runtime, git commit and whether `lab/` was dirty) is in neither hash.

Cross-CPU differences come from OpenBLAS `DYNAMIC_ARCH`: numpy and scipy pick a CPU-specific kernel at import (SkylakeX on the AVX-512 Xeon used here; Haswell, Zen or Apple machines pick others), which changes the last bits of the least-squares steps. In v1 that reached the hash through the noise of an unidentified, effectively-zero parameter printed with significant-digit rounding (a pan offset of -5.5e-10 vs +3.2e-10 deg). v2 writes every parameter at an absolute precision (`twin.PRECISION`), snaps near-zero noise to 0, and no longer fits the unidentified offsets.

Measured: svla_so101 rerun with `OPENBLAS_CORETYPE=Haswell` and `--threads 2` reproduced every metric, CI, fitted parameter and plot bit for bit. The optimizer took a slightly different path on a *losing* branch: the delay-4 screen MSE was 2.69449 vs 2.6915 and the run used 462 vs 477 rollout sets. `results_sha256` is therefore equal and `content_sha256` differs. A different CPU could still change a result in principle, so the supported cross-machine check is `verify`. It compares two reports leaf by leaf at a numeric tolerance (default rtol = atol = 1e-6), ignores the environment and hashes, and lists diagnostic differences separately (`--strict` fails on them too).

A wall-clock safety limit (`--time-limit`, default 3600 s per fit) exists. It never triggered here. If it does, the report flags itself as not bit-reproducible, so raise it on a much slower or heavily loaded machine.

## What is measured

All angles are physical joint angles in degrees: encoder ticks × 360/4096. Only the five arm joints are scored. The gripper is excluded because it contacts objects.

| metric | definition |
|---|---|
| sim-vs-real trajectory RMSE | per episode and joint, RMSE of `x_sim[t] - x[t]` over t = 1..T-1. Headline: mean over the 5 joints, then over episodes. Also reported: p90, the per-episode change distribution. |
| change | `mean(new) / mean(reference) - 1`, paired by episode. **Negative = better**, everywhere (reports, INDEX, this README). |
| static-frame RMSE | the same error restricted to the real robot's quasi-static holds (state and command steady within 0.2° over 5 frames): gravity sag, which a lag filter with a constant bias cannot model. Episodes with fewer than 10 such frames are skipped (n is shown). |
| command tracking RMSE | RMSE of `a[t] - y[t+1]` for the real robot (y = x) and for each model (y = x_sim) |
| command->state lag | see *Alignment*. Reported per joint in frames and in ms (datasets differ in fps). |
| final-pose gap | `abs(x_sim[T-1] - x[T-1])`. "Worse" is stated both by point estimate and by CI separation. |
| workspace novelty | fraction of held-out states outside the fit episodes' range of motion ± 2°. |
| clipping | fraction of held-out states outside each twin's joint range. |

**Models.** *stock*: the Menagerie MJCF as published, documented mapping, no delay. *aligned stock*: stock dynamics + fitted command delay + the joint-limit envelope (what alignment alone buys). *baseline*: `y[t+1] = y[t] + alpha*(a[t-d] + b - y[t])` per joint, no physics (3 parameters per joint: alpha, integer delay d, bias b), fitted on the same fit episodes by exhaustive grid + closed-form bias. *calibrated*: fitted servo dynamics + delay + envelope. "Calibrated vs baseline" is what the MuJoCo physics adds over a black-box lag model.

**Statistics.** Episodes are the unit of independence. Every CI is a 95% percentile bootstrap over episodes (10,000 resamples of whole episodes, fixed seed). Comparisons are paired by episode. With about 10 held-out episodes per set these CIs are approximate and slightly too narrow; they cover episode sampling only, not the choice of split, configuration or dataset.

**Split** (`sysid.split_episodes`). *Future block*: the last round(0.2 n) episodes by index. *Interleaved*: round(0.2 n) episodes drawn from the rest by `numpy.random.default_rng(0).permutation`, plus every remaining episode beyond the fit cap. *Fit*: the remaining episodes, at most 40. For a 50-episode dataset that is 30 / 10 / 10. A test checks that the sets are disjoint, complete and deterministic, and that the future block comes after every fit episode. The interleaved set measures interpolation within a session. The future block is the harder test: a later period with partly new motion, and the workspace-novelty metric says how new.

## Alignment convention (why the lag numbers are comparable)

The two LeRobot code generations record in opposite orders (verified in the LeRobot source, `huggingface/lerobot`):

- **Legacy** (`ManipulatorRobot.teleop_step` @ `e23b41e7~1`, `main_*` names, all v2.x SO-100 datasets here) **writes** the goal `a[t]` to the follower first and **reads** `x[t]` a few ms later (act-then-observe).
- **Current** (`record_loop` in `lerobot_record.py` @ `3f797de5`, `*.pos` names) **reads** `x[t]` first, then reads the leader or policy and **sends** `a[t]` (observe-then-act).

v1 stated that both read first; that was wrong for legacy datasets. The replay is the same for both:

```
q_sim[0] = x[0]   (first observed state, zero velocity)
for t = 0 .. T-2:
    ctrl = a[t - d]             (d = command delay in frames; stock twin d = 0), held for the whole frame
    mj_step x substeps          (substeps = round(frame_dt / timestep); the timestep is then set to
                                 frame_dt / substeps so simulated time equals the nominal frame time)
    q_sim[t+1] = qpos
compare q_sim[t] with x[t] for t = 1..T-1
```

In both conventions `x[t+1]` is the first reading taken a full frame after `a[t]` was sent. The few-ms send-to-read offset is not modelled: `a[t]` goes out a few ms before `x[t]` in legacy data and a few ms after it in current data. The fitted delay and dynamics absorb it, and it shifts lags between the two conventions by a fraction of a frame, in opposite directions.

Lag is `argmin_L Var(a[t] - y[t+L])` over a fixed window `t in [0, T-10)`, refined to sub-frame resolution with a parabola. Using a fixed window means larger shifts are not favoured. Using the variance means a static bias (gravity sag) is ignored. The same code runs on real and simulated trajectories. Reference values for an instantaneous actuator: **1 frame** in the replay and in current recordings, about 0 in legacy recordings. A value below 1 in the sim means an underdamped actuator running ahead of the 1-frame-delayed command (the stock `robotstudio_so101` does this). Sim-vs-real lags are compared within one dataset. Across datasets, compare them in ms, and only approximately across codebases.

**Timestamps are nominal.** In all 23 datasets here `timestamp == frame_index / fps` to within 2e-6 s (float32 rounding). Real loop timing, jitter and overruns are therefore unobservable, and the timestamp-jitter check in `data.py` cannot fire. Each report records the deviation.

The tests check that:
- a pure shift of k = 0..6 frames is recovered exactly;
- fractional shifts are recovered to within 0.1 frame;
- a near-instantaneous twin measures 1.0 frame, or 1 + d with a command delay d;
- a twin driven by its own simulated trajectory reproduces it with zero error.

## Units: verified from the data, not assumed

The SO-100/SO-101 servos (Feetech STS3215, 4096 ticks/rev) report integer ticks, and LeRobot maps them linearly into `observation.state`. So for each joint the recorded values lie on a lattice whose spacing is one encoder tick in the dataset's units. `units.py` fits that lattice per joint (residuals are typically < 0.002 tick) and classifies the encoding using the LeRobot source (`src/lerobot/motors/motors_bus.py` `_normalize`, main @ `3f797de5`, and the legacy `feetech_calibration.py`):

| tick spacing | encoding | conversion | zero |
|---|---|---|---|
| 180/2048 | legacy LeRobot (`main_*` names), `CalibrationMode.DEGREE` | identity | the calibration "zero position" (arm straight horizontal) |
| 360/4095 | `MotorNormMode.DEGREES` | × 4095/4096 | middle of the calibrated range |
| anything else | `MotorNormMode.RANGE_M100_100` (normalized) | × R/200 × 360/4096, with R = 200/spacing ticks **recovered from the data** | middle of the calibrated range |

For normalized data, R must come out an integer, and the full-turn `wrist_roll` must give R = 4095, because LeRobot records that motor over the whole encoder. If it does not, the dataset is rejected. On `lerobot/svla_so101_pickplace` the recovered ranges are 2505 / 2388 / 2231 / 2359 / **4095** ticks. Units are detected on the fit episodes; the report records whether the held-out episodes give the same encoding (v1 used all episodes).

Data without a tick lattice is rejected as unverifiable: filtered, simulated or re-encoded data, such as several "sim" datasets on the Hub. Rejected datasets get an `unsupported` report and no sim numbers.

## Mapping to the twin

`q = sign * deg2rad(x) + deg2rad(nominal_offset)`. **v2 does not fit zero offsets.**
- `trs_so_arm100` (legacy zero = horizontal pose = MJCF zero): nominal offsets are 0.
- `robotstudio_so101` (derived from TheRobotStudio `so101_new_calib`, zero = LeRobot's middle-of-range pose): nominal offsets are 0. There is no documented mapping for legacy-calibrated SO-101 data, so those datasets are rejected.
- MotorsBus-convention data on `trs_so_arm100`: the nominal offset is the MJCF range midpoint. This is an assumption, and the report says so.

v1 fitted a ±20° offset correction per joint. The review showed those offsets were unidentified: they act only through gravity and joint limits, stuck to the ±20° bounds unflagged, and made forward kinematics *less* plausible. For example, on IlyaGusev the gripper's lowest point fell below the base plane on more than half the frames (median -0.8 cm vs +4.5 cm nominal). On 00ri they moved a rest pose that sits exactly on the MJCF mechanical stop (-189.8° vs -190.2°) 17° off it. The shipped twin therefore keeps the documented convention. `--fit-offsets` re-enables the old behaviour for diagnostics.

**Sign gate** (unchanged rule from v1, now applied to the fit episodes only). Legacy LeRobot sets each motor's direction from the user's "rotated position", so the direction is checked per joint against the recorded range of motion:
- keep the documented sign if the 1st-99th percentile range fits the MJCF range with at most a 20° zero shift;
- otherwise flip it if the flipped sign fits;
- otherwise reject the dataset.

The same rule is also evaluated on all episodes and on the held-out episodes only, and the report states whether the decisions agree. They do not always: see svla_so100 below.

**Evidence, not gates.** `kinematics.py` reports where forward kinematics put the gripper relative to the base plane (assuming the base sits on the table) and how often the robot rests on or beyond a stock MJCF limit. `audit.py` correlates the real servo's static error with the twin's gravity torque on quasi-static frames whose gripper is ≥ 3 cm above the base plane (closer frames may be pressing on the table). It uses a centred regression for the implied static stiffness (v1 mixed a centred correlation with an uncentred slope) and says "not testable" when the gravity torque barely varies over the selected poses or too few frames remain.

## System identification

Fitted on the fit episodes only:

- **Per arm joint:** actuator kp, actuator kv (the servo's velocity term; joint damping is redundant with it and stays at stock), frictionloss. **Armature is fixed at stock**: from position trajectories only the bandwidth kp/I_eff is identifiable (the v1 review found posterior correlations of 0.99 between kp and armature, and between kp and kv).
- **Shared:** one integer command delay, screened over 0..5 frames.
- **Joint-limit envelope:** a stock MJCF limit that the fit episodes cross by more than 0.5° is falsified for this robot and released (no stop within the motion); every other limit stays at stock. v1 instead set the limits to the train range of motion + 2°, which clipped held-out motion outside that range (on a chronological split, 24% of svla_so101's held-out wrist_roll frames, which doubled the held-out error).

**Objective.** The mean over episodes of the per-episode sim-vs-real MSE, plus a weak ridge prior toward the stock values (1e-4 deg² per scale unit).

**Optimizer.** `scipy.optimize.least_squares` (TRF, bounded) with a forward-difference Jacobian. Each Jacobian runs as one batched multi-threaded `mujoco.rollout`. The procedure:
1. Short fits for each candidate delay on 16 fit episodes. Each starts from the best point of a coarse global grid over a servo-gain multiplier (kp × {3 … 0.01}, kv scaled by its square root), because a stiff stock actuator saturates its torque limit, where the local gradient with respect to kp is about zero.
2. A final fit at the best delay on all fit episodes (at most 30 evaluations). The report states whether it **converged** or stopped at the budget. v1's svla_so101 fit stopped at the budget unflagged.
3. Parameters within `BOUND_TOL` of a bound are flagged. v1's 1e-6 test could not fire: TRF iterates approach a bound asymptotically.

**Identifiability** (`sysid.identifiability`, at the fitted point, from the fit-episode Jacobian), replacing v1's one-parameter-at-a-time sensitivity table:
- eigenvalues of JᵀJ and its condition number, with the weakest directions;
- per parameter, the ratio of marginal to conditional standard deviation (sqrt of the variance inflation factor). ≥ 10 means only a combination with other parameters is identified;
- posterior correlations above 0.95;
- 95% CIs from a linearised episode bootstrap: whole fit episodes are resampled, and one Gauss-Newton step is taken from the optimum per resample. It captures episode-to-episode variability under the local linearisation, not multi-modality.
- The identifiable servo combinations are the result to read, not kp itself: **natural frequency** sqrt(kp/I_eff) and **damping ratio** (kv + damping)/(2 sqrt(kp I_eff)), with I_eff the joint-space inertia (armature included) at the median pose.
- Stability check: svla_so101 refitted on a different fit subset (`--seed 1`) gives natural frequencies within 0.03 Hz and damping ratios within 0.013 of the committed fit, inside each other's CIs (kp within 2%). Under v1's parametrisation (armature and offsets free), comparable refits gave wrist_flex kp anywhere from 20.8 to 50.6.

**Calibrated twin package.** `calibrated_twin.json` (schema `meatspace.calibrated-twin/v1`) holds the parameter overrides, the mapping, the delay, the joint ranges, the replay options and the provenance. Its `sha256` covers the canonical JSON. `twin.apply_to_spec`/`export_mjcf` apply it to the Menagerie MJCF, and `twin.apply_to_model` applies it to a compiled model. A test checks that the two paths agree.

## Report files

Each report directory holds:

- `report.json`, schema `meatspace.twin-gap-report/v2` (meatspace_lab 2.0.0; v1 reports used schema v1). It contains the dataset id and revision sha, the per-file sha256 of the data, the timestamp check, the units verdict and its held-out agreement, the mapping checks and their robustness, the twin id with its Menagerie sha and twin-directory sha256, the environment, the split, all metrics with CIs for fit / interleaved / future, the fitted parameters, the identifiability analysis, the baseline, the audits, the package hash, the limitations, and `results_sha256` / `content_sha256`.
- `report.md`, a human-readable version. Its headline is both held-out sets, against stock and against the baseline.
- `heldout_episode.svg`: a representative future-block episode (the one with the median stock error).
- `rmse_by_joint_future.svg` and `rmse_by_joint.svg`: per-joint held-out RMSE with CIs for the future block and the interleaved set, with the baseline as a reference mark.
- `calibrated_twin.json`.
- `trace.json`, schema `meatspace.twin-trace/v1`, written by `export-trace` (not by `report`): the per-frame command, real state, stock-twin, baseline and calibrated-twin trajectories (degrees, 2 decimals, the 5 arm joints) of the same episode as `heldout_episode.svg`. It re-runs that episode's replay from the committed files and refuses to write unless everything matches the report: `content_sha256`, the dataset revision and every data file's sha256, the units and mapping decisions, the twin directory hash, the package hash, and the refitted baseline. The per-joint RMSE it recomputes at full resolution must equal the episode's row in `report.json` `episodes` within 0.002 deg (measured: at most 0.0005 deg on all 18). The file stays under 150 KB; a longer episode is decimated by an integer factor (every k-th frame, no filtering), recorded as `decimation` (only `apayan/so100_ball8`, 906 frames, uses 2). `provenance` holds the report's hashes and the JSON paths the numbers come from. A new `report` run deletes a stale `trace.json`; `scripts/run_all.sh` re-exports them. `trace.py` was added after the committed reports were run, so `environment.code_sha256` of a new run differs from theirs (the hash covers every module); `report` itself is unchanged apart from deleting a stale trace, and `export-trace` is the check that the committed results still reproduce.

An `unsupported` report contains no sim numbers, only the reason, the checks and (for a rejected mapping) the forward-kinematics evidence.

## Limitations

- **Open-loop, joint-space, contact-free replay.** Objects and the table are not modelled. When the real arm pushes on the world, that shows up as twin error that no actuator calibration can remove.
- **Servo model.** The servo is MuJoCo's ideal PD position actuator with the stock torque limit. The fitted gains reproduce the dynamic lag but not the static sag: the calibrated elbow's final-pose and static-frame errors are often *larger* than stock (each report states where, by point estimate and by CI separation). The fitted kp is a bandwidth parameter of this model, not the servo's static stiffness, which the gravity-sag audit estimates where it is testable. A P-only loop with deadband, integral action or an acceleration profile is future work.
- **Zero offsets are not fitted.** The documented calibration convention is used as is. A robot whose zero differs from it is modelled with a slightly wrong gravity load. The FK check is the evidence for or against the convention.
- **The mapping gate is a heuristic** (20° range-feasibility rule, unchanged from v1) and can be fragile. On svla_so100 its decision depends on which episodes it sees. Pan and wrist_roll signs cannot be identified from range or gravity.
- **Joint limits.** Released limits have no stop at all. If a held-out episode drives a joint onto a real mechanical stop that the fit episodes never reached, the twin passes through it. Limits that were never crossed stay at their approximate Menagerie values, and held-out clipping against them is reported.
- **Command delay** is an integer number of frames, shared by all joints. The few-ms send-to-read offset of each LeRobot generation is absorbed by the fit.
- **Timestamps are nominal**, so loop timing and jitter are unobservable and unmodelled.
- **Identifiability CIs are local.** They come from a linearised bootstrap at the optimum, so they show episode-to-episode variability, not multi-modality or an optimizer stopping early.
- **One dataset is one robot and setup.** Transfer of a calibrated twin to other units of the same model is not tested.
- **Small held-out sets.** About 10 episodes per held-out set for 50-episode datasets, so the CIs are approximate.
- **Selection.** The candidate pool was hand-picked from Hub search results by the v1 builder with an unrecorded criterion. v2 runs every scan-ok candidate in that pool with one configuration, but the pool itself is not a random sample of LeRobot datasets.
- **Twin choice** comes from the dataset name and card (`so101` in the id or robot_type means `robotstudio_so101`, otherwise `trs_so_arm100`). svla_so101 declares `so100_follower` and the newer datasets the generic `so_follower`, so a hardware/twin mismatch cannot be excluded.
- **Normalized units** are trusted only when the tick lattice recovers a consistent calibration. Saturated readings (±100) are compared as recorded.
- **Development on the same data.** v2's design (split, envelope, frozen offsets, baseline) was chosen after seeing v1 and its review on these datasets. The future block and the 17 datasets not reported in v1 are the parts least exposed to that.
