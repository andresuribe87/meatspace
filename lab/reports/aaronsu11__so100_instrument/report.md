# Twin Gap Report: aaronsu11/so100_instrument x trs_so_arm100

```
HELD-OUT sim-vs-real joint RMSE, mean of 5 arm joints, deg  [95% bootstrap CI over episodes]
change = calibrated/reference - 1 (negative = better), paired by episode

FUTURE BLOCK (25 episodes)
  stock twin             0.94 [0.85, 1.04]
  aligned stock          0.74 [0.72, 0.76]   (stock dynamics + delay + released limits)
  lag-filter baseline    0.63 [0.61, 0.64]   (no physics: 3 params/joint)
  calibrated twin        0.58 [0.55, 0.60]
  change vs stock        -39% [-44, -33]   per-episode median -38% (range -55% .. -2%); 25/25 improved
  change vs baseline     -8% [-11, -4]   19/25 improved
  verdict                closes part of the gap (-39% [-44, -33] vs stock, residual 0.58 deg); calibrated twin beats the physics-free lag filter (-8% [-11, -4])

INTERLEAVED HELD-OUT (60 episodes)
  stock twin             1.22 [1.04, 1.43]
  aligned stock          0.96 [0.74, 1.30]   (stock dynamics + delay + released limits)
  lag-filter baseline    0.89 [0.68, 1.23]   (no physics: 3 params/joint)
  calibrated twin        0.76 [0.55, 1.10]
  change vs stock        -38% [-52, -18]   per-episode median -47% (range -82% .. +131%); 58/60 improved
  change vs baseline     -15% [-20, -10]   59/60 improved
  verdict                closes part of the gap (-38% [-52, -18] vs stock, residual 0.76 deg); calibrated twin beats the physics-free lag filter (-15% [-20, -10])

command->state lag, interleaved held-out, ms per joint (real / stock / calibrated):
  shoulder_pan 114/124/113  shoulder_lift 126/122/129  elbow_flex 117/111/129  wrist_flex 110/92/118  wrist_roll 108/108/122
  max |twin - real| over joints: stock 17.8 ms, calibrated 14.4 ms
```

![future-block held-out episode](heldout_episode.svg)

![per-joint RMSE, future block](rmse_by_joint_future.svg)

![per-joint RMSE, interleaved held-out](rmse_by_joint.svg)

## Future block (held out: the last 20% of episodes by index, recorded after every fit episode), n = 25

Per joint, mean over episodes [95% CI]. Degrees. Change = calibrated vs stock, negative = better.

```
sim-vs-real RMSE  stock                         aligned stock      baseline           calibrated                    change vs stock     vs baseline
----------------  ----------------------------  -----------------  -----------------  ----------------------------  ------------------  ---------------
shoulder_pan      0.28 [0.26, 0.30] (p90 0.34)  0.28 [0.26, 0.30]  0.35 [0.32, 0.37]  0.20 [0.19, 0.22] (p90 0.26)  -27% [-32, -21]     -41% [-44, -39]
shoulder_lift     1.38 [1.33, 1.42] (p90 1.53)  1.38 [1.33, 1.42]  0.96 [0.91, 1.01]  0.86 [0.81, 0.91] (p90 1.06)  -38% [-41, -34]     -11% [-16, -5]
elbow_flex        1.39 [1.33, 1.46] (p90 1.61)  1.40 [1.33, 1.46]  0.67 [0.63, 0.70]  0.81 [0.75, 0.87] (p90 1.01)  -42% [-47, -36]     +21% [+10, +33]
wrist_flex        1.39 [0.94, 1.86] (p90 2.92)  0.35 [0.29, 0.41]  0.43 [0.37, 0.49]  0.32 [0.29, 0.37] (p90 0.47)  -77% [-81, -69]     -25% [-29, -20]
wrist_roll        0.28 [0.25, 0.32] (p90 0.42)  0.28 [0.25, 0.32]  0.72 [0.70, 0.75]  0.68 [0.60, 0.78] (p90 1.03)  +141% [+122, +161]  -5% [-17, +7]
arm_mean          0.94 [0.85, 1.04] (p90 1.26)  0.74 [0.72, 0.76]  0.63 [0.61, 0.64]  0.58 [0.55, 0.60] (p90 0.65)  -39% [-44, -33]     -8% [-11, -4]

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
shoulder_pan           0.88 [0.80, 0.96]  0.90 [0.79, 1.00]  0.84 [0.77, 0.92]
shoulder_lift          3.68 [3.44, 3.91]  3.85 [3.63, 4.07]  3.63 [3.46, 3.81]
elbow_flex             4.47 [4.34, 4.61]  3.44 [3.29, 3.60]  4.40 [4.28, 4.53]
wrist_flex             1.72 [1.58, 1.87]  2.62 [2.24, 3.01]  1.76 [1.61, 1.91]
wrist_roll             2.07 [1.61, 2.54]  1.89 [1.47, 2.34]  2.05 [1.78, 2.34]

lag (frames)   real               stock              calibrated         real ms  stock ms  calib ms
-------------  -----------------  -----------------  -----------------  -------  --------  --------
shoulder_pan   3.52 [3.42, 3.64]  3.75 [3.70, 3.80]  3.57 [3.46, 3.68]  117      125       119
shoulder_lift  3.56 [3.52, 3.58]  3.57 [3.56, 3.59]  3.51 [3.46, 3.58]  119      119       117
elbow_flex     3.34 [3.29, 3.38]  3.25 [3.24, 3.26]  3.45 [3.39, 3.51]  111      108       115
wrist_flex     3.19 [3.16, 3.22]  2.97 [2.74, 3.16]  3.35 [3.31, 3.40]  106      99        112
wrist_roll     3.46 [3.39, 3.55]  3.27 [3.23, 3.33]  3.81 [3.43, 4.26]  115      109       127

final-pose gap  stock              calibrated
--------------  -----------------  -----------------
shoulder_pan    0.20 [0.15, 0.25]  0.14 [0.11, 0.17]
shoulder_lift   1.65 [1.45, 1.82]  0.88 [0.74, 1.01]
elbow_flex      1.27 [0.92, 1.61]  0.78 [0.57, 1.01]
wrist_flex      3.17 [2.10, 4.24]  0.44 [0.31, 0.57]
wrist_roll      0.29 [0.24, 0.33]  0.53 [0.45, 0.60]

fraction of states outside the fit episodes' range of motion +-2 deg: {'shoulder_pan': 0.0, 'shoulder_lift': 0.0179, 'elbow_flex': 0.0344, 'wrist_flex': 0.0, 'wrist_roll': 0.0183}
fraction of states outside the twin's joint range: stock {'shoulder_pan': 0.0, 'shoulder_lift': 0.0, 'elbow_flex': 0.0, 'wrist_flex': 0.1385, 'wrist_roll': 0.0}; calibrated {'shoulder_pan': 0.0, 'shoulder_lift': 0.0, 'elbow_flex': 0.0, 'wrist_flex': 0.0, 'wrist_roll': 0.0}
```

## Interleaved held-out (random episodes from the same period as the fit episodes), n = 60

Per joint, mean over episodes [95% CI]. Degrees. Change = calibrated vs stock, negative = better.

```
sim-vs-real RMSE  stock                         aligned stock      baseline           calibrated                    change vs stock  vs baseline
----------------  ----------------------------  -----------------  -----------------  ----------------------------  ---------------  ---------------
shoulder_pan      0.45 [0.40, 0.52] (p90 0.62)  0.45 [0.40, 0.52]  0.42 [0.37, 0.48]  0.35 [0.29, 0.41] (p90 0.47)  -24% [-30, -18]  -18% [-22, -14]
shoulder_lift     1.13 [1.04, 1.21] (p90 1.50)  1.13 [1.04, 1.21]  0.89 [0.83, 0.95]  0.71 [0.67, 0.75] (p90 0.91)  -37% [-41, -33]  -20% [-23, -17]
elbow_flex        1.32 [1.25, 1.38] (p90 1.71)  1.32 [1.25, 1.38]  0.80 [0.77, 0.84]  0.61 [0.58, 0.64] (p90 0.77)  -54% [-56, -51]  -24% [-29, -19]
wrist_flex        1.62 [1.32, 1.94] (p90 3.06)  0.47 [0.43, 0.51]  0.52 [0.48, 0.57]  0.36 [0.33, 0.40] (p90 0.50)  -78% [-81, -73]  -31% [-33, -28]
wrist_roll        1.60 [0.67, 2.74] (p90 1.63)  1.43 [0.35, 3.10]  1.83 [0.80, 3.46]  1.78 [0.74, 3.43] (p90 0.82)  +11% [-42, +98]  -2% [-8, -0]
arm_mean          1.22 [1.04, 1.43] (p90 1.72)  0.96 [0.74, 1.30]  0.89 [0.68, 1.23]  0.76 [0.55, 1.10] (p90 0.80)  -38% [-52, -18]  -15% [-20, -10]

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
shoulder_pan           1.16 [1.05, 1.28]  1.24 [1.09, 1.38]  1.07 [0.96, 1.17]
shoulder_lift          2.44 [2.27, 2.60]  2.24 [2.08, 2.41]  2.43 [2.31, 2.56]
elbow_flex             3.21 [3.10, 3.32]  2.27 [2.14, 2.42]  3.22 [3.11, 3.34]
wrist_flex             1.49 [1.34, 1.64]  2.47 [2.18, 2.78]  1.47 [1.34, 1.61]
wrist_roll             2.60 [1.54, 4.28]  3.86 [2.04, 6.34]  1.81 [1.69, 1.94]

lag (frames)   real               stock              calibrated         real ms  stock ms  calib ms
-------------  -----------------  -----------------  -----------------  -------  --------  --------
shoulder_pan   3.42 [3.31, 3.54]  3.72 [3.69, 3.74]  3.40 [3.32, 3.49]  114      124       113
shoulder_lift  3.77 [3.72, 3.82]  3.65 [3.64, 3.67]  3.86 [3.79, 3.92]  126      122       129
elbow_flex     3.52 [3.44, 3.60]  3.32 [3.31, 3.33]  3.88 [3.78, 3.99]  117      111       129
wrist_flex     3.30 [3.24, 3.35]  2.77 [2.54, 2.97]  3.54 [3.47, 3.61]  110      92        118
wrist_roll     3.23 [3.20, 3.27]  3.24 [3.20, 3.27]  3.66 [3.53, 3.80]  108      108       122

final-pose gap  stock              calibrated
--------------  -----------------  -----------------
shoulder_pan    0.17 [0.14, 0.21]  0.14 [0.11, 0.17]
shoulder_lift   1.07 [0.86, 1.27]  0.75 [0.67, 0.83]
elbow_flex      0.58 [0.40, 0.80]  0.41 [0.33, 0.50]
wrist_flex      2.67 [2.05, 3.34]  0.38 [0.30, 0.48]
wrist_roll      0.23 [0.20, 0.26]  0.57 [0.50, 0.62]

fraction of states outside the fit episodes' range of motion +-2 deg: {'shoulder_pan': 0.0155, 'shoulder_lift': 0.0012, 'elbow_flex': 0.0053, 'wrist_flex': 0.0, 'wrist_roll': 0.0074}
fraction of states outside the twin's joint range: stock {'shoulder_pan': 0.0, 'shoulder_lift': 0.0, 'elbow_flex': 0.0, 'wrist_flex': 0.1834, 'wrist_roll': 0.0768}; calibrated {'shoulder_pan': 0.0, 'shoulder_lift': 0.0, 'elbow_flex': 0.0, 'wrist_flex': 0.0, 'wrist_roll': 0.0}
```

## Fit episodes (used by the fit), n = 40

Per joint, mean over episodes [95% CI]. Degrees. Change = calibrated vs stock, negative = better.

```
sim-vs-real RMSE  stock                          aligned stock      baseline           calibrated                    change vs stock  vs baseline
----------------  -----------------------------  -----------------  -----------------  ----------------------------  ---------------  ---------------
shoulder_pan      0.40 [0.36, 0.45] (p90 0.51)   0.40 [0.36, 0.45]  0.37 [0.33, 0.42]  0.30 [0.26, 0.35] (p90 0.39)  -26% [-32, -20]  -19% [-22, -16]
shoulder_lift     1.11 [1.02, 1.20] (p90 1.41)   1.11 [1.02, 1.20]  0.84 [0.78, 0.91]  0.67 [0.63, 0.71] (p90 0.84)  -39% [-43, -35]  -20% [-24, -16]
elbow_flex        1.33 [1.25, 1.42] (p90 1.64)   1.34 [1.26, 1.42]  0.83 [0.79, 0.87]  0.58 [0.55, 0.62] (p90 0.72)  -56% [-60, -52]  -29% [-35, -24]
wrist_flex        1.22 [0.91, 1.58] (p90 2.52)   0.44 [0.39, 0.49]  0.49 [0.44, 0.55]  0.34 [0.30, 0.39] (p90 0.50)  -72% [-78, -64]  -30% [-34, -26]
wrist_roll        3.05 [1.48, 4.73] (p90 12.47)  1.26 [0.53, 2.19]  1.59 [0.94, 2.44]  1.55 [0.89, 2.42] (p90 4.96)  -49% [-65, -21]  -2% [-6, -0]
arm_mean          1.42 [1.13, 1.75] (p90 3.12)   0.91 [0.77, 1.09]  0.82 [0.69, 0.99]  0.69 [0.56, 0.86] (p90 1.34)  -52% [-59, -43]  -16% [-20, -13]

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
shoulder_pan           1.04 [0.93, 1.15]  1.12 [0.97, 1.28]  0.99 [0.88, 1.09]
shoulder_lift          2.41 [2.22, 2.60]  2.19 [2.00, 2.39]  2.41 [2.26, 2.56]
elbow_flex             3.13 [2.98, 3.27]  2.16 [1.96, 2.35]  3.13 [2.98, 3.29]
wrist_flex             1.55 [1.37, 1.74]  2.16 [1.84, 2.53]  1.54 [1.38, 1.72]
wrist_roll             2.39 [1.73, 3.21]  5.02 [3.03, 7.35]  1.87 [1.75, 1.98]

lag (frames)   real               stock              calibrated         real ms  stock ms  calib ms
-------------  -----------------  -----------------  -----------------  -------  --------  --------
shoulder_pan   3.37 [3.27, 3.49]  3.73 [3.70, 3.76]  3.45 [3.35, 3.57]  112      124       115
shoulder_lift  3.78 [3.72, 3.83]  3.66 [3.64, 3.67]  3.88 [3.79, 3.98]  126      122       129
elbow_flex     3.59 [3.47, 3.74]  3.33 [3.31, 3.35]  4.00 [3.84, 4.19]  120      111       133
wrist_flex     3.30 [3.23, 3.36]  2.96 [2.74, 3.13]  3.50 [3.43, 3.58]  110      99        117
wrist_roll     3.22 [3.18, 3.26]  3.22 [3.18, 3.25]  3.55 [3.39, 3.72]  107      107       118

final-pose gap  stock              calibrated
--------------  -----------------  -----------------
shoulder_pan    0.19 [0.16, 0.23]  0.16 [0.12, 0.20]
shoulder_lift   1.20 [0.99, 1.42]  0.72 [0.59, 0.85]
elbow_flex      0.76 [0.48, 1.06]  0.45 [0.36, 0.54]
wrist_flex      2.29 [1.58, 3.04]  0.29 [0.20, 0.39]
wrist_roll      0.22 [0.19, 0.25]  0.61 [0.54, 0.68]
```

## Calibrated twin

Package `calibrated_twin.json`, sha256 `0ea5aab423e9a1a7950c47a8d5afbe617272b1e3415af29be4260b146090230a`.
Fitted: kp[shoulder_pan], kv[shoulder_pan], frictionloss[shoulder_pan], kp[shoulder_lift], kv[shoulder_lift], frictionloss[shoulder_lift], kp[elbow_flex], kv[elbow_flex], frictionloss[elbow_flex], kp[wrist_flex], kv[wrist_flex], frictionloss[wrist_flex], kp[wrist_roll], kv[wrist_roll], frictionloss[wrist_roll]; command delay 0 frame(s) (screened train MSE by delay, deg^2: {'0': 4.57351, '1': 4.76012, '2': 5.14833, '3': 5.42947, '4': 6.50663, '5': 8.37966}). Train MSE 1.93846 deg^2. Optimizer: converged (`ftol` termination condition is satisfied.). At a bound: none.

```
joint          kp N m/rad   kv N m s/rad  frictionloss N m  armature kg m^2  zero offset deg
-------------  -----------  ------------  ----------------  ---------------  -----------------
shoulder_pan   50 -> 42.48  5.13 -> 3.2   0.1 -> 0.261      0.1 (fixed)      +0.0 (documented)
shoulder_lift  50 -> 17.48  4.96 -> 1.21  0.1 -> 0.319      0.1 (fixed)      +0.0 (documented)
elbow_flex     50 -> 17.82  4.63 -> 1.42  0.1 -> 0.366      0.1 (fixed)      +0.0 (documented)
wrist_flex     50 -> 34.74  4.49 -> 2.76  0.1 -> 0.323      0.1 (fixed)      +0.0 (documented)
wrist_roll     50 -> 36.46  4.47 -> 2.27  0.1 -> 0.751      0.1 (fixed)      +0.0 (documented)
```

Identifiable servo combinations (the individual gains are not the claim): natural frequency sqrt(kp/I_eff) and damping ratio (kv+damping)/(2 sqrt(kp I_eff)), I_eff = joint-space inertia at the median pose incl. armature; 95% CI from a linearised episode bootstrap of the fit.

```
joint          I_eff kg m^2  natural freq Hz [CI]  damping ratio [CI]
-------------  ------------  --------------------  --------------------
shoulder_pan   0.1057        3.19 [3.05, 3.33]     0.756 [0.715, 0.787]
shoulder_lift  0.1073        2.03 [1.99, 2.07]     0.443 [0.418, 0.463]
elbow_flex     0.1061        2.06 [2.03, 2.1]      0.516 [0.491, 0.54]
wrist_flex     0.1011        2.95 [2.71, 3.25]     0.736 [0.679, 0.782]
wrist_roll     0.1           3.04 [2.66, 3.46]     0.594 [0.346, 0.761]
```

Per-parameter identifiability (condition number of J^T J 8310.0): marginal/conditional std ratio = sqrt(VIF); >= 10 means only a combination with other parameters is identified.

```
parameter                    value   95% CI          std ratio  identified alone
---------------------------  ------  --------------  ---------  ----------------
kp[shoulder_pan]             42.48   [38.9, 46.2]    10.3       NO
kv[shoulder_pan]             3.203   [2.9, 3.47]     8.47       yes
frictionloss[shoulder_pan]   0.2612  [0.224, 0.299]  2.85       yes
kp[shoulder_lift]            17.48   [16.8, 18.1]    2.33       yes
kv[shoulder_lift]            1.213   [1.12, 1.29]    2.3        yes
frictionloss[shoulder_lift]  0.3191  [0.285, 0.355]  1.51       yes
kp[elbow_flex]               17.82   [17.2, 18.5]    2.97       yes
kv[elbow_flex]               1.419   [1.33, 1.51]    2.47       yes
frictionloss[elbow_flex]     0.3659  [0.344, 0.388]  1.69       yes
kp[wrist_flex]               34.74   [29.3, 42.1]    8.58       yes
kv[wrist_flex]               2.761   [2.34, 3.21]    7.11       yes
frictionloss[wrist_flex]     0.3229  [0.251, 0.413]  2.48       yes
kp[wrist_roll]               36.46   [27.9, 47.2]    8.26       yes
kv[wrist_roll]               2.269   [1.15, 3.27]    5.36       yes
frictionloss[wrist_roll]     0.7507  [0.5, 1.06]     3.98       yes
```

Posterior correlations |r| > 0.95: kp[shoulder_pan] ~ kv[shoulder_pan] (+0.987); kp[wrist_flex] ~ kv[wrist_flex] (+0.982); kp[wrist_roll] ~ kv[wrist_roll] (+0.967)

Weakest directions (relative eigenvalue: top loadings): 0.00012: kp[shoulder_pan] -0.78, kv[shoulder_pan] -0.49, frictionloss[shoulder_pan] -0.39, kp[wrist_flex] +0.00; 0.00029: frictionloss[wrist_roll] +0.82, kp[wrist_roll] +0.52, kv[wrist_roll] +0.22, kp[shoulder_pan] +0.00; 0.0004: kp[wrist_flex] -0.76, frictionloss[wrist_flex] -0.51, kv[wrist_flex] -0.41, kp[elbow_flex] +0.00

Physics-free baseline (fitted on the same fit episodes): y[t+1] = y[t] + alpha*(a[t-d] + b - y[t]), y[0] = x[0], per arm joint; alpha [0.44, 0.58, 0.28, 0.3, 0.3], delay [1, 2, 0, 0, 0] frames, bias [0.128, -1.1856, 1.4729, 0.1633, 0.6946] deg.

## Mapping audit

Sign checks (1st-99th percentile of FIT-episode states vs MJCF range):

```
joint          recorded p1..p99 deg  MJCF range deg     shift (doc sign)  shift (flipped)  decision
-------------  --------------------  -----------------  ----------------  ---------------  ---------------------------------------------------------------------------
shoulder_pan   [-9.84, 50.55]        [-110.01, 110.01]  0.0               0.0              documented sign (flipped sign would also fit: sign not identified by range)
shoulder_lift  [66.45, 189.14]       [-190.22, 9.97]    179.17            0.0              flipped sign (documented sign does not fit the MJCF range)
elbow_flex     [56.95, 175.78]       [-9.97, 179.91]    0.0               165.81           documented sign
wrist_flex     [-60.91, 101.43]      [-95.11, 95.11]    6.31              6.31             documented sign (flipped sign would also fit: sign not identified by range)
wrist_roll     [-179.03, -22.3]      [-159.86, 159.86]  19.18             19.18            documented sign (flipped sign would also fit: sign not identified by range)

same rule on other subsets (robustness): all_episodes: signs [1, -1, 1, 1, 1], accepted; heldout_only: signs [1, -1, 1, 1, 1], accepted -> agrees
released stock limits (crossed by fit episodes): {'wrist_flex': {'lower': False, 'upper': True}, 'wrist_roll': {'lower': True, 'upper': False}}
```

Forward-kinematics plausibility under the shipped mapping (evidence, not a gate; assumes the base sits on the work surface):

```
gripper lowest point minus base lowest point (m): {'p1': 0.045, 'p5': 0.046, 'p50': 0.133, 'min': 0.04}; frames > 2 cm below the base: 0.0
frames within 1 deg of a stock MJCF limit: {'shoulder_pan': 0.0, 'shoulder_lift': 0.0053, 'elbow_flex': 0.0, 'wrist_flex': 0.0368, 'wrist_roll': 0.002}
frames beyond a stock MJCF limit: {'shoulder_pan': 0.0, 'shoulder_lift': 0.0, 'elbow_flex': 0.0, 'wrist_flex': 0.1305, 'wrist_roll': 0.1012}
```

Gravity sag on real static frames (middle 80% of each episode, gripper >= 3 cm above the base plane): centred correlation between the servo's static error and the twin's gravity torque at the mapped pose, and the implied static stiffness (centred slope). Positive supports the mapping. Evidence, not a gate.

```
joint          corr [CI] verdict                                                                                          power (gravity std, n)  implied static K N m/rad  fitted kp
-------------  ---------------------------------------------------------------------------------------------------------  ----------------------  ------------------------  ---------
shoulder_pan   not testable (gravity torque ~constant over the selected static poses; gravity std 0.0 N m, 53 frames)                                                       42.5
shoulder_lift  +0.23 [-0.07, +0.50] inconclusive                                                                          0.231 N m, 53 fr        n/a                       17.5
elbow_flex     +0.35 [-0.65, +0.75] inconclusive                                                                          0.0592 N m, 53 fr       n/a                       17.8
wrist_flex     +0.56 [+0.14, +0.81] positive                                                                              0.0376 N m, 53 fr       4.87 [2.84, 22.3]         34.7
wrist_roll     not testable (gravity torque ~constant over the selected static poses; gravity std 0.0006 N m, 53 frames)                                                    36.5
static frames: 53 (0 excluded as possible table contact) from 16 fit episodes
```

## Method

- Recording convention (lerobot-legacy): Legacy LeRobot (ManipulatorRobot.teleop_step, `main_*` names): the goal a[t] is WRITTEN to the follower first and the follower state x[t] is READ afterwards (a few ms later), so x[t] may already contain a few ms of response to a[t] (act-then-observe).
- Replay: Replay (identical for both conventions): q_sim[0]=x[0] (zero velocity); for t=0..T-2 apply ctrl=a[t-d] (d = fitted integer command delay, stock d=0) for the whole frame, step `substeps` physics steps (timestep set so substeps*timestep = 1/fps exactly), record q_sim[t+1]; sim and real are compared at the same index t=1..T-1. The real sub-frame send-to-read offset (legacy: a[t] sent a few ms BEFORE x[t] is read; current: a[t] sent a few ms AFTER) is not modelled; it is absorbed by the fitted dynamics/delay, and it shifts lags between the two conventions by a fraction of a frame in opposite directions.
- Lag: lag = argmin_L Var(a[t] - y[t+L]) over a fixed window t in [0, T-10), parabolic sub-frame refinement; y = real or sim state. Includes the 1-frame sampling offset: in the replay and in observe-then-act (current LeRobot) recordings an instantaneous actuator measures 1.0 frame; in act-then-observe (legacy) recordings it would measure ~0, and a realistic servo measures its delay minus the few-ms write-to-read gap. Lags are therefore directly comparable between sim and real within one dataset, and only approximately (fraction of a frame) across codebases. Also reported in ms, since datasets differ in fps. Joints with command std < 1 deg in an episode are skipped.
- Units: legacy LeRobot degrees (tick = 180/2048 deg verified on every arm joint) (decided on the fit episodes; held-out episodes agree). Mapping to MJCF: q = sign*deg2rad(x) + deg2rad(offset); legacy LeRobot zero pose = arm straight horizontal (feetech_calibration.py); the MJCF zero (from the SO-ARM100 URDF) is also the arm stretched horizontally forward, so nominal offsets are 0. Documented signs +1 (MJCF joint axes); legacy LeRobot sets each motor's direction from the user's 'rotated position', so signs are checked per dataset against the recorded range of motion (mapping_checks).
- Split: future = last round(n*test_frac) episodes by index; interleaved = round(n*test_frac) episodes of the rest drawn by numpy default_rng(seed).permutation, plus every remaining episode beyond the fit cap; fit = the remaining episodes (<= max_train_episodes) (seed 0). Future: [100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124]. Interleaved: [5, 7, 8, 9, 10, 11, 12, 13, 14, 16, 19, 20, 22, 23, 26, 27, 29, 31, 32, 33, 36, 37, 38, 40, 41, 46, 48, 49, 50, 51, 52, 54, 56, 58, 59, 61, 63, 69, 72, 73, 75, 76, 77, 78, 79, 81, 82, 83, 84, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 99]. Overlap with fit: none.
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
- Confidence intervals are percentile bootstraps over episodes (whole episodes resampled, 10,000 draws, fixed seed); with 25 future / 60 interleaved held-out episodes they are approximate and tend to be slightly too narrow. They do not cover the choice of split, of fit configuration, or of dataset.
- Recorded with legacy LeRobot (act-then-observe); lags are not exactly comparable with current-LeRobot (observe-then-act) datasets (see conventions).
- Stock MJCF limits crossed by the fit episodes and released in the aligned/calibrated twins: wrist_flex upper, wrist_roll lower. The stock twin is held at those limits (counted as stock-twin error).
- Not identified individually (marginal/conditional std ratio >= 10): kp[shoulder_pan]. Only combinations of them are constrained by the data (see identifiability); individual values are not meaningful.
- interleaved: final-pose (static) gap is larger for the calibrated twin than for stock on wrist_roll by point estimate; CIs separate on wrist_roll.
- future: final-pose (static) gap is larger for the calibrated twin than for stock on wrist_roll by point estimate; CIs separate on wrist_roll.
- Joint direction flipped relative to the documented convention for shoulder_lift (chosen from the recorded range of motion vs the MJCF range; see mapping_checks).

## Provenance and reproduction

```
dataset        aaronsu11/so100_instrument @ 32acf178fc1f70ba4649e36e083da6a91aa018b1 (requested 32acf178fc1f70ba4649e36e083da6a91aa018b1)
               LeRobot v2.1, robot_type so100, 30 fps, 125 episodes loaded (repo: 125), 0 dropped
data files     data/chunk-000/episode_000000.parquet (23d6b0817b3c), data/chunk-000/episode_000001.parquet (d7eba9c0e0ae), data/chunk-000/episode_000002.parquet (c5f0ca69eff8), ... (125 files)
twin           trs_so_arm100 (so_arm100.xml) from https://github.com/google-deepmind/mujoco_menagerie @ b0655057a9df2abe39ea7fc989914ba6f248301c
               dir sha256 4f3b0f21b8a2b889..., timestep 0.002 -> 0.00196078 s x 17 substeps/frame, contacts disabled
software       mujoco 3.17.0, numpy 2.5.4, scipy 1.18.1, python 3.13.18, meatspace_lab 2.0.0 (code sha256 924eb3d8364be665...)
hardware       x86_64 Intel(R) Xeon(R) Processor @ 2.80GHz; OpenBLAS kernel numpy: SkylakeX; scipy: SkylakeX
report         schema meatspace.twin-gap-report/v2
               results sha256 6ebed9e380cca692c3b7e0ecec9a0bf9cf520d066addd936270541abfe2d2d5f  (numbers only; any interpreter/CPU)
               content sha256 8feb52c36931c0523fbb37777fee51683dd8c84b876a9aaa61354e2e84d5332f  (numbers + environment above)
```

Reproduce (from `lab/`, see README) into a scratch directory and compare:

```
python -m meatspace_lab report --dataset aaronsu11/so100_instrument --revision 32acf178fc1f70ba4649e36e083da6a91aa018b1 \
    --twin .cache/menagerie/trs_so_arm100 --out /tmp/repro/ --max-episodes 200
python -m meatspace_lab verify reports/aaronsu11__so100_instrument/report.json /tmp/repro/report.json
```
