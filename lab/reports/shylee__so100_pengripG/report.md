# Twin Gap Report: shylee/so100_pengripG x trs_so_arm100

```
HELD-OUT sim-vs-real joint RMSE, mean of 5 arm joints, deg  [95% bootstrap CI over episodes]
change = calibrated/reference - 1 (negative = better), paired by episode

FUTURE BLOCK (40 episodes)
  stock twin             1.18 [1.15, 1.20]
  aligned stock          1.21 [1.19, 1.23]   (stock dynamics + delay + released limits)
  lag-filter baseline    0.83 [0.81, 0.85]   (no physics: 3 params/joint)
  calibrated twin        0.62 [0.60, 0.64]
  change vs stock        -47% [-49, -45]   per-episode median -46% (range -59% .. -38%); 40/40 improved
  change vs baseline     -25% [-27, -23]   40/40 improved
  verdict                closes part of the gap (-47% [-49, -45] vs stock, residual 0.62 deg); calibrated twin beats the physics-free lag filter (-25% [-27, -23])

INTERLEAVED HELD-OUT (120 episodes)
  stock twin             1.16 [1.14, 1.18]
  aligned stock          1.20 [1.18, 1.22]   (stock dynamics + delay + released limits)
  lag-filter baseline    0.82 [0.80, 0.83]   (no physics: 3 params/joint)
  calibrated twin        0.62 [0.60, 0.64]
  change vs stock        -46% [-48, -45]   per-episode median -47% (range -62% .. -15%); 120/120 improved
  change vs baseline     -24% [-26, -23]   119/120 improved
  verdict                closes part of the gap (-46% [-48, -45] vs stock, residual 0.62 deg); calibrated twin beats the physics-free lag filter (-24% [-26, -23])

command->state lag, interleaved held-out, ms per joint (real / stock / calibrated):
  shoulder_pan 126/121/127  shoulder_lift 133/120/135  elbow_flex 126/113/141  wrist_flex 117/95/116  wrist_roll 135/109/139
  max |twin - real| over joints: stock 25.7 ms, calibrated 14.4 ms
```

![future-block held-out episode](heldout_episode.svg)

![per-joint RMSE, future block](rmse_by_joint_future.svg)

![per-joint RMSE, interleaved held-out](rmse_by_joint.svg)

## Future block (held out: the last 20% of episodes by index, recorded after every fit episode), n = 40

Per joint, mean over episodes [95% CI]. Degrees. Change = calibrated vs stock, negative = better.

```
sim-vs-real RMSE  stock                         aligned stock      baseline           calibrated                    change vs stock  vs baseline
----------------  ----------------------------  -----------------  -----------------  ----------------------------  ---------------  ---------------
shoulder_pan      0.45 [0.41, 0.48] (p90 0.57)  0.74 [0.70, 0.79]  0.48 [0.45, 0.51]  0.31 [0.28, 0.34] (p90 0.44)  -30% [-34, -27]  -35% [-39, -32]
shoulder_lift     1.50 [1.41, 1.59] (p90 1.85)  2.06 [1.99, 2.13]  0.95 [0.90, 1.00]  0.91 [0.88, 0.95] (p90 1.07)  -39% [-42, -36]  -4% [-8, -0]
elbow_flex        2.49 [2.42, 2.57] (p90 2.83)  1.97 [1.89, 2.06]  1.54 [1.48, 1.61]  1.26 [1.19, 1.33] (p90 1.56)  -50% [-53, -46]  -18% [-23, -13]
wrist_flex        0.92 [0.87, 0.97] (p90 1.08)  0.82 [0.78, 0.87]  0.76 [0.71, 0.80]  0.45 [0.41, 0.49] (p90 0.64)  -51% [-55, -48]  -41% [-44, -38]
wrist_roll        0.53 [0.51, 0.54] (p90 0.60)  0.44 [0.42, 0.46]  0.41 [0.39, 0.43]  0.18 [0.17, 0.19] (p90 0.22)  -66% [-68, -64]  -56% [-59, -53]
arm_mean          1.18 [1.15, 1.20] (p90 1.29)  1.21 [1.19, 1.23]  0.83 [0.81, 0.85]  0.62 [0.60, 0.64] (p90 0.71)  -47% [-49, -45]  -25% [-27, -23]

static-frame RMSE (quasi-static holds)  stock  baseline  calibrated  episodes with >= 10 static frames
--------------------------------------  -----  --------  ----------  ---------------------------------
shoulder_pan                            n/a    n/a       n/a         0
shoulder_lift                           n/a    n/a       n/a         0
elbow_flex                              n/a    n/a       n/a         0
wrist_flex                              n/a    n/a       n/a         0
wrist_roll                              n/a    n/a       n/a         0
arm_mean                                n/a    n/a       n/a         0

command tracking RMSE  real robot         stock twin         calibrated twin
---------------------  -----------------  -----------------  -----------------
shoulder_pan           2.00 [1.87, 2.14]  1.83 [1.69, 1.98]  1.95 [1.83, 2.08]
shoulder_lift          4.17 [3.97, 4.37]  3.66 [3.53, 3.79]  4.18 [4.05, 4.31]
elbow_flex             5.69 [5.55, 5.81]  3.55 [3.43, 3.66]  5.53 [5.41, 5.64]
wrist_flex             1.94 [1.85, 2.05]  1.74 [1.66, 1.82]  1.85 [1.78, 1.93]
wrist_roll             1.55 [1.42, 1.68]  1.14 [1.03, 1.26]  1.57 [1.45, 1.69]

lag (frames)   real               stock              calibrated         real ms  stock ms  calib ms
-------------  -----------------  -----------------  -----------------  -------  --------  --------
shoulder_pan   3.78 [3.74, 3.82]  3.62 [3.61, 3.63]  3.79 [3.75, 3.84]  126      121       126
shoulder_lift  3.95 [3.90, 3.99]  3.59 [3.59, 3.60]  3.97 [3.94, 4.00]  132      120       132
elbow_flex     4.06 [4.02, 4.11]  3.38 [3.36, 3.40]  4.17 [4.10, 4.23]  135      113       139
wrist_flex     3.61 [3.52, 3.69]  2.91 [2.84, 2.97]  3.49 [3.44, 3.54]  120      97        116
wrist_roll     3.99 [3.92, 4.06]  3.28 [3.26, 3.29]  4.12 [4.03, 4.22]  133      109       137

final-pose gap  stock              calibrated
--------------  -----------------  -----------------
shoulder_pan    0.45 [0.38, 0.53]  0.20 [0.16, 0.24]
shoulder_lift   2.16 [1.75, 2.57]  0.84 [0.70, 1.00]
elbow_flex      1.23 [0.86, 1.61]  1.15 [0.97, 1.33]
wrist_flex      1.09 [0.96, 1.21]  0.23 [0.17, 0.29]
wrist_roll      0.42 [0.35, 0.50]  0.13 [0.11, 0.17]

fraction of states outside the fit episodes' range of motion +-2 deg: {'shoulder_pan': 0.0165, 'shoulder_lift': 0.0, 'elbow_flex': 0.0, 'wrist_flex': 0.0, 'wrist_roll': 0.0}
fraction of states outside the twin's joint range: stock {'shoulder_pan': 0.0, 'shoulder_lift': 0.1123, 'elbow_flex': 0.0, 'wrist_flex': 0.2675, 'wrist_roll': 0.0}; calibrated {'shoulder_pan': 0.0, 'shoulder_lift': 0.0, 'elbow_flex': 0.0, 'wrist_flex': 0.0, 'wrist_roll': 0.0}
```

## Interleaved held-out (random episodes from the same period as the fit episodes), n = 120

Per joint, mean over episodes [95% CI]. Degrees. Change = calibrated vs stock, negative = better.

```
sim-vs-real RMSE  stock                         aligned stock      baseline           calibrated                    change vs stock  vs baseline
----------------  ----------------------------  -----------------  -----------------  ----------------------------  ---------------  ---------------
shoulder_pan      0.46 [0.44, 0.48] (p90 0.59)  0.68 [0.66, 0.71]  0.49 [0.48, 0.51]  0.29 [0.28, 0.31] (p90 0.41)  -36% [-38, -33]  -40% [-43, -38]
shoulder_lift     1.48 [1.44, 1.53] (p90 1.81)  1.97 [1.93, 2.01]  0.92 [0.89, 0.94]  0.86 [0.83, 0.88] (p90 1.04)  -42% [-44, -41]  -7% [-9, -4]
elbow_flex        2.45 [2.36, 2.54] (p90 2.93)  2.14 [2.07, 2.23]  1.57 [1.51, 1.64]  1.34 [1.26, 1.42] (p90 1.73)  -45% [-49, -42]  -15% [-18, -11]
wrist_flex        0.88 [0.85, 0.91] (p90 1.09)  0.76 [0.74, 0.79]  0.68 [0.66, 0.71]  0.42 [0.40, 0.44] (p90 0.58)  -53% [-55, -50]  -39% [-41, -37]
wrist_roll        0.52 [0.50, 0.53] (p90 0.62)  0.43 [0.42, 0.44]  0.42 [0.41, 0.44]  0.19 [0.18, 0.20] (p90 0.24)  -64% [-65, -62]  -56% [-58, -54]
arm_mean          1.16 [1.14, 1.18] (p90 1.27)  1.20 [1.18, 1.22]  0.82 [0.80, 0.83]  0.62 [0.60, 0.64] (p90 0.73)  -46% [-48, -45]  -24% [-26, -23]

static-frame RMSE (quasi-static holds)  stock  baseline  calibrated  episodes with >= 10 static frames
--------------------------------------  -----  --------  ----------  ---------------------------------
shoulder_pan                            n/a    n/a       n/a         0
shoulder_lift                           n/a    n/a       n/a         0
elbow_flex                              n/a    n/a       n/a         0
wrist_flex                              n/a    n/a       n/a         0
wrist_roll                              n/a    n/a       n/a         0
arm_mean                                n/a    n/a       n/a         0

command tracking RMSE  real robot         stock twin         calibrated twin
---------------------  -----------------  -----------------  -----------------
shoulder_pan           1.82 [1.76, 1.89]  1.64 [1.57, 1.71]  1.78 [1.72, 1.84]
shoulder_lift          3.93 [3.80, 4.05]  3.38 [3.28, 3.48]  3.92 [3.83, 4.02]
elbow_flex             5.23 [5.13, 5.33]  3.30 [3.21, 3.38]  5.29 [5.20, 5.37]
wrist_flex             1.78 [1.73, 1.83]  1.67 [1.62, 1.71]  1.75 [1.71, 1.78]
wrist_roll             1.43 [1.37, 1.50]  1.04 [0.98, 1.09]  1.45 [1.39, 1.51]

lag (frames)   real               stock              calibrated         real ms  stock ms  calib ms
-------------  -----------------  -----------------  -----------------  -------  --------  --------
shoulder_pan   3.79 [3.77, 3.82]  3.62 [3.62, 3.63]  3.81 [3.79, 3.83]  126      121       127
shoulder_lift  4.00 [3.98, 4.02]  3.61 [3.60, 3.62]  4.04 [4.01, 4.07]  133      120       135
elbow_flex     3.79 [3.71, 3.86]  3.38 [3.37, 3.39]  4.22 [4.17, 4.27]  126      113       141
wrist_flex     3.51 [3.45, 3.56]  2.86 [2.81, 2.91]  3.49 [3.45, 3.53]  117      95        116
wrist_roll     4.06 [4.00, 4.12]  3.28 [3.27, 3.29]  4.17 [4.10, 4.25]  135      109       139

final-pose gap  stock              calibrated
--------------  -----------------  -----------------
shoulder_pan    0.44 [0.40, 0.48]  0.18 [0.16, 0.20]
shoulder_lift   1.96 [1.73, 2.18]  0.64 [0.55, 0.73]
elbow_flex      1.73 [1.44, 2.04]  1.53 [1.37, 1.72]
wrist_flex      1.00 [0.91, 1.08]  0.28 [0.24, 0.32]
wrist_roll      0.43 [0.39, 0.47]  0.12 [0.10, 0.14]

fraction of states outside the fit episodes' range of motion +-2 deg: {'shoulder_pan': 0.0051, 'shoulder_lift': 0.0, 'elbow_flex': 0.0, 'wrist_flex': 0.0, 'wrist_roll': 0.0028}
fraction of states outside the twin's joint range: stock {'shoulder_pan': 0.0, 'shoulder_lift': 0.0906, 'elbow_flex': 0.0474, 'wrist_flex': 0.2939, 'wrist_roll': 0.0}; calibrated {'shoulder_pan': 0.0, 'shoulder_lift': 0.0, 'elbow_flex': 0.0, 'wrist_flex': 0.0, 'wrist_roll': 0.0}
```

## Fit episodes (used by the fit), n = 40

Per joint, mean over episodes [95% CI]. Degrees. Change = calibrated vs stock, negative = better.

```
sim-vs-real RMSE  stock                         aligned stock      baseline           calibrated                    change vs stock  vs baseline
----------------  ----------------------------  -----------------  -----------------  ----------------------------  ---------------  ---------------
shoulder_pan      0.42 [0.40, 0.44] (p90 0.49)  0.65 [0.61, 0.68]  0.46 [0.44, 0.48]  0.25 [0.23, 0.27] (p90 0.33)  -41% [-44, -37]  -46% [-50, -43]
shoulder_lift     1.41 [1.33, 1.50] (p90 1.83)  1.90 [1.83, 1.97]  0.88 [0.83, 0.93]  0.84 [0.80, 0.88] (p90 0.99)  -40% [-43, -38]  -4% [-8, -0]
elbow_flex        2.47 [2.33, 2.61] (p90 2.96)  2.11 [1.98, 2.26]  1.54 [1.43, 1.66]  1.26 [1.14, 1.39] (p90 1.60)  -49% [-54, -43]  -18% [-23, -13]
wrist_flex        0.90 [0.85, 0.95] (p90 1.12)  0.74 [0.70, 0.78]  0.63 [0.58, 0.69]  0.39 [0.35, 0.44] (p90 0.53)  -56% [-61, -51]  -38% [-41, -35]
wrist_roll        0.54 [0.52, 0.57] (p90 0.65)  0.44 [0.42, 0.46]  0.45 [0.42, 0.47]  0.19 [0.18, 0.20] (p90 0.24)  -65% [-67, -63]  -57% [-59, -55]
arm_mean          1.15 [1.11, 1.18] (p90 1.30)  1.17 [1.14, 1.20]  0.79 [0.77, 0.82]  0.59 [0.56, 0.61] (p90 0.68)  -49% [-51, -46]  -26% [-28, -24]

static-frame RMSE (quasi-static holds)  stock  baseline  calibrated  episodes with >= 10 static frames
--------------------------------------  -----  --------  ----------  ---------------------------------
shoulder_pan                            n/a    n/a       n/a         0
shoulder_lift                           n/a    n/a       n/a         0
elbow_flex                              n/a    n/a       n/a         0
wrist_flex                              n/a    n/a       n/a         0
wrist_roll                              n/a    n/a       n/a         0
arm_mean                                n/a    n/a       n/a         0

command tracking RMSE  real robot         stock twin         calibrated twin
---------------------  -----------------  -----------------  -----------------
shoulder_pan           1.77 [1.67, 1.87]  1.60 [1.49, 1.71]  1.75 [1.65, 1.84]
shoulder_lift          3.64 [3.42, 3.85]  3.16 [3.00, 3.32]  3.70 [3.54, 3.86]
elbow_flex             5.11 [4.96, 5.25]  3.11 [2.99, 3.24]  5.08 [4.95, 5.21]
wrist_flex             1.75 [1.68, 1.83]  1.65 [1.56, 1.73]  1.74 [1.67, 1.80]
wrist_roll             1.42 [1.30, 1.53]  0.99 [0.88, 1.10]  1.41 [1.29, 1.52]

lag (frames)   real               stock              calibrated         real ms  stock ms  calib ms
-------------  -----------------  -----------------  -----------------  -------  --------  --------
shoulder_pan   3.80 [3.75, 3.84]  3.62 [3.62, 3.63]  3.82 [3.78, 3.86]  127      121       127
shoulder_lift  3.97 [3.93, 4.01]  3.62 [3.61, 3.63]  4.07 [4.02, 4.11]  132      121       136
elbow_flex     3.85 [3.74, 3.95]  3.40 [3.38, 3.42]  4.25 [4.16, 4.35]  128      113       142
wrist_flex     3.58 [3.49, 3.67]  2.88 [2.80, 2.96]  3.58 [3.51, 3.66]  119      96        119
wrist_roll     4.23 [4.10, 4.36]  3.30 [3.28, 3.33]  4.29 [4.15, 4.43]  141      110       143

final-pose gap  stock              calibrated
--------------  -----------------  -----------------
shoulder_pan    0.42 [0.34, 0.49]  0.19 [0.14, 0.23]
shoulder_lift   2.06 [1.66, 2.46]  0.62 [0.44, 0.81]
elbow_flex      1.60 [1.09, 2.15]  1.25 [1.00, 1.53]
wrist_flex      1.05 [0.90, 1.19]  0.23 [0.17, 0.29]
wrist_roll      0.53 [0.46, 0.60]  0.16 [0.12, 0.20]
```

## Calibrated twin

Package `calibrated_twin.json`, sha256 `0aac6471294ecd9fa1270743df6a3e57fdc4bf14ef9c80b69acf6f614cf541e6`.
Fitted: kp[shoulder_pan], kv[shoulder_pan], frictionloss[shoulder_pan], kp[shoulder_lift], kv[shoulder_lift], frictionloss[shoulder_lift], kp[elbow_flex], kv[elbow_flex], frictionloss[elbow_flex], kp[wrist_flex], kv[wrist_flex], frictionloss[wrist_flex], kp[wrist_roll], kv[wrist_roll], frictionloss[wrist_roll]; command delay 0 frame(s) (screened train MSE by delay, deg^2: {'0': 0.78599, '1': 0.93206, '2': 1.37298, '3': 1.97031, '4': 2.4955, '5': 4.00916}). Train MSE 0.54951 deg^2. Optimizer: converged (`ftol` termination condition is satisfied.). At a bound: none.

```
joint          kp N m/rad   kv N m s/rad  frictionloss N m  armature kg m^2  zero offset deg
-------------  -----------  ------------  ----------------  ---------------  -----------------
shoulder_pan   50 -> 27.45  5.13 -> 2.52  0.1 -> 0.281      0.1 (fixed)      +0.0 (documented)
shoulder_lift  50 -> 17.29  4.96 -> 1.46  0.1 -> 0.379      0.1 (fixed)      +0.0 (documented)
elbow_flex     50 -> 20.05  4.63 -> 1.86  0.1 -> 0.804      0.1 (fixed)      +0.0 (documented)
wrist_flex     50 -> 25.41  4.49 -> 2.06  0.1 -> 0.373      0.1 (fixed)      +0.0 (documented)
wrist_roll     50 -> 33.04  4.47 -> 3.03  0.1 -> 0.384      0.1 (fixed)      +0.0 (documented)
```

Identifiable servo combinations (the individual gains are not the claim): natural frequency sqrt(kp/I_eff) and damping ratio (kv+damping)/(2 sqrt(kp I_eff)), I_eff = joint-space inertia at the median pose incl. armature; 95% CI from a linearised episode bootstrap of the fit.

```
joint          I_eff kg m^2  natural freq Hz [CI]  damping ratio [CI]
-------------  ------------  --------------------  --------------------
shoulder_pan   0.1121        2.49 [2.43, 2.55]     0.719 [0.702, 0.734]
shoulder_lift  0.1134        1.97 [1.94, 1.99]     0.521 [0.502, 0.539]
elbow_flex     0.1056        2.19 [2.11, 2.29]     0.638 [0.592, 0.68]
wrist_flex     0.1012        2.52 [2.44, 2.61]     0.644 [0.607, 0.675]
wrist_roll     0.1           2.89 [2.78, 3]        0.834 [0.797, 0.865]
```

Per-parameter identifiability (condition number of J^T J 11600.0): marginal/conditional std ratio = sqrt(VIF); >= 10 means only a combination with other parameters is identified.

```
parameter                    value   95% CI          std ratio  identified alone
---------------------------  ------  --------------  ---------  ----------------
kp[shoulder_pan]             27.45   [26.2, 28.8]    9.12       yes
kv[shoulder_pan]             2.522   [2.41, 2.63]    7.58       yes
frictionloss[shoulder_pan]   0.2814  [0.262, 0.301]  2.58       yes
kp[shoulder_lift]            17.29   [16.9, 17.7]    2.49       yes
kv[shoulder_lift]            1.46    [1.4, 1.52]     2.73       yes
frictionloss[shoulder_lift]  0.3791  [0.357, 0.405]  1.53       yes
kp[elbow_flex]               20.05   [18.6, 21.8]    5.37       yes
kv[elbow_flex]               1.857   [1.67, 2.05]    3.83       yes
frictionloss[elbow_flex]     0.8038  [0.702, 0.922]  2.54       yes
kp[wrist_flex]               25.41   [23.8, 27.1]    4.83       yes
kv[wrist_flex]               2.064   [1.89, 2.23]    3.84       yes
frictionloss[wrist_flex]     0.373   [0.346, 0.399]  2.08       yes
kp[wrist_roll]               33.04   [30.5, 35.6]    10.2       NO
kv[wrist_roll]               3.033   [2.79, 3.26]    7.54       yes
frictionloss[wrist_roll]     0.3836  [0.35, 0.417]   3.84       yes
```

Posterior correlations |r| > 0.95: kp[shoulder_pan] ~ kv[shoulder_pan] (+0.985); kp[wrist_roll] ~ kv[wrist_roll] (+0.984)

Weakest directions (relative eigenvalue: top loadings): 8.6e-05: kp[wrist_roll] +0.72, frictionloss[wrist_roll] +0.55, kv[wrist_roll] +0.43, kp[shoulder_pan] +0.00; 0.00021: kp[shoulder_pan] +0.81, frictionloss[shoulder_pan] +0.44, kv[shoulder_pan] +0.40, frictionloss[wrist_flex] +0.00; 0.00072: kp[wrist_flex] -0.75, frictionloss[wrist_flex] -0.61, kv[wrist_flex] -0.26, kp[elbow_flex] +0.00

Physics-free baseline (fitted on the same fit episodes): y[t+1] = y[t] + alpha*(a[t-d] + b - y[t]), y[0] = x[0], per arm joint; alpha [0.36, 0.34, 0.26, 0.38, 0.24], delay [1, 1, 0, 1, 0] frames, bias [-0.0283, -1.7705, 2.0701, 0.1555, 0.1464] deg.

## Mapping audit

Sign checks (1st-99th percentile of FIT-episode states vs MJCF range):

```
joint          recorded p1..p99 deg  MJCF range deg     shift (doc sign)  shift (flipped)  decision
-------------  --------------------  -----------------  ----------------  ---------------  ---------------------------------------------------------------------------
shoulder_pan   [-51.15, 44.3]        [-110.01, 110.01]  0.0               0.0              documented sign (flipped sign would also fit: sign not identified by range)
shoulder_lift  [33.75, 190.63]       [-190.22, 9.97]    180.67            0.41             flipped sign (documented sign does not fit the MJCF range)
elbow_flex     [7.89, 180.44]        [-9.97, 179.91]    0.53              170.47           documented sign
wrist_flex     [35.86, 96.86]        [-95.11, 95.11]    1.74              1.74             documented sign (flipped sign would also fit: sign not identified by range)
wrist_roll     [-51.5, 47.72]        [-159.86, 159.86]  0.0               0.0              documented sign (flipped sign would also fit: sign not identified by range)

same rule on other subsets (robustness): all_episodes: signs [1, -1, 1, 1, 1], accepted; heldout_only: signs [1, -1, 1, 1, 1], accepted -> agrees
released stock limits (crossed by fit episodes): {'shoulder_lift': {'lower': True, 'upper': False}, 'elbow_flex': {'lower': False, 'upper': True}, 'wrist_flex': {'lower': False, 'upper': True}}
```

Forward-kinematics plausibility under the shipped mapping (evidence, not a gate; assumes the base sits on the work surface):

```
gripper lowest point minus base lowest point (m): {'p1': 0.045, 'p5': 0.049, 'p50': 0.139, 'min': 0.039}; frames > 2 cm below the base: 0.0
frames within 1 deg of a stock MJCF limit: {'shoulder_pan': 0.0, 'shoulder_lift': 0.1145, 'elbow_flex': 0.0879, 'wrist_flex': 0.0882, 'wrist_roll': 0.0}
frames beyond a stock MJCF limit: {'shoulder_pan': 0.0, 'shoulder_lift': 0.0, 'elbow_flex': 0.0, 'wrist_flex': 0.2217, 'wrist_roll': 0.0}
```

Gravity sag on real static frames (middle 80% of each episode, gripper >= 3 cm above the base plane): centred correlation between the servo's static error and the twin's gravity torque at the mapped pose, and the implied static stiffness (centred slope). Positive supports the mapping. Evidence, not a gate.

```
joint          corr [CI] verdict                                                                                         power (gravity std, n)  implied static K N m/rad  fitted kp
-------------  --------------------------------------------------------------------------------------------------------  ----------------------  ------------------------  ---------
shoulder_pan   not testable (gravity torque ~constant over the selected static poses; gravity std 0.0 N m, 3 frames)                                                       27.4
shoulder_lift  not testable (gravity torque ~constant over the selected static poses; gravity std 0.0002 N m, 3 frames)                                                    17.3
elbow_flex     not testable (gravity torque ~constant over the selected static poses; gravity std 0.0002 N m, 3 frames)                                                    20
wrist_flex     not testable (gravity torque ~constant over the selected static poses; gravity std 0.0002 N m, 3 frames)                                                    25.4
wrist_roll     not testable (gravity torque ~constant over the selected static poses; gravity std 0.0 N m, 3 frames)                                                       33
static frames: 3 (0 excluded as possible table contact) from 1 fit episodes
```

## Method

- Recording convention (lerobot-legacy): Legacy LeRobot (ManipulatorRobot.teleop_step, `main_*` names): the goal a[t] is WRITTEN to the follower first and the follower state x[t] is READ afterwards (a few ms later), so x[t] may already contain a few ms of response to a[t] (act-then-observe).
- Replay: Replay (identical for both conventions): q_sim[0]=x[0] (zero velocity); for t=0..T-2 apply ctrl=a[t-d] (d = fitted integer command delay, stock d=0) for the whole frame, step `substeps` physics steps (timestep set so substeps*timestep = 1/fps exactly), record q_sim[t+1]; sim and real are compared at the same index t=1..T-1. The real sub-frame send-to-read offset (legacy: a[t] sent a few ms BEFORE x[t] is read; current: a[t] sent a few ms AFTER) is not modelled; it is absorbed by the fitted dynamics/delay, and it shifts lags between the two conventions by a fraction of a frame in opposite directions.
- Lag: lag = argmin_L Var(a[t] - y[t+L]) over a fixed window t in [0, T-10), parabolic sub-frame refinement; y = real or sim state. Includes the 1-frame sampling offset: in the replay and in observe-then-act (current LeRobot) recordings an instantaneous actuator measures 1.0 frame; in act-then-observe (legacy) recordings it would measure ~0, and a realistic servo measures its delay minus the few-ms write-to-read gap. Lags are therefore directly comparable between sim and real within one dataset, and only approximately (fraction of a frame) across codebases. Also reported in ms, since datasets differ in fps. Joints with command std < 1 deg in an episode are skipped.
- Units: legacy LeRobot degrees (tick = 180/2048 deg verified on every arm joint) (decided on the fit episodes; held-out episodes agree). Mapping to MJCF: q = sign*deg2rad(x) + deg2rad(offset); legacy LeRobot zero pose = arm straight horizontal (feetech_calibration.py); the MJCF zero (from the SO-ARM100 URDF) is also the arm stretched horizontally forward, so nominal offsets are 0. Documented signs +1 (MJCF joint axes); legacy LeRobot sets each motor's direction from the user's 'rotated position', so signs are checked per dataset against the recorded range of motion (mapping_checks).
- Split: future = last round(n*test_frac) episodes by index; interleaved = round(n*test_frac) episodes of the rest drawn by numpy default_rng(seed).permutation, plus every remaining episode beyond the fit cap; fit = the remaining episodes (<= max_train_episodes) (seed 0). Future: [160, 161, 162, 163, 164, 165, 166, 167, 168, 169, 170, 171, 172, 173, 174, 175, 176, 177, 178, 179, 180, 181, 182, 183, 184, 185, 186, 187, 188, 189, 190, 191, 192, 193, 194, 195, 196, 197, 198, 199]. Interleaved: [0, 3, 4, 5, 6, 7, 10, 12, 13, 14, 15, 16, 17, 18, 21, 24, 26, 28, 29, 30, 31, 32, 33, 35, 41, 42, 45, 46, 47, 49, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 75, 76, 77, 78, 79, 81, 82, 83, 84, 85, 86, 88, 89, 90, 92, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 106, 107, 109, 110, 112, 113, 114, 115, 117, 118, 119, 120, 121, 125, 126, 127, 128, 129, 130, 131, 132, 133, 135, 137, 138, 139, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 152, 153, 155, 156, 158, 159]. Overlap with fit: none.
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
- Confidence intervals are percentile bootstraps over episodes (whole episodes resampled, 10,000 draws, fixed seed); with 40 future / 120 interleaved held-out episodes they are approximate and tend to be slightly too narrow. They do not cover the choice of split, of fit configuration, or of dataset.
- Recorded with legacy LeRobot (act-then-observe); lags are not exactly comparable with current-LeRobot (observe-then-act) datasets (see conventions).
- Stock MJCF limits crossed by the fit episodes and released in the aligned/calibrated twins: shoulder_lift lower, elbow_flex upper, wrist_flex upper. The stock twin is held at those limits (counted as stock-twin error).
- Not identified individually (marginal/conditional std ratio >= 10): kp[wrist_roll]. Only combinations of them are constrained by the data (see identifiability); individual values are not meaningful.
- Joint direction flipped relative to the documented convention for shoulder_lift (chosen from the recorded range of motion vs the MJCF range; see mapping_checks).

## Provenance and reproduction

```
dataset        shylee/so100_pengripG @ ade2e0afcac795b99e36b22c3ef734b877de0410 (requested ade2e0afcac795b99e36b22c3ef734b877de0410)
               LeRobot v2.1, robot_type so100, 30 fps, 200 episodes loaded (repo: 300), 0 dropped
data files     data/chunk-000/episode_000000.parquet (b87593c0dcd1), data/chunk-000/episode_000001.parquet (d56fb1791f9e), data/chunk-000/episode_000002.parquet (12ff8f5f0a3e), ... (200 files)
twin           trs_so_arm100 (so_arm100.xml) from https://github.com/google-deepmind/mujoco_menagerie @ b0655057a9df2abe39ea7fc989914ba6f248301c
               dir sha256 4f3b0f21b8a2b889..., timestep 0.002 -> 0.00196078 s x 17 substeps/frame, contacts disabled
software       mujoco 3.17.0, numpy 2.5.4, scipy 1.18.1, python 3.13.18, meatspace_lab 2.0.0 (code sha256 924eb3d8364be665...)
hardware       x86_64 Intel(R) Xeon(R) Processor @ 2.80GHz; OpenBLAS kernel numpy: SkylakeX; scipy: SkylakeX
report         schema meatspace.twin-gap-report/v2
               results sha256 a745e74db4cbd551ffba9f379b311927c7164c6c2ca68b4569c134eb2afa66b8  (numbers only; any interpreter/CPU)
               content sha256 c0fc468f028c6ffe8fbeab00d601f0ea7f95beeacee9d4a6d58016a32b7d7b9a  (numbers + environment above)
```

Reproduce (from `lab/`, see README) into a scratch directory and compare:

```
python -m meatspace_lab report --dataset shylee/so100_pengripG --revision ade2e0afcac795b99e36b22c3ef734b877de0410 \
    --twin .cache/menagerie/trs_so_arm100 --out /tmp/repro/ --max-episodes 200
python -m meatspace_lab verify reports/shylee__so100_pengripG/report.json /tmp/repro/report.json
```
