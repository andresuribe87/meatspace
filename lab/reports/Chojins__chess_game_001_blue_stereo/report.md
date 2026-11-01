# Twin Gap Report: Chojins/chess_game_001_blue_stereo x trs_so_arm100

```
HELD-OUT sim-vs-real joint RMSE, mean of 5 arm joints, deg  [95% bootstrap CI over episodes]
change = calibrated/reference - 1 (negative = better), paired by episode

FUTURE BLOCK (40 episodes)
  stock twin             1.12 [1.05, 1.20]
  aligned stock          1.31 [1.05, 1.64]   (stock dynamics + delay + released limits)
  lag-filter baseline    1.18 [0.94, 1.48]   (no physics: 3 params/joint)
  calibrated twin        1.10 [0.84, 1.44]
  change vs stock        -2% [-21, +21]   per-episode median -24% (range -33% .. +175%); 36/40 improved
  change vs baseline     -6% [-11, -3]   31/40 improved
  verdict                no clear change (-2% [-21, +21] vs stock, residual 1.10 deg); calibrated twin beats the physics-free lag filter (-6% [-11, -3])

INTERLEAVED HELD-OUT (120 episodes)
  stock twin             1.07 [1.03, 1.11]
  aligned stock          1.07 [1.00, 1.17]   (stock dynamics + delay + released limits)
  lag-filter baseline    0.96 [0.89, 1.05]   (no physics: 3 params/joint)
  calibrated twin        0.90 [0.83, 1.00]
  change vs stock        -16% [-21, -9]   per-episode median -22% (range -47% .. +159%); 112/120 improved
  change vs baseline     -6% [-9, -4]   84/120 improved
  verdict                small improvement; most of the gap remains (-16% [-21, -9] vs stock, residual 0.90 deg); calibrated twin beats the physics-free lag filter (-6% [-9, -4])

command->state lag, interleaved held-out, ms per joint (real / stock / calibrated):
  shoulder_pan 116/125/118  shoulder_lift 127/118/134  elbow_flex 126/110/138  wrist_flex 112/108/112  wrist_roll 110/109/136
  max |twin - real| over joints: stock 16.3 ms, calibrated 25.8 ms
```

![future-block held-out episode](heldout_episode.svg)

![per-joint RMSE, future block](rmse_by_joint_future.svg)

![per-joint RMSE, interleaved held-out](rmse_by_joint.svg)

## Future block (held out: the last 20% of episodes by index, recorded after every fit episode), n = 40

Per joint, mean over episodes [95% CI]. Degrees. Change = calibrated vs stock, negative = better.

```
sim-vs-real RMSE  stock                         aligned stock      baseline           calibrated                    change vs stock    vs baseline
----------------  ----------------------------  -----------------  -----------------  ----------------------------  -----------------  ---------------
shoulder_pan      0.60 [0.59, 0.61] (p90 0.66)  0.60 [0.59, 0.61]  0.61 [0.59, 0.64]  0.59 [0.57, 0.60] (p90 0.65)  -2% [-3, -1]       -4% [-8, -1]
shoulder_lift     1.85 [1.72, 1.98] (p90 2.35)  1.85 [1.72, 1.98]  1.26 [1.16, 1.36]  1.14 [1.10, 1.18] (p90 1.33)  -38% [-41, -35]    -10% [-14, -4]
elbow_flex        1.26 [1.23, 1.30] (p90 1.42)  1.26 [1.23, 1.30]  0.98 [0.95, 1.01]  0.78 [0.76, 0.80] (p90 0.86)  -38% [-41, -36]    -20% [-23, -18]
wrist_flex        0.80 [0.71, 0.89] (p90 1.21)  0.61 [0.59, 0.63]  0.56 [0.54, 0.58]  0.59 [0.57, 0.61] (p90 0.66)  -25% [-32, -18]    +5% [+3, +7]
wrist_roll        1.10 [0.75, 1.51] (p90 3.06)  2.23 [0.87, 3.93]  2.47 [1.22, 4.04]  2.42 [1.08, 4.08] (p90 3.83)  +120% [+33, +193]  -2% [-12, +2]
arm_mean          1.12 [1.05, 1.20] (p90 1.47)  1.31 [1.05, 1.64]  1.18 [0.94, 1.48]  1.10 [0.84, 1.44] (p90 1.41)  -2% [-21, +21]     -6% [-11, -3]

static-frame RMSE (quasi-static holds)  stock              baseline           calibrated         episodes with >= 10 static frames
--------------------------------------  -----------------  -----------------  -----------------  ---------------------------------
shoulder_pan                            0.42 [0.28, 0.55]  0.40 [0.27, 0.52]  0.41 [0.26, 0.54]  8
shoulder_lift                           0.73 [0.63, 0.87]  0.83 [0.76, 0.91]  0.91 [0.79, 1.02]  8
elbow_flex                              0.78 [0.50, 1.15]  1.32 [1.06, 1.53]  0.56 [0.41, 0.71]  8
wrist_flex                              0.54 [0.48, 0.61]  0.94 [0.87, 1.00]  0.67 [0.61, 0.73]  8
wrist_roll                              0.32 [0.17, 0.47]  1.28 [1.11, 1.45]  0.80 [0.60, 1.01]  8
arm_mean                                0.56 [0.48, 0.65]  0.95 [0.93, 0.98]  0.67 [0.62, 0.73]  8

command tracking RMSE  real robot         stock twin         calibrated twin
---------------------  -----------------  -----------------  -----------------
shoulder_pan           1.11 [1.02, 1.20]  1.01 [0.90, 1.13]  0.92 [0.84, 1.01]
shoulder_lift          3.45 [3.27, 3.61]  2.41 [2.31, 2.50]  3.24 [3.11, 3.36]
elbow_flex             2.68 [2.60, 2.77]  1.90 [1.82, 1.98]  2.66 [2.58, 2.75]
wrist_flex             2.18 [2.11, 2.25]  2.11 [2.03, 2.20]  2.13 [2.06, 2.21]
wrist_roll             3.02 [1.73, 4.68]  3.43 [1.79, 5.45]  1.79 [1.62, 1.95]

lag (frames)   real               stock              calibrated         real ms  stock ms  calib ms
-------------  -----------------  -----------------  -----------------  -------  --------  --------
shoulder_pan   3.45 [3.40, 3.50]  3.73 [3.69, 3.77]  3.52 [3.41, 3.64]  115      124       117
shoulder_lift  3.88 [3.84, 3.92]  3.53 [3.53, 3.54]  4.02 [3.99, 4.05]  129      118       134
elbow_flex     3.81 [3.78, 3.83]  3.30 [3.30, 3.30]  4.11 [4.07, 4.15]  127      110       137
wrist_flex     3.32 [3.31, 3.33]  3.23 [3.22, 3.23]  3.37 [3.37, 3.38]  111      108       112
wrist_roll     3.33 [3.30, 3.35]  3.26 [3.24, 3.28]  3.93 [3.71, 4.20]  111      109       131

final-pose gap  stock              calibrated
--------------  -----------------  -----------------
shoulder_pan    0.38 [0.29, 0.47]  0.38 [0.29, 0.47]
shoulder_lift   0.70 [0.65, 0.74]  0.95 [0.86, 1.05]
elbow_flex      0.67 [0.61, 0.71]  0.64 [0.58, 0.70]
wrist_flex      0.59 [0.56, 0.62]  0.68 [0.65, 0.71]
wrist_roll      0.38 [0.31, 0.44]  0.59 [0.50, 0.68]

fraction of states outside the fit episodes' range of motion +-2 deg: {'shoulder_pan': 0.0221, 'shoulder_lift': 0.0, 'elbow_flex': 0.0027, 'wrist_flex': 0.0008, 'wrist_roll': 0.0}
fraction of states outside the twin's joint range: stock {'shoulder_pan': 0.0, 'shoulder_lift': 0.0, 'elbow_flex': 0.0, 'wrist_flex': 0.0379, 'wrist_roll': 0.0733}; calibrated {'shoulder_pan': 0.0, 'shoulder_lift': 0.0, 'elbow_flex': 0.0, 'wrist_flex': 0.0, 'wrist_roll': 0.0}
```

## Interleaved held-out (random episodes from the same period as the fit episodes), n = 120

Per joint, mean over episodes [95% CI]. Degrees. Change = calibrated vs stock, negative = better.

```
sim-vs-real RMSE  stock                         aligned stock      baseline           calibrated                    change vs stock  vs baseline
----------------  ----------------------------  -----------------  -----------------  ----------------------------  ---------------  ---------------
shoulder_pan      0.61 [0.60, 0.62] (p90 0.67)  0.61 [0.60, 0.62]  0.59 [0.58, 0.61]  0.59 [0.58, 0.60] (p90 0.65)  -3% [-3, -2]     -1% [-3, +2]
shoulder_lift     1.71 [1.63, 1.79] (p90 2.38)  1.71 [1.63, 1.79]  1.15 [1.09, 1.21]  1.11 [1.09, 1.14] (p90 1.27)  -35% [-37, -33]  -3% [-7, +1]
elbow_flex        1.19 [1.16, 1.22] (p90 1.41)  1.19 [1.17, 1.22]  0.92 [0.90, 0.94]  0.74 [0.72, 0.75] (p90 0.83)  -38% [-40, -36]  -20% [-22, -18]
wrist_flex        0.90 [0.83, 0.96] (p90 1.45)  0.62 [0.61, 0.63]  0.57 [0.57, 0.58]  0.59 [0.58, 0.60] (p90 0.67)  -34% [-38, -30]  +3% [+1, +4]
wrist_roll        0.94 [0.79, 1.12] (p90 2.54)  1.24 [0.85, 1.72]  1.55 [1.22, 1.98]  1.46 [1.09, 1.93] (p90 1.44)  +55% [+29, +84]  -6% [-11, -2]
arm_mean          1.07 [1.03, 1.11] (p90 1.40)  1.07 [1.00, 1.17]  0.96 [0.89, 1.05]  0.90 [0.83, 1.00] (p90 0.88)  -16% [-21, -9]   -6% [-9, -4]

static-frame RMSE (quasi-static holds)  stock              baseline           calibrated         episodes with >= 10 static frames
--------------------------------------  -----------------  -----------------  -----------------  ---------------------------------
shoulder_pan                            0.34 [0.28, 0.42]  0.37 [0.30, 0.45]  0.38 [0.31, 0.46]  38
shoulder_lift                           0.75 [0.68, 0.86]  0.84 [0.79, 0.90]  0.91 [0.80, 1.00]  38
elbow_flex                              0.66 [0.60, 0.73]  1.23 [1.18, 1.27]  0.43 [0.38, 0.49]  38
wrist_flex                              0.56 [0.53, 0.59]  0.92 [0.87, 0.97]  0.67 [0.63, 0.70]  38
wrist_roll                              0.39 [0.33, 0.45]  1.14 [1.08, 1.21]  0.74 [0.63, 0.84]  38
arm_mean                                0.54 [0.51, 0.57]  0.90 [0.87, 0.93]  0.62 [0.58, 0.67]  38

command tracking RMSE  real robot         stock twin         calibrated twin
---------------------  -----------------  -----------------  -----------------
shoulder_pan           1.01 [0.97, 1.06]  0.88 [0.83, 0.94]  0.82 [0.78, 0.86]
shoulder_lift          3.31 [3.20, 3.42]  2.41 [2.35, 2.47]  3.19 [3.11, 3.27]
elbow_flex             2.54 [2.50, 2.59]  1.81 [1.76, 1.86]  2.56 [2.51, 2.61]
wrist_flex             2.23 [2.18, 2.29]  2.19 [2.12, 2.26]  2.15 [2.10, 2.21]
wrist_roll             2.01 [1.62, 2.48]  2.21 [1.67, 2.86]  1.67 [1.58, 1.77]

lag (frames)   real               stock              calibrated         real ms  stock ms  calib ms
-------------  -----------------  -----------------  -----------------  -------  --------  --------
shoulder_pan   3.47 [3.44, 3.50]  3.74 [3.72, 3.76]  3.55 [3.50, 3.60]  116      125       118
shoulder_lift  3.82 [3.80, 3.84]  3.53 [3.53, 3.54]  4.02 [4.00, 4.04]  127      118       134
elbow_flex     3.79 [3.77, 3.81]  3.30 [3.30, 3.30]  4.14 [4.12, 4.17]  126      110       138
wrist_flex     3.37 [3.35, 3.38]  3.23 [3.22, 3.23]  3.37 [3.37, 3.37]  112      108       112
wrist_roll     3.30 [3.29, 3.32]  3.27 [3.25, 3.28]  4.08 [3.94, 4.22]  110      109       136

final-pose gap  stock              calibrated
--------------  -----------------  -----------------
shoulder_pan    0.38 [0.33, 0.43]  0.38 [0.33, 0.43]
shoulder_lift   0.74 [0.71, 0.77]  1.03 [0.97, 1.09]
elbow_flex      0.62 [0.59, 0.65]  0.56 [0.53, 0.60]
wrist_flex      0.59 [0.57, 0.61]  0.68 [0.66, 0.70]
wrist_roll      0.39 [0.35, 0.43]  0.66 [0.61, 0.71]

fraction of states outside the fit episodes' range of motion +-2 deg: {'shoulder_pan': 0.0048, 'shoulder_lift': 0.0022, 'elbow_flex': 0.0026, 'wrist_flex': 0.0027, 'wrist_roll': 0.0}
fraction of states outside the twin's joint range: stock {'shoulder_pan': 0.0, 'shoulder_lift': 0.0, 'elbow_flex': 0.0, 'wrist_flex': 0.0447, 'wrist_roll': 0.056}; calibrated {'shoulder_pan': 0.0, 'shoulder_lift': 0.0, 'elbow_flex': 0.0, 'wrist_flex': 0.0, 'wrist_roll': 0.0}
```

## Fit episodes (used by the fit), n = 40

Per joint, mean over episodes [95% CI]. Degrees. Change = calibrated vs stock, negative = better.

```
sim-vs-real RMSE  stock                         aligned stock      baseline           calibrated                    change vs stock    vs baseline
----------------  ----------------------------  -----------------  -----------------  ----------------------------  -----------------  ---------------
shoulder_pan      0.60 [0.59, 0.62] (p90 0.68)  0.60 [0.59, 0.62]  0.59 [0.57, 0.62]  0.59 [0.57, 0.61] (p90 0.67)  -3% [-4, -1]       -1% [-5, +4]
shoulder_lift     1.58 [1.48, 1.71] (p90 2.05)  1.58 [1.48, 1.71]  1.05 [0.96, 1.15]  1.07 [1.03, 1.11] (p90 1.25)  -33% [-36, -29]    +2% [-5, +8]
elbow_flex        1.15 [1.12, 1.18] (p90 1.33)  1.15 [1.12, 1.18]  0.90 [0.87, 0.92]  0.73 [0.71, 0.76] (p90 0.82)  -36% [-38, -34]    -18% [-21, -15]
wrist_flex        0.81 [0.73, 0.90] (p90 1.20)  0.64 [0.62, 0.65]  0.59 [0.58, 0.61]  0.61 [0.59, 0.62] (p90 0.65)  -25% [-32, -17]    +3% [+0, +5]
wrist_roll        1.11 [0.75, 1.53] (p90 2.84)  2.12 [0.76, 3.86]  2.40 [1.12, 4.00]  2.31 [0.99, 4.01] (p90 2.84)  +108% [+20, +186]  -4% [-14, +0]
arm_mean          1.05 [0.97, 1.15] (p90 1.46)  1.22 [0.94, 1.58]  1.11 [0.85, 1.43]  1.06 [0.79, 1.41] (p90 1.16)  +1% [-20, +25]     -4% [-8, -1]

static-frame RMSE (quasi-static holds)  stock              baseline           calibrated         episodes with >= 10 static frames
--------------------------------------  -----------------  -----------------  -----------------  ---------------------------------
shoulder_pan                            0.37 [0.29, 0.45]  0.39 [0.30, 0.48]  0.35 [0.26, 0.45]  12
shoulder_lift                           0.72 [0.66, 0.77]  0.78 [0.73, 0.84]  0.93 [0.77, 1.12]  12
elbow_flex                              0.54 [0.43, 0.65]  1.13 [0.97, 1.26]  0.44 [0.35, 0.55]  12
wrist_flex                              0.57 [0.50, 0.64]  0.94 [0.86, 1.00]  0.67 [0.60, 0.74]  12
wrist_roll                              0.32 [0.25, 0.40]  1.27 [1.14, 1.41]  0.60 [0.41, 0.79]  12
arm_mean                                0.51 [0.47, 0.54]  0.90 [0.86, 0.95]  0.60 [0.52, 0.68]  12

command tracking RMSE  real robot         stock twin         calibrated twin
---------------------  -----------------  -----------------  -----------------
shoulder_pan           0.97 [0.91, 1.03]  0.83 [0.75, 0.91]  0.78 [0.73, 0.85]
shoulder_lift          3.05 [2.90, 3.21]  2.24 [2.15, 2.32]  2.98 [2.87, 3.10]
elbow_flex             2.52 [2.45, 2.60]  1.82 [1.76, 1.89]  2.55 [2.49, 2.63]
wrist_flex             2.20 [2.10, 2.29]  2.09 [1.98, 2.20]  2.11 [2.01, 2.21]
wrist_roll             2.91 [1.57, 4.61]  3.26 [1.65, 5.32]  1.74 [1.57, 1.90]

lag (frames)   real               stock              calibrated         real ms  stock ms  calib ms
-------------  -----------------  -----------------  -----------------  -------  --------  --------
shoulder_pan   3.43 [3.40, 3.46]  3.74 [3.72, 3.76]  3.56 [3.49, 3.63]  114      125       119
shoulder_lift  3.80 [3.76, 3.84]  3.54 [3.53, 3.54]  4.06 [4.03, 4.10]  127      118       135
elbow_flex     3.78 [3.75, 3.80]  3.30 [3.30, 3.31]  4.12 [4.09, 4.16]  126      110       137
wrist_flex     3.37 [3.35, 3.40]  3.23 [3.22, 3.23]  3.37 [3.37, 3.38]  112      108       112
wrist_roll     3.32 [3.29, 3.35]  3.27 [3.25, 3.29]  4.01 [3.78, 4.26]  111      109       134

final-pose gap  stock              calibrated
--------------  -----------------  -----------------
shoulder_pan    0.36 [0.28, 0.46]  0.35 [0.27, 0.44]
shoulder_lift   0.77 [0.73, 0.82]  1.08 [1.00, 1.17]
elbow_flex      0.62 [0.56, 0.68]  0.58 [0.52, 0.65]
wrist_flex      0.62 [0.57, 0.65]  0.70 [0.66, 0.74]
wrist_roll      0.35 [0.28, 0.42]  0.61 [0.53, 0.69]
```

## Calibrated twin

Package `calibrated_twin.json`, sha256 `ffd28f31249ae715e3cf26de8de1373557a82d34535d3041a56c586444a796f2`.
Fitted: kp[shoulder_pan], kv[shoulder_pan], frictionloss[shoulder_pan], kp[shoulder_lift], kv[shoulder_lift], frictionloss[shoulder_lift], kp[elbow_flex], kv[elbow_flex], frictionloss[elbow_flex], kp[wrist_flex], kv[wrist_flex], frictionloss[wrist_flex], kp[wrist_roll], kv[wrist_roll], frictionloss[wrist_roll]; command delay 0 frame(s) (screened train MSE by delay, deg^2: {'0': 0.96081, '1': 1.05485, '2': 1.26845, '3': 1.39614, '4': 1.93481, '5': 3.3283}). Train MSE 6.35505 deg^2. Optimizer: converged (`ftol` termination condition is satisfied.). At a bound: frictionloss[wrist_flex].

```
joint          kp N m/rad   kv N m s/rad   frictionloss N m  armature kg m^2  zero offset deg
-------------  -----------  -------------  ----------------  ---------------  -----------------
shoulder_pan   50 -> 107.3  5.13 -> 8.97   0.1 -> 0.541      0.1 (fixed)      +0.0 (documented)
shoulder_lift  50 -> 11.22  4.96 -> 0.995  0.1 -> 0.198      0.1 (fixed)      +0.0 (documented)
elbow_flex     50 -> 18.52  4.63 -> 1.64   0.1 -> 0.364      0.1 (fixed)      +0.0 (documented)
wrist_flex     50 -> 71.74  4.49 -> 7.08   0.1 -> 1e-06      0.1 (fixed)      +0.0 (documented)
wrist_roll     50 -> 58.07  4.47 -> 4.55   0.1 -> 0.998      0.1 (fixed)      +0.0 (documented)
```

Identifiable servo combinations (the individual gains are not the claim): natural frequency sqrt(kp/I_eff) and damping ratio (kv+damping)/(2 sqrt(kp I_eff)), I_eff = joint-space inertia at the median pose incl. armature; 95% CI from a linearised episode bootstrap of the fit.

```
joint          I_eff kg m^2  natural freq Hz [CI]  damping ratio [CI]
-------------  ------------  --------------------  --------------------
shoulder_pan   0.1047        5.1 [4.46, 5.83]      1.34 [1.11, 1.49]
shoulder_lift  0.105         1.64 [1.62, 1.67]     0.458 [0.439, 0.478]
elbow_flex     0.1063        2.1 [2.07, 2.14]      0.586 [0.565, 0.607]
wrist_flex     0.1011        4.24 [4.02, 4.45]     1.31 [1.24, 1.37]
wrist_roll     0.1           3.83 [1.67, 9.57]     0.945 [0, 1.09]
```

Per-parameter identifiability (condition number of J^T J 499000.0): marginal/conditional std ratio = sqrt(VIF); >= 10 means only a combination with other parameters is identified.

```
parameter                    value      95% CI            std ratio  identified alone
---------------------------  ---------  ----------------  ---------  ----------------
kp[shoulder_pan]             107.3      [82.4, 141]       20.9       NO
kv[shoulder_pan]             8.971      [6.55, 11.3]      16.7       NO
frictionloss[shoulder_pan]   0.5414     [0.347, 0.74]     5.86       yes
kp[shoulder_lift]            11.22      [10.9, 11.6]      2.18       yes
kv[shoulder_lift]            0.9946     [0.942, 1.05]     2.46       yes
frictionloss[shoulder_lift]  0.1977     [0.179, 0.216]    1.44       yes
kp[elbow_flex]               18.52      [18, 19.1]        2.74       yes
kv[elbow_flex]               1.643      [1.56, 1.73]      2.79       yes
frictionloss[elbow_flex]     0.3645     [0.35, 0.378]     1.55       yes
kp[wrist_flex]               71.74      [64.5, 78.9]      18.8       NO
kv[wrist_flex]               7.078      [6.34, 7.73]      18.8       NO
frictionloss[wrist_flex]     1.109e-06  fixed (at bound)  n/a        -
kp[wrist_roll]               58.07      [11, 362]         14.8       NO
kv[wrist_roll]               4.554      [0, 11.5]         10.5       NO
frictionloss[wrist_roll]     0.9984     [0, 3.87]         5.92       yes
```

Posterior correlations |r| > 0.95: kp[wrist_flex] ~ kv[wrist_flex] (+0.999); kp[shoulder_pan] ~ kv[shoulder_pan] (+0.997); kp[wrist_roll] ~ kv[wrist_roll] (+0.993); kp[wrist_roll] ~ frictionloss[wrist_roll] (+0.977); kp[shoulder_pan] ~ frictionloss[shoulder_pan] (+0.973); kv[shoulder_pan] ~ frictionloss[shoulder_pan] (+0.958); kv[wrist_roll] ~ frictionloss[wrist_roll] (+0.953)

Weakest directions (relative eigenvalue: top loadings): 2e-06: kv[shoulder_pan] +0.76, frictionloss[shoulder_pan] +0.48, kp[shoulder_pan] +0.43, kv[wrist_flex] +0.00; 1.8e-05: frictionloss[wrist_roll] +0.84, kp[wrist_roll] +0.40, kv[wrist_roll] +0.35, kv[shoulder_pan] +0.00; 3.1e-05: kv[wrist_flex] -0.81, kp[wrist_flex] -0.58, kp[elbow_flex] +0.00, frictionloss[shoulder_lift] +0.00

Physics-free baseline (fitted on the same fit episodes): y[t+1] = y[t] + alpha*(a[t-d] + b - y[t]), y[0] = x[0], per arm joint; alpha [0.28, 0.56, 0.24, 0.3, 0.28], delay [0, 2, 0, 0, 0] frames, bias [-0.1322, -1.4547, 0.9491, -0.2, 1.489] deg.

## Mapping audit

Sign checks (1st-99th percentile of FIT-episode states vs MJCF range):

```
joint          recorded p1..p99 deg  MJCF range deg     shift (doc sign)  shift (flipped)  decision
-------------  --------------------  -----------------  ----------------  ---------------  ---------------------------------------------------------------------------
shoulder_pan   [-32.7, 35.16]        [-110.01, 110.01]  0.0               0.0              documented sign (flipped sign would also fit: sign not identified by range)
shoulder_lift  [58.54, 180.97]       [-190.22, 9.97]    171.0             0.0              flipped sign (documented sign does not fit the MJCF range)
elbow_flex     [80.38, 161.98]       [-9.97, 179.91]    0.0               152.01           documented sign
wrist_flex     [20.53, 99.05]        [-95.11, 95.11]    3.94              3.94             documented sign (flipped sign would also fit: sign not identified by range)
wrist_roll     [-165.76, -30.29]     [-159.86, 159.86]  5.91              5.91             documented sign (flipped sign would also fit: sign not identified by range)

same rule on other subsets (robustness): all_episodes: signs [1, -1, 1, 1, 1], accepted; heldout_only: signs [1, -1, 1, 1, 1], accepted -> agrees
released stock limits (crossed by fit episodes): {'wrist_flex': {'lower': False, 'upper': True}, 'wrist_roll': {'lower': True, 'upper': False}}
```

Forward-kinematics plausibility under the shipped mapping (evidence, not a gate; assumes the base sits on the work surface):

```
gripper lowest point minus base lowest point (m): {'p1': -0.003, 'p5': 0.005, 'p50': 0.083, 'min': -0.015}; frames > 2 cm below the base: 0.0
frames within 1 deg of a stock MJCF limit: {'shoulder_pan': 0.0, 'shoulder_lift': 0.0, 'elbow_flex': 0.0, 'wrist_flex': 0.0172, 'wrist_roll': 0.0051}
frames beyond a stock MJCF limit: {'shoulder_pan': 0.0, 'shoulder_lift': 0.0, 'elbow_flex': 0.0, 'wrist_flex': 0.0346, 'wrist_roll': 0.0639}
```

Gravity sag on real static frames (middle 80% of each episode, gripper >= 3 cm above the base plane): centred correlation between the servo's static error and the twin's gravity torque at the mapped pose, and the implied static stiffness (centred slope). Positive supports the mapping. Evidence, not a gate.

```
joint          corr [CI] verdict                                                                                           power (gravity std, n)  implied static K N m/rad  fitted kp
-------------  ----------------------------------------------------------------------------------------------------------  ----------------------  ------------------------  ---------
shoulder_pan   not testable (gravity torque ~constant over the selected static poses; gravity std 0.0 N m, 294 frames)                                                       107
shoulder_lift  not testable (gravity torque ~constant over the selected static poses; gravity std 0.001 N m, 294 frames)                                                     11.2
elbow_flex     not testable (gravity torque ~constant over the selected static poses; gravity std 0.001 N m, 294 frames)                                                     18.5
wrist_flex     not testable (gravity torque ~constant over the selected static poses; gravity std 0.0004 N m, 294 frames)                                                    71.7
wrist_roll     not testable (gravity torque ~constant over the selected static poses; gravity std 0.0001 N m, 294 frames)                                                    58.1
static frames: 306 (12 excluded as possible table contact) from 32 fit episodes
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
- Stock MJCF limits crossed by the fit episodes and released in the aligned/calibrated twins: wrist_flex upper, wrist_roll lower. The stock twin is held at those limits (counted as stock-twin error).
- Fitted parameters at a bound (within BOUND_TOL): frictionloss[wrist_flex]; the value is a bound, not an estimate.
- Not identified individually (marginal/conditional std ratio >= 10): kp[shoulder_pan], kv[shoulder_pan], kp[wrist_flex], kv[wrist_flex], kp[wrist_roll], kv[wrist_roll]. Only combinations of them are constrained by the data (see identifiability); individual values are not meaningful.
- interleaved: final-pose (static) gap is larger for the calibrated twin than for stock on shoulder_pan, shoulder_lift, wrist_flex, wrist_roll by point estimate; CIs separate on shoulder_lift, wrist_flex, wrist_roll.
- future: final-pose (static) gap is larger for the calibrated twin than for stock on shoulder_pan, shoulder_lift, wrist_flex, wrist_roll by point estimate; CIs separate on shoulder_lift, wrist_flex, wrist_roll.
- Joint direction flipped relative to the documented convention for shoulder_lift (chosen from the recorded range of motion vs the MJCF range; see mapping_checks).

## Provenance and reproduction

```
dataset        Chojins/chess_game_001_blue_stereo @ 32e5130eeba23302baf15ceb014124f3e50e3052 (requested 32e5130eeba23302baf15ceb014124f3e50e3052)
               LeRobot v2.1, robot_type so100-blue, 30 fps, 200 episodes loaded (repo: 577), 0 dropped
data files     data/chunk-000/episode_000000.parquet (10930943f768), data/chunk-000/episode_000001.parquet (ea166a377cce), data/chunk-000/episode_000002.parquet (b1ff489071b7), ... (200 files)
twin           trs_so_arm100 (so_arm100.xml) from https://github.com/google-deepmind/mujoco_menagerie @ b0655057a9df2abe39ea7fc989914ba6f248301c
               dir sha256 4f3b0f21b8a2b889..., timestep 0.002 -> 0.00196078 s x 17 substeps/frame, contacts disabled
software       mujoco 3.17.0, numpy 2.5.4, scipy 1.18.1, python 3.13.18, meatspace_lab 2.0.0 (code sha256 924eb3d8364be665...)
hardware       x86_64 Intel(R) Xeon(R) Processor @ 2.80GHz; OpenBLAS kernel numpy: SkylakeX; scipy: SkylakeX
report         schema meatspace.twin-gap-report/v2
               results sha256 90fd77ff654db93b79ee538ad404a52e0777d35d9484ee74ec58708b0875c3ab  (numbers only; any interpreter/CPU)
               content sha256 b26626c6feb90e4f60380b53a6b3ce5def851d29d2b0b5c0c909f935202a4577  (numbers + environment above)
```

Reproduce (from `lab/`, see README) into a scratch directory and compare:

```
python -m meatspace_lab report --dataset Chojins/chess_game_001_blue_stereo --revision 32e5130eeba23302baf15ceb014124f3e50e3052 \
    --twin .cache/menagerie/trs_so_arm100 --out /tmp/repro/ --max-episodes 200
python -m meatspace_lab verify reports/Chojins__chess_game_001_blue_stereo/report.json /tmp/repro/report.json
```
