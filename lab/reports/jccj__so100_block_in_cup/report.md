# Twin Gap Report: jccj/so100_block_in_cup x trs_so_arm100

```
HELD-OUT sim-vs-real joint RMSE, mean of 5 arm joints, deg  [95% bootstrap CI over episodes]
change = calibrated/reference - 1 (negative = better), paired by episode

FUTURE BLOCK (10 episodes)
  stock twin             0.90 [0.83, 0.95]
  aligned stock          0.88 [0.79, 0.96]   (stock dynamics + delay + released limits)
  lag-filter baseline    0.76 [0.67, 0.84]   (no physics: 3 params/joint)
  calibrated twin        0.62 [0.54, 0.69]
  change vs stock        -31% [-36, -26]   per-episode median -32% (range -48% .. -12%); 10/10 improved
  change vs baseline     -18% [-20, -16]   10/10 improved
  verdict                closes part of the gap (-31% [-36, -26] vs stock, residual 0.62 deg); calibrated twin beats the physics-free lag filter (-18% [-20, -16])

INTERLEAVED HELD-OUT (10 episodes)
  stock twin             0.81 [0.73, 0.90]
  aligned stock          0.76 [0.67, 0.88]   (stock dynamics + delay + released limits)
  lag-filter baseline    0.64 [0.55, 0.77]   (no physics: 3 params/joint)
  calibrated twin        0.48 [0.39, 0.59]
  change vs stock        -41% [-48, -33]   per-episode median -47% (range -56% .. -22%); 10/10 improved
  change vs baseline     -25% [-30, -21]   10/10 improved
  verdict                closes part of the gap (-41% [-48, -33] vs stock, residual 0.48 deg); calibrated twin beats the physics-free lag filter (-25% [-30, -21])

command->state lag, interleaved held-out, ms per joint (real / stock / calibrated):
  shoulder_pan 112/121/113  shoulder_lift 119/117/122  elbow_flex 125/111/131  wrist_flex 117/110/123  wrist_roll 110/109/123
  max |twin - real| over joints: stock 14.9 ms, calibrated 12.6 ms
```

![future-block held-out episode](heldout_episode.svg)

![per-joint RMSE, future block](rmse_by_joint_future.svg)

![per-joint RMSE, interleaved held-out](rmse_by_joint.svg)

## Future block (held out: the last 20% of episodes by index, recorded after every fit episode), n = 10

Per joint, mean over episodes [95% CI]. Degrees. Change = calibrated vs stock, negative = better.

```
sim-vs-real RMSE  stock                         aligned stock      baseline           calibrated                    change vs stock  vs baseline
----------------  ----------------------------  -----------------  -----------------  ----------------------------  ---------------  ---------------
shoulder_pan      0.25 [0.24, 0.26] (p90 0.27)  0.25 [0.24, 0.26]  0.27 [0.26, 0.29]  0.21 [0.20, 0.23] (p90 0.24)  -14% [-19, -10]  -21% [-28, -14]
shoulder_lift     1.40 [1.28, 1.50] (p90 1.55)  0.81 [0.77, 0.85]  0.70 [0.66, 0.74]  0.58 [0.55, 0.60] (p90 0.60)  -59% [-62, -55]  -18% [-21, -13]
elbow_flex        1.51 [1.44, 1.60] (p90 1.70)  1.51 [1.44, 1.60]  0.89 [0.85, 0.93]  0.60 [0.56, 0.64] (p90 0.66)  -60% [-64, -56]  -33% [-37, -28]
wrist_flex        1.01 [0.80, 1.19] (p90 1.25)  1.53 [1.14, 1.86]  1.53 [1.15, 1.84]  1.49 [1.14, 1.79] (p90 1.90)  +48% [+38, +55]  -2% [-5, +1]
wrist_roll        0.31 [0.27, 0.37] (p90 0.34)  0.31 [0.27, 0.37]  0.39 [0.31, 0.53]  0.21 [0.16, 0.28] (p90 0.25)  -32% [-40, -22]  -46% [-49, -42]
arm_mean          0.90 [0.83, 0.95] (p90 0.97)  0.88 [0.79, 0.96]  0.76 [0.67, 0.84]  0.62 [0.54, 0.69] (p90 0.70)  -31% [-36, -26]  -18% [-20, -16]

static-frame RMSE (quasi-static holds)  stock              baseline           calibrated         episodes with >= 10 static frames
--------------------------------------  -----------------  -----------------  -----------------  ---------------------------------
shoulder_pan                            0.19 [0.17, 0.21]  0.23 [0.20, 0.26]  0.15 [0.11, 0.19]  10
shoulder_lift                           1.33 [1.04, 1.60]  0.48 [0.39, 0.60]  0.20 [0.16, 0.23]  10
elbow_flex                              1.45 [1.20, 1.72]  1.12 [0.96, 1.26]  0.44 [0.36, 0.52]  10
wrist_flex                              0.52 [0.39, 0.67]  0.54 [0.41, 0.71]  0.48 [0.39, 0.59]  10
wrist_roll                              0.29 [0.24, 0.33]  0.33 [0.29, 0.38]  0.19 [0.13, 0.26]  10
arm_mean                                0.75 [0.66, 0.84]  0.54 [0.49, 0.59]  0.29 [0.26, 0.32]  10

command tracking RMSE  real robot         stock twin         calibrated twin
---------------------  -----------------  -----------------  -----------------
shoulder_pan           0.76 [0.67, 0.83]  0.78 [0.67, 0.87]  0.77 [0.68, 0.84]
shoulder_lift          2.96 [2.86, 3.05]  3.01 [2.90, 3.10]  2.99 [2.91, 3.07]
elbow_flex             3.52 [3.38, 3.65]  2.58 [2.48, 2.68]  3.45 [3.35, 3.55]
wrist_flex             1.95 [1.70, 2.16]  1.23 [1.15, 1.31]  1.22 [1.17, 1.27]
wrist_roll             0.74 [0.56, 0.96]  0.57 [0.40, 0.76]  0.68 [0.53, 0.85]

lag (frames)   real               stock              calibrated         real ms  stock ms  calib ms
-------------  -----------------  -----------------  -----------------  -------  --------  --------
shoulder_pan   3.33 [3.29, 3.38]  3.61 [3.59, 3.65]  3.46 [3.42, 3.51]  111      120       115
shoulder_lift  3.57 [3.56, 3.58]  3.50 [3.50, 3.51]  3.69 [3.67, 3.71]  119      117       123
elbow_flex     3.72 [3.70, 3.73]  3.30 [3.30, 3.30]  3.76 [3.73, 3.79]  124      110       125
wrist_flex     3.35 [3.31, 3.40]  3.24 [3.23, 3.25]  3.28 [3.21, 3.35]  112      108       109
wrist_roll     3.75 [3.39, 4.21]  3.40 [3.24, 3.63]  3.86 [3.54, 4.28]  125      113       129

final-pose gap  stock              calibrated
--------------  -----------------  -----------------
shoulder_pan    0.22 [0.16, 0.27]  0.15 [0.10, 0.22]
shoulder_lift   1.94 [1.58, 2.19]  0.47 [0.37, 0.57]
elbow_flex      0.18 [0.11, 0.24]  0.36 [0.20, 0.54]
wrist_flex      0.39 [0.22, 0.55]  0.23 [0.13, 0.35]
wrist_roll      0.28 [0.23, 0.33]  0.18 [0.11, 0.24]

fraction of states outside the fit episodes' range of motion +-2 deg: {'shoulder_pan': 0.0, 'shoulder_lift': 0.0, 'elbow_flex': 0.0103, 'wrist_flex': 0.0, 'wrist_roll': 0.0}
fraction of states outside the twin's joint range: stock {'shoulder_pan': 0.0, 'shoulder_lift': 0.3319, 'elbow_flex': 0.0, 'wrist_flex': 0.0, 'wrist_roll': 0.0}; calibrated {'shoulder_pan': 0.0, 'shoulder_lift': 0.0, 'elbow_flex': 0.0, 'wrist_flex': 0.0, 'wrist_roll': 0.0}
```

## Interleaved held-out (random episodes from the same period as the fit episodes), n = 10

Per joint, mean over episodes [95% CI]. Degrees. Change = calibrated vs stock, negative = better.

```
sim-vs-real RMSE  stock                         aligned stock      baseline           calibrated                    change vs stock  vs baseline
----------------  ----------------------------  -----------------  -----------------  ----------------------------  ---------------  ---------------
shoulder_pan      0.28 [0.27, 0.29] (p90 0.29)  0.28 [0.27, 0.29]  0.29 [0.28, 0.31]  0.22 [0.21, 0.23] (p90 0.23)  -21% [-26, -16]  -26% [-33, -17]
shoulder_lift     1.29 [1.08, 1.51] (p90 1.71)  0.87 [0.78, 0.97]  0.76 [0.65, 0.87]  0.58 [0.55, 0.62] (p90 0.66)  -55% [-61, -47]  -23% [-32, -11]
elbow_flex        1.44 [1.34, 1.55] (p90 1.73)  1.44 [1.34, 1.55]  0.90 [0.86, 0.94]  0.54 [0.50, 0.59] (p90 0.64)  -62% [-66, -58]  -40% [-44, -35]
wrist_flex        0.78 [0.50, 1.13] (p90 1.62)  0.95 [0.51, 1.51]  0.96 [0.52, 1.51]  0.90 [0.44, 1.46] (p90 2.17)  +16% [-9, +31]   -6% [-15, -2]
wrist_roll        0.26 [0.24, 0.28] (p90 0.30)  0.26 [0.24, 0.28]  0.30 [0.28, 0.31]  0.16 [0.14, 0.17] (p90 0.20)  -40% [-44, -37]  -48% [-52, -43]
arm_mean          0.81 [0.73, 0.90] (p90 1.03)  0.76 [0.67, 0.88]  0.64 [0.55, 0.77]  0.48 [0.39, 0.59] (p90 0.75)  -41% [-48, -33]  -25% [-30, -21]

static-frame RMSE (quasi-static holds)  stock              baseline           calibrated         episodes with >= 10 static frames
--------------------------------------  -----------------  -----------------  -----------------  ---------------------------------
shoulder_pan                            0.25 [0.21, 0.28]  0.29 [0.25, 0.33]  0.21 [0.19, 0.23]  10
shoulder_lift                           0.99 [0.70, 1.30]  0.42 [0.35, 0.48]  0.35 [0.26, 0.45]  10
elbow_flex                              1.37 [1.11, 1.64]  1.13 [1.04, 1.22]  0.49 [0.41, 0.58]  10
wrist_flex                              0.66 [0.41, 1.03]  0.78 [0.43, 1.36]  0.71 [0.35, 1.30]  10
wrist_roll                              0.27 [0.21, 0.32]  0.30 [0.26, 0.34]  0.14 [0.11, 0.17]  10
arm_mean                                0.71 [0.60, 0.82]  0.58 [0.51, 0.70]  0.38 [0.31, 0.50]  10

command tracking RMSE  real robot         stock twin         calibrated twin
---------------------  -----------------  -----------------  -----------------
shoulder_pan           1.11 [1.05, 1.18]  1.18 [1.10, 1.26]  1.10 [1.03, 1.16]
shoulder_lift          2.93 [2.77, 3.10]  2.85 [2.65, 3.04]  2.93 [2.80, 3.05]
elbow_flex             2.98 [2.81, 3.16]  2.04 [1.89, 2.21]  3.01 [2.89, 3.13]
wrist_flex             1.41 [1.02, 1.91]  0.91 [0.73, 1.11]  1.15 [1.03, 1.27]
wrist_roll             0.53 [0.41, 0.67]  0.39 [0.24, 0.56]  0.52 [0.39, 0.68]

lag (frames)   real               stock              calibrated         real ms  stock ms  calib ms
-------------  -----------------  -----------------  -----------------  -------  --------  --------
shoulder_pan   3.37 [3.35, 3.38]  3.62 [3.62, 3.63]  3.39 [3.37, 3.41]  112      121       113
shoulder_lift  3.57 [3.54, 3.61]  3.50 [3.50, 3.50]  3.67 [3.64, 3.69]  119      117       122
elbow_flex     3.76 [3.75, 3.78]  3.32 [3.31, 3.32]  3.94 [3.86, 4.02]  125      111       131
wrist_flex     3.51 [3.42, 3.60]  3.29 [3.26, 3.31]  3.68 [3.52, 3.85]  117      110       123
wrist_roll     3.31 [3.19, 3.44]  3.28 [3.23, 3.33]  3.68 [3.53, 3.84]  110      109       123

final-pose gap  stock              calibrated
--------------  -----------------  -----------------
shoulder_pan    0.29 [0.23, 0.35]  0.23 [0.17, 0.30]
shoulder_lift   1.71 [1.10, 2.27]  0.35 [0.23, 0.47]
elbow_flex      0.18 [0.13, 0.23]  0.19 [0.12, 0.28]
wrist_flex      0.51 [0.35, 0.65]  0.17 [0.08, 0.28]
wrist_roll      0.27 [0.19, 0.35]  0.15 [0.10, 0.21]

fraction of states outside the fit episodes' range of motion +-2 deg: {'shoulder_pan': 0.0048, 'shoulder_lift': 0.0, 'elbow_flex': 0.0, 'wrist_flex': 0.0, 'wrist_roll': 0.0092}
fraction of states outside the twin's joint range: stock {'shoulder_pan': 0.0, 'shoulder_lift': 0.2403, 'elbow_flex': 0.0, 'wrist_flex': 0.0, 'wrist_roll': 0.0}; calibrated {'shoulder_pan': 0.0, 'shoulder_lift': 0.0, 'elbow_flex': 0.0, 'wrist_flex': 0.0, 'wrist_roll': 0.0}
```

## Fit episodes (used by the fit), n = 30

Per joint, mean over episodes [95% CI]. Degrees. Change = calibrated vs stock, negative = better.

```
sim-vs-real RMSE  stock                         aligned stock      baseline           calibrated                    change vs stock  vs baseline
----------------  ----------------------------  -----------------  -----------------  ----------------------------  ---------------  ---------------
shoulder_pan      0.28 [0.27, 0.28] (p90 0.30)  0.28 [0.27, 0.28]  0.29 [0.28, 0.30]  0.21 [0.20, 0.21] (p90 0.22)  -25% [-28, -23]  -30% [-32, -26]
shoulder_lift     1.34 [1.23, 1.44] (p90 1.69)  0.83 [0.77, 0.89]  0.74 [0.67, 0.81]  0.56 [0.54, 0.58] (p90 0.62)  -58% [-62, -54]  -24% [-30, -17]
elbow_flex        1.42 [1.37, 1.48] (p90 1.63)  1.42 [1.37, 1.48]  0.88 [0.85, 0.90]  0.55 [0.53, 0.58] (p90 0.69)  -61% [-63, -59]  -37% [-40, -34]
wrist_flex        0.80 [0.60, 1.03] (p90 1.90)  1.01 [0.67, 1.40]  1.03 [0.69, 1.42]  0.96 [0.63, 1.34] (p90 2.72)  +21% [+4, +32]   -6% [-10, -3]
wrist_roll        0.25 [0.24, 0.26] (p90 0.29)  0.25 [0.24, 0.26]  0.29 [0.28, 0.31]  0.15 [0.14, 0.16] (p90 0.18)  -41% [-44, -38]  -49% [-53, -45]
arm_mean          0.82 [0.77, 0.87] (p90 1.09)  0.76 [0.68, 0.84]  0.65 [0.57, 0.74]  0.49 [0.42, 0.56] (p90 0.86)  -40% [-46, -35]  -25% [-27, -22]

static-frame RMSE (quasi-static holds)  stock              baseline           calibrated         episodes with >= 10 static frames
--------------------------------------  -----------------  -----------------  -----------------  ---------------------------------
shoulder_pan                            0.25 [0.22, 0.29]  0.31 [0.28, 0.34]  0.19 [0.17, 0.21]  30
shoulder_lift                           1.00 [0.80, 1.21]  0.51 [0.44, 0.59]  0.34 [0.27, 0.43]  30
elbow_flex                              1.36 [1.23, 1.50]  1.04 [0.98, 1.10]  0.40 [0.36, 0.45]  30
wrist_flex                              0.97 [0.68, 1.32]  1.24 [0.76, 1.81]  1.15 [0.66, 1.73]  30
wrist_roll                              0.25 [0.23, 0.27]  0.30 [0.28, 0.33]  0.13 [0.11, 0.15]  30
arm_mean                                0.77 [0.70, 0.84]  0.68 [0.58, 0.80]  0.44 [0.33, 0.57]  30

command tracking RMSE  real robot         stock twin         calibrated twin
---------------------  -----------------  -----------------  -----------------
shoulder_pan           1.13 [1.09, 1.17]  1.20 [1.15, 1.25]  1.11 [1.07, 1.15]
shoulder_lift          2.95 [2.84, 3.06]  2.91 [2.80, 3.03]  2.96 [2.87, 3.04]
elbow_flex             3.01 [2.94, 3.08]  2.10 [2.02, 2.17]  3.03 [2.98, 3.09]
wrist_flex             1.53 [1.25, 1.85]  0.98 [0.87, 1.09]  1.16 [1.11, 1.21]
wrist_roll             0.60 [0.50, 0.71]  0.46 [0.34, 0.59]  0.59 [0.47, 0.70]

lag (frames)   real               stock              calibrated         real ms  stock ms  calib ms
-------------  -----------------  -----------------  -----------------  -------  --------  --------
shoulder_pan   3.35 [3.34, 3.37]  3.61 [3.61, 3.62]  3.36 [3.35, 3.38]  112      120       112
shoulder_lift  3.58 [3.56, 3.59]  3.50 [3.49, 3.50]  3.67 [3.65, 3.69]  119      117       122
elbow_flex     3.73 [3.72, 3.75]  3.31 [3.31, 3.31]  3.93 [3.89, 3.96]  124      110       131
wrist_flex     3.47 [3.43, 3.51]  3.28 [3.27, 3.30]  3.65 [3.55, 3.76]  116      109       122
wrist_roll     3.34 [3.22, 3.51]  3.26 [3.22, 3.33]  3.57 [3.39, 3.89]  111      109       119

final-pose gap  stock              calibrated
--------------  -----------------  -----------------
shoulder_pan    0.28 [0.25, 0.31]  0.17 [0.14, 0.19]
shoulder_lift   1.57 [1.25, 1.88]  0.22 [0.17, 0.28]
elbow_flex      0.14 [0.12, 0.16]  0.24 [0.18, 0.30]
wrist_flex      0.42 [0.32, 0.51]  0.24 [0.16, 0.33]
wrist_roll      0.27 [0.24, 0.31]  0.13 [0.10, 0.16]
```

## Calibrated twin

Package `calibrated_twin.json`, sha256 `c1aa0c9bc3a86dc1f6b5cb04949036e6e9147fa11e0533813cb491414899dc07`.
Fitted: kp[shoulder_pan], kv[shoulder_pan], frictionloss[shoulder_pan], kp[shoulder_lift], kv[shoulder_lift], frictionloss[shoulder_lift], kp[elbow_flex], kv[elbow_flex], frictionloss[elbow_flex], kp[wrist_flex], kv[wrist_flex], frictionloss[wrist_flex], kp[wrist_roll], kv[wrist_roll], frictionloss[wrist_roll]; command delay 0 frame(s) (screened train MSE by delay, deg^2: {'0': 1.01339, '1': 1.11378, '2': 1.30965, '3': 1.54965, '4': 2.15422, '5': 3.41037}). Train MSE 0.52189 deg^2. Optimizer: converged (`ftol` termination condition is satisfied.). At a bound: none.

```
joint          kp N m/rad   kv N m s/rad  frictionloss N m  armature kg m^2  zero offset deg
-------------  -----------  ------------  ----------------  ---------------  -----------------
shoulder_pan   50 -> 47     5.13 -> 4.05  0.1 -> 0.253      0.1 (fixed)      +0.0 (documented)
shoulder_lift  50 -> 21.41  4.96 -> 1.89  0.1 -> 0.334      0.1 (fixed)      +0.0 (documented)
elbow_flex     50 -> 18.03  4.63 -> 1.49  0.1 -> 0.469      0.1 (fixed)      +0.0 (documented)
wrist_flex     50 -> 43.31  4.49 -> 2.49  0.1 -> 0.92       0.1 (fixed)      +0.0 (documented)
wrist_roll     50 -> 31.29  4.47 -> 2.61  0.1 -> 0.214      0.1 (fixed)      +0.0 (documented)
```

Identifiable servo combinations (the individual gains are not the claim): natural frequency sqrt(kp/I_eff) and damping ratio (kv+damping)/(2 sqrt(kp I_eff)), I_eff = joint-space inertia at the median pose incl. armature; 95% CI from a linearised episode bootstrap of the fit.

```
joint          I_eff kg m^2  natural freq Hz [CI]  damping ratio [CI]
-------------  ------------  --------------------  --------------------
shoulder_pan   0.1044        3.38 [3.25, 3.49]     0.915 [0.875, 0.948]
shoulder_lift  0.1057        2.27 [2.23, 2.31]     0.629 [0.606, 0.656]
elbow_flex     0.1067        2.07 [2.04, 2.09]     0.537 [0.523, 0.55]
wrist_flex     0.1012        3.29 [2.77, 4.13]     0.595 [0.395, 0.752]
wrist_roll     0.1001        2.81 [2.53, 3]        0.738 [0.653, 0.778]
```

Per-parameter identifiability (condition number of J^T J 9470.0): marginal/conditional std ratio = sqrt(VIF); >= 10 means only a combination with other parameters is identified.

```
parameter                    value   95% CI          std ratio  identified alone
---------------------------  ------  --------------  ---------  ----------------
kp[shoulder_pan]             47      [43.6, 50.2]    10.8       NO
kv[shoulder_pan]             4.054   [3.73, 4.34]    9.36       yes
frictionloss[shoulder_pan]   0.253   [0.234, 0.271]  2.5        yes
kp[shoulder_lift]            21.41   [20.7, 22.3]    3.4        yes
kv[shoulder_lift]            1.893   [1.79, 2.01]    3.59       yes
frictionloss[shoulder_lift]  0.3342  [0.296, 0.374]  1.55       yes
kp[elbow_flex]               18.03   [17.6, 18.5]    2.88       yes
kv[elbow_flex]               1.49    [1.44, 1.54]    2.25       yes
frictionloss[elbow_flex]     0.4691  [0.437, 0.504]  1.97       yes
kp[wrist_flex]               43.31   [30.7, 68.3]    5.38       yes
kv[wrist_flex]               2.491   [1.56, 3.46]    3.06       yes
frictionloss[wrist_flex]     0.9202  [0.338, 1.64]   3.4        yes
kp[wrist_roll]               31.29   [25.3, 35.7]    5.5        yes
kv[wrist_roll]               2.611   [2.08, 2.94]    4.33       yes
frictionloss[wrist_roll]     0.214   [0.164, 0.246]  2.31       yes
```

Posterior correlations |r| > 0.95: kp[shoulder_pan] ~ kv[shoulder_pan] (+0.991); kp[wrist_roll] ~ kv[wrist_roll] (+0.966)

Weakest directions (relative eigenvalue: top loadings): 0.00011: kp[shoulder_pan] -0.72, kv[shoulder_pan] -0.57, frictionloss[shoulder_pan] -0.38, frictionloss[wrist_flex] +0.00; 0.00019: kp[wrist_roll] +0.83, kv[wrist_roll] +0.41, frictionloss[wrist_roll] +0.38, frictionloss[wrist_flex] +0.00; 0.00019: frictionloss[wrist_flex] -0.89, kp[wrist_flex] -0.42, kv[wrist_flex] -0.16, kp[elbow_flex] +0.00

Physics-free baseline (fitted on the same fit episodes): y[t+1] = y[t] + alpha*(a[t-d] + b - y[t]), y[0] = x[0], per arm joint; alpha [0.42, 0.64, 0.26, 0.26, 0.42], delay [1, 2, 0, 0, 1] frames, bias [-0.0342, -0.7714, 1.5487, 0.1428, -0.1049] deg.

## Mapping audit

Sign checks (1st-99th percentile of FIT-episode states vs MJCF range):

```
joint          recorded p1..p99 deg  MJCF range deg     shift (doc sign)  shift (flipped)  decision
-------------  --------------------  -----------------  ----------------  ---------------  ---------------------------------------------------------------------------
shoulder_pan   [-43.59, 21.62]       [-110.01, 110.01]  0.0               0.0              documented sign (flipped sign would also fit: sign not identified by range)
shoulder_lift  [46.9, 193.01]        [-190.22, 9.97]    183.04            2.79             flipped sign (documented sign does not fit the MJCF range)
elbow_flex     [50.51, 177.63]       [-9.97, 179.91]    0.0               167.66           documented sign
wrist_flex     [42.19, 90.79]        [-95.11, 95.11]    0.0               0.0              documented sign (flipped sign would also fit: sign not identified by range)
wrist_roll     [-4.75, 47.2]         [-159.86, 159.86]  0.0               0.0              documented sign (flipped sign would also fit: sign not identified by range)

same rule on other subsets (robustness): all_episodes: signs [1, -1, 1, 1, 1], accepted; heldout_only: signs [1, -1, 1, 1, 1], accepted -> agrees
released stock limits (crossed by fit episodes): {'shoulder_lift': {'lower': True, 'upper': False}, 'wrist_flex': {'lower': False, 'upper': True}}
```

Forward-kinematics plausibility under the shipped mapping (evidence, not a gate; assumes the base sits on the work surface):

```
gripper lowest point minus base lowest point (m): {'p1': 0.041, 'p5': 0.043, 'p50': 0.081, 'min': 0.04}; frames > 2 cm below the base: 0.0
frames within 1 deg of a stock MJCF limit: {'shoulder_pan': 0.0, 'shoulder_lift': 0.0301, 'elbow_flex': 0.0, 'wrist_flex': 0.0, 'wrist_roll': 0.0}
frames beyond a stock MJCF limit: {'shoulder_pan': 0.0, 'shoulder_lift': 0.2482, 'elbow_flex': 0.0, 'wrist_flex': 0.0, 'wrist_roll': 0.0}
```

Gravity sag on real static frames (middle 80% of each episode, gripper >= 3 cm above the base plane): centred correlation between the servo's static error and the twin's gravity torque at the mapped pose, and the implied static stiffness (centred slope). Positive supports the mapping. Evidence, not a gate.

```
joint          corr [CI] verdict                                                                                            power (gravity std, n)  implied static K N m/rad  fitted kp
-------------  -----------------------------------------------------------------------------------------------------------  ----------------------  ------------------------  ---------
shoulder_pan   not testable (gravity torque ~constant over the selected static poses; gravity std 0.0 N m, 1411 frames)                                                       47
shoulder_lift  +0.26 [+0.19, +0.32] positive                                                                                0.2716 N m, 1411 fr     136 [102, 210]            21.4
elbow_flex     -0.39 [-0.50, -0.26] negative                                                                                0.0344 N m, 1411 fr     n/a                       18
wrist_flex     +0.11 [+0.03, +0.23] positive                                                                                0.0269 N m, 1411 fr     7.87 [4.41, 33.3]         43.3
wrist_roll     not testable (gravity torque ~constant over the selected static poses; gravity std 0.0001 N m, 1411 frames)                                                    31.3
static frames: 1411 (0 excluded as possible table contact) from 30 fit episodes
```

## Method

- Recording convention (lerobot-legacy): Legacy LeRobot (ManipulatorRobot.teleop_step, `main_*` names): the goal a[t] is WRITTEN to the follower first and the follower state x[t] is READ afterwards (a few ms later), so x[t] may already contain a few ms of response to a[t] (act-then-observe).
- Replay: Replay (identical for both conventions): q_sim[0]=x[0] (zero velocity); for t=0..T-2 apply ctrl=a[t-d] (d = fitted integer command delay, stock d=0) for the whole frame, step `substeps` physics steps (timestep set so substeps*timestep = 1/fps exactly), record q_sim[t+1]; sim and real are compared at the same index t=1..T-1. The real sub-frame send-to-read offset (legacy: a[t] sent a few ms BEFORE x[t] is read; current: a[t] sent a few ms AFTER) is not modelled; it is absorbed by the fitted dynamics/delay, and it shifts lags between the two conventions by a fraction of a frame in opposite directions.
- Lag: lag = argmin_L Var(a[t] - y[t+L]) over a fixed window t in [0, T-10), parabolic sub-frame refinement; y = real or sim state. Includes the 1-frame sampling offset: in the replay and in observe-then-act (current LeRobot) recordings an instantaneous actuator measures 1.0 frame; in act-then-observe (legacy) recordings it would measure ~0, and a realistic servo measures its delay minus the few-ms write-to-read gap. Lags are therefore directly comparable between sim and real within one dataset, and only approximately (fraction of a frame) across codebases. Also reported in ms, since datasets differ in fps. Joints with command std < 1 deg in an episode are skipped.
- Units: legacy LeRobot degrees (tick = 180/2048 deg verified on every arm joint) (decided on the fit episodes; held-out episodes agree). Mapping to MJCF: q = sign*deg2rad(x) + deg2rad(offset); legacy LeRobot zero pose = arm straight horizontal (feetech_calibration.py); the MJCF zero (from the SO-ARM100 URDF) is also the arm stretched horizontally forward, so nominal offsets are 0. Documented signs +1 (MJCF joint axes); legacy LeRobot sets each motor's direction from the user's 'rotated position', so signs are checked per dataset against the recorded range of motion (mapping_checks).
- Split: future = last round(n*test_frac) episodes by index; interleaved = round(n*test_frac) episodes of the rest drawn by numpy default_rng(seed).permutation, plus every remaining episode beyond the fit cap; fit = the remaining episodes (<= max_train_episodes) (seed 0). Future: [40, 41, 42, 43, 44, 45, 46, 47, 48, 49]. Interleaved: [1, 2, 3, 4, 11, 18, 23, 24, 27, 34]. Overlap with fit: none.
- Fit: scipy.optimize.least_squares(method='trf', bounds), forward-difference Jacobian, log-parametrised kp; bounds {'kp': [1.0, 3000.0], 'kv': [0.0, 50.0], 'armature': [0.0001, 0.5], 'frictionloss': [0.0, 1.0]}; delays screened [0, 1, 2, 3, 4, 5] on 16 fit episodes (each from the best point of a coarse global servo-gain grid), final fit (30 evaluations max) on all fit episodes; budgets counted in evaluations (deterministic).
- Models compared: **stock** (Menagerie MJCF as published, documented mapping, no delay), **aligned stock** (stock dynamics + fitted delay + released limits), **baseline** (physics-free per-joint lag filter), **calibrated** (fitted kp, kv, frictionloss + delay + released limits).

## Limitations

- Open-loop joint-space replay only: contacts are disabled in simulation, objects/table are not modelled; episodes where the real arm pushes on the world show up as sim-vs-real error that no actuator calibration can remove.
- Gripper excluded from all metrics (object contact); it is driven by a linear map of its 0-100 range onto the MJCF jaw range.
- The servo is modelled as MuJoCo's ideal PD position actuator with a torque limit (stock forcerange); the real STS3215 firmware (P-only position loop, acceleration profile, deadband) is approximated, not reproduced. The fitted kp is therefore a bandwidth parameter of that model, not the servo's static stiffness (compare the gravity-sag audit).
- Fitted per joint: kp, kv, frictionloss; shared: integer command delay. Armature is fixed at the stock value (only the bandwidth kp/I_eff is identifiable from position trajectories); the identifiable combinations (natural frequency, damping ratio) are reported with CIs.
- Zero offsets are NOT fitted: the twin uses the documented calibration convention (sign checked per joint). In v1 fitted offsets were unidentified, went to their +-20 deg bounds and degraded forward-kinematic plausibility. A robot whose calibration zero differs from the convention is therefore modelled with a wrong gravity load.
- Joint limits: a stock MJCF limit that the fit episodes cross by > 0.5 deg is released (no stop); others stay at stock. Held-out motion past a non-released stock limit is clipped by the twin (fraction reported).
- Command delay is an integer number of frames shared by all joints.
- Dataset timestamps are nominal (frame_index/fps); real control-loop timing, jitter and overruns are unobservable and unmodelled.
- One dataset = one physical robot and setup: the calibrated twin is a model of that robot, not of the robot type; transfer to other units is not tested here.
- Confidence intervals are percentile bootstraps over episodes (whole episodes resampled, 10,000 draws, fixed seed); with 10 future / 10 interleaved held-out episodes they are approximate and tend to be slightly too narrow. They do not cover the choice of split, of fit configuration, or of dataset.
- Recorded with legacy LeRobot (act-then-observe); lags are not exactly comparable with current-LeRobot (observe-then-act) datasets (see conventions).
- Stock MJCF limits crossed by the fit episodes and released in the aligned/calibrated twins: shoulder_lift lower, wrist_flex upper. The stock twin is held at those limits (counted as stock-twin error).
- Not identified individually (marginal/conditional std ratio >= 10): kp[shoulder_pan]. Only combinations of them are constrained by the data (see identifiability); individual values are not meaningful.
- interleaved: final-pose (static) gap is larger for the calibrated twin than for stock on elbow_flex by point estimate; CIs overlap on all of them.
- future: final-pose (static) gap is larger for the calibrated twin than for stock on elbow_flex by point estimate; CIs overlap on all of them.
- Joint direction flipped relative to the documented convention for shoulder_lift (chosen from the recorded range of motion vs the MJCF range; see mapping_checks).

## Provenance and reproduction

```
dataset        jccj/so100_block_in_cup @ 87a2b14997c2fabe117ca2b1fa4e7a8a42356623 (requested 87a2b14997c2fabe117ca2b1fa4e7a8a42356623)
               LeRobot v2.1, robot_type so100, 30 fps, 50 episodes loaded (repo: 50), 0 dropped
data files     data/chunk-000/episode_000000.parquet (da4d890c5f8c), data/chunk-000/episode_000001.parquet (f675e97fbbb1), data/chunk-000/episode_000002.parquet (9f7a91394267), ... (50 files)
twin           trs_so_arm100 (so_arm100.xml) from https://github.com/google-deepmind/mujoco_menagerie @ b0655057a9df2abe39ea7fc989914ba6f248301c
               dir sha256 4f3b0f21b8a2b889..., timestep 0.002 -> 0.00196078 s x 17 substeps/frame, contacts disabled
software       mujoco 3.17.0, numpy 2.5.4, scipy 1.18.1, python 3.13.18, meatspace_lab 2.0.0 (code sha256 924eb3d8364be665...)
hardware       x86_64 Intel(R) Xeon(R) Processor @ 2.80GHz; OpenBLAS kernel numpy: SkylakeX; scipy: SkylakeX
report         schema meatspace.twin-gap-report/v2
               results sha256 6bf17c2218a48997bb502737acdbe2866e1719729ce896e9444c63e4932936a2  (numbers only; any interpreter/CPU)
               content sha256 b4f690007dccb28661e6c41dd1284efef2e5af8da14948da7c652e3c73ef1af4  (numbers + environment above)
```

Reproduce (from `lab/`, see README) into a scratch directory and compare:

```
python -m meatspace_lab report --dataset jccj/so100_block_in_cup --revision 87a2b14997c2fabe117ca2b1fa4e7a8a42356623 \
    --twin .cache/menagerie/trs_so_arm100 --out /tmp/repro/ --max-episodes 200
python -m meatspace_lab verify reports/jccj__so100_block_in_cup/report.json /tmp/repro/report.json
```
