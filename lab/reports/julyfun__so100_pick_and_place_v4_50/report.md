# Twin Gap Report: julyfun/so100_pick_and_place_v4_50 x trs_so_arm100

```
HELD-OUT sim-vs-real joint RMSE, mean of 5 arm joints, deg  [95% bootstrap CI over episodes]
change = calibrated/reference - 1 (negative = better), paired by episode

FUTURE BLOCK (10 episodes)
  stock twin             1.64 [1.52, 1.77]
  aligned stock          0.67 [0.62, 0.73]   (stock dynamics + delay + released limits)
  lag-filter baseline    0.52 [0.49, 0.57]   (no physics: 3 params/joint)
  calibrated twin        0.37 [0.34, 0.41]
  change vs stock        -77% [-79, -76]   per-episode median -76% (range -83% .. -74%); 10/10 improved
  change vs baseline     -28% [-32, -25]   10/10 improved
  verdict                closes most of the gap (-77% [-79, -76] vs stock, residual 0.37 deg); calibrated twin beats the physics-free lag filter (-28% [-32, -25])

INTERLEAVED HELD-OUT (10 episodes)
  stock twin             1.67 [1.57, 1.76]
  aligned stock          0.75 [0.70, 0.81]   (stock dynamics + delay + released limits)
  lag-filter baseline    0.55 [0.49, 0.61]   (no physics: 3 params/joint)
  calibrated twin        0.38 [0.34, 0.43]
  change vs stock        -77% [-79, -75]   per-episode median -78% (range -83% .. -70%); 10/10 improved
  change vs baseline     -30% [-33, -27]   10/10 improved
  verdict                closes most of the gap (-77% [-79, -75] vs stock, residual 0.38 deg); calibrated twin beats the physics-free lag filter (-30% [-33, -27])

command->state lag, interleaved held-out, ms per joint (real / stock / calibrated):
  shoulder_pan 111/122/113  shoulder_lift 125/120/127  elbow_flex 141/114/175  wrist_flex 113/112/116  wrist_roll 130/110/130
  max |twin - real| over joints: stock 26.6 ms, calibrated 34.0 ms
```

![future-block held-out episode](heldout_episode.svg)

![per-joint RMSE, future block](rmse_by_joint_future.svg)

![per-joint RMSE, interleaved held-out](rmse_by_joint.svg)

## Future block (held out: the last 20% of episodes by index, recorded after every fit episode), n = 10

Per joint, mean over episodes [95% CI]. Degrees. Change = calibrated vs stock, negative = better.

```
sim-vs-real RMSE  stock                         aligned stock      baseline           calibrated                    change vs stock  vs baseline
----------------  ----------------------------  -----------------  -----------------  ----------------------------  ---------------  ---------------
shoulder_pan      0.36 [0.31, 0.42] (p90 0.44)  0.36 [0.31, 0.42]  0.41 [0.30, 0.57]  0.29 [0.21, 0.39] (p90 0.46)  -20% [-33, -8]   -30% [-35, -23]
shoulder_lift     0.75 [0.66, 0.85] (p90 0.87)  0.75 [0.66, 0.85]  0.66 [0.60, 0.74]  0.49 [0.45, 0.54] (p90 0.54)  -34% [-40, -26]  -25% [-29, -21]
elbow_flex        1.42 [1.24, 1.61] (p90 1.74)  1.42 [1.25, 1.62]  0.77 [0.71, 0.86]  0.64 [0.55, 0.73] (p90 0.85)  -55% [-58, -51]  -17% [-25, -7]
wrist_flex        5.18 [4.74, 5.62] (p90 6.03)  0.30 [0.24, 0.37]  0.30 [0.26, 0.34]  0.25 [0.21, 0.30] (p90 0.37)  -95% [-96, -94]  -15% [-24, -8]
wrist_roll        0.51 [0.49, 0.54] (p90 0.57)  0.51 [0.49, 0.54]  0.47 [0.43, 0.50]  0.19 [0.16, 0.23] (p90 0.27)  -63% [-68, -56]  -59% [-66, -51]
arm_mean          1.64 [1.52, 1.77] (p90 1.80)  0.67 [0.62, 0.73]  0.52 [0.49, 0.57]  0.37 [0.34, 0.41] (p90 0.42)  -77% [-79, -76]  -28% [-32, -25]

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
shoulder_pan           1.70 [1.51, 1.93]  1.78 [1.59, 1.99]  1.63 [1.46, 1.81]
shoulder_lift          2.56 [2.40, 2.71]  2.30 [2.16, 2.44]  2.59 [2.46, 2.72]
elbow_flex             2.24 [1.92, 2.58]  1.16 [0.91, 1.43]  2.43 [2.13, 2.74]
wrist_flex             1.66 [1.48, 1.82]  5.37 [4.92, 5.79]  1.63 [1.47, 1.77]
wrist_roll             1.74 [1.47, 2.02]  1.39 [1.12, 1.66]  1.72 [1.46, 1.98]

lag (frames)   real               stock              calibrated         real ms  stock ms  calib ms
-------------  -----------------  -----------------  -----------------  -------  --------  --------
shoulder_pan   3.48 [3.32, 3.70]  3.68 [3.61, 3.79]  3.42 [3.33, 3.54]  116      123       114
shoulder_lift  3.57 [3.51, 3.62]  3.53 [3.51, 3.55]  3.71 [3.68, 3.75]  119      118       124
elbow_flex     4.13 [3.95, 4.33]  3.35 [3.32, 3.38]  5.33 [4.91, 5.78]  138      112       178
wrist_flex     3.35 [3.32, 3.38]  3.38 [3.28, 3.53]  3.35 [3.32, 3.40]  112      113       112
wrist_roll     3.79 [3.67, 3.93]  3.28 [3.24, 3.32]  3.83 [3.67, 4.01]  126      109       128

final-pose gap  stock              calibrated
--------------  -----------------  -----------------
shoulder_pan    0.10 [0.05, 0.15]  0.10 [0.07, 0.13]
shoulder_lift   0.27 [0.13, 0.43]  0.11 [0.05, 0.17]
elbow_flex      0.27 [0.08, 0.51]  0.21 [0.12, 0.30]
wrist_flex      9.04 [8.76, 9.28]  0.18 [0.09, 0.28]
wrist_roll      0.51 [0.42, 0.60]  0.13 [0.08, 0.18]

fraction of states outside the fit episodes' range of motion +-2 deg: {'shoulder_pan': 0.0, 'shoulder_lift': 0.0, 'elbow_flex': 0.0, 'wrist_flex': 0.0, 'wrist_roll': 0.0266}
fraction of states outside the twin's joint range: stock {'shoulder_pan': 0.0, 'shoulder_lift': 0.0, 'elbow_flex': 0.0, 'wrist_flex': 0.4315, 'wrist_roll': 0.0}; calibrated {'shoulder_pan': 0.0, 'shoulder_lift': 0.0, 'elbow_flex': 0.0, 'wrist_flex': 0.0, 'wrist_roll': 0.0}
```

## Interleaved held-out (random episodes from the same period as the fit episodes), n = 10

Per joint, mean over episodes [95% CI]. Degrees. Change = calibrated vs stock, negative = better.

```
sim-vs-real RMSE  stock                         aligned stock      baseline           calibrated                    change vs stock  vs baseline
----------------  ----------------------------  -----------------  -----------------  ----------------------------  ---------------  ---------------
shoulder_pan      0.35 [0.33, 0.37] (p90 0.39)  0.35 [0.33, 0.37]  0.32 [0.28, 0.36]  0.24 [0.21, 0.27] (p90 0.29)  -32% [-41, -24]  -26% [-32, -19]
shoulder_lift     0.80 [0.68, 0.92] (p90 1.08)  0.80 [0.69, 0.93]  0.71 [0.55, 0.90]  0.52 [0.44, 0.62] (p90 0.64)  -35% [-39, -30]  -27% [-32, -19]
elbow_flex        1.75 [1.60, 1.91] (p90 2.05)  1.75 [1.61, 1.91]  0.88 [0.77, 1.00]  0.69 [0.59, 0.79] (p90 0.85)  -61% [-65, -57]  -22% [-28, -15]
wrist_flex        4.90 [4.50, 5.28] (p90 5.55)  0.31 [0.24, 0.39]  0.32 [0.28, 0.36]  0.27 [0.21, 0.33] (p90 0.39)  -95% [-96, -93]  -16% [-25, -7]
wrist_roll        0.55 [0.50, 0.60] (p90 0.64)  0.55 [0.50, 0.60]  0.51 [0.46, 0.56]  0.20 [0.16, 0.25] (p90 0.28)  -64% [-69, -57]  -61% [-66, -54]
arm_mean          1.67 [1.57, 1.76] (p90 1.83)  0.75 [0.70, 0.81]  0.55 [0.49, 0.61]  0.38 [0.34, 0.43] (p90 0.49)  -77% [-79, -75]  -30% [-33, -27]

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
shoulder_pan           1.63 [1.40, 1.86]  1.79 [1.52, 2.04]  1.62 [1.41, 1.83]
shoulder_lift          2.59 [2.39, 2.82]  2.29 [2.15, 2.45]  2.58 [2.45, 2.73]
elbow_flex             2.66 [2.44, 2.91]  1.27 [1.08, 1.47]  2.68 [2.52, 2.87]
wrist_flex             1.46 [1.29, 1.65]  5.04 [4.63, 5.44]  1.46 [1.31, 1.62]
wrist_roll             1.67 [1.45, 1.91]  1.28 [1.07, 1.50]  1.64 [1.44, 1.85]

lag (frames)   real               stock              calibrated         real ms  stock ms  calib ms
-------------  -----------------  -----------------  -----------------  -------  --------  --------
shoulder_pan   3.34 [3.30, 3.40]  3.66 [3.63, 3.69]  3.40 [3.35, 3.45]  111      122       113
shoulder_lift  3.74 [3.58, 3.98]  3.61 [3.55, 3.72]  3.82 [3.75, 3.94]  125      120       127
elbow_flex     4.22 [4.00, 4.44]  3.42 [3.34, 3.55]  5.24 [4.90, 5.59]  141      114       175
wrist_flex     3.40 [3.36, 3.44]  3.37 [3.31, 3.44]  3.47 [3.41, 3.52]  113      112       116
wrist_roll     3.89 [3.76, 4.07]  3.29 [3.26, 3.33]  3.90 [3.75, 4.11]  130      110       130

final-pose gap  stock              calibrated
--------------  -----------------  -----------------
shoulder_pan    0.14 [0.08, 0.20]  0.12 [0.07, 0.17]
shoulder_lift   0.56 [0.37, 0.75]  0.18 [0.09, 0.29]
elbow_flex      0.31 [0.10, 0.59]  0.24 [0.12, 0.38]
wrist_flex      8.83 [8.53, 9.10]  0.14 [0.05, 0.27]
wrist_roll      0.60 [0.52, 0.67]  0.13 [0.07, 0.20]

fraction of states outside the fit episodes' range of motion +-2 deg: {'shoulder_pan': 0.0224, 'shoulder_lift': 0.0, 'elbow_flex': 0.0, 'wrist_flex': 0.0, 'wrist_roll': 0.0}
fraction of states outside the twin's joint range: stock {'shoulder_pan': 0.0, 'shoulder_lift': 0.0, 'elbow_flex': 0.0, 'wrist_flex': 0.4032, 'wrist_roll': 0.0}; calibrated {'shoulder_pan': 0.0, 'shoulder_lift': 0.0, 'elbow_flex': 0.0, 'wrist_flex': 0.0, 'wrist_roll': 0.0}
```

## Fit episodes (used by the fit), n = 30

Per joint, mean over episodes [95% CI]. Degrees. Change = calibrated vs stock, negative = better.

```
sim-vs-real RMSE  stock                         aligned stock      baseline           calibrated                    change vs stock  vs baseline
----------------  ----------------------------  -----------------  -----------------  ----------------------------  ---------------  ---------------
shoulder_pan      0.34 [0.32, 0.37] (p90 0.44)  0.34 [0.32, 0.37]  0.34 [0.31, 0.36]  0.26 [0.23, 0.28] (p90 0.37)  -26% [-30, -22]  -24% [-28, -21]
shoulder_lift     0.78 [0.72, 0.85] (p90 1.02)  0.79 [0.72, 0.86]  0.71 [0.65, 0.78]  0.52 [0.48, 0.56] (p90 0.61)  -34% [-37, -30]  -27% [-30, -24]
elbow_flex        1.53 [1.41, 1.67] (p90 2.04)  1.54 [1.41, 1.68]  0.90 [0.83, 0.96]  0.66 [0.60, 0.73] (p90 0.94)  -57% [-60, -54]  -26% [-31, -21]
wrist_flex        4.97 [4.67, 5.27] (p90 5.84)  0.32 [0.28, 0.36]  0.31 [0.28, 0.35]  0.27 [0.23, 0.31] (p90 0.42)  -95% [-95, -94]  -14% [-21, -9]
wrist_roll        0.54 [0.52, 0.57] (p90 0.65)  0.54 [0.52, 0.57]  0.51 [0.48, 0.54]  0.22 [0.19, 0.25] (p90 0.39)  -59% [-64, -55]  -57% [-61, -53]
arm_mean          1.64 [1.56, 1.71] (p90 1.88)  0.71 [0.66, 0.75]  0.55 [0.52, 0.59]  0.39 [0.36, 0.41] (p90 0.51)  -76% [-78, -75]  -30% [-33, -28]

static-frame RMSE (quasi-static holds)  stock              baseline           calibrated         episodes with >= 10 static frames
--------------------------------------  -----------------  -----------------  -----------------  ---------------------------------
shoulder_pan                            0.19 [0.15, 0.22]  0.14 [0.13, 0.15]  0.11 [0.09, 0.12]  2
shoulder_lift                           0.84 [0.74, 0.94]  0.24 [0.08, 0.40]  0.23 [0.21, 0.24]  2
elbow_flex                              1.19 [1.16, 1.21]  0.49 [0.30, 0.68]  0.10 [0.07, 0.13]  2
wrist_flex                              7.91 [6.58, 9.24]  0.34 [0.22, 0.46]  0.13 [0.11, 0.15]  2
wrist_roll                              0.56 [0.29, 0.82]  0.61 [0.24, 0.99]  0.26 [0.20, 0.33]  2
arm_mean                                2.14 [1.96, 2.32]  0.36 [0.24, 0.49]  0.16 [0.14, 0.19]  2

command tracking RMSE  real robot         stock twin         calibrated twin
---------------------  -----------------  -----------------  -----------------
shoulder_pan           1.48 [1.35, 1.61]  1.58 [1.42, 1.73]  1.45 [1.32, 1.57]
shoulder_lift          2.48 [2.35, 2.60]  2.16 [2.03, 2.28]  2.48 [2.36, 2.58]
elbow_flex             2.29 [2.11, 2.48]  1.11 [1.00, 1.22]  2.34 [2.20, 2.48]
wrist_flex             1.48 [1.38, 1.59]  5.10 [4.80, 5.39]  1.46 [1.36, 1.56]
wrist_roll             1.65 [1.51, 1.79]  1.26 [1.13, 1.38]  1.61 [1.49, 1.73]

lag (frames)   real               stock              calibrated         real ms  stock ms  calib ms
-------------  -----------------  -----------------  -----------------  -------  --------  --------
shoulder_pan   3.38 [3.34, 3.43]  3.66 [3.63, 3.70]  3.43 [3.38, 3.49]  113      122       114
shoulder_lift  3.64 [3.59, 3.71]  3.55 [3.53, 3.58]  3.77 [3.73, 3.82]  121      118       126
elbow_flex     4.28 [4.11, 4.47]  3.44 [3.38, 3.52]  5.44 [5.22, 5.68]  143      115       181
wrist_flex     3.40 [3.37, 3.45]  3.38 [3.31, 3.47]  3.44 [3.40, 3.47]  113      113       115
wrist_roll     3.93 [3.86, 4.01]  3.32 [3.30, 3.34]  3.95 [3.88, 4.03]  131      111       132

final-pose gap  stock              calibrated
--------------  -----------------  -----------------
shoulder_pan    0.17 [0.13, 0.21]  0.15 [0.11, 0.18]
shoulder_lift   0.41 [0.30, 0.52]  0.22 [0.16, 0.28]
elbow_flex      0.65 [0.41, 0.93]  0.34 [0.25, 0.44]
wrist_flex      8.42 [7.66, 9.00]  0.14 [0.10, 0.17]
wrist_roll      0.51 [0.47, 0.56]  0.11 [0.08, 0.14]
```

## Calibrated twin

Package `calibrated_twin.json`, sha256 `516a88d3da7f9dec59525a56acff056ab83d93a4b1b3fec3522cfc569a0ba4e2`.
Fitted: kp[shoulder_pan], kv[shoulder_pan], frictionloss[shoulder_pan], kp[shoulder_lift], kv[shoulder_lift], frictionloss[shoulder_lift], kp[elbow_flex], kv[elbow_flex], frictionloss[elbow_flex], kp[wrist_flex], kv[wrist_flex], frictionloss[wrist_flex], kp[wrist_roll], kv[wrist_roll], frictionloss[wrist_roll]; command delay 0 frame(s) (screened train MSE by delay, deg^2: {'0': 0.35381, '1': 0.37206, '2': 0.67097, '3': 0.92771, '4': 1.56162, '5': 2.74771}). Train MSE 0.19333 deg^2. Optimizer: converged (`ftol` termination condition is satisfied.). At a bound: none.

```
joint          kp N m/rad   kv N m s/rad  frictionloss N m  armature kg m^2  zero offset deg
-------------  -----------  ------------  ----------------  ---------------  -----------------
shoulder_pan   50 -> 36.07  5.13 -> 3.11  0.1 -> 0.193      0.1 (fixed)      +0.0 (documented)
shoulder_lift  50 -> 21.79  4.96 -> 1.93  0.1 -> 0.22       0.1 (fixed)      +0.0 (documented)
elbow_flex     50 -> 13.07  4.63 -> 1.2   0.1 -> 0.297      0.1 (fixed)      +0.0 (documented)
wrist_flex     50 -> 47.83  4.49 -> 4.01  0.1 -> 0.333      0.1 (fixed)      +0.0 (documented)
wrist_roll     50 -> 63.88  4.47 -> 5.5   0.1 -> 0.79       0.1 (fixed)      +0.0 (documented)
```

Identifiable servo combinations (the individual gains are not the claim): natural frequency sqrt(kp/I_eff) and damping ratio (kv+damping)/(2 sqrt(kp I_eff)), I_eff = joint-space inertia at the median pose incl. armature; 95% CI from a linearised episode bootstrap of the fit.

```
joint          I_eff kg m^2  natural freq Hz [CI]  damping ratio [CI]
-------------  ------------  --------------------  --------------------
shoulder_pan   0.1057        2.94 [2.88, 3.01]     0.796 [0.768, 0.817]
shoulder_lift  0.1067        2.27 [2.23, 2.33]     0.634 [0.613, 0.657]
elbow_flex     0.1052        1.77 [1.73, 1.81]     0.51 [0.468, 0.548]
wrist_flex     0.1011        3.46 [3.33, 3.6]      0.912 [0.869, 0.948]
wrist_roll     0.1           4.02 [3.45, 4.6]      1.09 [0.858, 1.21]
```

Per-parameter identifiability (condition number of J^T J 13800.0): marginal/conditional std ratio = sqrt(VIF); >= 10 means only a combination with other parameters is identified.

```
parameter                    value   95% CI          std ratio  identified alone
---------------------------  ------  --------------  ---------  ----------------
kp[shoulder_pan]             36.07   [34.5, 37.7]    8.81       yes
kv[shoulder_pan]             3.107   [2.94, 3.25]    7.95       yes
frictionloss[shoulder_pan]   0.1931  [0.172, 0.218]  1.86       yes
kp[shoulder_lift]            21.79   [20.9, 22.8]    2.74       yes
kv[shoulder_lift]            1.934   [1.83, 2.04]    2.83       yes
frictionloss[shoulder_lift]  0.2204  [0.201, 0.239]  1.57       yes
kp[elbow_flex]               13.07   [12.5, 13.7]    1.7        yes
kv[elbow_flex]               1.197   [1.08, 1.31]    1.69       yes
frictionloss[elbow_flex]     0.297   [0.278, 0.317]  1.61       yes
kp[wrist_flex]               47.83   [44.3, 51.8]    11.5       NO
kv[wrist_flex]               4.011   [3.68, 4.33]    9.86       yes
frictionloss[wrist_flex]     0.3334  [0.298, 0.373]  2.68       yes
kp[wrist_roll]               63.88   [47.1, 83.7]    14.6       NO
kv[wrist_roll]               5.503   [3.73, 7.04]    10.6       NO
frictionloss[wrist_roll]     0.7898  [0.568, 0.997]  5.3        yes
```

Posterior correlations |r| > 0.95: kp[wrist_roll] ~ kv[wrist_roll] (+0.991); kp[wrist_flex] ~ kv[wrist_flex] (+0.988); kp[shoulder_pan] ~ kv[shoulder_pan] (+0.986); kp[wrist_roll] ~ frictionloss[wrist_roll] (+0.964)

Weakest directions (relative eigenvalue: top loadings): 7.2e-05: frictionloss[wrist_roll] +0.74, kv[wrist_roll] +0.48, kp[wrist_roll] +0.46, kp[shoulder_pan] +0.00; 0.00025: kp[wrist_flex] -0.70, kv[wrist_flex] -0.55, frictionloss[wrist_flex] -0.46, kp[shoulder_lift] +0.00; 0.00058: kp[shoulder_pan] +0.81, kv[shoulder_pan] +0.50, frictionloss[shoulder_pan] +0.30, kp[wrist_flex] +0.00

Physics-free baseline (fitted on the same fit episodes): y[t+1] = y[t] + alpha*(a[t-d] + b - y[t]), y[0] = x[0], per arm joint; alpha [0.3, 0.28, 0.22, 0.4, 0.26], delay [0, 0, 0, 1, 0] frames, bias [-0.1386, -0.9047, 1.6453, 0.196, -0.0694] deg.

## Mapping audit

Sign checks (1st-99th percentile of FIT-episode states vs MJCF range):

```
joint          recorded p1..p99 deg  MJCF range deg     shift (doc sign)  shift (flipped)  decision
-------------  --------------------  -----------------  ----------------  ---------------  ---------------------------------------------------------------------------
shoulder_pan   [-36.12, 34.28]       [-110.01, 110.01]  0.0               0.0              documented sign (flipped sign would also fit: sign not identified by range)
shoulder_lift  [53.26, 155.02]       [-190.22, 9.97]    145.05            0.0              flipped sign (documented sign does not fit the MJCF range)
elbow_flex     [62.4, 137.46]        [-9.97, 179.91]    0.0               127.49           documented sign
wrist_flex     [50.13, 104.68]       [-95.11, 95.11]    9.57              9.57             documented sign (flipped sign would also fit: sign not identified by range)
wrist_roll     [-146.78, -18.49]     [-159.86, 159.86]  0.0               0.0              documented sign (flipped sign would also fit: sign not identified by range)

same rule on other subsets (robustness): all_episodes: signs [1, -1, 1, 1, 1], accepted; heldout_only: signs [1, -1, 1, 1, 1], accepted -> agrees
released stock limits (crossed by fit episodes): {'wrist_flex': {'lower': False, 'upper': True}}
```

Forward-kinematics plausibility under the shipped mapping (evidence, not a gate; assumes the base sits on the work surface):

```
gripper lowest point minus base lowest point (m): {'p1': 0.04, 'p5': 0.047, 'p50': 0.103, 'min': 0.031}; frames > 2 cm below the base: 0.0
frames within 1 deg of a stock MJCF limit: {'shoulder_pan': 0.0, 'shoulder_lift': 0.0, 'elbow_flex': 0.0, 'wrist_flex': 0.0381, 'wrist_roll': 0.0}
frames beyond a stock MJCF limit: {'shoulder_pan': 0.0, 'shoulder_lift': 0.0, 'elbow_flex': 0.0, 'wrist_flex': 0.4068, 'wrist_roll': 0.0}
```

Gravity sag on real static frames (middle 80% of each episode, gripper >= 3 cm above the base plane): centred correlation between the servo's static error and the twin's gravity torque at the mapped pose, and the implied static stiffness (centred slope). Positive supports the mapping. Evidence, not a gate.

```
joint          corr [CI] verdict                                                                                          power (gravity std, n)  implied static K N m/rad  fitted kp
-------------  ---------------------------------------------------------------------------------------------------------  ----------------------  ------------------------  ---------
shoulder_pan   not testable (gravity torque ~constant over the selected static poses; gravity std 0.0 N m, 23 frames)                                                       36.1
shoulder_lift  not testable (too few static off-table frames/episodes; gravity std 0.0986 N m, 23 frames)                                                                   21.8
elbow_flex     not testable (gravity torque ~constant over the selected static poses; gravity std 0.0058 N m, 23 frames)                                                    13.1
wrist_flex     not testable (gravity torque ~constant over the selected static poses; gravity std 0.0116 N m, 23 frames)                                                    47.8
wrist_roll     not testable (gravity torque ~constant over the selected static poses; gravity std 0.0002 N m, 23 frames)                                                    63.9
static frames: 23 (0 excluded as possible table contact) from 3 fit episodes
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
- Stock MJCF limits crossed by the fit episodes and released in the aligned/calibrated twins: wrist_flex upper. The stock twin is held at those limits (counted as stock-twin error).
- Not identified individually (marginal/conditional std ratio >= 10): kp[wrist_flex], kp[wrist_roll], kv[wrist_roll]. Only combinations of them are constrained by the data (see identifiability); individual values are not meaningful.
- future: final-pose (static) gap is larger for the calibrated twin than for stock on shoulder_pan by point estimate; CIs overlap on all of them.
- Joint direction flipped relative to the documented convention for shoulder_lift (chosen from the recorded range of motion vs the MJCF range; see mapping_checks).

## Provenance and reproduction

```
dataset        julyfun/so100_pick_and_place_v4_50 @ 0f93d5ec05075a83a55b2a793d205dee6b27b763 (requested 0f93d5ec05075a83a55b2a793d205dee6b27b763)
               LeRobot v2.1, robot_type so100, 30 fps, 50 episodes loaded (repo: 50), 0 dropped
data files     data/chunk-000/episode_000000.parquet (60fcb45783f3), data/chunk-000/episode_000001.parquet (8614e2172900), data/chunk-000/episode_000002.parquet (08beafaabcd7), ... (50 files)
twin           trs_so_arm100 (so_arm100.xml) from https://github.com/google-deepmind/mujoco_menagerie @ b0655057a9df2abe39ea7fc989914ba6f248301c
               dir sha256 4f3b0f21b8a2b889..., timestep 0.002 -> 0.00196078 s x 17 substeps/frame, contacts disabled
software       mujoco 3.17.0, numpy 2.5.4, scipy 1.18.1, python 3.13.18, meatspace_lab 2.0.0 (code sha256 924eb3d8364be665...)
hardware       x86_64 Intel(R) Xeon(R) Processor @ 2.80GHz; OpenBLAS kernel numpy: SkylakeX; scipy: SkylakeX
report         schema meatspace.twin-gap-report/v2
               results sha256 2afb09ee1e22ff112ef9c629f8a82ee91c1ca4f414112ea4d1dc81634c6e6243  (numbers only; any interpreter/CPU)
               content sha256 b333754383d3cb2690dcdd26a70b27d3d48490371c4dc30a9309c8196941b95d  (numbers + environment above)
```

Reproduce (from `lab/`, see README) into a scratch directory and compare:

```
python -m meatspace_lab report --dataset julyfun/so100_pick_and_place_v4_50 --revision 0f93d5ec05075a83a55b2a793d205dee6b27b763 \
    --twin .cache/menagerie/trs_so_arm100 --out /tmp/repro/ --max-episodes 200
python -m meatspace_lab verify reports/julyfun__so100_pick_and_place_v4_50/report.json /tmp/repro/report.json
```
