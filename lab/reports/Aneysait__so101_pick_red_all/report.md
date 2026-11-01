# Twin Gap Report: Aneysait/so101_pick_red_all x robotstudio_so101

```
HELD-OUT sim-vs-real joint RMSE, mean of 5 arm joints, deg  [95% bootstrap CI over episodes]
change = calibrated/reference - 1 (negative = better), paired by episode

FUTURE BLOCK (23 episodes)
  stock twin             4.18 [4.12, 4.26]
  aligned stock          1.39 [1.36, 1.42]   (stock dynamics + delay + released limits)
  lag-filter baseline    1.00 [0.98, 1.02]   (no physics: 3 params/joint)
  calibrated twin        0.68 [0.67, 0.70]
  change vs stock        -84% [-84, -83]   per-episode median -84% (range -86% .. -81%); 23/23 improved
  change vs baseline     -32% [-34, -30]   23/23 improved
  verdict                closes most of the gap (-84% [-84, -83] vs stock, residual 0.68 deg); calibrated twin beats the physics-free lag filter (-32% [-34, -30])

INTERLEAVED HELD-OUT (53 episodes)
  stock twin             3.97 [3.88, 4.07]
  aligned stock          1.41 [1.38, 1.45]   (stock dynamics + delay + released limits)
  lag-filter baseline    1.00 [0.98, 1.03]   (no physics: 3 params/joint)
  calibrated twin        0.69 [0.67, 0.71]
  change vs stock        -83% [-83, -82]   per-episode median -82% (range -85% .. -81%); 53/53 improved
  change vs baseline     -31% [-32, -30]   53/53 improved
  verdict                closes most of the gap (-83% [-83, -82] vs stock, residual 0.69 deg); calibrated twin beats the physics-free lag filter (-31% [-32, -30])

command->state lag, interleaved held-out, ms per joint (real / stock / calibrated):
  shoulder_pan 130/25/130  shoulder_lift 139/27/138  elbow_flex 135/26/135  wrist_flex 131/26/130  wrist_roll 179/27/165
  max |twin - real| over joints: stock 151.7 ms, calibrated 13.8 ms
```

![future-block held-out episode](heldout_episode.svg)

![per-joint RMSE, future block](rmse_by_joint_future.svg)

![per-joint RMSE, interleaved held-out](rmse_by_joint.svg)

## Future block (held out: the last 20% of episodes by index, recorded after every fit episode), n = 23

Per joint, mean over episodes [95% CI]. Degrees. Change = calibrated vs stock, negative = better.

```
sim-vs-real RMSE  stock                         aligned stock      baseline           calibrated                    change vs stock  vs baseline
----------------  ----------------------------  -----------------  -----------------  ----------------------------  ---------------  ---------------
shoulder_pan      3.22 [3.16, 3.28] (p90 3.49)  0.48 [0.46, 0.50]  0.29 [0.27, 0.32]  0.23 [0.21, 0.25] (p90 0.29)  -93% [-93, -92]  -23% [-28, -17]
shoulder_lift     7.42 [7.27, 7.57] (p90 8.01)  1.91 [1.87, 1.96]  1.66 [1.61, 1.70]  0.94 [0.91, 0.97] (p90 1.03)  -87% [-88, -87]  -43% [-44, -42]
elbow_flex        5.48 [5.35, 5.62] (p90 5.88)  1.97 [1.91, 2.02]  1.18 [1.14, 1.22]  0.78 [0.76, 0.81] (p90 0.85)  -86% [-86, -85]  -34% [-36, -31]
wrist_flex        2.41 [2.32, 2.50] (p90 2.71)  0.81 [0.78, 0.84]  0.55 [0.53, 0.58]  0.50 [0.48, 0.53] (p90 0.59)  -79% [-81, -78]  -9% [-14, -4]
wrist_roll        2.39 [2.27, 2.51] (p90 2.83)  1.78 [1.68, 1.90]  1.31 [1.24, 1.38]  0.96 [0.89, 1.03] (p90 1.20)  -60% [-62, -58]  -27% [-33, -21]
arm_mean          4.18 [4.12, 4.26] (p90 4.40)  1.39 [1.36, 1.42]  1.00 [0.98, 1.02]  0.68 [0.67, 0.70] (p90 0.74)  -84% [-84, -83]  -32% [-34, -30]

static-frame RMSE (quasi-static holds)  stock              baseline           calibrated         episodes with >= 10 static frames
--------------------------------------  -----------------  -----------------  -----------------  ---------------------------------
shoulder_pan                            0.23 [0.18, 0.28]  0.23 [0.18, 0.28]  0.10 [0.08, 0.13]  23
shoulder_lift                           3.91 [3.71, 4.04]  1.11 [1.07, 1.15]  0.29 [0.25, 0.33]  23
elbow_flex                              0.54 [0.41, 0.71]  0.96 [0.89, 1.03]  0.64 [0.58, 0.69]  23
wrist_flex                              0.35 [0.26, 0.43]  0.31 [0.24, 0.40]  0.29 [0.22, 0.36]  23
wrist_roll                              0.66 [0.36, 1.03]  1.23 [1.06, 1.40]  0.72 [0.59, 0.87]  23
arm_mean                                1.14 [1.05, 1.23]  0.77 [0.73, 0.81]  0.41 [0.38, 0.44]  23

command tracking RMSE  real robot         stock twin         calibrated twin
---------------------  -----------------  -----------------  -----------------
shoulder_pan           2.96 [2.90, 3.02]  0.29 [0.28, 0.29]  2.93 [2.89, 2.98]
shoulder_lift          6.44 [6.28, 6.61]  3.05 [2.95, 3.13]  6.57 [6.44, 6.70]
elbow_flex             5.18 [5.04, 5.32]  0.37 [0.37, 0.38]  5.16 [5.07, 5.25]
wrist_flex             2.23 [2.14, 2.32]  1.19 [0.99, 1.37]  2.35 [2.26, 2.43]
wrist_roll             2.33 [2.22, 2.45]  0.12 [0.11, 0.13]  1.91 [1.84, 1.98]

lag (frames)   real               stock              calibrated         real ms  stock ms  calib ms
-------------  -----------------  -----------------  -----------------  -------  --------  --------
shoulder_pan   3.85 [3.83, 3.87]  0.76 [0.75, 0.76]  3.83 [3.82, 3.84]  128      25        128
shoulder_lift  4.03 [4.01, 4.04]  0.80 [0.80, 0.81]  4.15 [4.14, 4.15]  134      27        138
elbow_flex     4.00 [3.98, 4.03]  0.80 [0.79, 0.80]  3.99 [3.98, 4.01]  133      27        133
wrist_flex     3.62 [3.59, 3.64]  0.81 [0.79, 0.82]  3.81 [3.79, 3.84]  121      27        127
wrist_roll     5.09 [4.92, 5.27]  0.81 [0.80, 0.82]  4.67 [4.47, 4.88]  170      27        156

final-pose gap  stock              calibrated
--------------  -----------------  -----------------
shoulder_pan    0.22 [0.16, 0.27]  0.14 [0.10, 0.18]
shoulder_lift   3.97 [3.77, 4.11]  0.13 [0.09, 0.18]
elbow_flex      0.58 [0.40, 0.81]  1.05 [0.92, 1.16]
wrist_flex      0.28 [0.20, 0.37]  0.37 [0.26, 0.47]
wrist_roll      0.67 [0.36, 1.05]  0.53 [0.28, 0.83]

fraction of states outside the fit episodes' range of motion +-2 deg: {'shoulder_pan': 0.0, 'shoulder_lift': 0.0, 'elbow_flex': 0.0, 'wrist_flex': 0.0, 'wrist_roll': 0.0}
fraction of states outside the twin's joint range: stock {'shoulder_pan': 0.0, 'shoulder_lift': 0.5862, 'elbow_flex': 0.0, 'wrist_flex': 0.0805, 'wrist_roll': 0.0}; calibrated {'shoulder_pan': 0.0, 'shoulder_lift': 0.0, 'elbow_flex': 0.0, 'wrist_flex': 0.0, 'wrist_roll': 0.0}
```

## Interleaved held-out (random episodes from the same period as the fit episodes), n = 53

Per joint, mean over episodes [95% CI]. Degrees. Change = calibrated vs stock, negative = better.

```
sim-vs-real RMSE  stock                         aligned stock      baseline           calibrated                    change vs stock  vs baseline
----------------  ----------------------------  -----------------  -----------------  ----------------------------  ---------------  ---------------
shoulder_pan      2.43 [2.32, 2.55] (p90 3.06)  0.45 [0.43, 0.47]  0.33 [0.31, 0.35]  0.21 [0.19, 0.23] (p90 0.31)  -91% [-92, -91]  -37% [-41, -32]
shoulder_lift     7.20 [7.05, 7.35] (p90 7.81)  2.06 [1.99, 2.13]  1.68 [1.63, 1.74]  0.94 [0.90, 0.98] (p90 1.12)  -87% [-87, -87]  -44% [-45, -43]
elbow_flex        5.39 [5.24, 5.56] (p90 6.23)  1.91 [1.87, 1.96]  1.15 [1.12, 1.18]  0.86 [0.82, 0.89] (p90 1.04)  -84% [-85, -84]  -26% [-28, -23]
wrist_flex        2.46 [2.34, 2.58] (p90 2.92)  0.93 [0.89, 0.97]  0.65 [0.62, 0.69]  0.56 [0.53, 0.60] (p90 0.69)  -77% [-78, -76]  -14% [-17, -11]
wrist_roll        2.39 [2.31, 2.46] (p90 2.73)  1.70 [1.64, 1.77]  1.21 [1.16, 1.25]  0.90 [0.86, 0.94] (p90 1.07)  -62% [-64, -61]  -26% [-30, -21]
arm_mean          3.97 [3.88, 4.07] (p90 4.43)  1.41 [1.38, 1.45]  1.00 [0.98, 1.03]  0.69 [0.67, 0.71] (p90 0.79)  -83% [-83, -82]  -31% [-32, -30]

static-frame RMSE (quasi-static holds)  stock              baseline           calibrated         episodes with >= 10 static frames
--------------------------------------  -----------------  -----------------  -----------------  ---------------------------------
shoulder_pan                            0.28 [0.24, 0.32]  0.27 [0.24, 0.31]  0.11 [0.09, 0.13]  53
shoulder_lift                           3.89 [3.78, 3.96]  1.08 [1.05, 1.10]  0.25 [0.23, 0.27]  53
elbow_flex                              0.53 [0.46, 0.62]  0.94 [0.90, 0.98]  0.60 [0.56, 0.63]  53
wrist_flex                              0.51 [0.44, 0.58]  0.41 [0.34, 0.47]  0.45 [0.40, 0.51]  53
wrist_roll                              0.55 [0.41, 0.72]  1.07 [0.96, 1.18]  0.80 [0.72, 0.89]  53
arm_mean                                1.15 [1.10, 1.21]  0.75 [0.72, 0.78]  0.44 [0.42, 0.47]  53

command tracking RMSE  real robot         stock twin         calibrated twin
---------------------  -----------------  -----------------  -----------------
shoulder_pan           2.23 [2.13, 2.34]  0.22 [0.21, 0.23]  2.21 [2.13, 2.29]
shoulder_lift          6.27 [6.12, 6.43]  3.02 [2.95, 3.07]  6.20 [6.04, 6.36]
elbow_flex             5.09 [4.94, 5.26]  0.38 [0.37, 0.39]  5.03 [4.91, 5.16]
wrist_flex             2.27 [2.17, 2.37]  1.32 [1.11, 1.53]  2.20 [2.10, 2.31]
wrist_roll             2.33 [2.26, 2.41]  0.11 [0.11, 0.12]  1.99 [1.95, 2.02]

lag (frames)   real               stock              calibrated         real ms  stock ms  calib ms
-------------  -----------------  -----------------  -----------------  -------  --------  --------
shoulder_pan   3.89 [3.85, 3.93]  0.75 [0.74, 0.75]  3.89 [3.88, 3.90]  130      25        130
shoulder_lift  4.17 [4.13, 4.20]  0.80 [0.80, 0.81]  4.15 [4.14, 4.16]  139      27        138
elbow_flex     4.06 [4.03, 4.10]  0.78 [0.78, 0.79]  4.04 [4.03, 4.06]  135      26        135
wrist_flex     3.92 [3.87, 3.98]  0.78 [0.78, 0.79]  3.91 [3.88, 3.94]  131      26        130
wrist_roll     5.36 [5.24, 5.50]  0.81 [0.81, 0.82]  4.95 [4.78, 5.14]  179      27        165

final-pose gap  stock              calibrated
--------------  -----------------  -----------------
shoulder_pan    0.27 [0.23, 0.31]  0.17 [0.14, 0.20]
shoulder_lift   3.90 [3.79, 3.97]  0.08 [0.06, 0.10]
elbow_flex      0.49 [0.46, 0.53]  1.07 [1.03, 1.11]
wrist_flex      0.51 [0.44, 0.58]  0.63 [0.56, 0.70]
wrist_roll      0.55 [0.41, 0.72]  0.45 [0.32, 0.61]

fraction of states outside the fit episodes' range of motion +-2 deg: {'shoulder_pan': 0.0013, 'shoulder_lift': 0.0, 'elbow_flex': 0.0, 'wrist_flex': 0.0011, 'wrist_roll': 0.0}
fraction of states outside the twin's joint range: stock {'shoulder_pan': 0.0, 'shoulder_lift': 0.574, 'elbow_flex': 0.0002, 'wrist_flex': 0.0794, 'wrist_roll': 0.0}; calibrated {'shoulder_pan': 0.0, 'shoulder_lift': 0.0, 'elbow_flex': 0.0, 'wrist_flex': 0.0, 'wrist_roll': 0.0}
```

## Fit episodes (used by the fit), n = 40

Per joint, mean over episodes [95% CI]. Degrees. Change = calibrated vs stock, negative = better.

```
sim-vs-real RMSE  stock                         aligned stock      baseline           calibrated                    change vs stock  vs baseline
----------------  ----------------------------  -----------------  -----------------  ----------------------------  ---------------  ---------------
shoulder_pan      2.30 [2.19, 2.41] (p90 2.66)  0.44 [0.41, 0.46]  0.32 [0.30, 0.34]  0.20 [0.18, 0.22] (p90 0.29)  -92% [-92, -91]  -39% [-43, -34]
shoulder_lift     7.11 [6.92, 7.29] (p90 7.92)  2.06 [1.97, 2.14]  1.67 [1.60, 1.74]  0.93 [0.90, 0.97] (p90 1.09)  -87% [-87, -87]  -44% [-46, -42]
elbow_flex        5.28 [5.10, 5.46] (p90 6.06)  1.90 [1.87, 1.95]  1.16 [1.14, 1.19]  0.85 [0.81, 0.89] (p90 1.02)  -84% [-84, -83]  -27% [-31, -24]
wrist_flex        2.32 [2.19, 2.46] (p90 2.86)  0.88 [0.84, 0.93]  0.63 [0.59, 0.67]  0.52 [0.48, 0.55] (p90 0.64)  -78% [-79, -76]  -18% [-22, -14]
wrist_roll        2.34 [2.23, 2.44] (p90 2.77)  1.69 [1.60, 1.79]  1.16 [1.10, 1.22]  0.92 [0.87, 0.96] (p90 1.07)  -61% [-63, -59]  -21% [-25, -16]
arm_mean          3.87 [3.76, 3.98] (p90 4.33)  1.39 [1.35, 1.44]  0.99 [0.96, 1.02]  0.68 [0.66, 0.70] (p90 0.78)  -82% [-83, -82]  -31% [-32, -30]

static-frame RMSE (quasi-static holds)  stock              baseline           calibrated         episodes with >= 10 static frames
--------------------------------------  -----------------  -----------------  -----------------  ---------------------------------
shoulder_pan                            0.28 [0.24, 0.32]  0.27 [0.23, 0.31]  0.10 [0.09, 0.12]  40
shoulder_lift                           3.69 [3.39, 3.92]  1.08 [1.05, 1.12]  0.25 [0.23, 0.28]  40
elbow_flex                              0.44 [0.40, 0.48]  0.98 [0.93, 1.02]  0.62 [0.58, 0.67]  40
wrist_flex                              0.48 [0.41, 0.55]  0.40 [0.34, 0.46]  0.41 [0.36, 0.47]  40
wrist_roll                              0.52 [0.32, 0.75]  1.01 [0.90, 1.12]  0.83 [0.74, 0.92]  40
arm_mean                                1.08 [1.00, 1.16]  0.75 [0.72, 0.78]  0.44 [0.42, 0.47]  40

command tracking RMSE  real robot         stock twin         calibrated twin
---------------------  -----------------  -----------------  -----------------
shoulder_pan           2.11 [2.02, 2.22]  0.21 [0.21, 0.22]  2.11 [2.03, 2.19]
shoulder_lift          6.21 [6.02, 6.39]  2.92 [2.78, 3.03]  6.12 [5.95, 6.30]
elbow_flex             4.98 [4.81, 5.16]  0.38 [0.37, 0.39]  4.94 [4.81, 5.07]
wrist_flex             2.16 [2.05, 2.28]  1.15 [0.93, 1.38]  2.10 [1.99, 2.21]
wrist_roll             2.29 [2.18, 2.39]  0.11 [0.10, 0.12]  1.97 [1.91, 2.03]

lag (frames)   real               stock              calibrated         real ms  stock ms  calib ms
-------------  -----------------  -----------------  -----------------  -------  --------  --------
shoulder_pan   3.88 [3.84, 3.93]  0.75 [0.75, 0.75]  3.90 [3.89, 3.92]  129      25        130
shoulder_lift  4.18 [4.14, 4.22]  0.80 [0.80, 0.81]  4.15 [4.14, 4.16]  139      27        138
elbow_flex     4.07 [4.02, 4.12]  0.78 [0.77, 0.79]  4.06 [4.04, 4.09]  136      26        135
wrist_flex     3.97 [3.90, 4.03]  0.79 [0.78, 0.81]  3.94 [3.91, 3.97]  132      26        131
wrist_roll     5.45 [5.29, 5.62]  0.82 [0.81, 0.83]  5.13 [4.89, 5.41]  182      27        171

final-pose gap  stock              calibrated
--------------  -----------------  -----------------
shoulder_pan    0.26 [0.22, 0.30]  0.16 [0.13, 0.19]
shoulder_lift   3.72 [3.42, 3.95]  0.10 [0.08, 0.12]
elbow_flex      0.45 [0.40, 0.49]  1.10 [1.04, 1.15]
wrist_flex      0.47 [0.40, 0.54]  0.55 [0.46, 0.63]
wrist_roll      0.52 [0.31, 0.78]  0.54 [0.37, 0.73]
```

## Calibrated twin

Package `calibrated_twin.json`, sha256 `1bcccedeb80ddc9ec26e60d3c3e3235b69d19f0a2a25e8d2daf1e82fcfc19dda`.
Fitted: kp[shoulder_pan], kv[shoulder_pan], frictionloss[shoulder_pan], kp[shoulder_lift], kv[shoulder_lift], frictionloss[shoulder_lift], kp[elbow_flex], kv[elbow_flex], frictionloss[elbow_flex], kp[wrist_flex], kv[wrist_flex], frictionloss[wrist_flex], kp[wrist_roll], kv[wrist_roll], frictionloss[wrist_roll]; command delay 0 frame(s) (screened train MSE by delay, deg^2: {'0': 0.45978, '1': 0.48837, '2': 0.70234, '3': 1.12952, '4': 2.40815, '5': 5.04195}). Train MSE 0.55931 deg^2. Optimizer: converged (`xtol` termination condition is satisfied.). At a bound: kv[wrist_roll].

```
joint          kp N m/rad      kv N m s/rad     frictionloss N m  armature kg m^2  zero offset deg
-------------  --------------  ---------------  ----------------  ---------------  -----------------
shoulder_pan   998.2 -> 9.45   2.73 -> 0.419    0.052 -> 0.0687   0.028 (fixed)    +0.0 (documented)
shoulder_lift  998.2 -> 8.963  2.73 -> 0.435    0.052 -> 0.0972   0.028 (fixed)    +0.0 (documented)
elbow_flex     998.2 -> 12.16  2.73 -> 0.671    0.052 -> 0.342    0.028 (fixed)    +0.0 (documented)
wrist_flex     998.2 -> 13.21  2.73 -> 0.758    0.052 -> 0.222    0.028 (fixed)    +0.0 (documented)
wrist_roll     998.2 -> 8.883  2.73 -> 0.00317  0.052 -> 0.395    0.028 (fixed)    +0.0 (documented)
```

Identifiable servo combinations (the individual gains are not the claim): natural frequency sqrt(kp/I_eff) and damping ratio (kv+damping)/(2 sqrt(kp I_eff)), I_eff = joint-space inertia at the median pose incl. armature; 95% CI from a linearised episode bootstrap of the fit.

```
joint          I_eff kg m^2  natural freq Hz [CI]  damping ratio [CI]
-------------  ------------  --------------------  -------------------
shoulder_pan   0.03006       2.82 [2.76, 2.88]     0.956 [0.942, 0.97]
shoulder_lift  0.02998       2.75 [2.73, 2.77]     0.998 [0.985, 1.01]
elbow_flex     0.03452       2.99 [2.93, 3.04]     0.981 [0.955, 1.01]
wrist_flex     0.02913       3.39 [3.17, 3.59]     1.09 [1, 1.16]
wrist_roll     0.02808       2.83 [2.65, 3.11]     0.604 [0.55, 0.645]
```

Per-parameter identifiability (condition number of J^T J 14800.0): marginal/conditional std ratio = sqrt(VIF); >= 10 means only a combination with other parameters is identified.

```
parameter                    value     95% CI            std ratio  identified alone
---------------------------  --------  ----------------  ---------  ----------------
kp[shoulder_pan]             9.45      [9.07, 9.83]      7.92       yes
kv[shoulder_pan]             0.419     [0.39, 0.448]     7.34       yes
frictionloss[shoulder_pan]   0.06872   [0.0624, 0.0748]  1.6        yes
kp[shoulder_lift]            8.963     [8.82, 9.1]       3.14       yes
kv[shoulder_lift]            0.4347    [0.416, 0.454]    3.32       yes
frictionloss[shoulder_lift]  0.09722   [0.086, 0.109]    1.43       yes
kp[elbow_flex]               12.16     [11.7, 12.6]      3.59       yes
kv[elbow_flex]               0.6705    [0.622, 0.723]    3.33       yes
frictionloss[elbow_flex]     0.3417    [0.317, 0.37]     1.48       yes
kp[wrist_flex]               13.21     [11.6, 14.8]      7.99       yes
kv[wrist_flex]               0.7581    [0.564, 0.921]    6.63       yes
frictionloss[wrist_flex]     0.2223    [0.195, 0.249]    2.36       yes
kp[wrist_roll]               8.883     [7.79, 10.7]      3.67       yes
kv[wrist_roll]               0.003174  fixed (at bound)  n/a        -
frictionloss[wrist_roll]     0.395     [0.32, 0.5]       3.67       yes
```

Posterior correlations |r| > 0.95: kp[shoulder_pan] ~ kv[shoulder_pan] (+0.985); kp[wrist_flex] ~ kv[wrist_flex] (+0.977); kp[wrist_roll] ~ frictionloss[wrist_roll] (+0.962)

Weakest directions (relative eigenvalue: top loadings): 6.7e-05: kp[wrist_flex] -0.90, frictionloss[wrist_flex] -0.37, kv[wrist_flex] -0.25, kp[shoulder_pan] +0.00; 8.8e-05: kp[shoulder_pan] +0.97, kv[shoulder_pan] +0.20, frictionloss[shoulder_pan] +0.12, kp[wrist_flex] +0.00; 0.00021: frictionloss[wrist_roll] +0.76, kp[wrist_roll] +0.65, kp[shoulder_pan] +0.00, kp[shoulder_lift] +0.00

Physics-free baseline (fitted on the same fit episodes): y[t+1] = y[t] + alpha*(a[t-d] + b - y[t]), y[0] = x[0], per arm joint; alpha [0.34, 0.86, 0.32, 0.24, 0.16], delay [1, 3, 1, 0, 0] frames, bias [-0.0225, 1.1348, 1.4395, -0.1357, -0.9376] deg.

## Mapping audit

Sign checks (1st-99th percentile of FIT-episode states vs MJCF range):

```
joint          recorded p1..p99 deg  MJCF range deg     shift (doc sign)  shift (flipped)  decision
-------------  --------------------  -----------------  ----------------  ---------------  ---------------------------------------------------------------------------
shoulder_pan   [-19.29, 49.83]       [-110.0, 110.0]    0.0               0.0              documented sign (flipped sign would also fit: sign not identified by range)
shoulder_lift  [-104.19, 51.77]      [-100.0, 100.0]    4.19              4.19             documented sign (flipped sign would also fit: sign not identified by range)
elbow_flex     [-50.01, 90.44]       [-96.83, 96.83]    0.0               0.0              documented sign (flipped sign would also fit: sign not identified by range)
wrist_flex     [59.81, 99.62]        [-95.0, 95.0]      4.62              4.62             documented sign (flipped sign would also fit: sign not identified by range)
wrist_roll     [-2.07, 33.0]         [-157.21, 162.79]  0.0               0.0              documented sign (flipped sign would also fit: sign not identified by range)

same rule on other subsets (robustness): all_episodes: signs [1, 1, 1, 1, 1], accepted; heldout_only: signs [1, 1, 1, 1, 1], accepted -> agrees
released stock limits (crossed by fit episodes): {'shoulder_lift': {'lower': True, 'upper': False}, 'elbow_flex': {'lower': False, 'upper': True}, 'wrist_flex': {'lower': False, 'upper': True}}
```

Forward-kinematics plausibility under the shipped mapping (evidence, not a gate; assumes the base sits on the work surface):

```
gripper lowest point minus base lowest point (m): {'p1': 0.025, 'p5': 0.031, 'p50': 0.039, 'min': 0.015}; frames > 2 cm below the base: 0.0
frames within 1 deg of a stock MJCF limit: {'shoulder_pan': 0.0, 'shoulder_lift': 0.0108, 'elbow_flex': 0.0002, 'wrist_flex': 0.0202, 'wrist_roll': 0.0}
frames beyond a stock MJCF limit: {'shoulder_pan': 0.0, 'shoulder_lift': 0.5662, 'elbow_flex': 0.0001, 'wrist_flex': 0.0659, 'wrist_roll': 0.0}
```

Gravity sag on real static frames (middle 80% of each episode, gripper >= 3 cm above the base plane): centred correlation between the servo's static error and the twin's gravity torque at the mapped pose, and the implied static stiffness (centred slope). Positive supports the mapping. Evidence, not a gate.

```
joint          corr [CI] verdict                                                                                            power (gravity std, n)  implied static K N m/rad  fitted kp
-------------  -----------------------------------------------------------------------------------------------------------  ----------------------  ------------------------  ---------
shoulder_pan   not testable (gravity torque ~constant over the selected static poses; gravity std 0.0 N m, 3655 frames)                                                       9.45
shoulder_lift  not testable (gravity torque ~constant over the selected static poses; gravity std 0.0017 N m, 3655 frames)                                                    8.96
elbow_flex     not testable (gravity torque ~constant over the selected static poses; gravity std 0.0012 N m, 3655 frames)                                                    12.2
wrist_flex     not testable (gravity torque ~constant over the selected static poses; gravity std 0.0014 N m, 3655 frames)                                                    13.2
wrist_roll     not testable (gravity torque ~constant over the selected static poses; gravity std 0.0001 N m, 3655 frames)                                                    8.88
static frames: 3655 (0 excluded as possible table contact) from 40 fit episodes
```

## Method

- Recording convention (lerobot-motorsbus): Current LeRobot (record_loop, `*.pos` names): x[t] is READ first (robot.get_observation), then the leader or policy is read and a[t] is SENT, so x[t] cannot reflect a[t] (observe-then-act).
- Replay: Replay (identical for both conventions): q_sim[0]=x[0] (zero velocity); for t=0..T-2 apply ctrl=a[t-d] (d = fitted integer command delay, stock d=0) for the whole frame, step `substeps` physics steps (timestep set so substeps*timestep = 1/fps exactly), record q_sim[t+1]; sim and real are compared at the same index t=1..T-1. The real sub-frame send-to-read offset (legacy: a[t] sent a few ms BEFORE x[t] is read; current: a[t] sent a few ms AFTER) is not modelled; it is absorbed by the fitted dynamics/delay, and it shifts lags between the two conventions by a fraction of a frame in opposite directions.
- Lag: lag = argmin_L Var(a[t] - y[t+L]) over a fixed window t in [0, T-10), parabolic sub-frame refinement; y = real or sim state. Includes the 1-frame sampling offset: in the replay and in observe-then-act (current LeRobot) recordings an instantaneous actuator measures 1.0 frame; in act-then-observe (legacy) recordings it would measure ~0, and a realistic servo measures its delay minus the few-ms write-to-read gap. Lags are therefore directly comparable between sim and real within one dataset, and only approximately (fraction of a frame) across codebases. Also reported in ms, since datasets differ in fps. Joints with command std < 1 deg in an episode are skipped.
- Units: LeRobot MotorNormMode.DEGREES (tick = 360/4095 units verified on every arm joint) (decided on the fit episodes; held-out episodes agree). Mapping to MJCF: q = sign*deg2rad(x) + deg2rad(offset); MJCF derived from TheRobotStudio so101_new_calib.xml, whose zero is the LeRobot 'middle of range' calibration pose; nominal offsets 0, documented signs +1 (checked per dataset against the recorded range of motion, mapping_checks).
- Split: future = last round(n*test_frac) episodes by index; interleaved = round(n*test_frac) episodes of the rest drawn by numpy default_rng(seed).permutation, plus every remaining episode beyond the fit cap; fit = the remaining episodes (<= max_train_episodes) (seed 0). Future: [93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115]. Interleaved: [5, 7, 8, 9, 10, 11, 12, 13, 14, 16, 19, 20, 25, 27, 29, 31, 32, 33, 34, 38, 39, 40, 41, 43, 46, 48, 52, 54, 56, 57, 58, 59, 61, 63, 67, 69, 70, 72, 73, 74, 76, 77, 78, 79, 81, 82, 83, 84, 86, 88, 89, 90, 91]. Overlap with fit: none.
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
- Confidence intervals are percentile bootstraps over episodes (whole episodes resampled, 10,000 draws, fixed seed); with 23 future / 53 interleaved held-out episodes they are approximate and tend to be slightly too narrow. They do not cover the choice of split, of fit configuration, or of dataset.
- info.json robot_type is the generic 'so_follower' (LeRobot's shared SO-100/SO-101 class); the twin (robotstudio_so101) was chosen from the dataset name/card.
- Stock MJCF limits crossed by the fit episodes and released in the aligned/calibrated twins: shoulder_lift lower, elbow_flex upper, wrist_flex upper. The stock twin is held at those limits (counted as stock-twin error).
- Fitted parameters at a bound (within BOUND_TOL): kv[wrist_roll]; the value is a bound, not an estimate.
- interleaved: final-pose (static) gap is larger for the calibrated twin than for stock on elbow_flex, wrist_flex by point estimate; CIs separate on elbow_flex.
- future: final-pose (static) gap is larger for the calibrated twin than for stock on elbow_flex, wrist_flex by point estimate; CIs separate on elbow_flex.

## Provenance and reproduction

```
dataset        Aneysait/so101_pick_red_all @ 296c2bc9d2afbfa0fd05d8c51f7143cf7c9fd883 (requested 296c2bc9d2afbfa0fd05d8c51f7143cf7c9fd883)
               LeRobot v3.0, robot_type so_follower, 30 fps, 116 episodes loaded (repo: 116), 0 dropped
data files     data/chunk-000/file-000.parquet (faee924e5204)
twin           robotstudio_so101 (so101.xml) from https://github.com/google-deepmind/mujoco_menagerie @ b0655057a9df2abe39ea7fc989914ba6f248301c
               dir sha256 6c00120339c328b1..., timestep 0.005 -> 0.0047619 s x 7 substeps/frame, contacts disabled
software       mujoco 3.17.0, numpy 2.5.4, scipy 1.18.1, python 3.13.18, meatspace_lab 2.0.0 (code sha256 924eb3d8364be665...)
hardware       x86_64 Intel(R) Xeon(R) Processor @ 2.80GHz; OpenBLAS kernel numpy: SkylakeX; scipy: SkylakeX
report         schema meatspace.twin-gap-report/v2
               results sha256 78b3844892540254cdb3520dbe9af701e9b83fde7b6623ae9d724e6763c17612  (numbers only; any interpreter/CPU)
               content sha256 28c962233bc6f3695177a9bb010d7750e6c7e5224f2db71bd6c1cddc6993aa30  (numbers + environment above)
```

Reproduce (from `lab/`, see README) into a scratch directory and compare:

```
python -m meatspace_lab report --dataset Aneysait/so101_pick_red_all --revision 296c2bc9d2afbfa0fd05d8c51f7143cf7c9fd883 \
    --twin .cache/menagerie/robotstudio_so101 --out /tmp/repro/ --max-episodes 200
python -m meatspace_lab verify reports/Aneysait__so101_pick_red_all/report.json /tmp/repro/report.json
```
