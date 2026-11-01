# Twin Gap Report: Loki0929/so100_lan x trs_so_arm100

```
HELD-OUT sim-vs-real joint RMSE, mean of 5 arm joints, deg  [95% bootstrap CI over episodes]
change = calibrated/reference - 1 (negative = better), paired by episode

FUTURE BLOCK (40 episodes)
  stock twin             1.71 [1.57, 1.86]
  aligned stock          1.04 [0.97, 1.11]   (stock dynamics + delay + released limits)
  lag-filter baseline    1.05 [0.98, 1.12]   (no physics: 3 params/joint)
  calibrated twin        0.89 [0.82, 0.97]
  change vs stock        -48% [-49, -46]   per-episode median -49% (range -54% .. -36%); 40/40 improved
  change vs baseline     -15% [-17, -13]   40/40 improved
  verdict                closes part of the gap (-48% [-49, -46] vs stock, residual 0.89 deg); calibrated twin beats the physics-free lag filter (-15% [-17, -13])

INTERLEAVED HELD-OUT (120 episodes)
  stock twin             1.78 [1.69, 1.88]
  aligned stock          1.18 [1.13, 1.22]   (stock dynamics + delay + released limits)
  lag-filter baseline    1.16 [1.12, 1.21]   (no physics: 3 params/joint)
  calibrated twin        1.04 [0.99, 1.10]
  change vs stock        -42% [-43, -40]   per-episode median -45% (range -58% .. -5%); 120/120 improved
  change vs baseline     -11% [-12, -10]   120/120 improved
  verdict                closes part of the gap (-42% [-43, -40] vs stock, residual 1.04 deg); calibrated twin beats the physics-free lag filter (-11% [-12, -10])

command->state lag, interleaved held-out, ms per joint (real / stock / calibrated):
  shoulder_pan 146/118/150  shoulder_lift 156/116/154  elbow_flex 153/108/143  wrist_flex 137/105/123  wrist_roll 131/107/131
  max |twin - real| over joints: stock 44.8 ms, calibrated 14.2 ms
```

![future-block held-out episode](heldout_episode.svg)

![per-joint RMSE, future block](rmse_by_joint_future.svg)

![per-joint RMSE, interleaved held-out](rmse_by_joint.svg)

## Future block (held out: the last 20% of episodes by index, recorded after every fit episode), n = 40

Per joint, mean over episodes [95% CI]. Degrees. Change = calibrated vs stock, negative = better.

```
sim-vs-real RMSE  stock                         aligned stock      baseline           calibrated                    change vs stock  vs baseline
----------------  ----------------------------  -----------------  -----------------  ----------------------------  ---------------  ---------------
shoulder_pan      1.12 [0.92, 1.38] (p90 1.65)  0.56 [0.50, 0.63]  0.54 [0.48, 0.62]  0.53 [0.47, 0.61] (p90 0.68)  -53% [-57, -47]  -2% [-4, -0]
shoulder_lift     2.20 [2.01, 2.40] (p90 3.11)  1.47 [1.38, 1.56]  1.40 [1.33, 1.47]  0.99 [0.93, 1.06] (p90 1.34)  -55% [-57, -53]  -29% [-32, -27]
elbow_flex        3.24 [2.86, 3.64] (p90 4.89)  2.01 [1.77, 2.27]  1.89 [1.64, 2.16]  1.72 [1.44, 2.01] (p90 2.88)  -47% [-50, -44]  -9% [-12, -7]
wrist_flex        1.39 [1.23, 1.58] (p90 1.91)  0.83 [0.75, 0.92]  1.07 [0.96, 1.20]  0.93 [0.80, 1.09] (p90 1.39)  -33% [-36, -30]  -13% [-17, -9]
wrist_roll        0.59 [0.54, 0.64] (p90 0.76)  0.32 [0.31, 0.34]  0.35 [0.32, 0.37]  0.29 [0.27, 0.31] (p90 0.36)  -51% [-53, -48]  -17% [-18, -15]
arm_mean          1.71 [1.57, 1.86] (p90 2.34)  1.04 [0.97, 1.11]  1.05 [0.98, 1.12]  0.89 [0.82, 0.97] (p90 1.29)  -48% [-49, -46]  -15% [-17, -13]

static-frame RMSE (quasi-static holds)  stock              baseline           calibrated         episodes with >= 10 static frames
--------------------------------------  -----------------  -----------------  -----------------  ---------------------------------
shoulder_pan                            0.26 [0.21, 0.31]  0.31 [0.25, 0.38]  0.32 [0.27, 0.37]  40
shoulder_lift                           0.08 [0.06, 0.10]  0.92 [0.88, 0.95]  0.26 [0.23, 0.29]  40
elbow_flex                              0.37 [0.30, 0.44]  1.15 [1.07, 1.22]  0.68 [0.60, 0.75]  40
wrist_flex                              0.80 [0.69, 0.90]  0.86 [0.75, 0.96]  0.55 [0.47, 0.64]  40
wrist_roll                              0.28 [0.23, 0.34]  0.34 [0.29, 0.41]  0.24 [0.19, 0.30]  40
arm_mean                                0.36 [0.34, 0.37]  0.72 [0.70, 0.73]  0.41 [0.40, 0.43]  40

command tracking RMSE  real robot         stock twin         calibrated twin
---------------------  -----------------  -----------------  -----------------
shoulder_pan           3.56 [3.25, 3.87]  2.72 [2.46, 3.05]  3.56 [3.30, 3.81]
shoulder_lift          5.66 [5.28, 6.04]  3.73 [3.54, 3.91]  5.59 [5.31, 5.86]
elbow_flex             6.76 [6.11, 7.42]  3.72 [3.44, 4.00]  5.47 [5.09, 5.85]
wrist_flex             3.37 [3.04, 3.75]  2.17 [1.98, 2.36]  2.71 [2.51, 2.94]
wrist_roll             1.94 [1.82, 2.06]  1.41 [1.34, 1.49]  1.86 [1.76, 1.96]

lag (frames)   real               stock              calibrated         real ms  stock ms  calib ms
-------------  -----------------  -----------------  -----------------  -------  --------  --------
shoulder_pan   4.41 [4.33, 4.48]  3.56 [3.56, 3.57]  4.50 [4.49, 4.50]  147      119       150
shoulder_lift  4.57 [4.49, 4.65]  3.48 [3.48, 3.48]  4.60 [4.60, 4.61]  152      116       153
elbow_flex     5.01 [4.88, 5.13]  3.27 [3.26, 3.27]  4.33 [4.31, 4.35]  167      109       144
wrist_flex     4.31 [4.24, 4.38]  3.16 [3.16, 3.17]  3.75 [3.73, 3.78]  144      105       125
wrist_roll     3.98 [3.94, 4.01]  3.18 [3.17, 3.18]  3.92 [3.91, 3.92]  133      106       131

final-pose gap  stock              calibrated
--------------  -----------------  -----------------
shoulder_pan    0.19 [0.16, 0.23]  0.27 [0.22, 0.31]
shoulder_lift   0.08 [0.06, 0.10]  0.31 [0.28, 0.34]
elbow_flex      0.36 [0.30, 0.44]  0.67 [0.60, 0.74]
wrist_flex      0.81 [0.70, 0.91]  0.70 [0.63, 0.78]
wrist_roll      0.28 [0.22, 0.35]  0.26 [0.20, 0.32]

fraction of states outside the fit episodes' range of motion +-2 deg: {'shoulder_pan': 0.0062, 'shoulder_lift': 0.0007, 'elbow_flex': 0.0073, 'wrist_flex': 0.0, 'wrist_roll': 0.0006}
fraction of states outside the twin's joint range: stock {'shoulder_pan': 0.0131, 'shoulder_lift': 0.0, 'elbow_flex': 0.0, 'wrist_flex': 0.004, 'wrist_roll': 0.0}; calibrated {'shoulder_pan': 0.0, 'shoulder_lift': 0.0, 'elbow_flex': 0.0, 'wrist_flex': 0.0, 'wrist_roll': 0.0}
```

## Interleaved held-out (random episodes from the same period as the fit episodes), n = 120

Per joint, mean over episodes [95% CI]. Degrees. Change = calibrated vs stock, negative = better.

```
sim-vs-real RMSE  stock                         aligned stock      baseline           calibrated                    change vs stock  vs baseline
----------------  ----------------------------  -----------------  -----------------  ----------------------------  ---------------  ---------------
shoulder_pan      1.07 [0.96, 1.18] (p90 1.85)  0.59 [0.55, 0.64]  0.56 [0.52, 0.62]  0.55 [0.51, 0.60] (p90 0.78)  -48% [-51, -45]  -2% [-3, -0]
shoulder_lift     2.46 [2.33, 2.58] (p90 3.43)  1.47 [1.41, 1.53]  1.39 [1.34, 1.45]  1.02 [0.97, 1.07] (p90 1.42)  -58% [-59, -57]  -27% [-29, -25]
elbow_flex        3.03 [2.75, 3.31] (p90 5.01)  2.17 [2.03, 2.32]  2.06 [1.90, 2.22]  1.98 [1.81, 2.15] (p90 3.07)  -35% [-39, -30]  -4% [-5, -3]
wrist_flex        1.76 [1.60, 1.93] (p90 2.96)  1.29 [1.19, 1.40]  1.44 [1.33, 1.57]  1.33 [1.20, 1.48] (p90 2.34)  -24% [-28, -21]  -8% [-10, -5]
wrist_roll        0.60 [0.56, 0.64] (p90 0.89)  0.36 [0.35, 0.37]  0.37 [0.35, 0.39]  0.33 [0.31, 0.35] (p90 0.45)  -46% [-47, -43]  -11% [-13, -10]
arm_mean          1.78 [1.69, 1.88] (p90 2.43)  1.18 [1.13, 1.22]  1.16 [1.12, 1.21]  1.04 [0.99, 1.10] (p90 1.35)  -42% [-43, -40]  -11% [-12, -10]

static-frame RMSE (quasi-static holds)  stock              baseline           calibrated         episodes with >= 10 static frames
--------------------------------------  -----------------  -----------------  -----------------  ---------------------------------
shoulder_pan                            0.19 [0.17, 0.21]  0.25 [0.23, 0.28]  0.24 [0.22, 0.27]  112
shoulder_lift                           0.07 [0.06, 0.09]  1.03 [1.00, 1.06]  0.17 [0.16, 0.19]  112
elbow_flex                              0.19 [0.16, 0.23]  0.96 [0.92, 1.00]  0.49 [0.45, 0.53]  112
wrist_flex                              1.09 [1.03, 1.15]  1.15 [1.09, 1.21]  0.79 [0.74, 0.84]  112
wrist_roll                              0.31 [0.27, 0.34]  0.37 [0.33, 0.41]  0.26 [0.23, 0.30]  112
arm_mean                                0.37 [0.36, 0.38]  0.75 [0.74, 0.77]  0.39 [0.38, 0.40]  112

command tracking RMSE  real robot         stock twin         calibrated twin
---------------------  -----------------  -----------------  -----------------
shoulder_pan           3.63 [3.41, 3.87]  2.67 [2.54, 2.80]  3.63 [3.46, 3.81]
shoulder_lift          6.36 [6.11, 6.62]  4.14 [4.01, 4.28]  6.16 [5.97, 6.36]
elbow_flex             6.50 [6.05, 6.95]  3.91 [3.76, 4.06]  5.69 [5.49, 5.90]
wrist_flex             3.86 [3.57, 4.17]  2.69 [2.57, 2.82]  3.21 [3.07, 3.36]
wrist_roll             1.99 [1.88, 2.10]  1.47 [1.40, 1.54]  1.92 [1.83, 2.01]

lag (frames)   real               stock              calibrated         real ms  stock ms  calib ms
-------------  -----------------  -----------------  -----------------  -------  --------  --------
shoulder_pan   4.39 [4.35, 4.45]  3.55 [3.54, 3.55]  4.50 [4.50, 4.50]  146      118       150
shoulder_lift  4.67 [4.63, 4.71]  3.47 [3.47, 3.48]  4.61 [4.61, 4.61]  156      116       154
elbow_flex     4.60 [4.42, 4.77]  3.25 [3.25, 3.25]  4.30 [4.29, 4.31]  153      108       143
wrist_flex     4.12 [3.98, 4.26]  3.16 [3.16, 3.17]  3.69 [3.68, 3.71]  137      105       123
wrist_roll     3.94 [3.91, 3.97]  3.20 [3.19, 3.20]  3.92 [3.91, 3.92]  131      107       131

final-pose gap  stock              calibrated
--------------  -----------------  -----------------
shoulder_pan    0.18 [0.16, 0.21]  0.24 [0.21, 0.27]
shoulder_lift   0.12 [0.10, 0.15]  0.25 [0.23, 0.27]
elbow_flex      0.22 [0.18, 0.26]  0.53 [0.49, 0.58]
wrist_flex      1.06 [1.00, 1.11]  0.79 [0.75, 0.83]
wrist_roll      0.32 [0.28, 0.35]  0.29 [0.26, 0.32]

fraction of states outside the fit episodes' range of motion +-2 deg: {'shoulder_pan': 0.0024, 'shoulder_lift': 0.0017, 'elbow_flex': 0.0036, 'wrist_flex': 0.008, 'wrist_roll': 0.0011}
fraction of states outside the twin's joint range: stock {'shoulder_pan': 0.0023, 'shoulder_lift': 0.0101, 'elbow_flex': 0.0, 'wrist_flex': 0.0298, 'wrist_roll': 0.0}; calibrated {'shoulder_pan': 0.0, 'shoulder_lift': 0.0101, 'elbow_flex': 0.0, 'wrist_flex': 0.0, 'wrist_roll': 0.0}
```

## Fit episodes (used by the fit), n = 40

Per joint, mean over episodes [95% CI]. Degrees. Change = calibrated vs stock, negative = better.

```
sim-vs-real RMSE  stock                         aligned stock      baseline           calibrated                    change vs stock  vs baseline
----------------  ----------------------------  -----------------  -----------------  ----------------------------  ---------------  ---------------
shoulder_pan      1.02 [0.84, 1.22] (p90 2.03)  0.61 [0.55, 0.67]  0.56 [0.50, 0.64]  0.56 [0.50, 0.64] (p90 0.87)  -45% [-49, -38]  +0% [-1, +2]
shoulder_lift     2.06 [1.86, 2.27] (p90 2.89)  1.34 [1.24, 1.45]  1.30 [1.22, 1.38]  0.95 [0.88, 1.03] (p90 1.25)  -54% [-57, -51]  -27% [-30, -23]
elbow_flex        2.24 [1.88, 2.62] (p90 3.72)  2.00 [1.88, 2.13]  1.84 [1.71, 1.99]  1.80 [1.65, 1.96] (p90 2.22)  -20% [-31, -4]   -2% [-4, -1]
wrist_flex        1.35 [1.15, 1.57] (p90 2.31)  1.35 [1.22, 1.49]  1.26 [1.15, 1.40]  1.15 [1.02, 1.31] (p90 1.76)  -15% [-22, -6]   -9% [-13, -6]
wrist_roll        0.50 [0.44, 0.58] (p90 0.74)  0.36 [0.34, 0.39]  0.32 [0.29, 0.35]  0.29 [0.26, 0.32] (p90 0.43)  -43% [-47, -38]  -10% [-13, -7]
arm_mean          1.43 [1.31, 1.55] (p90 1.97)  1.13 [1.08, 1.18]  1.06 [1.02, 1.10]  0.95 [0.90, 1.00] (p90 1.15)  -34% [-39, -28]  -10% [-12, -8]

static-frame RMSE (quasi-static holds)  stock              baseline           calibrated         episodes with >= 10 static frames
--------------------------------------  -----------------  -----------------  -----------------  ---------------------------------
shoulder_pan                            0.16 [0.13, 0.20]  0.22 [0.18, 0.27]  0.21 [0.17, 0.26]  33
shoulder_lift                           0.07 [0.05, 0.10]  1.05 [1.01, 1.10]  0.14 [0.11, 0.17]  33
elbow_flex                              0.27 [0.18, 0.36]  1.04 [0.95, 1.14]  0.58 [0.49, 0.68]  33
wrist_flex                              1.02 [0.88, 1.15]  1.09 [0.95, 1.22]  0.75 [0.63, 0.87]  33
wrist_roll                              0.22 [0.17, 0.27]  0.28 [0.23, 0.33]  0.18 [0.14, 0.23]  33
arm_mean                                0.35 [0.33, 0.37]  0.74 [0.71, 0.76]  0.37 [0.35, 0.40]  33

command tracking RMSE  real robot         stock twin         calibrated twin
---------------------  -----------------  -----------------  -----------------
shoulder_pan           3.54 [3.11, 3.98]  2.64 [2.40, 2.90]  3.58 [3.25, 3.94]
shoulder_lift          5.43 [5.03, 5.85]  3.63 [3.42, 3.86]  5.42 [5.11, 5.75]
elbow_flex             5.09 [4.44, 5.77]  3.53 [3.33, 3.74]  5.18 [4.90, 5.47]
wrist_flex             3.11 [2.74, 3.54]  2.54 [2.34, 2.74]  3.06 [2.84, 3.28]
wrist_roll             1.86 [1.69, 2.06]  1.43 [1.32, 1.54]  1.87 [1.72, 2.02]

lag (frames)   real               stock              calibrated         real ms  stock ms  calib ms
-------------  -----------------  -----------------  -----------------  -------  --------  --------
shoulder_pan   4.33 [4.25, 4.42]  3.56 [3.55, 3.57]  4.50 [4.49, 4.50]  144      119       150
shoulder_lift  4.54 [4.47, 4.62]  3.48 [3.48, 3.49]  4.62 [4.61, 4.62]  151      116       154
elbow_flex     4.02 [3.72, 4.34]  3.25 [3.25, 3.26]  4.32 [4.31, 4.34]  134      108       144
wrist_flex     3.66 [3.41, 3.91]  3.17 [3.17, 3.18]  3.73 [3.70, 3.76]  122      106       124
wrist_roll     3.84 [3.79, 3.89]  3.21 [3.20, 3.22]  3.93 [3.91, 3.94]  128      107       131

final-pose gap  stock              calibrated
--------------  -----------------  -----------------
shoulder_pan    0.18 [0.15, 0.22]  0.26 [0.21, 0.30]
shoulder_lift   0.14 [0.10, 0.19]  0.24 [0.21, 0.27]
elbow_flex      0.26 [0.17, 0.35]  0.57 [0.48, 0.67]
wrist_flex      1.04 [0.92, 1.15]  0.86 [0.80, 0.92]
wrist_roll      0.25 [0.20, 0.30]  0.23 [0.18, 0.27]
```

## Calibrated twin

Package `calibrated_twin.json`, sha256 `24270112b5b1e85c24462ed99fe5f9c1e7400dd3d20115f8acb945331eae1e35`.
Fitted: kp[shoulder_pan], kv[shoulder_pan], frictionloss[shoulder_pan], kp[shoulder_lift], kv[shoulder_lift], frictionloss[shoulder_lift], kp[elbow_flex], kv[elbow_flex], frictionloss[elbow_flex], kp[wrist_flex], kv[wrist_flex], frictionloss[wrist_flex], kp[wrist_roll], kv[wrist_roll], frictionloss[wrist_roll]; command delay 0 frame(s) (screened train MSE by delay, deg^2: {'0': 0.78056, '1': 0.89236, '2': 1.20598, '3': 1.81675, '4': 3.59425, '5': 7.6424}). Train MSE 1.29238 deg^2. Optimizer: converged (`ftol` termination condition is satisfied.). At a bound: none.

```
joint          kp N m/rad   kv N m s/rad  frictionloss N m  armature kg m^2  zero offset deg
-------------  -----------  ------------  ----------------  ---------------  -----------------
shoulder_pan   50 -> 13.99  5.13 -> 1.86  0.1 -> 0.00139    0.1 (fixed)      +0.0 (documented)
shoulder_lift  50 -> 14.92  4.96 -> 1.99  0.1 -> 0.0258     0.1 (fixed)      +0.0 (documented)
elbow_flex     50 -> 19.96  4.63 -> 2.44  0.1 -> 0.193      0.1 (fixed)      +0.0 (documented)
wrist_flex     50 -> 30.48  4.49 -> 3     0.1 -> 0.337      0.1 (fixed)      +0.0 (documented)
wrist_roll     50 -> 19.86  4.47 -> 2.17  0.1 -> 0.0547     0.1 (fixed)      +0.0 (documented)
```

Identifiable servo combinations (the individual gains are not the claim): natural frequency sqrt(kp/I_eff) and damping ratio (kv+damping)/(2 sqrt(kp I_eff)), I_eff = joint-space inertia at the median pose incl. armature; 95% CI from a linearised episode bootstrap of the fit.

```
joint          I_eff kg m^2  natural freq Hz [CI]  damping ratio [CI]
-------------  ------------  --------------------  --------------------
shoulder_pan   0.104         1.85 [1.81, 1.9]      0.769 [0.752, 0.784]
shoulder_lift  0.1048        1.9 [1.87, 1.93]      0.794 [0.77, 0.819]
elbow_flex     0.1063        2.18 [2.09, 2.28]     0.838 [0.755, 0.901]
wrist_flex     0.1011        2.76 [2.45, 3.08]     0.854 [0.78, 0.925]
wrist_roll     0.1           2.24 [2.2, 2.29]      0.771 [0.751, 0.788]
```

Per-parameter identifiability (condition number of J^T J 1960.0): marginal/conditional std ratio = sqrt(VIF); >= 10 means only a combination with other parameters is identified.

```
parameter                    value     95% CI            std ratio  identified alone
---------------------------  --------  ----------------  ---------  ----------------
kp[shoulder_pan]             13.99     [13.4, 14.8]      5.41       yes
kv[shoulder_pan]             1.856     [1.81, 1.9]       5.44       yes
frictionloss[shoulder_pan]   0.001386  [0, 0.0217]       1.22       yes
kp[shoulder_lift]            14.92     [14.5, 15.4]      3.46       yes
kv[shoulder_lift]            1.986     [1.91, 2.07]      3.74       yes
frictionloss[shoulder_lift]  0.02576   [0.000272, 0.05]  1.36       yes
kp[elbow_flex]               19.96     [18.4, 21.7]      4.15       yes
kv[elbow_flex]               2.441     [2.21, 2.63]      4.24       yes
frictionloss[elbow_flex]     0.1928    [0.138, 0.265]    1.29       yes
kp[wrist_flex]               30.48     [24, 37.8]        6.54       yes
kv[wrist_flex]               2.999     [2.58, 3.35]      5.92       yes
frictionloss[wrist_flex]     0.3371    [0.17, 0.505]     1.65       yes
kp[wrist_roll]               19.86     [19.1, 20.7]      5.43       yes
kv[wrist_roll]               2.173     [2.12, 2.22]      5.28       yes
frictionloss[wrist_roll]     0.0547    [0.0345, 0.075]   1.36       yes
```

Posterior correlations |r| > 0.95: kp[wrist_flex] ~ kv[wrist_flex] (+0.975); kp[shoulder_pan] ~ kv[shoulder_pan] (+0.975); kp[wrist_roll] ~ kv[wrist_roll] (+0.969); kp[elbow_flex] ~ kv[elbow_flex] (+0.953)

Weakest directions (relative eigenvalue: top loadings): 0.00051: kp[wrist_roll] -0.91, kv[wrist_roll] -0.39, frictionloss[wrist_roll] -0.10, kp[shoulder_pan] +0.00; 0.00055: frictionloss[wrist_flex] +0.66, kp[wrist_flex] +0.65, kv[wrist_flex] +0.36, kp[shoulder_pan] +0.00; 0.002: kp[shoulder_pan] +0.94, kv[shoulder_pan] +0.34, frictionloss[wrist_flex] -0.01, kp[wrist_flex] +0.01

Physics-free baseline (fitted on the same fit episodes): y[t+1] = y[t] + alpha*(a[t-d] + b - y[t]), y[0] = x[0], per arm joint; alpha [0.4, 0.62, 0.3, 0.36, 0.52], delay [2, 3, 1, 1, 2] frames, bias [-0.1034, -0.9126, 1.1817, 0.0646, 0.0314] deg.

## Mapping audit

Sign checks (1st-99th percentile of FIT-episode states vs MJCF range):

```
joint          recorded p1..p99 deg  MJCF range deg     shift (doc sign)  shift (flipped)  decision
-------------  --------------------  -----------------  ----------------  ---------------  ---------------------------------------------------------------------------
shoulder_pan   [-65.73, 106.79]      [-110.01, 110.01]  0.0               0.0              documented sign (flipped sign would also fit: sign not identified by range)
shoulder_lift  [35.61, 190.28]       [-190.22, 9.97]    180.31            0.06             flipped sign (documented sign does not fit the MJCF range)
elbow_flex     [37.3, 178.68]        [-9.97, 179.91]    0.0               168.71           documented sign
wrist_flex     [-38.91, 99.49]       [-95.11, 95.11]    4.38              4.38             documented sign (flipped sign would also fit: sign not identified by range)
wrist_roll     [-99.4, -19.78]       [-159.86, 159.86]  0.0               0.0              documented sign (flipped sign would also fit: sign not identified by range)

same rule on other subsets (robustness): all_episodes: signs [1, -1, 1, 1, 1], accepted; heldout_only: signs [1, -1, 1, 1, 1], accepted -> agrees
released stock limits (crossed by fit episodes): {'shoulder_pan': {'lower': False, 'upper': True}, 'wrist_flex': {'lower': False, 'upper': True}}
```

Forward-kinematics plausibility under the shipped mapping (evidence, not a gate; assumes the base sits on the work surface):

```
gripper lowest point minus base lowest point (m): {'p1': 0.038, 'p5': 0.039, 'p50': 0.071, 'min': 0.036}; frames > 2 cm below the base: 0.0
frames within 1 deg of a stock MJCF limit: {'shoulder_pan': 0.0037, 'shoulder_lift': 0.3614, 'elbow_flex': 0.0, 'wrist_flex': 0.0057, 'wrist_roll': 0.0}
frames beyond a stock MJCF limit: {'shoulder_pan': 0.0036, 'shoulder_lift': 0.0, 'elbow_flex': 0.0, 'wrist_flex': 0.0202, 'wrist_roll': 0.0}
```

Gravity sag on real static frames (middle 80% of each episode, gripper >= 3 cm above the base plane): centred correlation between the servo's static error and the twin's gravity torque at the mapped pose, and the implied static stiffness (centred slope). Positive supports the mapping. Evidence, not a gate.

```
joint          corr [CI] verdict                                                                                            power (gravity std, n)  implied static K N m/rad  fitted kp
-------------  -----------------------------------------------------------------------------------------------------------  ----------------------  ------------------------  ---------
shoulder_pan   not testable (gravity torque ~constant over the selected static poses; gravity std 0.0 N m, 1282 frames)                                                       14
shoulder_lift  not testable (gravity torque ~constant over the selected static poses; gravity std 0.007 N m, 1282 frames)                                                     14.9
elbow_flex     not testable (gravity torque ~constant over the selected static poses; gravity std 0.0021 N m, 1282 frames)                                                    20
wrist_flex     not testable (gravity torque ~constant over the selected static poses; gravity std 0.0015 N m, 1282 frames)                                                    30.5
wrist_roll     not testable (gravity torque ~constant over the selected static poses; gravity std 0.0002 N m, 1282 frames)                                                    19.9
static frames: 1282 (0 excluded as possible table contact) from 39 fit episodes
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
- Stock MJCF limits crossed by the fit episodes and released in the aligned/calibrated twins: shoulder_pan upper, wrist_flex upper. The stock twin is held at those limits (counted as stock-twin error).
- interleaved held-out states outside the calibrated twin's range (clipped): {'shoulder_lift': 0.0101}.
- interleaved: final-pose (static) gap is larger for the calibrated twin than for stock on shoulder_pan, shoulder_lift, elbow_flex by point estimate; CIs separate on shoulder_pan, shoulder_lift, elbow_flex.
- future: final-pose (static) gap is larger for the calibrated twin than for stock on shoulder_pan, shoulder_lift, elbow_flex by point estimate; CIs separate on shoulder_lift, elbow_flex.
- Joint direction flipped relative to the documented convention for shoulder_lift (chosen from the recorded range of motion vs the MJCF range; see mapping_checks).

## Provenance and reproduction

```
dataset        Loki0929/so100_lan @ 17852d65f6b871a62d760adce88e1dd899663585 (requested 17852d65f6b871a62d760adce88e1dd899663585)
               LeRobot v2.1, robot_type so100, 30 fps, 200 episodes loaded (repo: 800), 0 dropped
data files     data/chunk-000/episode_000000.parquet (f0d27fc07c44), data/chunk-000/episode_000001.parquet (64763c1a2749), data/chunk-000/episode_000002.parquet (62afd268c306), ... (200 files)
twin           trs_so_arm100 (so_arm100.xml) from https://github.com/google-deepmind/mujoco_menagerie @ b0655057a9df2abe39ea7fc989914ba6f248301c
               dir sha256 4f3b0f21b8a2b889..., timestep 0.002 -> 0.00196078 s x 17 substeps/frame, contacts disabled
software       mujoco 3.17.0, numpy 2.5.4, scipy 1.18.1, python 3.13.18, meatspace_lab 2.0.0 (code sha256 924eb3d8364be665...)
hardware       x86_64 Intel(R) Xeon(R) Processor @ 2.80GHz; OpenBLAS kernel numpy: SkylakeX; scipy: SkylakeX
report         schema meatspace.twin-gap-report/v2
               results sha256 ecf97dc14a0b8f4bfd2504825a379a146bf839b2a0523b125e62847d17ce3605  (numbers only; any interpreter/CPU)
               content sha256 5dd504008b93bd47c50a77ca4e5fab8c04a7665063569bbe5c8d0a71cf40c393  (numbers + environment above)
```

Reproduce (from `lab/`, see README) into a scratch directory and compare:

```
python -m meatspace_lab report --dataset Loki0929/so100_lan --revision 17852d65f6b871a62d760adce88e1dd899663585 \
    --twin .cache/menagerie/trs_so_arm100 --out /tmp/repro/ --max-episodes 200
python -m meatspace_lab verify reports/Loki0929__so100_lan/report.json /tmp/repro/report.json
```
