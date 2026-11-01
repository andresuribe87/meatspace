# Twin Gap Report: shubham4413/so100_smolvla_rc x trs_so_arm100

```
HELD-OUT sim-vs-real joint RMSE, mean of 5 arm joints, deg  [95% bootstrap CI over episodes]
change = calibrated/reference - 1 (negative = better), paired by episode

FUTURE BLOCK (32 episodes)
  stock twin             2.06 [1.94, 2.20]
  aligned stock          1.68 [1.60, 1.78]   (stock dynamics + delay + released limits)
  lag-filter baseline    1.44 [1.38, 1.51]   (no physics: 3 params/joint)
  calibrated twin        1.14 [1.08, 1.21]
  change vs stock        -45% [-47, -42]   per-episode median -44% (range -62% .. -20%); 32/32 improved
  change vs baseline     -21% [-24, -18]   32/32 improved
  verdict                closes part of the gap (-45% [-47, -42] vs stock, residual 1.14 deg); calibrated twin beats the physics-free lag filter (-21% [-24, -18])

INTERLEAVED HELD-OUT (88 episodes)
  stock twin             1.98 [1.90, 2.07]
  aligned stock          1.78 [1.73, 1.83]   (stock dynamics + delay + released limits)
  lag-filter baseline    1.48 [1.44, 1.52]   (no physics: 3 params/joint)
  calibrated twin        1.20 [1.16, 1.25]
  change vs stock        -40% [-41, -38]   per-episode median -39% (range -67% .. -23%); 88/88 improved
  change vs baseline     -19% [-20, -17]   86/88 improved
  verdict                closes part of the gap (-40% [-41, -38] vs stock, residual 1.20 deg); calibrated twin beats the physics-free lag filter (-19% [-20, -17])

command->state lag, interleaved held-out, ms per joint (real / stock / calibrated):
  shoulder_pan 141/121/143  shoulder_lift 163/117/179  elbow_flex 161/109/189  wrist_flex 135/106/148  wrist_roll 131/107/134
  max |twin - real| over joints: stock 51.2 ms, calibrated 28.2 ms
```

![future-block held-out episode](heldout_episode.svg)

![per-joint RMSE, future block](rmse_by_joint_future.svg)

![per-joint RMSE, interleaved held-out](rmse_by_joint.svg)

## Future block (held out: the last 20% of episodes by index, recorded after every fit episode), n = 32

Per joint, mean over episodes [95% CI]. Degrees. Change = calibrated vs stock, negative = better.

```
sim-vs-real RMSE  stock                         aligned stock      baseline           calibrated                    change vs stock  vs baseline
----------------  ----------------------------  -----------------  -----------------  ----------------------------  ---------------  ---------------
shoulder_pan      0.46 [0.43, 0.48] (p90 0.56)  0.39 [0.38, 0.41]  0.38 [0.36, 0.39]  0.32 [0.30, 0.34] (p90 0.37)  -30% [-34, -25]  -15% [-20, -11]
shoulder_lift     3.82 [3.52, 4.13] (p90 5.16)  3.22 [2.97, 3.48]  2.42 [2.27, 2.58]  1.85 [1.72, 2.02] (p90 2.26)  -51% [-54, -49]  -23% [-27, -19]
elbow_flex        4.45 [4.16, 4.80] (p90 4.84)  3.90 [3.68, 4.18]  3.45 [3.28, 3.63]  2.68 [2.48, 2.94] (p90 2.84)  -40% [-43, -37]  -22% [-26, -18]
wrist_flex        1.03 [0.79, 1.38] (p90 1.67)  0.56 [0.52, 0.60]  0.59 [0.56, 0.64]  0.50 [0.47, 0.53] (p90 0.60)  -52% [-64, -37]  -16% [-20, -11]
wrist_roll        0.55 [0.48, 0.65] (p90 0.77)  0.35 [0.33, 0.37]  0.36 [0.34, 0.39]  0.34 [0.31, 0.37] (p90 0.40)  -39% [-44, -34]  -7% [-11, -2]
arm_mean          2.06 [1.94, 2.20] (p90 2.47)  1.68 [1.60, 1.78]  1.44 [1.38, 1.51]  1.14 [1.08, 1.21] (p90 1.36)  -45% [-47, -42]  -21% [-24, -18]

static-frame RMSE (quasi-static holds)  stock              baseline           calibrated         episodes with >= 10 static frames
--------------------------------------  -----------------  -----------------  -----------------  ---------------------------------
shoulder_pan                            0.19 [0.15, 0.23]  0.28 [0.20, 0.36]  0.15 [0.08, 0.23]  14
shoulder_lift                           1.01 [0.67, 1.38]  2.64 [2.32, 2.90]  0.69 [0.39, 1.02]  14
elbow_flex                              2.94 [2.77, 3.26]  5.25 [4.90, 5.48]  2.65 [2.43, 2.88]  14
wrist_flex                              0.50 [0.40, 0.60]  0.68 [0.48, 0.87]  0.33 [0.22, 0.44]  14
wrist_roll                              0.29 [0.20, 0.39]  0.32 [0.24, 0.41]  0.23 [0.15, 0.32]  14
arm_mean                                0.99 [0.89, 1.10]  1.84 [1.66, 1.96]  0.81 [0.70, 0.93]  14

command tracking RMSE  real robot         stock twin         calibrated twin
---------------------  -----------------  -----------------  -----------------
shoulder_pan           1.68 [1.53, 1.82]  1.33 [1.21, 1.45]  1.67 [1.54, 1.80]
shoulder_lift          6.82 [6.34, 7.32]  3.84 [3.60, 4.08]  7.05 [6.63, 7.47]
elbow_flex             7.55 [7.05, 8.09]  5.04 [4.86, 5.23]  7.32 [6.94, 7.69]
wrist_flex             2.22 [1.98, 2.48]  1.73 [1.46, 2.07]  2.37 [2.14, 2.60]
wrist_roll             1.74 [1.50, 2.01]  1.28 [1.12, 1.45]  1.69 [1.48, 1.91]

lag (frames)   real               stock              calibrated         real ms  stock ms  calib ms
-------------  -----------------  -----------------  -----------------  -------  --------  --------
shoulder_pan   4.20 [4.17, 4.22]  3.60 [3.58, 3.61]  4.28 [4.22, 4.36]  140      120       143
shoulder_lift  4.83 [4.76, 4.91]  3.47 [3.47, 3.48]  5.29 [5.27, 5.32]  161      116       176
elbow_flex     4.93 [4.86, 5.03]  3.26 [3.26, 3.26]  5.28 [5.21, 5.35]  164      109       176
wrist_flex     3.96 [3.90, 4.02]  3.16 [3.14, 3.17]  4.39 [4.36, 4.42]  132      105       146
wrist_roll     3.90 [3.85, 3.95]  3.15 [3.12, 3.17]  3.96 [3.93, 4.00]  130      105       132

final-pose gap  stock              calibrated
--------------  -----------------  -----------------
shoulder_pan    0.23 [0.17, 0.29]  0.18 [0.14, 0.24]
shoulder_lift   0.75 [0.56, 0.97]  1.22 [0.98, 1.46]
elbow_flex      2.76 [2.73, 2.79]  3.04 [2.86, 3.23]
wrist_flex      0.43 [0.34, 0.51]  0.32 [0.24, 0.41]
wrist_roll      0.44 [0.26, 0.68]  0.28 [0.21, 0.36]

fraction of states outside the fit episodes' range of motion +-2 deg: {'shoulder_pan': 0.0158, 'shoulder_lift': 0.0, 'elbow_flex': 0.0, 'wrist_flex': 0.0009, 'wrist_roll': 0.0045}
fraction of states outside the twin's joint range: stock {'shoulder_pan': 0.0, 'shoulder_lift': 0.1286, 'elbow_flex': 0.3395, 'wrist_flex': 0.0277, 'wrist_roll': 0.0}; calibrated {'shoulder_pan': 0.0, 'shoulder_lift': 0.0, 'elbow_flex': 0.0, 'wrist_flex': 0.0, 'wrist_roll': 0.0}
```

## Interleaved held-out (random episodes from the same period as the fit episodes), n = 88

Per joint, mean over episodes [95% CI]. Degrees. Change = calibrated vs stock, negative = better.

```
sim-vs-real RMSE  stock                         aligned stock      baseline           calibrated                    change vs stock  vs baseline
----------------  ----------------------------  -----------------  -----------------  ----------------------------  ---------------  ---------------
shoulder_pan      0.52 [0.50, 0.54] (p90 0.61)  0.47 [0.45, 0.49]  0.44 [0.42, 0.46]  0.37 [0.35, 0.39] (p90 0.45)  -29% [-31, -26]  -16% [-18, -13]
shoulder_lift     3.84 [3.65, 4.05] (p90 4.84)  3.42 [3.26, 3.60]  2.39 [2.26, 2.54]  1.88 [1.76, 2.03] (p90 2.41)  -51% [-53, -49]  -21% [-24, -18]
elbow_flex        4.05 [3.86, 4.26] (p90 4.77)  4.04 [3.92, 4.18]  3.61 [3.52, 3.72]  2.90 [2.80, 3.04] (p90 3.19)  -28% [-30, -26]  -20% [-21, -18]
wrist_flex        0.98 [0.85, 1.17] (p90 1.48)  0.59 [0.56, 0.62]  0.54 [0.52, 0.56]  0.49 [0.47, 0.52] (p90 0.64)  -50% [-58, -43]  -9% [-12, -6]
wrist_roll        0.53 [0.47, 0.60] (p90 0.78)  0.36 [0.33, 0.41]  0.40 [0.36, 0.46]  0.34 [0.31, 0.40] (p90 0.41)  -35% [-38, -32]  -14% [-19, -10]
arm_mean          1.98 [1.90, 2.07] (p90 2.50)  1.78 [1.73, 1.83]  1.48 [1.44, 1.52]  1.20 [1.16, 1.25] (p90 1.39)  -40% [-41, -38]  -19% [-20, -17]

static-frame RMSE (quasi-static holds)  stock              baseline           calibrated         episodes with >= 10 static frames
--------------------------------------  -----------------  -----------------  -----------------  ---------------------------------
shoulder_pan                            0.32 [0.20, 0.45]  0.37 [0.27, 0.48]  0.28 [0.18, 0.38]  17
shoulder_lift                           1.88 [1.09, 2.90]  2.40 [1.88, 2.92]  1.01 [0.64, 1.44]  17
elbow_flex                              2.95 [2.49, 3.41]  4.78 [3.80, 5.61]  2.87 [2.41, 3.28]  17
wrist_flex                              0.42 [0.31, 0.53]  0.62 [0.47, 0.78]  0.28 [0.21, 0.37]  17
wrist_roll                              0.35 [0.28, 0.41]  0.39 [0.33, 0.45]  0.27 [0.21, 0.33]  17
arm_mean                                1.18 [1.02, 1.37]  1.71 [1.52, 1.89]  0.94 [0.84, 1.04]  17

command tracking RMSE  real robot         stock twin         calibrated twin
---------------------  -----------------  -----------------  -----------------
shoulder_pan           1.51 [1.45, 1.58]  1.16 [1.11, 1.22]  1.47 [1.41, 1.54]
shoulder_lift          6.25 [5.92, 6.58]  3.19 [3.01, 3.37]  6.20 [5.95, 6.47]
elbow_flex             6.47 [6.14, 6.81]  4.55 [4.40, 4.71]  6.28 [6.03, 6.54]
wrist_flex             2.26 [2.06, 2.47]  1.64 [1.47, 1.85]  2.34 [2.15, 2.53]
wrist_roll             1.61 [1.45, 1.78]  1.19 [1.08, 1.31]  1.55 [1.42, 1.68]

lag (frames)   real               stock              calibrated         real ms  stock ms  calib ms
-------------  -----------------  -----------------  -----------------  -------  --------  --------
shoulder_pan   4.23 [4.21, 4.25]  3.62 [3.61, 3.63]  4.28 [4.26, 4.31]  141      121       143
shoulder_lift  4.88 [4.80, 4.97]  3.50 [3.49, 3.52]  5.37 [5.35, 5.39]  163      117       179
elbow_flex     4.82 [4.76, 4.89]  3.28 [3.27, 3.29]  5.66 [5.59, 5.74]  161      109       189
wrist_flex     4.06 [4.02, 4.09]  3.17 [3.16, 3.18]  4.43 [4.40, 4.46]  135      106       148
wrist_roll     3.94 [3.90, 4.00]  3.20 [3.17, 3.24]  4.03 [4.00, 4.06]  131      107       134

final-pose gap  stock              calibrated
--------------  -----------------  -----------------
shoulder_pan    0.25 [0.21, 0.29]  0.24 [0.20, 0.28]
shoulder_lift   0.77 [0.70, 0.85]  1.38 [1.27, 1.50]
elbow_flex      2.60 [2.53, 2.67]  4.06 [3.89, 4.22]
wrist_flex      0.27 [0.23, 0.31]  0.22 [0.17, 0.26]
wrist_roll      0.42 [0.30, 0.61]  0.29 [0.22, 0.38]

fraction of states outside the fit episodes' range of motion +-2 deg: {'shoulder_pan': 0.0063, 'shoulder_lift': 0.0, 'elbow_flex': 0.0003, 'wrist_flex': 0.0007, 'wrist_roll': 0.0037}
fraction of states outside the twin's joint range: stock {'shoulder_pan': 0.0, 'shoulder_lift': 0.0273, 'elbow_flex': 0.2499, 'wrist_flex': 0.0171, 'wrist_roll': 0.0}; calibrated {'shoulder_pan': 0.0, 'shoulder_lift': 0.0, 'elbow_flex': 0.0, 'wrist_flex': 0.0, 'wrist_roll': 0.0}
```

## Fit episodes (used by the fit), n = 40

Per joint, mean over episodes [95% CI]. Degrees. Change = calibrated vs stock, negative = better.

```
sim-vs-real RMSE  stock                         aligned stock      baseline           calibrated                    change vs stock  vs baseline
----------------  ----------------------------  -----------------  -----------------  ----------------------------  ---------------  ---------------
shoulder_pan      0.52 [0.50, 0.54] (p90 0.59)  0.47 [0.45, 0.49]  0.44 [0.41, 0.47]  0.36 [0.34, 0.38] (p90 0.42)  -31% [-34, -28]  -17% [-21, -14]
shoulder_lift     3.79 [3.49, 4.10] (p90 5.36)  3.39 [3.16, 3.63]  2.26 [2.10, 2.43]  1.87 [1.68, 2.07] (p90 2.63)  -51% [-53, -48]  -17% [-21, -13]
elbow_flex        4.18 [3.81, 4.62] (p90 5.38)  4.14 [3.88, 4.45]  3.57 [3.40, 3.76]  3.00 [2.76, 3.31] (p90 3.47)  -28% [-31, -25]  -16% [-20, -11]
wrist_flex        1.15 [0.90, 1.47] (p90 1.81)  0.64 [0.57, 0.73]  0.56 [0.50, 0.64]  0.53 [0.48, 0.62] (p90 0.60)  -54% [-63, -43]  -4% [-8, -0]
wrist_roll        0.50 [0.45, 0.56] (p90 0.79)  0.36 [0.33, 0.39]  0.41 [0.35, 0.49]  0.33 [0.31, 0.36] (p90 0.39)  -34% [-39, -28]  -18% [-27, -10]
arm_mean          2.03 [1.87, 2.21] (p90 2.86)  1.80 [1.70, 1.91]  1.44 [1.38, 1.51]  1.22 [1.13, 1.32] (p90 1.48)  -40% [-42, -38]  -16% [-19, -12]

static-frame RMSE (quasi-static holds)  stock              baseline           calibrated         episodes with >= 10 static frames
--------------------------------------  -----------------  -----------------  -----------------  ---------------------------------
shoulder_pan                            0.31 [0.13, 0.50]  0.25 [0.12, 0.39]  0.15 [0.05, 0.27]  5
shoulder_lift                           1.14 [0.26, 2.26]  2.38 [1.91, 2.84]  0.53 [0.16, 0.95]  5
elbow_flex                              3.02 [2.84, 3.20]  5.27 [3.39, 6.32]  2.79 [1.87, 3.32]  5
wrist_flex                              1.19 [0.01, 3.16]  0.48 [0.38, 0.58]  0.15 [0.01, 0.37]  5
wrist_roll                              0.34 [0.26, 0.44]  0.36 [0.29, 0.44]  0.28 [0.16, 0.41]  5
arm_mean                                1.20 [0.76, 1.90]  1.75 [1.35, 1.99]  0.78 [0.68, 0.92]  5

command tracking RMSE  real robot         stock twin         calibrated twin
---------------------  -----------------  -----------------  -----------------
shoulder_pan           1.59 [1.50, 1.68]  1.23 [1.16, 1.31]  1.54 [1.46, 1.63]
shoulder_lift          6.13 [5.62, 6.67]  3.12 [2.87, 3.39]  6.17 [5.77, 6.59]
elbow_flex             6.60 [6.03, 7.24]  4.41 [4.18, 4.65]  6.32 [5.94, 6.72]
wrist_flex             2.27 [1.90, 2.71]  1.72 [1.43, 2.06]  2.31 [1.99, 2.67]
wrist_roll             1.57 [1.37, 1.79]  1.17 [1.02, 1.33]  1.52 [1.34, 1.72]

lag (frames)   real               stock              calibrated         real ms  stock ms  calib ms
-------------  -----------------  -----------------  -----------------  -------  --------  --------
shoulder_pan   4.25 [4.22, 4.30]  3.64 [3.61, 3.68]  4.27 [4.23, 4.32]  142      121       142
shoulder_lift  4.84 [4.73, 4.97]  3.49 [3.48, 3.50]  5.37 [5.34, 5.40]  161      116       179
elbow_flex     4.85 [4.74, 5.00]  3.27 [3.27, 3.28]  5.66 [5.54, 5.78]  162      109       189
wrist_flex     4.08 [4.01, 4.15]  3.18 [3.17, 3.19]  4.48 [4.43, 4.53]  136      106       149
wrist_roll     3.94 [3.83, 4.08]  3.23 [3.15, 3.34]  4.06 [3.98, 4.15]  131      108       135

final-pose gap  stock              calibrated
--------------  -----------------  -----------------
shoulder_pan    0.25 [0.19, 0.31]  0.21 [0.17, 0.26]
shoulder_lift   0.88 [0.77, 1.00]  1.51 [1.34, 1.68]
elbow_flex      2.59 [2.53, 2.65]  3.88 [3.55, 4.18]
wrist_flex      0.38 [0.23, 0.61]  0.34 [0.25, 0.43]
wrist_roll      0.38 [0.29, 0.47]  0.33 [0.26, 0.40]
```

## Calibrated twin

Package `calibrated_twin.json`, sha256 `2ac5a6d895d7ad5b415c4f648cfa38bf71de9b8b24718a0eb21374f5b03cecd7`.
Fitted: kp[shoulder_pan], kv[shoulder_pan], frictionloss[shoulder_pan], kp[shoulder_lift], kv[shoulder_lift], frictionloss[shoulder_lift], kp[elbow_flex], kv[elbow_flex], frictionloss[elbow_flex], kp[wrist_flex], kv[wrist_flex], frictionloss[wrist_flex], kp[wrist_roll], kv[wrist_roll], frictionloss[wrist_roll]; command delay 0 frame(s) (screened train MSE by delay, deg^2: {'0': 1.83209, '1': 3.93074, '2': 3.83655, '3': 4.20979, '4': 5.72766, '5': 6.90033}). Train MSE 2.85407 deg^2. Optimizer: converged (`ftol` termination condition is satisfied.). At a bound: none.

```
joint          kp N m/rad   kv N m s/rad  frictionloss N m  armature kg m^2  zero offset deg
-------------  -----------  ------------  ----------------  ---------------  ------------------
shoulder_pan   50 -> 18.57  5.13 -> 1.99  0.1 -> 0.151      0.1 (fixed)      +0.0 (documented)
shoulder_lift  50 -> 8.567  4.96 -> 1.15  0.1 -> 0.172      0.1 (fixed)      -90.1 (documented)
elbow_flex     50 -> 12.88  4.63 -> 1.63  0.1 -> 0.675      0.1 (fixed)      +85.0 (documented)
wrist_flex     50 -> 19.74  4.49 -> 2.44  0.1 -> 0.147      0.1 (fixed)      +0.0 (documented)
wrist_roll     50 -> 24.48  4.47 -> 2.75  0.1 -> 0.0956     0.1 (fixed)      +0.0 (documented)
```

Identifiable servo combinations (the individual gains are not the claim): natural frequency sqrt(kp/I_eff) and damping ratio (kv+damping)/(2 sqrt(kp I_eff)), I_eff = joint-space inertia at the median pose incl. armature; 95% CI from a linearised episode bootstrap of the fit.

```
joint          I_eff kg m^2  natural freq Hz [CI]  damping ratio [CI]
-------------  ------------  --------------------  --------------------
shoulder_pan   0.1092        2.08 [2.02, 2.13]     0.698 [0.667, 0.725]
shoulder_lift  0.1086        1.41 [1.4, 1.43]      0.598 [0.558, 0.639]
elbow_flex     0.1064        1.75 [1.69, 1.82]     0.695 [0.612, 0.769]
wrist_flex     0.1011        2.22 [2.1, 2.34]      0.864 [0.825, 0.889]
wrist_roll     0.1           2.49 [2.4, 2.61]      0.878 [0.845, 0.91]
```

Per-parameter identifiability (condition number of J^T J 8930.0): marginal/conditional std ratio = sqrt(VIF); >= 10 means only a combination with other parameters is identified.

```
parameter                    value    95% CI           std ratio  identified alone
---------------------------  -------  ---------------  ---------  ----------------
kp[shoulder_pan]             18.57    [17.6, 19.6]     5.53       yes
kv[shoulder_pan]             1.988    [1.85, 2.12]     4.75       yes
frictionloss[shoulder_pan]   0.1508   [0.138, 0.163]   1.78       yes
kp[shoulder_lift]            8.567    [8.37, 8.78]     1.91       yes
kv[shoulder_lift]            1.153    [1.07, 1.24]     2.1        yes
frictionloss[shoulder_lift]  0.172    [0.134, 0.206]   1.28       yes
kp[elbow_flex]               12.88    [12, 13.9]       3.36       yes
kv[elbow_flex]               1.628    [1.44, 1.8]      2.69       yes
frictionloss[elbow_flex]     0.6751   [0.561, 0.793]   1.74       yes
kp[wrist_flex]               19.74    [17.6, 21.8]     5          yes
kv[wrist_flex]               2.441    [2.33, 2.54]     4.64       yes
frictionloss[wrist_flex]     0.147    [0.0953, 0.198]  1.39       yes
kp[wrist_roll]               24.48    [22.8, 26.8]     5.34       yes
kv[wrist_roll]               2.75     [2.59, 2.95]     4.99       yes
frictionloss[wrist_roll]     0.09556  [0.0791, 0.118]  1.44       yes
```

Posterior correlations |r| > 0.95: kp[wrist_roll] ~ kv[wrist_roll] (+0.966); kp[wrist_flex] ~ kv[wrist_flex] (+0.966); kp[shoulder_pan] ~ kv[shoulder_pan] (+0.964)

Weakest directions (relative eigenvalue: top loadings): 0.00011: kp[wrist_roll] -0.87, kv[wrist_roll] -0.47, frictionloss[wrist_roll] -0.18, kp[shoulder_pan] +0.00; 0.00013: kp[shoulder_pan] -0.90, kv[shoulder_pan] -0.35, frictionloss[shoulder_pan] -0.27, kp[wrist_flex] +0.00; 0.00033: kp[wrist_flex] -0.86, kv[wrist_flex] -0.41, frictionloss[wrist_flex] -0.30, frictionloss[elbow_flex] +0.00

Physics-free baseline (fitted on the same fit episodes): y[t+1] = y[t] + alpha*(a[t-d] + b - y[t]), y[0] = x[0], per arm joint; alpha [0.3, 0.5, 0.18, 0.28, 0.3], delay [1, 3, 0, 1, 1] frames, bias [-0.2299, 3.0531, 2.1779, 0.4031, 0.0259] deg.

## Mapping audit

Sign checks (1st-99th percentile of FIT-episode states vs MJCF range):

```
joint          recorded p1..p99 deg  MJCF range deg     shift (doc sign)  shift (flipped)  decision
-------------  --------------------  -----------------  ----------------  ---------------  ---------------------------------------------------------------------------
shoulder_pan   [-41.26, 19.05]       [-110.01, 110.01]  0.0               0.0              documented sign (flipped sign would also fit: sign not identified by range)
shoulder_lift  [-101.51, 66.27]      [-190.22, 9.97]    1.42              1.42             documented sign (flipped sign would also fit: sign not identified by range)
elbow_flex     [-72.07, 98.0]        [-9.97, 179.91]    3.06              3.06             documented sign (flipped sign would also fit: sign not identified by range)
wrist_flex     [36.04, 100.75]       [-95.11, 95.11]    5.64              5.64             documented sign (flipped sign would also fit: sign not identified by range)
wrist_roll     [54.45, 118.43]       [-159.86, 159.86]  0.0               0.0              documented sign (flipped sign would also fit: sign not identified by range)

same rule on other subsets (robustness): all_episodes: signs [1, 1, 1, 1, 1], accepted; heldout_only: signs [1, 1, 1, 1, 1], accepted -> agrees
released stock limits (crossed by fit episodes): {'shoulder_lift': {'lower': True, 'upper': False}, 'elbow_flex': {'lower': False, 'upper': True}, 'wrist_flex': {'lower': False, 'upper': True}}
```

Forward-kinematics plausibility under the shipped mapping (evidence, not a gate; assumes the base sits on the work surface):

```
gripper lowest point minus base lowest point (m): {'p1': 0.02, 'p5': 0.021, 'p50': 0.065, 'min': 0.006}; frames > 2 cm below the base: 0.0
frames within 1 deg of a stock MJCF limit: {'shoulder_pan': 0.0, 'shoulder_lift': 0.0043, 'elbow_flex': 0.0082, 'wrist_flex': 0.0087, 'wrist_roll': 0.0}
frames beyond a stock MJCF limit: {'shoulder_pan': 0.0, 'shoulder_lift': 0.041, 'elbow_flex': 0.2547, 'wrist_flex': 0.019, 'wrist_roll': 0.0}
```

Gravity sag on real static frames (middle 80% of each episode, gripper >= 3 cm above the base plane): centred correlation between the servo's static error and the twin's gravity torque at the mapped pose, and the implied static stiffness (centred slope). Positive supports the mapping. Evidence, not a gate.

```
joint          corr [CI] verdict                                                                                          power (gravity std, n)  implied static K N m/rad  fitted kp
-------------  ---------------------------------------------------------------------------------------------------------  ----------------------  ------------------------  ---------
shoulder_pan   not testable (gravity torque ~constant over the selected static poses; gravity std 0.0 N m, 68 frames)                                                       18.6
shoulder_lift  +0.17 [-0.28, +0.64] inconclusive                                                                          0.0892 N m, 68 fr       n/a                       8.57
elbow_flex     not testable (gravity torque ~constant over the selected static poses; gravity std 0.0157 N m, 68 frames)                                                    12.9
wrist_flex     not testable (gravity torque ~constant over the selected static poses; gravity std 0.0178 N m, 68 frames)                                                    19.7
wrist_roll     not testable (gravity torque ~constant over the selected static poses; gravity std 0.0003 N m, 68 frames)                                                    24.5
static frames: 167 (99 excluded as possible table contact) from 14 fit episodes
```

## Method

- Recording convention (lerobot-motorsbus): Current LeRobot (record_loop, `*.pos` names): x[t] is READ first (robot.get_observation), then the leader or policy is read and a[t] is SENT, so x[t] cannot reflect a[t] (observe-then-act).
- Replay: Replay (identical for both conventions): q_sim[0]=x[0] (zero velocity); for t=0..T-2 apply ctrl=a[t-d] (d = fitted integer command delay, stock d=0) for the whole frame, step `substeps` physics steps (timestep set so substeps*timestep = 1/fps exactly), record q_sim[t+1]; sim and real are compared at the same index t=1..T-1. The real sub-frame send-to-read offset (legacy: a[t] sent a few ms BEFORE x[t] is read; current: a[t] sent a few ms AFTER) is not modelled; it is absorbed by the fitted dynamics/delay, and it shifts lags between the two conventions by a fraction of a frame in opposite directions.
- Lag: lag = argmin_L Var(a[t] - y[t+L]) over a fixed window t in [0, T-10), parabolic sub-frame refinement; y = real or sim state. Includes the 1-frame sampling offset: in the replay and in observe-then-act (current LeRobot) recordings an instantaneous actuator measures 1.0 frame; in act-then-observe (legacy) recordings it would measure ~0, and a realistic servo measures its delay minus the few-ms write-to-read gap. Lags are therefore directly comparable between sim and real within one dataset, and only approximately (fraction of a frame) across codebases. Also reported in ms, since datasets differ in fps. Joints with command std < 1 deg in an episode are skipped.
- Units: LeRobot MotorNormMode.DEGREES (tick = 360/4095 units verified on every arm joint) (decided on the fit episodes; held-out episodes agree). Mapping to MJCF: q = sign*deg2rad(x) + deg2rad(offset); LeRobot MotorsBus zero = middle of the calibrated range; nominal offset = middle of the MJCF joint range (assumes the robot was calibrated over the same mechanical range as the MJCF).
- Split: future = last round(n*test_frac) episodes by index; interleaved = round(n*test_frac) episodes of the rest drawn by numpy default_rng(seed).permutation, plus every remaining episode beyond the fit cap; fit = the remaining episodes (<= max_train_episodes) (seed 0). Future: [128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 152, 153, 154, 155, 156, 157, 158, 159]. Interleaved: [0, 1, 5, 7, 11, 12, 13, 14, 16, 21, 23, 24, 26, 29, 31, 32, 33, 34, 36, 37, 38, 39, 40, 41, 43, 45, 46, 47, 48, 49, 50, 51, 53, 54, 56, 57, 58, 59, 60, 61, 62, 63, 64, 66, 69, 70, 71, 73, 74, 76, 77, 78, 79, 80, 81, 83, 84, 88, 89, 90, 93, 94, 95, 97, 98, 100, 101, 102, 103, 104, 105, 106, 107, 109, 111, 112, 113, 114, 117, 119, 120, 121, 122, 123, 124, 125, 126, 127]. Overlap with fit: none.
- Fit: scipy.optimize.least_squares(method='trf', bounds), forward-difference Jacobian, log-parametrised kp; bounds {'kp': [1.0, 3000.0], 'kv': [0.0, 50.0], 'armature': [0.0001, 0.5], 'frictionloss': [0.0, 1.0]}; delays screened [0, 1, 2, 3, 4, 5] on 16 fit episodes (each from the best point of a coarse global servo-gain grid), final fit (30 evaluations max) on all fit episodes; budgets counted in evaluations (deterministic).
- Models compared: **stock** (Menagerie MJCF as published, documented mapping, no delay), **aligned stock** (stock dynamics + fitted delay + released limits), **baseline** (physics-free per-joint lag filter), **calibrated** (fitted kp, kv, frictionloss + delay + released limits).

## Limitations

- Nominal zero for this (MotorsBus, mid-range zero) dataset on trs_so_arm100 assumes the robot was calibrated over the MJCF joint ranges (middle of range = MJCF range midpoint).
- Open-loop joint-space replay only: contacts are disabled in simulation, objects/table are not modelled; episodes where the real arm pushes on the world show up as sim-vs-real error that no actuator calibration can remove.
- Gripper excluded from all metrics (object contact); it is driven by a linear map of its 0-100 range onto the MJCF jaw range.
- The servo is modelled as MuJoCo's ideal PD position actuator with a torque limit (stock forcerange); the real STS3215 firmware (P-only position loop, acceleration profile, deadband) is approximated, not reproduced. The fitted kp is therefore a bandwidth parameter of that model, not the servo's static stiffness (compare the gravity-sag audit).
- Fitted per joint: kp, kv, frictionloss; shared: integer command delay. Armature is fixed at the stock value (only the bandwidth kp/I_eff is identifiable from position trajectories); the identifiable combinations (natural frequency, damping ratio) are reported with CIs.
- Zero offsets are NOT fitted: the twin uses the documented calibration convention (sign checked per joint). In v1 fitted offsets were unidentified, went to their +-20 deg bounds and degraded forward-kinematic plausibility. A robot whose calibration zero differs from the convention is therefore modelled with a wrong gravity load.
- Joint limits: a stock MJCF limit that the fit episodes cross by > 0.5 deg is released (no stop); others stay at stock. Held-out motion past a non-released stock limit is clipped by the twin (fraction reported).
- Command delay is an integer number of frames shared by all joints.
- Dataset timestamps are nominal (frame_index/fps); real control-loop timing, jitter and overruns are unobservable and unmodelled.
- One dataset = one physical robot and setup: the calibrated twin is a model of that robot, not of the robot type; transfer to other units is not tested here.
- Confidence intervals are percentile bootstraps over episodes (whole episodes resampled, 10,000 draws, fixed seed); with 32 future / 88 interleaved held-out episodes they are approximate and tend to be slightly too narrow. They do not cover the choice of split, of fit configuration, or of dataset.
- info.json robot_type is the generic 'so_follower' (LeRobot's shared SO-100/SO-101 class); the twin (trs_so_arm100) was chosen from the dataset name/card.
- Stock MJCF limits crossed by the fit episodes and released in the aligned/calibrated twins: shoulder_lift lower, elbow_flex upper, wrist_flex upper. The stock twin is held at those limits (counted as stock-twin error).
- interleaved: final-pose (static) gap is larger for the calibrated twin than for stock on shoulder_lift, elbow_flex by point estimate; CIs separate on shoulder_lift, elbow_flex.
- future: final-pose (static) gap is larger for the calibrated twin than for stock on shoulder_lift, elbow_flex by point estimate; CIs separate on shoulder_lift, elbow_flex.

## Provenance and reproduction

```
dataset        shubham4413/so100_smolvla_rc @ b829fbf12935c4575ce8d276e3884a3d6dbf0103 (requested b829fbf12935c4575ce8d276e3884a3d6dbf0103)
               LeRobot v3.0, robot_type so_follower, 30 fps, 160 episodes loaded (repo: 160), 0 dropped
data files     data/chunk-000/file-000.parquet (19e16e9ad40d)
twin           trs_so_arm100 (so_arm100.xml) from https://github.com/google-deepmind/mujoco_menagerie @ b0655057a9df2abe39ea7fc989914ba6f248301c
               dir sha256 4f3b0f21b8a2b889..., timestep 0.002 -> 0.00196078 s x 17 substeps/frame, contacts disabled
software       mujoco 3.17.0, numpy 2.5.4, scipy 1.18.1, python 3.13.18, meatspace_lab 2.0.0 (code sha256 924eb3d8364be665...)
hardware       x86_64 Intel(R) Xeon(R) Processor @ 2.80GHz; OpenBLAS kernel numpy: SkylakeX; scipy: SkylakeX
report         schema meatspace.twin-gap-report/v2
               results sha256 ab36e3a39129372102fff8582628a51b559334eb9e890dea810cb5bbd93aaee6  (numbers only; any interpreter/CPU)
               content sha256 6dcc1cb9a69d2cbd659ddabc9663f492bcfc955744b35eea3b5f982359421b7c  (numbers + environment above)
```

Reproduce (from `lab/`, see README) into a scratch directory and compare:

```
python -m meatspace_lab report --dataset shubham4413/so100_smolvla_rc --revision b829fbf12935c4575ce8d276e3884a3d6dbf0103 \
    --twin .cache/menagerie/trs_so_arm100 --out /tmp/repro/ --max-episodes 200
python -m meatspace_lab verify reports/shubham4413__so100_smolvla_rc/report.json /tmp/repro/report.json
```
