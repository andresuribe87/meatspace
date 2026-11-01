# Twin Gap Report: CarolinePascal/plug_socket_moved x trs_so_arm100

```
HELD-OUT sim-vs-real joint RMSE, mean of 5 arm joints, deg  [95% bootstrap CI over episodes]
change = calibrated/reference - 1 (negative = better), paired by episode

FUTURE BLOCK (9 episodes)
  stock twin             3.39 [3.10, 3.68]
  aligned stock          3.95 [3.72, 4.19]   (stock dynamics + delay + released limits)
  lag-filter baseline    3.30 [3.13, 3.46]   (no physics: 3 params/joint)
  calibrated twin        3.42 [3.18, 3.67]
  change vs stock        +1% [-1, +4]   per-episode median +1% (range -5% .. +8%); 3/9 improved
  change vs baseline     +4% [+0, +7]   2/9 improved
  verdict                no clear change (+1% [-1, +4] vs stock, residual 3.42 deg); calibrated twin is WORSE than the physics-free lag filter (+4% [+0, +7])

INTERLEAVED HELD-OUT (9 episodes)
  stock twin             3.38 [3.05, 3.76]
  aligned stock          3.93 [3.62, 4.26]   (stock dynamics + delay + released limits)
  lag-filter baseline    3.30 [3.08, 3.55]   (no physics: 3 params/joint)
  calibrated twin        3.39 [3.11, 3.70]
  change vs stock        +0% [-3, +4]   per-episode median -1% (range -9% .. +11%); 5/9 improved
  change vs baseline     +3% [+0, +5]   3/9 improved
  verdict                no clear change (+0% [-3, +4] vs stock, residual 3.39 deg); calibrated twin is WORSE than the physics-free lag filter (+3% [+0, +5])

command->state lag, interleaved held-out, ms per joint (real / stock / calibrated):
  shoulder_pan 120/122/142  shoulder_lift 97/173/118  elbow_flex 262/131/305  wrist_flex 181/102/186  wrist_roll 130/103/131
  max |twin - real| over joints: stock 131.4 ms, calibrated 42.9 ms
```

![future-block held-out episode](heldout_episode.svg)

![per-joint RMSE, future block](rmse_by_joint_future.svg)

![per-joint RMSE, interleaved held-out](rmse_by_joint.svg)

## Future block (held out: the last 20% of episodes by index, recorded after every fit episode), n = 9

Per joint, mean over episodes [95% CI]. Degrees. Change = calibrated vs stock, negative = better.

```
sim-vs-real RMSE  stock                         aligned stock      baseline           calibrated                    change vs stock  vs baseline
----------------  ----------------------------  -----------------  -----------------  ----------------------------  ---------------  ---------------
shoulder_pan      1.19 [0.77, 1.80] (p90 1.82)  1.23 [0.83, 1.83]  1.26 [0.83, 1.88]  1.07 [0.71, 1.63] (p90 1.54)  -10% [-19, -2]   -15% [-23, -8]
shoulder_lift     4.91 [4.14, 5.66] (p90 6.34)  5.66 [5.05, 6.28]  5.22 [4.60, 5.86]  5.27 [4.67, 5.89] (p90 6.55)  +7% [+3, +13]    +1% [+0, +2]
elbow_flex        5.45 [4.72, 6.23] (p90 7.17)  7.69 [6.89, 8.49]  5.70 [5.12, 6.27]  6.95 [6.27, 7.67] (p90 8.25)  +28% [+20, +35]  +22% [+16, +27]
wrist_flex        4.77 [4.47, 5.08] (p90 5.38)  4.27 [3.92, 4.63]  3.58 [3.25, 3.85]  3.02 [2.60, 3.41] (p90 3.69)  -37% [-43, -32]  -16% [-26, -5]
wrist_roll        0.64 [0.47, 0.80] (p90 0.89)  0.90 [0.82, 0.98]  0.72 [0.62, 0.82]  0.80 [0.73, 0.88] (p90 0.93)  +26% [+6, +60]   +11% [+5, +23]
arm_mean          3.39 [3.10, 3.68] (p90 3.89)  3.95 [3.72, 4.19]  3.30 [3.13, 3.46]  3.42 [3.18, 3.67] (p90 3.89)  +1% [-1, +4]     +4% [+0, +7]

static-frame RMSE (quasi-static holds)  stock  baseline  calibrated  episodes with >= 10 static frames
--------------------------------------  -----  --------  ----------  ---------------------------------
shoulder_pan                            1.01   1.16      0.68        1
shoulder_lift                           4.98   7.49      7.72        1
elbow_flex                              7.74   11.41     13.82       1
wrist_flex                              5.64   4.05      3.92        1
wrist_roll                              1.11   1.02      1.14        1
arm_mean                                4.10   5.03      5.46        1

command tracking RMSE  real robot         stock twin         calibrated twin
---------------------  -----------------  -----------------  -----------------
shoulder_pan           1.65 [1.25, 2.21]  0.97 [0.88, 1.09]  1.40 [1.32, 1.50]
shoulder_lift          5.46 [4.86, 6.09]  5.43 [5.09, 5.72]  2.60 [2.37, 2.84]
elbow_flex             8.32 [7.51, 9.20]  3.73 [3.50, 3.97]  6.64 [6.13, 7.18]
wrist_flex             6.54 [6.21, 6.87]  2.67 [2.40, 2.92]  5.91 [5.42, 6.37]
wrist_roll             2.09 [1.92, 2.29]  1.88 [1.73, 2.07]  2.47 [2.28, 2.71]

lag (frames)   real               stock              calibrated         real ms  stock ms  calib ms
-------------  -----------------  -----------------  -----------------  -------  --------  --------
shoulder_pan   4.20 [3.76, 4.65]  3.73 [3.64, 3.89]  4.41 [4.14, 4.67]  140      124       147
shoulder_lift  2.51 [2.17, 2.90]  4.55 [4.40, 4.71]  3.58 [3.55, 3.61]  84       152       119
elbow_flex     7.58 [6.95, 8.20]  3.71 [3.59, 3.83]  8.99 [8.68, 9.32]  253      124       300
wrist_flex     5.76 [5.45, 6.20]  3.15 [3.14, 3.16]  5.58 [5.47, 5.72]  192      105       186
wrist_roll     3.22 [3.08, 3.40]  3.07 [3.01, 3.15]  3.84 [3.76, 3.95]  107      102       128

final-pose gap  stock              calibrated
--------------  -----------------  -----------------
shoulder_pan    1.83 [0.83, 3.07]  1.50 [0.64, 2.72]
shoulder_lift   5.17 [3.18, 7.31]  4.93 [3.02, 7.05]
elbow_flex      4.82 [2.65, 7.57]  6.50 [4.77, 9.07]
wrist_flex      6.49 [5.42, 7.62]  5.16 [4.26, 6.20]
wrist_roll      0.54 [0.26, 0.83]  0.40 [0.20, 0.62]

fraction of states outside the fit episodes' range of motion +-2 deg: {'shoulder_pan': 0.0487, 'shoulder_lift': 0.0, 'elbow_flex': 0.0, 'wrist_flex': 0.0, 'wrist_roll': 0.006}
fraction of states outside the twin's joint range: stock {'shoulder_pan': 0.0, 'shoulder_lift': 0.1655, 'elbow_flex': 0.0, 'wrist_flex': 0.0, 'wrist_roll': 0.0}; calibrated {'shoulder_pan': 0.0, 'shoulder_lift': 0.0, 'elbow_flex': 0.0, 'wrist_flex': 0.0, 'wrist_roll': 0.0}
```

## Interleaved held-out (random episodes from the same period as the fit episodes), n = 9

Per joint, mean over episodes [95% CI]. Degrees. Change = calibrated vs stock, negative = better.

```
sim-vs-real RMSE  stock                         aligned stock      baseline           calibrated                    change vs stock  vs baseline
----------------  ----------------------------  -----------------  -----------------  ----------------------------  ---------------  ---------------
shoulder_pan      0.94 [0.70, 1.22] (p90 1.60)  1.02 [0.79, 1.28]  0.99 [0.76, 1.26]  0.79 [0.59, 1.01] (p90 1.37)  -17% [-21, -13]  -21% [-26, -16]
shoulder_lift     4.62 [4.11, 5.13] (p90 5.72)  5.48 [5.09, 5.88]  5.05 [4.61, 5.50]  5.09 [4.68, 5.49] (p90 5.89)  +10% [+6, +15]   +1% [-0, +2]
elbow_flex        5.47 [4.74, 6.36] (p90 6.46)  8.00 [7.31, 8.70]  6.07 [5.66, 6.50]  7.18 [6.58, 7.82] (p90 8.44)  +31% [+20, +45]  +18% [+14, +22]
wrist_flex        4.95 [4.38, 5.49] (p90 5.61)  4.41 [3.82, 5.03]  3.68 [3.24, 4.19]  3.21 [2.66, 3.90] (p90 4.36)  -35% [-44, -26]  -13% [-21, -5]
wrist_roll        0.93 [0.71, 1.17] (p90 1.38)  0.75 [0.61, 0.90]  0.73 [0.57, 0.92]  0.68 [0.53, 0.84] (p90 1.02)  -27% [-36, -13]  -7% [-14, +1]
arm_mean          3.38 [3.05, 3.76] (p90 3.91)  3.93 [3.62, 4.26]  3.30 [3.08, 3.55]  3.39 [3.11, 3.70] (p90 3.84)  +0% [-3, +4]     +3% [+0, +5]

static-frame RMSE (quasi-static holds)  stock  baseline  calibrated  episodes with >= 10 static frames
--------------------------------------  -----  --------  ----------  ---------------------------------
shoulder_pan                            0.87   1.07      0.30        1
shoulder_lift                           5.24   7.23      7.23        1
elbow_flex                              10.73  13.37     15.94       1
wrist_flex                              4.18   2.63      1.70        1
wrist_roll                              1.15   1.11      1.12        1
arm_mean                                4.43   5.08      5.26        1

command tracking RMSE  real robot         stock twin         calibrated twin
---------------------  -----------------  -----------------  -----------------
shoulder_pan           1.40 [1.20, 1.61]  0.97 [0.85, 1.09]  1.37 [1.28, 1.47]
shoulder_lift          5.41 [4.99, 5.83]  5.88 [5.52, 6.21]  2.67 [2.41, 2.93]
elbow_flex             8.48 [7.87, 9.11]  3.80 [3.57, 4.02]  6.37 [5.70, 7.02]
wrist_flex             6.83 [6.30, 7.34]  3.29 [2.93, 3.78]  6.61 [6.34, 6.92]
wrist_roll             2.61 [2.26, 2.94]  1.95 [1.77, 2.09]  2.64 [2.37, 2.87]

lag (frames)   real               stock              calibrated         real ms  stock ms  calib ms
-------------  -----------------  -----------------  -----------------  -------  --------  --------
shoulder_pan   3.61 [3.15, 4.01]  3.65 [3.62, 3.69]  4.25 [3.99, 4.56]  120      122       142
shoulder_lift  2.90 [2.50, 3.30]  5.20 [4.85, 5.62]  3.54 [3.52, 3.56]  97       173       118
elbow_flex     7.87 [7.06, 8.69]  3.93 [3.82, 4.05]  9.16 [8.65, 9.68]  262      131       305
wrist_flex     5.43 [5.06, 5.78]  3.05 [2.89, 3.15]  5.57 [5.51, 5.63]  181      102       186
wrist_roll     3.89 [3.57, 4.19]  3.08 [3.04, 3.12]  3.94 [3.81, 4.10]  130      103       131

final-pose gap  stock              calibrated
--------------  -----------------  -----------------
shoulder_pan    1.51 [0.82, 2.31]  1.18 [0.48, 1.98]
shoulder_lift   3.82 [2.25, 5.40]  3.84 [2.29, 5.40]
elbow_flex      5.45 [2.49, 9.41]  5.88 [3.61, 8.84]
wrist_flex      4.52 [2.96, 5.91]  4.37 [3.47, 5.40]
wrist_roll      0.82 [0.40, 1.25]  0.69 [0.38, 1.04]

fraction of states outside the fit episodes' range of motion +-2 deg: {'shoulder_pan': 0.0, 'shoulder_lift': 0.0, 'elbow_flex': 0.0, 'wrist_flex': 0.0, 'wrist_roll': 0.0}
fraction of states outside the twin's joint range: stock {'shoulder_pan': 0.0, 'shoulder_lift': 0.1995, 'elbow_flex': 0.0, 'wrist_flex': 0.0824, 'wrist_roll': 0.0}; calibrated {'shoulder_pan': 0.0, 'shoulder_lift': 0.0, 'elbow_flex': 0.0, 'wrist_flex': 0.0, 'wrist_roll': 0.0}
```

## Fit episodes (used by the fit), n = 26

Per joint, mean over episodes [95% CI]. Degrees. Change = calibrated vs stock, negative = better.

```
sim-vs-real RMSE  stock                         aligned stock      baseline           calibrated                    change vs stock  vs baseline
----------------  ----------------------------  -----------------  -----------------  ----------------------------  ---------------  ---------------
shoulder_pan      1.15 [0.92, 1.44] (p90 1.82)  1.24 [1.02, 1.51]  1.20 [0.97, 1.47]  0.98 [0.77, 1.24] (p90 1.58)  -15% [-20, -9]   -18% [-24, -12]
shoulder_lift     4.38 [3.90, 4.94] (p90 6.03)  5.23 [4.83, 5.72]  4.88 [4.46, 5.38]  4.92 [4.51, 5.41] (p90 6.31)  +12% [+9, +16]   +1% [+0, +1]
elbow_flex        5.34 [4.66, 6.39] (p90 6.76)  7.84 [7.19, 8.74]  6.04 [5.40, 7.09]  7.04 [6.49, 7.82] (p90 8.27)  +32% [+22, +42]  +17% [+8, +24]
wrist_flex        4.75 [4.42, 5.11] (p90 6.11)  4.16 [3.88, 4.47]  3.53 [3.33, 3.74]  3.03 [2.79, 3.30] (p90 3.88)  -36% [-41, -31]  -14% [-19, -9]
wrist_roll        0.80 [0.68, 0.93] (p90 1.16)  0.78 [0.69, 0.87]  0.73 [0.64, 0.82]  0.70 [0.62, 0.79] (p90 0.93)  -12% [-21, -1]   -3% [-7, +1]
arm_mean          3.29 [3.04, 3.55] (p90 4.22)  3.85 [3.63, 4.08]  3.27 [3.08, 3.51]  3.34 [3.13, 3.56] (p90 4.22)  +2% [-1, +5]     +2% [-1, +4]

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
shoulder_pan           1.67 [1.47, 1.90]  1.06 [0.94, 1.19]  1.45 [1.37, 1.53]
shoulder_lift          5.33 [4.91, 5.82]  5.72 [5.50, 5.96]  2.61 [2.47, 2.77]
elbow_flex             8.29 [7.62, 9.17]  3.78 [3.61, 3.94]  6.11 [5.77, 6.46]
wrist_flex             6.36 [6.01, 6.72]  3.05 [2.77, 3.43]  6.23 [6.03, 6.44]
wrist_roll             2.16 [1.99, 2.34]  1.67 [1.56, 1.78]  2.22 [2.07, 2.37]

lag (frames)   real               stock              calibrated         real ms  stock ms  calib ms
-------------  -----------------  -----------------  -----------------  -------  --------  --------
shoulder_pan   3.40 [3.06, 3.70]  3.64 [3.61, 3.67]  4.09 [3.92, 4.26]  113      121       136
shoulder_lift  3.13 [2.86, 3.38]  4.86 [4.65, 5.12]  3.56 [3.54, 3.57]  104      162       119
elbow_flex     7.05 [6.44, 7.69]  3.73 [3.64, 3.83]  8.82 [8.47, 9.16]  235      124       294
wrist_flex     5.34 [5.07, 5.61]  3.06 [2.91, 3.16]  5.60 [5.48, 5.71]  178      102       187
wrist_roll     3.66 [3.49, 3.86]  3.05 [3.04, 3.07]  3.82 [3.78, 3.87]  122      102       127

final-pose gap  stock              calibrated
--------------  -----------------  -----------------
shoulder_pan    1.59 [1.09, 2.14]  1.38 [0.87, 1.96]
shoulder_lift   4.28 [3.01, 5.80]  4.12 [2.85, 5.65]
elbow_flex      4.63 [3.23, 6.33]  5.23 [4.09, 6.53]
wrist_flex      5.50 [4.47, 6.59]  4.95 [4.36, 5.56]
wrist_roll      0.52 [0.38, 0.67]  0.36 [0.24, 0.49]
```

## Calibrated twin

Package `calibrated_twin.json`, sha256 `d3c5f2300680555b51862f9a709f4356425519a680f6f70649f500cc289c471f`.
Fitted: kp[shoulder_pan], kv[shoulder_pan], frictionloss[shoulder_pan], kp[shoulder_lift], kv[shoulder_lift], frictionloss[shoulder_lift], kp[elbow_flex], kv[elbow_flex], frictionloss[elbow_flex], kp[wrist_flex], kv[wrist_flex], frictionloss[wrist_flex], kp[wrist_roll], kv[wrist_roll], frictionloss[wrist_roll]; command delay 1 frame(s) (screened train MSE by delay, deg^2: {'0': 16.60109, '1': 16.40698, '2': 18.19948, '3': 19.69088, '4': 22.23731, '5': 23.64953}). Train MSE 17.94505 deg^2. Optimizer: converged (`ftol` termination condition is satisfied.). At a bound: frictionloss[shoulder_pan], frictionloss[shoulder_lift], frictionloss[elbow_flex], frictionloss[wrist_flex], frictionloss[wrist_roll].

```
joint          kp N m/rad   kv N m s/rad  frictionloss N m  armature kg m^2  zero offset deg
-------------  -----------  ------------  ----------------  ---------------  -----------------
shoulder_pan   50 -> 44.86  5.13 -> 1.7   0.1 -> 1          0.1 (fixed)      +0.0 (documented)
shoulder_lift  50 -> 103.3  4.96 -> 6.04  0.1 -> 1          0.1 (fixed)      +0.0 (documented)
elbow_flex     50 -> 13.99  4.63 -> 2.41  0.1 -> 1          0.1 (fixed)      +0.0 (documented)
wrist_flex     50 -> 17.61  4.49 -> 1.72  0.1 -> 1          0.1 (fixed)      +0.0 (documented)
wrist_roll     50 -> 159.6  4.47 -> 11.6  0.1 -> 1          0.1 (fixed)      +0.0 (documented)
```

Identifiable servo combinations (the individual gains are not the claim): natural frequency sqrt(kp/I_eff) and damping ratio (kv+damping)/(2 sqrt(kp I_eff)), I_eff = joint-space inertia at the median pose incl. armature; 95% CI from a linearised episode bootstrap of the fit.

```
joint          I_eff kg m^2  natural freq Hz [CI]  damping ratio [CI]
-------------  ------------  --------------------  --------------------
shoulder_pan   0.1114        3.19 [2.96, 3.4]      0.381 [0.278, 0.448]
shoulder_lift  0.1089        4.9 [3.67, 6.43]      0.9 [0.382, 1.12]
elbow_flex     0.107         1.82 [1.56, 2.06]     0.983 [0.592, 1.23]
wrist_flex     0.1011        2.1 [1.96, 2.23]      0.643 [0.558, 0.708]
wrist_roll     0.1           6.36 [5.96, 6.81]     1.45 [1.31, 1.58]
```

Per-parameter identifiability (condition number of J^T J 17800.0): marginal/conditional std ratio = sqrt(VIF); >= 10 means only a combination with other parameters is identified.

```
parameter                    value  95% CI            std ratio  identified alone
---------------------------  -----  ----------------  ---------  ----------------
kp[shoulder_pan]             44.86  [38.5, 50.8]      1.52       yes
kv[shoulder_pan]             1.702  [1.16, 2.13]      1.52       yes
frictionloss[shoulder_pan]   1      fixed (at bound)  n/a        -
kp[shoulder_lift]            103.3  [58, 178]         5.45       yes
kv[shoulder_lift]            6.04   [1.93, 9.82]      5.45       yes
frictionloss[shoulder_lift]  1      fixed (at bound)  n/a        -
kp[elbow_flex]               13.99  [10.3, 17.9]      2.34       yes
kv[elbow_flex]               2.406  [1.25, 3.41]      2.34       yes
frictionloss[elbow_flex]     1      fixed (at bound)  n/a        -
kp[wrist_flex]               17.61  [15.3, 19.9]      2.33       yes
kv[wrist_flex]               1.718  [1.39, 2.01]      2.33       yes
frictionloss[wrist_flex]     1      fixed (at bound)  n/a        -
kp[wrist_roll]               159.6  [140, 183]        5.86       yes
kv[wrist_roll]               11.55  [9.87, 13.3]      5.86       yes
frictionloss[wrist_roll]     1      fixed (at bound)  n/a        -
```

Posterior correlations |r| > 0.95: kp[wrist_roll] ~ kv[wrist_roll] (+0.985); kp[shoulder_lift] ~ kv[shoulder_lift] (+0.983)

Weakest directions (relative eigenvalue: top loadings): 5.6e-05: kv[wrist_roll] +0.93, kp[wrist_roll] +0.36, kv[shoulder_lift] +0.00, kp[shoulder_lift] +0.00; 0.00032: kv[shoulder_lift] +0.80, kp[shoulder_lift] +0.60, kp[elbow_flex] +0.00, kv[elbow_flex] +0.00; 0.0038: kp[shoulder_pan] +0.74, kv[shoulder_pan] +0.67, kp[wrist_flex] +0.00, kv[wrist_flex] +0.00

Physics-free baseline (fitted on the same fit episodes): y[t+1] = y[t] + alpha*(a[t-d] + b - y[t]), y[0] = x[0], per arm joint; alpha [0.28, 0.3, 0.08, 0.16, 0.32], delay [0, 0, 0, 0, 1] frames, bias [0.1049, -0.2404, -3.8706, -1.5784, 0.119] deg.

## Mapping audit

Sign checks (1st-99th percentile of FIT-episode states vs MJCF range):

```
joint          recorded p1..p99 deg  MJCF range deg     shift (doc sign)  shift (flipped)  decision
-------------  --------------------  -----------------  ----------------  ---------------  ---------------------------------------------------------------------------
shoulder_pan   [-56.36, 12.74]       [-110.01, 110.01]  0.0               0.0              documented sign (flipped sign would also fit: sign not identified by range)
shoulder_lift  [37.0, 195.29]        [-190.22, 9.97]    185.32            5.07             flipped sign (documented sign does not fit the MJCF range)
elbow_flex     [83.06, 172.71]       [-9.97, 179.91]    0.0               162.74           documented sign
wrist_flex     [-103.97, 76.9]       [-95.11, 95.11]    8.86              8.86             documented sign (flipped sign would also fit: sign not identified by range)
wrist_roll     [43.77, 95.19]        [-159.86, 159.86]  0.0               0.0              documented sign (flipped sign would also fit: sign not identified by range)

same rule on other subsets (robustness): all_episodes: signs [1, -1, 1, 1, 1], accepted; heldout_only: signs [1, -1, 1, 1, 1], accepted -> agrees
released stock limits (crossed by fit episodes): {'shoulder_lift': {'lower': True, 'upper': False}, 'elbow_flex': {'lower': False, 'upper': True}, 'wrist_flex': {'lower': True, 'upper': False}}
```

Forward-kinematics plausibility under the shipped mapping (evidence, not a gate; assumes the base sits on the work surface):

```
gripper lowest point minus base lowest point (m): {'p1': 0.041, 'p5': 0.047, 'p50': 0.101, 'min': 0.033}; frames > 2 cm below the base: 0.0
frames within 1 deg of a stock MJCF limit: {'shoulder_pan': 0.0, 'shoulder_lift': 0.0011, 'elbow_flex': 0.0, 'wrist_flex': 0.0085, 'wrist_roll': 0.0}
frames beyond a stock MJCF limit: {'shoulder_pan': 0.0, 'shoulder_lift': 0.1851, 'elbow_flex': 0.0, 'wrist_flex': 0.0332, 'wrist_roll': 0.0}
```

Gravity sag on real static frames (middle 80% of each episode, gripper >= 3 cm above the base plane): centred correlation between the servo's static error and the twin's gravity torque at the mapped pose, and the implied static stiffness (centred slope). Positive supports the mapping. Evidence, not a gate.

```
joint          corr [CI] verdict                                                                                          power (gravity std, n)  implied static K N m/rad  fitted kp
-------------  ---------------------------------------------------------------------------------------------------------  ----------------------  ------------------------  ---------
shoulder_pan   not testable (gravity torque ~constant over the selected static poses; gravity std 0.0 N m, 52 frames)                                                       44.9
shoulder_lift  not testable (gravity torque ~constant over the selected static poses; gravity std 0.0012 N m, 52 frames)                                                    103
elbow_flex     not testable (gravity torque ~constant over the selected static poses; gravity std 0.0012 N m, 52 frames)                                                    14
wrist_flex     not testable (gravity torque ~constant over the selected static poses; gravity std 0.0013 N m, 52 frames)                                                    17.6
wrist_roll     not testable (gravity torque ~constant over the selected static poses; gravity std 0.0 N m, 52 frames)                                                       160
static frames: 52 (0 excluded as possible table contact) from 12 fit episodes
```

## Method

- Recording convention (lerobot-legacy): Legacy LeRobot (ManipulatorRobot.teleop_step, `main_*` names): the goal a[t] is WRITTEN to the follower first and the follower state x[t] is READ afterwards (a few ms later), so x[t] may already contain a few ms of response to a[t] (act-then-observe).
- Replay: Replay (identical for both conventions): q_sim[0]=x[0] (zero velocity); for t=0..T-2 apply ctrl=a[t-d] (d = fitted integer command delay, stock d=0) for the whole frame, step `substeps` physics steps (timestep set so substeps*timestep = 1/fps exactly), record q_sim[t+1]; sim and real are compared at the same index t=1..T-1. The real sub-frame send-to-read offset (legacy: a[t] sent a few ms BEFORE x[t] is read; current: a[t] sent a few ms AFTER) is not modelled; it is absorbed by the fitted dynamics/delay, and it shifts lags between the two conventions by a fraction of a frame in opposite directions.
- Lag: lag = argmin_L Var(a[t] - y[t+L]) over a fixed window t in [0, T-10), parabolic sub-frame refinement; y = real or sim state. Includes the 1-frame sampling offset: in the replay and in observe-then-act (current LeRobot) recordings an instantaneous actuator measures 1.0 frame; in act-then-observe (legacy) recordings it would measure ~0, and a realistic servo measures its delay minus the few-ms write-to-read gap. Lags are therefore directly comparable between sim and real within one dataset, and only approximately (fraction of a frame) across codebases. Also reported in ms, since datasets differ in fps. Joints with command std < 1 deg in an episode are skipped.
- Units: legacy LeRobot degrees (tick = 180/2048 deg verified on every arm joint) (decided on the fit episodes; held-out episodes agree). Mapping to MJCF: q = sign*deg2rad(x) + deg2rad(offset); legacy LeRobot zero pose = arm straight horizontal (feetech_calibration.py); the MJCF zero (from the SO-ARM100 URDF) is also the arm stretched horizontally forward, so nominal offsets are 0. Documented signs +1 (MJCF joint axes); legacy LeRobot sets each motor's direction from the user's 'rotated position', so signs are checked per dataset against the recorded range of motion (mapping_checks).
- Split: future = last round(n*test_frac) episodes by index; interleaved = round(n*test_frac) episodes of the rest drawn by numpy default_rng(seed).permutation, plus every remaining episode beyond the fit cap; fit = the remaining episodes (<= max_train_episodes) (seed 0). Future: [35, 36, 37, 38, 39, 40, 41, 42, 43]. Interleaved: [2, 3, 4, 11, 20, 21, 26, 30, 33]. Overlap with fit: none.
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
- Confidence intervals are percentile bootstraps over episodes (whole episodes resampled, 10,000 draws, fixed seed); with 9 future / 9 interleaved held-out episodes they are approximate and tend to be slightly too narrow. They do not cover the choice of split, of fit configuration, or of dataset.
- Recorded with legacy LeRobot (act-then-observe); lags are not exactly comparable with current-LeRobot (observe-then-act) datasets (see conventions).
- Stock MJCF limits crossed by the fit episodes and released in the aligned/calibrated twins: shoulder_lift lower, elbow_flex upper, wrist_flex lower. The stock twin is held at those limits (counted as stock-twin error).
- Fitted parameters at a bound (within BOUND_TOL): frictionloss[shoulder_pan], frictionloss[shoulder_lift], frictionloss[elbow_flex], frictionloss[wrist_flex], frictionloss[wrist_roll]; the value is a bound, not an estimate.
- interleaved: final-pose (static) gap is larger for the calibrated twin than for stock on shoulder_lift, elbow_flex by point estimate; CIs overlap on all of them.
- future: final-pose (static) gap is larger for the calibrated twin than for stock on elbow_flex by point estimate; CIs overlap on all of them.
- interleaved: the calibrated twin is WORSE than the physics-free lag filter: on this set the MuJoCo physics adds nothing measurable over a 3-parameter-per-joint black-box lag model.
- future: the calibrated twin is WORSE than the physics-free lag filter: on this set the MuJoCo physics adds nothing measurable over a 3-parameter-per-joint black-box lag model.
- Joint direction flipped relative to the documented convention for shoulder_lift (chosen from the recorded range of motion vs the MJCF range; see mapping_checks).

## Provenance and reproduction

```
dataset        CarolinePascal/plug_socket_moved @ 4336e5a0d67e050ba0ec41ec3a294da75d689ae2 (requested 4336e5a0d67e050ba0ec41ec3a294da75d689ae2)
               LeRobot v2.1, robot_type so100, 30 fps, 44 episodes loaded (repo: 44), 0 dropped
data files     data/chunk-000/episode_000000.parquet (152c7257f899), data/chunk-000/episode_000001.parquet (7225ffd1b784), data/chunk-000/episode_000002.parquet (a2b2ca633b1e), ... (44 files)
twin           trs_so_arm100 (so_arm100.xml) from https://github.com/google-deepmind/mujoco_menagerie @ b0655057a9df2abe39ea7fc989914ba6f248301c
               dir sha256 4f3b0f21b8a2b889..., timestep 0.002 -> 0.00196078 s x 17 substeps/frame, contacts disabled
software       mujoco 3.17.0, numpy 2.5.4, scipy 1.18.1, python 3.13.18, meatspace_lab 2.0.0 (code sha256 924eb3d8364be665...)
hardware       x86_64 Intel(R) Xeon(R) Processor @ 2.80GHz; OpenBLAS kernel numpy: SkylakeX; scipy: SkylakeX
report         schema meatspace.twin-gap-report/v2
               results sha256 1770400655fce5b64d9de3954f5f51536b1175483a9fa616d8764d85c034574a  (numbers only; any interpreter/CPU)
               content sha256 e4ebc52fa5fd26bdcae16ec3bbc2b1aab8583ffb8d792a4daf3e11c4ab1fcbb3  (numbers + environment above)
```

Reproduce (from `lab/`, see README) into a scratch directory and compare:

```
python -m meatspace_lab report --dataset CarolinePascal/plug_socket_moved --revision 4336e5a0d67e050ba0ec41ec3a294da75d689ae2 \
    --twin .cache/menagerie/trs_so_arm100 --out /tmp/repro/ --max-episodes 200
python -m meatspace_lab verify reports/CarolinePascal__plug_socket_moved/report.json /tmp/repro/report.json
```
