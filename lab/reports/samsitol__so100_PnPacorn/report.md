# Twin Gap Report: samsitol/so100_PnPacorn x trs_so_arm100

```
HELD-OUT sim-vs-real joint RMSE, mean of 5 arm joints, deg  [95% bootstrap CI over episodes]
change = calibrated/reference - 1 (negative = better), paired by episode

FUTURE BLOCK (30 episodes)
  stock twin             1.47 [1.39, 1.55]
  aligned stock          1.24 [1.20, 1.27]   (stock dynamics + delay + released limits)
  lag-filter baseline    1.01 [0.98, 1.03]   (no physics: 3 params/joint)
  calibrated twin        0.93 [0.90, 0.96]
  change vs stock        -37% [-39, -34]   per-episode median -37% (range -49% .. -20%); 30/30 improved
  change vs baseline     -8% [-9, -6]   29/30 improved
  verdict                closes part of the gap (-37% [-39, -34] vs stock, residual 0.93 deg); calibrated twin beats the physics-free lag filter (-8% [-9, -6])

INTERLEAVED HELD-OUT (80 episodes)
  stock twin             1.54 [1.47, 1.61]
  aligned stock          1.26 [1.23, 1.30]   (stock dynamics + delay + released limits)
  lag-filter baseline    1.03 [1.00, 1.06]   (no physics: 3 params/joint)
  calibrated twin        0.87 [0.85, 0.90]
  change vs stock        -43% [-45, -41]   per-episode median -44% (range -58% .. -6%); 80/80 improved
  change vs baseline     -15% [-17, -13]   78/80 improved
  verdict                closes part of the gap (-43% [-45, -41] vs stock, residual 0.87 deg); calibrated twin beats the physics-free lag filter (-15% [-17, -13])

command->state lag, interleaved held-out, ms per joint (real / stock / calibrated):
  shoulder_pan 74/120/75  shoulder_lift 114/116/122  elbow_flex 115/110/132  wrist_flex 95/109/116  wrist_roll 106/107/115
  max |twin - real| over joints: stock 45.7 ms, calibrated 21.4 ms
```

![future-block held-out episode](heldout_episode.svg)

![per-joint RMSE, future block](rmse_by_joint_future.svg)

![per-joint RMSE, interleaved held-out](rmse_by_joint.svg)

## Future block (held out: the last 20% of episodes by index, recorded after every fit episode), n = 30

Per joint, mean over episodes [95% CI]. Degrees. Change = calibrated vs stock, negative = better.

```
sim-vs-real RMSE  stock                         aligned stock      baseline           calibrated                    change vs stock  vs baseline
----------------  ----------------------------  -----------------  -----------------  ----------------------------  ---------------  ---------------
shoulder_pan      1.22 [1.15, 1.30] (p90 1.47)  1.22 [1.15, 1.30]  0.32 [0.29, 0.35]  0.31 [0.28, 0.34] (p90 0.42)  -74% [-76, -73]  -1% [-3, +0]
shoulder_lift     1.09 [1.03, 1.15] (p90 1.27)  1.09 [1.03, 1.15]  1.08 [1.02, 1.14]  0.92 [0.88, 0.96] (p90 1.07)  -15% [-19, -11]  -15% [-20, -10]
elbow_flex        1.47 [1.41, 1.54] (p90 1.68)  1.48 [1.41, 1.54]  1.31 [1.28, 1.35]  1.22 [1.17, 1.27] (p90 1.46)  -17% [-22, -13]  -7% [-11, -3]
wrist_flex        3.04 [2.68, 3.40] (p90 3.98)  1.87 [1.75, 1.98]  1.70 [1.63, 1.77]  1.64 [1.54, 1.74] (p90 2.03)  -46% [-50, -41]  -4% [-7, -1]
wrist_roll        0.53 [0.50, 0.55] (p90 0.64)  0.53 [0.50, 0.55]  0.62 [0.59, 0.66]  0.56 [0.54, 0.58] (p90 0.66)  +6% [+4, +9]     -10% [-12, -8]
arm_mean          1.47 [1.39, 1.55] (p90 1.69)  1.24 [1.20, 1.27]  1.01 [0.98, 1.03]  0.93 [0.90, 0.96] (p90 1.03)  -37% [-39, -34]  -8% [-9, -6]

static-frame RMSE (quasi-static holds)  stock              baseline           calibrated         episodes with >= 10 static frames
--------------------------------------  -----------------  -----------------  -----------------  ---------------------------------
shoulder_pan                            0.13 [0.11, 0.15]  0.17 [0.14, 0.20]  0.14 [0.12, 0.16]  27
shoulder_lift                           0.25 [0.19, 0.33]  0.81 [0.70, 0.93]  0.32 [0.23, 0.42]  27
elbow_flex                              0.60 [0.54, 0.66]  1.67 [1.60, 1.73]  0.85 [0.68, 1.03]  27
wrist_flex                              2.66 [2.57, 2.76]  1.75 [1.65, 1.84]  1.86 [1.75, 1.96]  27
wrist_roll                              0.46 [0.40, 0.51]  0.48 [0.42, 0.54]  0.30 [0.25, 0.35]  27
arm_mean                                0.82 [0.79, 0.85]  0.98 [0.95, 1.00]  0.69 [0.65, 0.73]  27

command tracking RMSE  real robot         stock twin         calibrated twin
---------------------  -----------------  -----------------  -----------------
shoulder_pan           1.34 [1.23, 1.46]  2.48 [2.30, 2.66]  1.21 [1.12, 1.30]
shoulder_lift          2.53 [2.43, 2.62]  2.45 [2.37, 2.54]  2.71 [2.63, 2.80]
elbow_flex             2.81 [2.68, 2.94]  2.24 [2.10, 2.38]  3.03 [2.89, 3.17]
wrist_flex             2.67 [2.52, 2.82]  4.15 [3.69, 4.61]  2.55 [2.45, 2.66]
wrist_roll             1.11 [1.06, 1.16]  1.40 [1.32, 1.47]  1.52 [1.46, 1.59]

lag (frames)   real               stock              calibrated         real ms  stock ms  calib ms
-------------  -----------------  -----------------  -----------------  -------  --------  --------
shoulder_pan   2.34 [2.31, 2.36]  3.57 [3.56, 3.58]  2.23 [2.23, 2.23]  78       119       74
shoulder_lift  3.18 [3.15, 3.21]  3.46 [3.46, 3.47]  3.56 [3.54, 3.58]  106      115       119
elbow_flex     3.26 [3.22, 3.29]  3.28 [3.28, 3.28]  3.85 [3.81, 3.90]  109      109       129
wrist_flex     2.83 [2.74, 2.91]  3.20 [3.19, 3.21]  3.35 [3.29, 3.41]  94       107       112
wrist_roll     2.51 [2.48, 2.54]  3.16 [3.14, 3.18]  3.33 [3.29, 3.36]  84       105       111

final-pose gap  stock              calibrated
--------------  -----------------  -----------------
shoulder_pan    0.22 [0.15, 0.31]  0.14 [0.11, 0.17]
shoulder_lift   0.33 [0.23, 0.46]  0.56 [0.40, 0.74]
elbow_flex      0.72 [0.57, 0.92]  1.37 [1.17, 1.57]
wrist_flex      2.50 [2.20, 2.75]  1.90 [1.66, 2.12]
wrist_roll      0.50 [0.41, 0.59]  0.41 [0.32, 0.51]

fraction of states outside the fit episodes' range of motion +-2 deg: {'shoulder_pan': 0.0, 'shoulder_lift': 0.0, 'elbow_flex': 0.0, 'wrist_flex': 0.0, 'wrist_roll': 0.0}
fraction of states outside the twin's joint range: stock {'shoulder_pan': 0.0, 'shoulder_lift': 0.0, 'elbow_flex': 0.0, 'wrist_flex': 0.1124, 'wrist_roll': 0.0}; calibrated {'shoulder_pan': 0.0, 'shoulder_lift': 0.0, 'elbow_flex': 0.0, 'wrist_flex': 0.0, 'wrist_roll': 0.0}
```

## Interleaved held-out (random episodes from the same period as the fit episodes), n = 80

Per joint, mean over episodes [95% CI]. Degrees. Change = calibrated vs stock, negative = better.

```
sim-vs-real RMSE  stock                         aligned stock      baseline           calibrated                    change vs stock  vs baseline
----------------  ----------------------------  -----------------  -----------------  ----------------------------  ---------------  ---------------
shoulder_pan      1.19 [1.12, 1.25] (p90 1.66)  1.19 [1.12, 1.25]  0.34 [0.30, 0.38]  0.33 [0.30, 0.37] (p90 0.42)  -73% [-75, -69]  -3% [-6, -1]
shoulder_lift     1.15 [1.10, 1.20] (p90 1.46)  1.15 [1.11, 1.20]  1.22 [1.16, 1.28]  0.84 [0.81, 0.88] (p90 1.03)  -27% [-29, -24]  -31% [-34, -28]
elbow_flex        1.56 [1.51, 1.62] (p90 1.82)  1.54 [1.50, 1.58]  1.25 [1.22, 1.28]  1.04 [1.00, 1.07] (p90 1.20)  -34% [-35, -31]  -17% [-19, -14]
wrist_flex        3.31 [3.02, 3.62] (p90 5.09)  1.95 [1.85, 2.06]  1.82 [1.74, 1.89]  1.75 [1.66, 1.84] (p90 2.36)  -47% [-50, -44]  -4% [-6, -1]
wrist_roll        0.48 [0.44, 0.52] (p90 0.55)  0.48 [0.44, 0.52]  0.52 [0.49, 0.56]  0.42 [0.38, 0.46] (p90 0.56)  -12% [-17, -8]   -20% [-25, -14]
arm_mean          1.54 [1.47, 1.61] (p90 1.99)  1.26 [1.23, 1.30]  1.03 [1.00, 1.06]  0.87 [0.85, 0.90] (p90 1.03)  -43% [-45, -41]  -15% [-17, -13]

static-frame RMSE (quasi-static holds)  stock              baseline           calibrated         episodes with >= 10 static frames
--------------------------------------  -----------------  -----------------  -----------------  ---------------------------------
shoulder_pan                            0.15 [0.11, 0.18]  0.16 [0.13, 0.20]  0.16 [0.13, 0.20]  50
shoulder_lift                           0.46 [0.39, 0.52]  0.99 [0.87, 1.10]  0.46 [0.38, 0.56]  50
elbow_flex                              0.54 [0.47, 0.62]  1.49 [1.43, 1.55]  0.73 [0.62, 0.84]  50
wrist_flex                              2.38 [2.06, 2.76]  1.69 [1.54, 1.85]  1.77 [1.59, 1.96]  50
wrist_roll                              0.49 [0.42, 0.57]  0.53 [0.46, 0.61]  0.34 [0.28, 0.41]  50
arm_mean                                0.80 [0.73, 0.89]  0.97 [0.93, 1.02]  0.69 [0.65, 0.73]  50

command tracking RMSE  real robot         stock twin         calibrated twin
---------------------  -----------------  -----------------  -----------------
shoulder_pan           1.09 [1.00, 1.19]  2.21 [2.13, 2.31]  1.07 [1.03, 1.12]
shoulder_lift          2.57 [2.49, 2.65]  2.21 [2.14, 2.28]  2.52 [2.46, 2.59]
elbow_flex             2.79 [2.71, 2.88]  2.07 [1.96, 2.20]  2.83 [2.75, 2.92]
wrist_flex             2.53 [2.41, 2.65]  4.35 [3.93, 4.79]  2.33 [2.26, 2.40]
wrist_roll             1.33 [1.25, 1.42]  1.28 [1.21, 1.37]  1.43 [1.36, 1.51]

lag (frames)   real               stock              calibrated         real ms  stock ms  calib ms
-------------  -----------------  -----------------  -----------------  -------  --------  --------
shoulder_pan   2.22 [2.16, 2.29]  3.59 [3.59, 3.60]  2.24 [2.23, 2.24]  74       120       75
shoulder_lift  3.43 [3.40, 3.47]  3.49 [3.49, 3.51]  3.66 [3.64, 3.68]  114      116       122
elbow_flex     3.44 [3.40, 3.48]  3.30 [3.29, 3.30]  3.96 [3.91, 4.01]  115      110       132
wrist_flex     2.85 [2.76, 2.94]  3.26 [3.23, 3.29]  3.49 [3.44, 3.54]  95       109       116
wrist_roll     3.17 [3.07, 3.27]  3.22 [3.19, 3.27]  3.45 [3.40, 3.50]  106      107       115

final-pose gap  stock              calibrated
--------------  -----------------  -----------------
shoulder_pan    0.19 [0.14, 0.23]  0.11 [0.09, 0.14]
shoulder_lift   0.52 [0.46, 0.59]  0.56 [0.47, 0.66]
elbow_flex      0.48 [0.42, 0.57]  0.86 [0.77, 0.96]
wrist_flex      2.37 [2.15, 2.56]  1.87 [1.72, 2.03]
wrist_roll      0.51 [0.43, 0.59]  0.45 [0.37, 0.55]

fraction of states outside the fit episodes' range of motion +-2 deg: {'shoulder_pan': 0.0001, 'shoulder_lift': 0.0017, 'elbow_flex': 0.0, 'wrist_flex': 0.0, 'wrist_roll': 0.0058}
fraction of states outside the twin's joint range: stock {'shoulder_pan': 0.0, 'shoulder_lift': 0.0, 'elbow_flex': 0.0026, 'wrist_flex': 0.1544, 'wrist_roll': 0.0009}; calibrated {'shoulder_pan': 0.0, 'shoulder_lift': 0.0, 'elbow_flex': 0.0, 'wrist_flex': 0.0, 'wrist_roll': 0.0009}
```

## Fit episodes (used by the fit), n = 40

Per joint, mean over episodes [95% CI]. Degrees. Change = calibrated vs stock, negative = better.

```
sim-vs-real RMSE  stock                         aligned stock      baseline           calibrated                    change vs stock  vs baseline
----------------  ----------------------------  -----------------  -----------------  ----------------------------  ---------------  ---------------
shoulder_pan      1.22 [1.12, 1.33] (p90 1.65)  1.22 [1.12, 1.33]  0.37 [0.32, 0.44]  0.36 [0.31, 0.43] (p90 0.48)  -71% [-75, -65]  -4% [-6, -1]
shoulder_lift     1.07 [1.02, 1.12] (p90 1.27)  1.07 [1.02, 1.12]  1.14 [1.08, 1.20]  0.79 [0.75, 0.83] (p90 0.93)  -26% [-29, -23]  -31% [-35, -27]
elbow_flex        1.70 [1.58, 1.84] (p90 2.33)  1.64 [1.55, 1.73]  1.31 [1.25, 1.37]  1.10 [1.03, 1.18] (p90 1.49)  -35% [-38, -32]  -16% [-20, -11]
wrist_flex        3.63 [3.24, 4.02] (p90 4.97)  2.16 [2.01, 2.32]  1.96 [1.85, 2.08]  1.88 [1.74, 2.03] (p90 2.48)  -48% [-51, -45]  -4% [-7, -2]
wrist_roll        0.45 [0.43, 0.47] (p90 0.53)  0.45 [0.43, 0.47]  0.48 [0.45, 0.50]  0.34 [0.31, 0.37] (p90 0.48)  -24% [-28, -20]  -28% [-31, -25]
arm_mean          1.61 [1.52, 1.71] (p90 1.94)  1.31 [1.26, 1.36]  1.05 [1.01, 1.09]  0.89 [0.85, 0.94] (p90 1.08)  -45% [-47, -42]  -15% [-17, -13]

static-frame RMSE (quasi-static holds)  stock              baseline           calibrated         episodes with >= 10 static frames
--------------------------------------  -----------------  -----------------  -----------------  ---------------------------------
shoulder_pan                            0.13 [0.09, 0.17]  0.15 [0.12, 0.19]  0.14 [0.10, 0.18]  26
shoulder_lift                           0.50 [0.41, 0.59]  1.04 [0.89, 1.18]  0.55 [0.40, 0.70]  26
elbow_flex                              0.64 [0.43, 0.91]  1.47 [1.40, 1.54]  0.76 [0.59, 0.95]  26
wrist_flex                              2.53 [2.10, 3.02]  1.86 [1.57, 2.26]  1.91 [1.60, 2.34]  26
wrist_roll                              0.47 [0.39, 0.54]  0.51 [0.43, 0.58]  0.27 [0.22, 0.33]  26
arm_mean                                0.85 [0.78, 0.94]  1.01 [0.94, 1.08]  0.73 [0.66, 0.81]  26

command tracking RMSE  real robot         stock twin         calibrated twin
---------------------  -----------------  -----------------  -----------------
shoulder_pan           1.10 [0.98, 1.25]  2.26 [2.15, 2.39]  1.10 [1.04, 1.16]
shoulder_lift          2.58 [2.47, 2.68]  2.24 [2.15, 2.33]  2.52 [2.44, 2.60]
elbow_flex             2.95 [2.81, 3.10]  2.30 [2.06, 2.57]  2.90 [2.78, 3.02]
wrist_flex             2.73 [2.60, 2.87]  4.84 [4.26, 5.43]  2.27 [2.20, 2.33]
wrist_roll             1.43 [1.35, 1.51]  1.27 [1.20, 1.34]  1.41 [1.35, 1.47]

lag (frames)   real               stock              calibrated         real ms  stock ms  calib ms
-------------  -----------------  -----------------  -----------------  -------  --------  --------
shoulder_pan   2.21 [2.11, 2.32]  3.59 [3.58, 3.59]  2.24 [2.23, 2.25]  74       120       75
shoulder_lift  3.46 [3.41, 3.50]  3.49 [3.48, 3.50]  3.64 [3.61, 3.66]  115      116       121
elbow_flex     3.47 [3.41, 3.52]  3.30 [3.29, 3.30]  3.93 [3.87, 3.99]  116      110       131
wrist_flex     2.95 [2.85, 3.04]  3.22 [3.20, 3.25]  3.51 [3.44, 3.59]  98       107       117
wrist_roll     3.36 [3.25, 3.45]  3.19 [3.18, 3.21]  3.39 [3.36, 3.43]  112      106       113

final-pose gap  stock              calibrated
--------------  -----------------  -----------------
shoulder_pan    0.23 [0.09, 0.47]  0.12 [0.08, 0.17]
shoulder_lift   0.49 [0.38, 0.62]  0.52 [0.42, 0.61]
elbow_flex      0.53 [0.40, 0.67]  0.87 [0.74, 1.00]
wrist_flex      2.82 [2.38, 3.36]  2.04 [1.74, 2.36]
wrist_roll      0.50 [0.42, 0.59]  0.37 [0.30, 0.45]
```

## Calibrated twin

Package `calibrated_twin.json`, sha256 `f14be6d001a4d8066a1103e54384f75ce2787117f4627c59845d23ee0747676d`.
Fitted: kp[shoulder_pan], kv[shoulder_pan], frictionloss[shoulder_pan], kp[shoulder_lift], kv[shoulder_lift], frictionloss[shoulder_lift], kp[elbow_flex], kv[elbow_flex], frictionloss[elbow_flex], kp[wrist_flex], kv[wrist_flex], frictionloss[wrist_flex], kp[wrist_roll], kv[wrist_roll], frictionloss[wrist_roll]; command delay 0 frame(s) (screened train MSE by delay, deg^2: {'0': 1.5568, '1': 1.81779, '2': 2.16285, '3': 2.66507, '4': 4.15063, '5': 6.89888}). Train MSE 1.19098 deg^2. Optimizer: converged (`ftol` termination condition is satisfied.). At a bound: frictionloss[wrist_flex].

```
joint          kp N m/rad   kv N m s/rad  frictionloss N m  armature kg m^2  zero offset deg
-------------  -----------  ------------  ----------------  ---------------  -----------------
shoulder_pan   50 -> 145    5.13 -> 8.08  0.1 -> 0.298      0.1 (fixed)      +0.0 (documented)
shoulder_lift  50 -> 20.21  4.96 -> 1.71  0.1 -> 0.315      0.1 (fixed)      +0.0 (documented)
elbow_flex     50 -> 17.39  4.63 -> 1.36  0.1 -> 0.479      0.1 (fixed)      +0.0 (documented)
wrist_flex     50 -> 34.05  4.49 -> 2.05  0.1 -> 1          0.1 (fixed)      +0.0 (documented)
wrist_roll     50 -> 53.53  4.47 -> 4.35  0.1 -> 0.495      0.1 (fixed)      +0.0 (documented)
```

Identifiable servo combinations (the individual gains are not the claim): natural frequency sqrt(kp/I_eff) and damping ratio (kv+damping)/(2 sqrt(kp I_eff)), I_eff = joint-space inertia at the median pose incl. armature; 95% CI from a linearised episode bootstrap of the fit.

```
joint          I_eff kg m^2  natural freq Hz [CI]  damping ratio [CI]
-------------  ------------  --------------------  --------------------
shoulder_pan   0.1036        5.95 [5.23, 6.76]     1.04 [0.835, 1.19]
shoulder_lift  0.1061        2.2 [2.13, 2.26]      0.583 [0.547, 0.612]
elbow_flex     0.1056        2.04 [1.98, 2.11]     0.502 [0.468, 0.532]
wrist_flex     0.1011        2.92 [2.76, 3.09]     0.552 [0.461, 0.633]
wrist_roll     0.1           3.68 [3.33, 4.09]     0.939 [0.861, 0.993]
```

Per-parameter identifiability (condition number of J^T J 101000.0): marginal/conditional std ratio = sqrt(VIF); >= 10 means only a combination with other parameters is identified.

```
parameter                    value   95% CI            std ratio  identified alone
---------------------------  ------  ----------------  ---------  ----------------
kp[shoulder_pan]             145     [112, 187]        25.8       NO
kv[shoulder_pan]             8.075   [5.74, 10.3]      24.3       NO
frictionloss[shoulder_pan]   0.2979  [0.219, 0.369]    2.5        yes
kp[shoulder_lift]            20.21   [19.1, 21.4]      2.51       yes
kv[shoulder_lift]            1.706   [1.56, 1.83]      2.84       yes
frictionloss[shoulder_lift]  0.3148  [0.283, 0.35]     1.5        yes
kp[elbow_flex]               17.39   [16.3, 18.5]      2.43       yes
kv[elbow_flex]               1.36    [1.23, 1.48]      2.32       yes
frictionloss[elbow_flex]     0.4788  [0.448, 0.513]    1.69       yes
kp[wrist_flex]               34.05   [30.3, 38.1]      2.44       yes
kv[wrist_flex]               2.049   [1.62, 2.47]      2.44       yes
frictionloss[wrist_flex]     1       fixed (at bound)  n/a        -
kp[wrist_roll]               53.53   [43.9, 66.2]      10.2       NO
kv[wrist_roll]               4.346   [3.62, 5.09]      7.99       yes
frictionloss[wrist_roll]     0.4953  [0.392, 0.598]    3.22       yes
```

Posterior correlations |r| > 0.95: kp[shoulder_pan] ~ kv[shoulder_pan] (+0.999); kp[wrist_roll] ~ kv[wrist_roll] (+0.985)

Weakest directions (relative eigenvalue: top loadings): 9.9e-06: kv[shoulder_pan] +0.77, kp[shoulder_pan] +0.51, frictionloss[shoulder_pan] +0.37, frictionloss[shoulder_lift] +0.00; 0.00011: frictionloss[wrist_roll] +0.64, kp[wrist_roll] +0.59, kv[wrist_roll] +0.49, frictionloss[elbow_flex] +0.00; 0.00022: frictionloss[shoulder_pan] +0.93, kv[shoulder_pan] -0.35, kp[shoulder_pan] -0.14, kp[shoulder_lift] +0.00

Physics-free baseline (fitted on the same fit episodes): y[t+1] = y[t] + alpha*(a[t-d] + b - y[t]), y[0] = x[0], per arm joint; alpha [0.44, 0.68, 0.28, 0.32, 0.28], delay [0, 2, 0, 0, 0] frames, bias [-0.0655, -0.6984, 1.4607, -0.9713, 0.0134] deg.

## Mapping audit

Sign checks (1st-99th percentile of FIT-episode states vs MJCF range):

```
joint          recorded p1..p99 deg  MJCF range deg     shift (doc sign)  shift (flipped)  decision
-------------  --------------------  -----------------  ----------------  ---------------  ---------------------------------------------------------------------------
shoulder_pan   [-74.36, 95.62]       [-110.01, 110.01]  0.0               0.0              documented sign (flipped sign would also fit: sign not identified by range)
shoulder_lift  [24.35, 179.03]       [-190.22, 9.97]    169.06            0.0              flipped sign (documented sign does not fit the MJCF range)
elbow_flex     [-3.53, 166.73]       [-9.97, 179.91]    0.0               156.76           documented sign
wrist_flex     [-27.51, 105.64]      [-95.11, 95.11]    10.53             10.53            documented sign (flipped sign would also fit: sign not identified by range)
wrist_roll     [17.75, 109.62]       [-159.86, 159.86]  0.0               0.0              documented sign (flipped sign would also fit: sign not identified by range)

same rule on other subsets (robustness): all_episodes: signs [1, -1, 1, 1, 1], accepted; heldout_only: signs [1, -1, 1, 1, 1], accepted -> agrees
released stock limits (crossed by fit episodes): {'elbow_flex': {'lower': True, 'upper': False}, 'wrist_flex': {'lower': False, 'upper': True}}
```

Forward-kinematics plausibility under the shipped mapping (evidence, not a gate; assumes the base sits on the work surface):

```
gripper lowest point minus base lowest point (m): {'p1': 0.012, 'p5': 0.026, 'p50': 0.074, 'min': -0.014}; frames > 2 cm below the base: 0.0
frames within 1 deg of a stock MJCF limit: {'shoulder_pan': 0.0, 'shoulder_lift': 0.0, 'elbow_flex': 0.0003, 'wrist_flex': 0.0188, 'wrist_roll': 0.0001}
frames beyond a stock MJCF limit: {'shoulder_pan': 0.0, 'shoulder_lift': 0.0, 'elbow_flex': 0.0034, 'wrist_flex': 0.1416, 'wrist_roll': 0.0004}
```

Gravity sag on real static frames (middle 80% of each episode, gripper >= 3 cm above the base plane): centred correlation between the servo's static error and the twin's gravity torque at the mapped pose, and the implied static stiffness (centred slope). Positive supports the mapping. Evidence, not a gate.

```
joint          corr [CI] verdict                                                                                           power (gravity std, n)  implied static K N m/rad  fitted kp
-------------  ----------------------------------------------------------------------------------------------------------  ----------------------  ------------------------  ---------
shoulder_pan   not testable (gravity torque ~constant over the selected static poses; gravity std 0.0 N m, 816 frames)                                                       145
shoulder_lift  +0.49 [+0.30, +0.72] positive                                                                               0.1636 N m, 816 fr      41.4 [24.1, 65]           20.2
elbow_flex     not testable (gravity torque ~constant over the selected static poses; gravity std 0.0151 N m, 816 frames)                                                    17.4
wrist_flex     not testable (gravity torque ~constant over the selected static poses; gravity std 0.0103 N m, 816 frames)                                                    34
wrist_roll     not testable (gravity torque ~constant over the selected static poses; gravity std 0.0002 N m, 816 frames)                                                    53.5
static frames: 929 (113 excluded as possible table contact) from 31 fit episodes
```

## Method

- Recording convention (lerobot-legacy): Legacy LeRobot (ManipulatorRobot.teleop_step, `main_*` names): the goal a[t] is WRITTEN to the follower first and the follower state x[t] is READ afterwards (a few ms later), so x[t] may already contain a few ms of response to a[t] (act-then-observe).
- Replay: Replay (identical for both conventions): q_sim[0]=x[0] (zero velocity); for t=0..T-2 apply ctrl=a[t-d] (d = fitted integer command delay, stock d=0) for the whole frame, step `substeps` physics steps (timestep set so substeps*timestep = 1/fps exactly), record q_sim[t+1]; sim and real are compared at the same index t=1..T-1. The real sub-frame send-to-read offset (legacy: a[t] sent a few ms BEFORE x[t] is read; current: a[t] sent a few ms AFTER) is not modelled; it is absorbed by the fitted dynamics/delay, and it shifts lags between the two conventions by a fraction of a frame in opposite directions.
- Lag: lag = argmin_L Var(a[t] - y[t+L]) over a fixed window t in [0, T-10), parabolic sub-frame refinement; y = real or sim state. Includes the 1-frame sampling offset: in the replay and in observe-then-act (current LeRobot) recordings an instantaneous actuator measures 1.0 frame; in act-then-observe (legacy) recordings it would measure ~0, and a realistic servo measures its delay minus the few-ms write-to-read gap. Lags are therefore directly comparable between sim and real within one dataset, and only approximately (fraction of a frame) across codebases. Also reported in ms, since datasets differ in fps. Joints with command std < 1 deg in an episode are skipped.
- Units: legacy LeRobot degrees (tick = 180/2048 deg verified on every arm joint) (decided on the fit episodes; held-out episodes agree). Mapping to MJCF: q = sign*deg2rad(x) + deg2rad(offset); legacy LeRobot zero pose = arm straight horizontal (feetech_calibration.py); the MJCF zero (from the SO-ARM100 URDF) is also the arm stretched horizontally forward, so nominal offsets are 0. Documented signs +1 (MJCF joint axes); legacy LeRobot sets each motor's direction from the user's 'rotated position', so signs are checked per dataset against the recorded range of motion (mapping_checks).
- Split: future = last round(n*test_frac) episodes by index; interleaved = round(n*test_frac) episodes of the rest drawn by numpy default_rng(seed).permutation, plus every remaining episode beyond the fit cap; fit = the remaining episodes (<= max_train_episodes) (seed 0). Future: [120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149]. Interleaved: [0, 1, 5, 7, 10, 12, 13, 14, 16, 20, 21, 23, 26, 27, 29, 31, 32, 33, 34, 36, 38, 39, 40, 41, 44, 45, 46, 47, 48, 49, 50, 51, 54, 56, 57, 58, 59, 60, 61, 62, 63, 67, 69, 70, 72, 73, 76, 77, 78, 79, 84, 85, 87, 88, 89, 91, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119]. Overlap with fit: none.
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
- Confidence intervals are percentile bootstraps over episodes (whole episodes resampled, 10,000 draws, fixed seed); with 30 future / 80 interleaved held-out episodes they are approximate and tend to be slightly too narrow. They do not cover the choice of split, of fit configuration, or of dataset.
- Recorded with legacy LeRobot (act-then-observe); lags are not exactly comparable with current-LeRobot (observe-then-act) datasets (see conventions).
- Stock MJCF limits crossed by the fit episodes and released in the aligned/calibrated twins: elbow_flex lower, wrist_flex upper. The stock twin is held at those limits (counted as stock-twin error).
- Fitted parameters at a bound (within BOUND_TOL): frictionloss[wrist_flex]; the value is a bound, not an estimate.
- Not identified individually (marginal/conditional std ratio >= 10): kp[shoulder_pan], kv[shoulder_pan], kp[wrist_roll]. Only combinations of them are constrained by the data (see identifiability); individual values are not meaningful.
- interleaved: final-pose (static) gap is larger for the calibrated twin than for stock on shoulder_lift, elbow_flex by point estimate; CIs separate on elbow_flex.
- future: final-pose (static) gap is larger for the calibrated twin than for stock on shoulder_lift, elbow_flex by point estimate; CIs separate on elbow_flex.
- Joint direction flipped relative to the documented convention for shoulder_lift (chosen from the recorded range of motion vs the MJCF range; see mapping_checks).

## Provenance and reproduction

```
dataset        samsitol/so100_PnPacorn @ e6df029701efdd46cf260eb26303f2d67005abfb (requested e6df029701efdd46cf260eb26303f2d67005abfb)
               LeRobot v2.1, robot_type so100, 30 fps, 150 episodes loaded (repo: 150), 0 dropped
data files     data/chunk-000/episode_000000.parquet (adb2bcd395c9), data/chunk-000/episode_000001.parquet (becbcace3cbb), data/chunk-000/episode_000002.parquet (8962a59f67c1), ... (150 files)
twin           trs_so_arm100 (so_arm100.xml) from https://github.com/google-deepmind/mujoco_menagerie @ b0655057a9df2abe39ea7fc989914ba6f248301c
               dir sha256 4f3b0f21b8a2b889..., timestep 0.002 -> 0.00196078 s x 17 substeps/frame, contacts disabled
software       mujoco 3.17.0, numpy 2.5.4, scipy 1.18.1, python 3.13.18, meatspace_lab 2.0.0 (code sha256 924eb3d8364be665...)
hardware       x86_64 Intel(R) Xeon(R) Processor @ 2.80GHz; OpenBLAS kernel numpy: SkylakeX; scipy: SkylakeX
report         schema meatspace.twin-gap-report/v2
               results sha256 70414f94f4215d9d04f0d67081ea93c8fb727e33d2194f47fbe560c9298c37ca  (numbers only; any interpreter/CPU)
               content sha256 79a1d736e05ee7250ee65f2a510c49fa38c8dbbe78fc87084fff8fa83697df99  (numbers + environment above)
```

Reproduce (from `lab/`, see README) into a scratch directory and compare:

```
python -m meatspace_lab report --dataset samsitol/so100_PnPacorn --revision e6df029701efdd46cf260eb26303f2d67005abfb \
    --twin .cache/menagerie/trs_so_arm100 --out /tmp/repro/ --max-episodes 200
python -m meatspace_lab verify reports/samsitol__so100_PnPacorn/report.json /tmp/repro/report.json
```
