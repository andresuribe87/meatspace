# Twin Gap Report: 00ri/so100_battery x trs_so_arm100

```
HELD-OUT sim-vs-real joint RMSE, mean of 5 arm joints, deg  [95% bootstrap CI over episodes]
change = calibrated/reference - 1 (negative = better), paired by episode

FUTURE BLOCK (10 episodes)
  stock twin             0.57 [0.55, 0.60]
  aligned stock          0.57 [0.55, 0.60]   (stock dynamics + delay + released limits)
  lag-filter baseline    0.49 [0.47, 0.50]   (no physics: 3 params/joint)
  calibrated twin        0.34 [0.32, 0.36]
  change vs stock        -41% [-43, -38]   per-episode median -42% (range -48% .. -31%); 10/10 improved
  change vs baseline     -31% [-33, -28]   10/10 improved
  verdict                closes part of the gap (-41% [-43, -38] vs stock, residual 0.34 deg); calibrated twin beats the physics-free lag filter (-31% [-33, -28])

INTERLEAVED HELD-OUT (10 episodes)
  stock twin             0.56 [0.55, 0.58]
  aligned stock          0.56 [0.55, 0.58]   (stock dynamics + delay + released limits)
  lag-filter baseline    0.49 [0.48, 0.51]   (no physics: 3 params/joint)
  calibrated twin        0.33 [0.32, 0.35]
  change vs stock        -41% [-44, -39]   per-episode median -40% (range -48% .. -33%); 10/10 improved
  change vs baseline     -33% [-36, -29]   10/10 improved
  verdict                closes part of the gap (-41% [-44, -39] vs stock, residual 0.33 deg); calibrated twin beats the physics-free lag filter (-33% [-36, -29])

command->state lag, interleaved held-out, ms per joint (real / stock / calibrated):
  shoulder_pan 113/124/118  shoulder_lift 103/118/107  elbow_flex 123/111/128  wrist_flex 113/111/121  wrist_roll 108/108/109
  max |twin - real| over joints: stock 15.5 ms, calibrated 7.8 ms
```

![future-block held-out episode](heldout_episode.svg)

![per-joint RMSE, future block](rmse_by_joint_future.svg)

![per-joint RMSE, interleaved held-out](rmse_by_joint.svg)

## Future block (held out: the last 20% of episodes by index, recorded after every fit episode), n = 10

Per joint, mean over episodes [95% CI]. Degrees. Change = calibrated vs stock, negative = better.

```
sim-vs-real RMSE  stock                         aligned stock      baseline           calibrated                    change vs stock  vs baseline
----------------  ----------------------------  -----------------  -----------------  ----------------------------  ---------------  ---------------
shoulder_pan      0.30 [0.28, 0.32] (p90 0.33)  0.30 [0.28, 0.32]  0.29 [0.26, 0.32]  0.25 [0.23, 0.27] (p90 0.29)  -18% [-21, -14]  -14% [-19, -9]
shoulder_lift     0.98 [0.88, 1.07] (p90 1.14)  0.98 [0.88, 1.07]  0.89 [0.83, 0.95]  0.59 [0.56, 0.63] (p90 0.65)  -40% [-43, -35]  -33% [-37, -29]
elbow_flex        1.08 [1.01, 1.15] (p90 1.18)  1.08 [1.01, 1.15]  0.76 [0.71, 0.80]  0.45 [0.42, 0.48] (p90 0.53)  -58% [-62, -54]  -41% [-45, -36]
wrist_flex        0.31 [0.28, 0.34] (p90 0.37)  0.31 [0.28, 0.34]  0.29 [0.27, 0.32]  0.22 [0.20, 0.25] (p90 0.26)  -28% [-34, -21]  -25% [-30, -19]
wrist_roll        0.19 [0.16, 0.21] (p90 0.24)  0.19 [0.16, 0.21]  0.22 [0.20, 0.23]  0.18 [0.15, 0.20] (p90 0.23)  -4% [-6, -3]     -17% [-25, -10]
arm_mean          0.57 [0.55, 0.60] (p90 0.60)  0.57 [0.55, 0.60]  0.49 [0.47, 0.50]  0.34 [0.32, 0.36] (p90 0.38)  -41% [-43, -38]  -31% [-33, -28]

static-frame RMSE (quasi-static holds)  stock              baseline           calibrated         episodes with >= 10 static frames
--------------------------------------  -----------------  -----------------  -----------------  ---------------------------------
shoulder_pan                            0.13 [0.06, 0.23]  0.22 [0.13, 0.34]  0.11 [0.04, 0.19]  9
shoulder_lift                           0.21 [0.16, 0.26]  0.72 [0.63, 0.82]  0.13 [0.09, 0.16]  9
elbow_flex                              0.20 [0.13, 0.32]  0.82 [0.62, 0.94]  0.30 [0.23, 0.35]  9
wrist_flex                              0.34 [0.19, 0.48]  0.34 [0.25, 0.42]  0.19 [0.12, 0.27]  9
wrist_roll                              0.15 [0.10, 0.20]  0.20 [0.14, 0.25]  0.14 [0.08, 0.18]  9
arm_mean                                0.21 [0.17, 0.24]  0.46 [0.40, 0.51]  0.17 [0.14, 0.20]  9

command tracking RMSE  real robot         stock twin         calibrated twin
---------------------  -----------------  -----------------  -----------------
shoulder_pan           1.10 [0.98, 1.24]  1.20 [1.05, 1.36]  1.07 [0.96, 1.20]
shoulder_lift          2.28 [2.04, 2.48]  2.44 [2.21, 2.67]  2.26 [2.08, 2.42]
elbow_flex             2.69 [2.51, 2.88]  2.02 [1.84, 2.20]  2.65 [2.48, 2.82]
wrist_flex             0.84 [0.75, 0.94]  0.73 [0.64, 0.83]  0.84 [0.76, 0.93]
wrist_roll             1.33 [1.13, 1.51]  1.26 [1.09, 1.42]  1.27 [1.10, 1.43]

lag (frames)   real               stock              calibrated         real ms  stock ms  calib ms
-------------  -----------------  -----------------  -----------------  -------  --------  --------
shoulder_pan   3.37 [3.32, 3.42]  3.67 [3.65, 3.69]  3.37 [3.32, 3.42]  112      122       112
shoulder_lift  3.06 [3.02, 3.09]  3.54 [3.53, 3.54]  3.15 [3.09, 3.21]  102      118       105
elbow_flex     3.71 [3.66, 3.76]  3.32 [3.31, 3.33]  3.73 [3.66, 3.80]  124      111       124
wrist_flex     3.37 [3.32, 3.41]  3.34 [3.32, 3.37]  3.60 [3.50, 3.69]  112      111       120
wrist_roll     3.34 [3.30, 3.38]  3.26 [3.24, 3.28]  3.28 [3.26, 3.31]  111      109       109

final-pose gap  stock              calibrated
--------------  -----------------  -----------------
shoulder_pan    0.19 [0.13, 0.26]  0.16 [0.10, 0.22]
shoulder_lift   0.17 [0.14, 0.21]  0.14 [0.09, 0.19]
elbow_flex      0.13 [0.06, 0.25]  0.22 [0.14, 0.31]
wrist_flex      0.24 [0.14, 0.36]  0.11 [0.06, 0.16]
wrist_roll      0.21 [0.16, 0.25]  0.17 [0.13, 0.21]

fraction of states outside the fit episodes' range of motion +-2 deg: {'shoulder_pan': 0.0, 'shoulder_lift': 0.0, 'elbow_flex': 0.0135, 'wrist_flex': 0.0081, 'wrist_roll': 0.0338}
fraction of states outside the twin's joint range: stock {'shoulder_pan': 0.0, 'shoulder_lift': 0.0, 'elbow_flex': 0.0, 'wrist_flex': 0.0041, 'wrist_roll': 0.0}; calibrated {'shoulder_pan': 0.0, 'shoulder_lift': 0.0, 'elbow_flex': 0.0, 'wrist_flex': 0.0041, 'wrist_roll': 0.0}
```

## Interleaved held-out (random episodes from the same period as the fit episodes), n = 10

Per joint, mean over episodes [95% CI]. Degrees. Change = calibrated vs stock, negative = better.

```
sim-vs-real RMSE  stock                         aligned stock      baseline           calibrated                    change vs stock  vs baseline
----------------  ----------------------------  -----------------  -----------------  ----------------------------  ---------------  ---------------
shoulder_pan      0.30 [0.28, 0.32] (p90 0.33)  0.30 [0.28, 0.32]  0.30 [0.28, 0.33]  0.25 [0.24, 0.26] (p90 0.27)  -17% [-22, -11]  -18% [-22, -13]
shoulder_lift     0.99 [0.96, 1.03] (p90 1.03)  0.99 [0.96, 1.03]  0.88 [0.84, 0.93]  0.60 [0.56, 0.65] (p90 0.67)  -39% [-43, -34]  -32% [-37, -25]
elbow_flex        1.07 [1.02, 1.13] (p90 1.17)  1.07 [1.02, 1.13]  0.78 [0.75, 0.83]  0.45 [0.42, 0.47] (p90 0.48)  -59% [-62, -55]  -43% [-48, -38]
wrist_flex        0.31 [0.27, 0.35] (p90 0.40)  0.31 [0.27, 0.35]  0.31 [0.28, 0.33]  0.22 [0.20, 0.23] (p90 0.24)  -30% [-35, -23]  -30% [-32, -27]
wrist_roll        0.14 [0.13, 0.16] (p90 0.17)  0.14 [0.13, 0.16]  0.18 [0.17, 0.19]  0.14 [0.13, 0.15] (p90 0.17)  -2% [-4, -1]     -23% [-29, -18]
arm_mean          0.56 [0.55, 0.58] (p90 0.58)  0.56 [0.55, 0.58]  0.49 [0.48, 0.51]  0.33 [0.32, 0.35] (p90 0.35)  -41% [-44, -39]  -33% [-36, -29]

static-frame RMSE (quasi-static holds)  stock              baseline           calibrated         episodes with >= 10 static frames
--------------------------------------  -----------------  -----------------  -----------------  ---------------------------------
shoulder_pan                            0.25 [0.14, 0.36]  0.30 [0.16, 0.46]  0.22 [0.14, 0.30]  7
shoulder_lift                           0.23 [0.18, 0.27]  0.67 [0.63, 0.70]  0.21 [0.14, 0.31]  7
elbow_flex                              0.33 [0.12, 0.54]  0.87 [0.76, 0.96]  0.35 [0.30, 0.42]  7
wrist_flex                              0.35 [0.17, 0.53]  0.40 [0.32, 0.48]  0.23 [0.13, 0.34]  7
wrist_roll                              0.16 [0.11, 0.22]  0.22 [0.17, 0.27]  0.15 [0.09, 0.21]  7
arm_mean                                0.26 [0.20, 0.34]  0.49 [0.44, 0.55]  0.23 [0.20, 0.27]  7

command tracking RMSE  real robot         stock twin         calibrated twin
---------------------  -----------------  -----------------  -----------------
shoulder_pan           0.90 [0.78, 1.02]  0.97 [0.82, 1.12]  0.91 [0.79, 1.02]
shoulder_lift          2.17 [2.10, 2.24]  2.24 [2.15, 2.31]  2.18 [2.10, 2.25]
elbow_flex             2.42 [2.32, 2.52]  1.74 [1.60, 1.88]  2.42 [2.30, 2.54]
wrist_flex             0.80 [0.74, 0.85]  0.68 [0.62, 0.73]  0.80 [0.75, 0.84]
wrist_roll             1.10 [1.03, 1.19]  1.10 [1.03, 1.17]  1.11 [1.04, 1.18]

lag (frames)   real               stock              calibrated         real ms  stock ms  calib ms
-------------  -----------------  -----------------  -----------------  -------  --------  --------
shoulder_pan   3.38 [3.33, 3.44]  3.73 [3.70, 3.78]  3.53 [3.43, 3.65]  113      124       118
shoulder_lift  3.08 [3.05, 3.10]  3.54 [3.53, 3.55]  3.22 [3.20, 3.24]  103      118       107
elbow_flex     3.70 [3.67, 3.74]  3.33 [3.32, 3.33]  3.84 [3.79, 3.88]  123      111       128
wrist_flex     3.38 [3.34, 3.43]  3.35 [3.33, 3.36]  3.62 [3.56, 3.68]  113      111       121
wrist_roll     3.23 [3.21, 3.25]  3.25 [3.24, 3.27]  3.27 [3.25, 3.29]  108      108       109

final-pose gap  stock              calibrated
--------------  -----------------  -----------------
shoulder_pan    0.17 [0.11, 0.22]  0.19 [0.11, 0.26]
shoulder_lift   0.22 [0.19, 0.25]  0.25 [0.14, 0.37]
elbow_flex      0.15 [0.06, 0.29]  0.20 [0.14, 0.28]
wrist_flex      0.23 [0.13, 0.34]  0.11 [0.04, 0.19]
wrist_roll      0.12 [0.09, 0.16]  0.10 [0.06, 0.13]

fraction of states outside the fit episodes' range of motion +-2 deg: {'shoulder_pan': 0.0, 'shoulder_lift': 0.0, 'elbow_flex': 0.0122, 'wrist_flex': 0.0, 'wrist_roll': 0.0}
fraction of states outside the twin's joint range: stock {'shoulder_pan': 0.0, 'shoulder_lift': 0.0, 'elbow_flex': 0.0, 'wrist_flex': 0.0, 'wrist_roll': 0.0}; calibrated {'shoulder_pan': 0.0, 'shoulder_lift': 0.0, 'elbow_flex': 0.0, 'wrist_flex': 0.0, 'wrist_roll': 0.0}
```

## Fit episodes (used by the fit), n = 30

Per joint, mean over episodes [95% CI]. Degrees. Change = calibrated vs stock, negative = better.

```
sim-vs-real RMSE  stock                         aligned stock      baseline           calibrated                    change vs stock  vs baseline
----------------  ----------------------------  -----------------  -----------------  ----------------------------  ---------------  ---------------
shoulder_pan      0.31 [0.30, 0.32] (p90 0.34)  0.31 [0.30, 0.32]  0.30 [0.29, 0.32]  0.25 [0.24, 0.27] (p90 0.28)  -18% [-21, -15]  -17% [-21, -13]
shoulder_lift     1.02 [0.97, 1.08] (p90 1.21)  1.02 [0.97, 1.08]  0.93 [0.87, 0.99]  0.62 [0.59, 0.64] (p90 0.70)  -40% [-42, -37]  -34% [-36, -30]
elbow_flex        1.07 [1.03, 1.12] (p90 1.24)  1.07 [1.03, 1.12]  0.78 [0.75, 0.81]  0.45 [0.43, 0.48] (p90 0.55)  -58% [-60, -54]  -41% [-45, -37]
wrist_flex        0.29 [0.27, 0.31] (p90 0.35)  0.29 [0.27, 0.31]  0.29 [0.27, 0.31]  0.21 [0.20, 0.22] (p90 0.25)  -27% [-30, -24]  -26% [-29, -23]
wrist_roll        0.15 [0.14, 0.17] (p90 0.19)  0.15 [0.14, 0.17]  0.19 [0.18, 0.20]  0.15 [0.14, 0.16] (p90 0.18)  -2% [-3, -1]     -20% [-24, -15]
arm_mean          0.57 [0.56, 0.58] (p90 0.62)  0.57 [0.56, 0.58]  0.50 [0.48, 0.51]  0.34 [0.33, 0.35] (p90 0.38)  -41% [-43, -39]  -32% [-34, -30]

static-frame RMSE (quasi-static holds)  stock              baseline           calibrated         episodes with >= 10 static frames
--------------------------------------  -----------------  -----------------  -----------------  ---------------------------------
shoulder_pan                            0.24 [0.19, 0.28]  0.28 [0.23, 0.33]  0.19 [0.15, 0.23]  28
shoulder_lift                           0.29 [0.23, 0.38]  0.68 [0.63, 0.74]  0.20 [0.16, 0.25]  28
elbow_flex                              0.27 [0.16, 0.41]  0.84 [0.76, 0.91]  0.32 [0.29, 0.35]  28
wrist_flex                              0.32 [0.26, 0.39]  0.34 [0.29, 0.38]  0.17 [0.14, 0.21]  28
wrist_roll                              0.14 [0.11, 0.16]  0.18 [0.15, 0.20]  0.13 [0.11, 0.15]  28
arm_mean                                0.25 [0.22, 0.29]  0.46 [0.44, 0.48]  0.20 [0.18, 0.22]  28

command tracking RMSE  real robot         stock twin         calibrated twin
---------------------  -----------------  -----------------  -----------------
shoulder_pan           1.01 [0.91, 1.11]  1.08 [0.95, 1.20]  0.98 [0.88, 1.08]
shoulder_lift          2.19 [2.10, 2.29]  2.24 [2.14, 2.34]  2.17 [2.10, 2.24]
elbow_flex             2.46 [2.37, 2.54]  1.78 [1.69, 1.87]  2.46 [2.40, 2.54]
wrist_flex             0.82 [0.79, 0.86]  0.72 [0.68, 0.75]  0.82 [0.79, 0.85]
wrist_roll             0.97 [0.84, 1.09]  0.95 [0.84, 1.07]  0.97 [0.85, 1.08]

lag (frames)   real               stock              calibrated         real ms  stock ms  calib ms
-------------  -----------------  -----------------  -----------------  -------  --------  --------
shoulder_pan   3.39 [3.36, 3.44]  3.70 [3.68, 3.73]  3.46 [3.39, 3.53]  113      123       115
shoulder_lift  3.08 [3.06, 3.11]  3.55 [3.54, 3.57]  3.23 [3.18, 3.29]  103      118       108
elbow_flex     3.73 [3.70, 3.76]  3.33 [3.32, 3.35]  3.84 [3.79, 3.89]  124      111       128
wrist_flex     3.40 [3.37, 3.44]  3.35 [3.33, 3.36]  3.58 [3.54, 3.62]  113      112       119
wrist_roll     3.25 [3.22, 3.27]  3.30 [3.28, 3.33]  3.34 [3.31, 3.38]  108      110       111

final-pose gap  stock              calibrated
--------------  -----------------  -----------------
shoulder_pan    0.23 [0.18, 0.28]  0.21 [0.17, 0.26]
shoulder_lift   0.21 [0.19, 0.24]  0.21 [0.15, 0.26]
elbow_flex      0.10 [0.07, 0.12]  0.25 [0.20, 0.30]
wrist_flex      0.26 [0.20, 0.32]  0.11 [0.07, 0.15]
wrist_roll      0.16 [0.13, 0.19]  0.14 [0.11, 0.17]
```

## Calibrated twin

Package `calibrated_twin.json`, sha256 `83f253d508031e2dd53878842de9fbda98e3a575d37701bef974baf0ca94c925`.
Fitted: kp[shoulder_pan], kv[shoulder_pan], frictionloss[shoulder_pan], kp[shoulder_lift], kv[shoulder_lift], frictionloss[shoulder_lift], kp[elbow_flex], kv[elbow_flex], frictionloss[elbow_flex], kp[wrist_flex], kv[wrist_flex], frictionloss[wrist_flex], kp[wrist_roll], kv[wrist_roll], frictionloss[wrist_roll]; command delay 0 frame(s) (screened train MSE by delay, deg^2: {'0': 0.22082, '1': 0.45735, '2': 0.56101, '3': 0.79315, '4': 1.45286, '5': 2.70336}). Train MSE 0.14629 deg^2. Optimizer: converged (`ftol` termination condition is satisfied.). At a bound: none.

```
joint          kp N m/rad   kv N m s/rad  frictionloss N m  armature kg m^2  zero offset deg
-------------  -----------  ------------  ----------------  ---------------  -----------------
shoulder_pan   50 -> 37.55  5.13 -> 3.18  0.1 -> 0.184      0.1 (fixed)      +0.0 (documented)
shoulder_lift  50 -> 19.66  4.96 -> 1.26  0.1 -> 0.349      0.1 (fixed)      +0.0 (documented)
elbow_flex     50 -> 17.27  4.63 -> 1.46  0.1 -> 0.303      0.1 (fixed)      +0.0 (documented)
wrist_flex     50 -> 26.38  4.49 -> 2.04  0.1 -> 0.179      0.1 (fixed)      +0.0 (documented)
wrist_roll     50 -> 51.06  4.47 -> 4.52  0.1 -> 0.14       0.1 (fixed)      +0.0 (documented)
```

Identifiable servo combinations (the individual gains are not the claim): natural frequency sqrt(kp/I_eff) and damping ratio (kv+damping)/(2 sqrt(kp I_eff)), I_eff = joint-space inertia at the median pose incl. armature; 95% CI from a linearised episode bootstrap of the fit.

```
joint          I_eff kg m^2  natural freq Hz [CI]  damping ratio [CI]
-------------  ------------  --------------------  --------------------
shoulder_pan   0.1043        3.02 [2.89, 3.14]     0.804 [0.757, 0.841]
shoulder_lift  0.1058        2.17 [2.14, 2.21]     0.436 [0.414, 0.457]
elbow_flex     0.1063        2.03 [2.01, 2.05]     0.539 [0.523, 0.554]
wrist_flex     0.1012        2.57 [2.48, 2.66]     0.625 [0.59, 0.658]
wrist_roll     0.1           3.6 [3.48, 3.73]      0.999 [0.964, 1.03]
```

Per-parameter identifiability (condition number of J^T J 15700.0): marginal/conditional std ratio = sqrt(VIF); >= 10 means only a combination with other parameters is identified.

```
parameter                    value   95% CI          std ratio  identified alone
---------------------------  ------  --------------  ---------  ----------------
kp[shoulder_pan]             37.55   [34.3, 40.7]    13.6       NO
kv[shoulder_pan]             3.182   [2.87, 3.45]    11.8       NO
frictionloss[shoulder_pan]   0.1836  [0.158, 0.204]  2.99       yes
kp[shoulder_lift]            19.66   [19.1, 20.4]    2.34       yes
kv[shoulder_lift]            1.256   [1.18, 1.34]    2.49       yes
frictionloss[shoulder_lift]  0.3486  [0.321, 0.377]  1.56       yes
kp[elbow_flex]               17.26   [16.9, 17.7]    2.32       yes
kv[elbow_flex]               1.461   [1.41, 1.51]    2.12       yes
frictionloss[elbow_flex]     0.3032  [0.288, 0.317]  1.49       yes
kp[wrist_flex]               26.38   [24.6, 28.2]    4.02       yes
kv[wrist_flex]               2.043   [1.86, 2.22]    3.26       yes
frictionloss[wrist_flex]     0.1793  [0.166, 0.191]  1.88       yes
kp[wrist_roll]               51.06   [47.8, 54.9]    14.4       NO
kv[wrist_roll]               4.517   [4.25, 4.81]    13.4       NO
frictionloss[wrist_roll]     0.1403  [0.12, 0.162]   2.05       yes
```

Posterior correlations |r| > 0.95: kp[wrist_roll] ~ kv[wrist_roll] (+0.995); kp[shoulder_pan] ~ kv[shoulder_pan] (+0.994)

Weakest directions (relative eigenvalue: top loadings): 6.4e-05: kp[wrist_roll] -0.73, kv[wrist_roll] -0.65, frictionloss[wrist_roll] -0.20, kp[shoulder_pan] +0.00; 8.8e-05: kp[shoulder_pan] +0.81, kv[shoulder_pan] +0.51, frictionloss[shoulder_pan] +0.29, kp[wrist_flex] +0.00; 0.00078: kp[wrist_flex] +0.89, kv[wrist_flex] +0.36, frictionloss[wrist_flex] +0.30, kp[elbow_flex] +0.00

Physics-free baseline (fitted on the same fit episodes): y[t+1] = y[t] + alpha*(a[t-d] + b - y[t]), y[0] = x[0], per arm joint; alpha [0.42, 0.48, 0.26, 0.28, 0.42], delay [1, 1, 0, 0, 1] frames, bias [-0.0838, -0.8188, 1.1874, 0.2496, 0.0048] deg.

## Mapping audit

Sign checks (1st-99th percentile of FIT-episode states vs MJCF range):

```
joint          recorded p1..p99 deg  MJCF range deg     shift (doc sign)  shift (flipped)  decision
-------------  --------------------  -----------------  ----------------  ---------------  ---------------------------------------------------------------------------
shoulder_pan   [-55.28, 39.81]       [-110.01, 110.01]  0.0               0.0              documented sign (flipped sign would also fit: sign not identified by range)
shoulder_lift  [48.02, 189.49]       [-190.22, 9.97]    179.52            0.0              flipped sign (documented sign does not fit the MJCF range)
elbow_flex     [43.59, 167.26]       [-9.97, 179.91]    0.0               157.29           documented sign
wrist_flex     [36.65, 81.12]        [-95.11, 95.11]    0.0               0.0              documented sign (flipped sign would also fit: sign not identified by range)
wrist_roll     [-58.27, 75.67]       [-159.86, 159.86]  0.0               0.0              documented sign (flipped sign would also fit: sign not identified by range)

same rule on other subsets (robustness): all_episodes: signs [1, -1, 1, 1, 1], accepted; heldout_only: signs [1, -1, 1, 1, 1], accepted -> agrees
released stock limits (crossed by fit episodes): {}
```

Forward-kinematics plausibility under the shipped mapping (evidence, not a gate; assumes the base sits on the work surface):

```
gripper lowest point minus base lowest point (m): {'p1': 0.046, 'p5': 0.051, 'p50': 0.076, 'min': 0.042}; frames > 2 cm below the base: 0.0
frames within 1 deg of a stock MJCF limit: {'shoulder_pan': 0.0, 'shoulder_lift': 0.3012, 'elbow_flex': 0.0, 'wrist_flex': 0.0007, 'wrist_roll': 0.0}
frames beyond a stock MJCF limit: {'shoulder_pan': 0.0, 'shoulder_lift': 0.0, 'elbow_flex': 0.0, 'wrist_flex': 0.0002, 'wrist_roll': 0.0}
```

Gravity sag on real static frames (middle 80% of each episode, gripper >= 3 cm above the base plane): centred correlation between the servo's static error and the twin's gravity torque at the mapped pose, and the implied static stiffness (centred slope). Positive supports the mapping. Evidence, not a gate.

```
joint          corr [CI] verdict                                                                                            power (gravity std, n)  implied static K N m/rad  fitted kp
-------------  -----------------------------------------------------------------------------------------------------------  ----------------------  ------------------------  ---------
shoulder_pan   not testable (gravity torque ~constant over the selected static poses; gravity std 0.0 N m, 1283 frames)                                                       37.6
shoulder_lift  +0.41 [+0.19, +0.59] positive                                                                                0.1959 N m, 1283 fr     80.6 [38.7, 239]          19.7
elbow_flex     not testable (gravity torque ~constant over the selected static poses; gravity std 0.0125 N m, 1283 frames)                                                    17.3
wrist_flex     not testable (gravity torque ~constant over the selected static poses; gravity std 0.0097 N m, 1283 frames)                                                    26.4
wrist_roll     not testable (gravity torque ~constant over the selected static poses; gravity std 0.0002 N m, 1283 frames)                                                    51.1
static frames: 1283 (0 excluded as possible table contact) from 30 fit episodes
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
- future held-out states outside the calibrated twin's range (clipped): {'wrist_flex': 0.0041}.
- Not identified individually (marginal/conditional std ratio >= 10): kp[shoulder_pan], kv[shoulder_pan], kp[wrist_roll], kv[wrist_roll]. Only combinations of them are constrained by the data (see identifiability); individual values are not meaningful.
- interleaved: final-pose (static) gap is larger for the calibrated twin than for stock on shoulder_pan, shoulder_lift, elbow_flex by point estimate; CIs overlap on all of them.
- future: final-pose (static) gap is larger for the calibrated twin than for stock on elbow_flex by point estimate; CIs overlap on all of them.
- Joint direction flipped relative to the documented convention for shoulder_lift (chosen from the recorded range of motion vs the MJCF range; see mapping_checks).

## Provenance and reproduction

```
dataset        00ri/so100_battery @ f619ae763ab6c4e7488c32a4c51f99246a761f5d (requested f619ae763ab6c4e7488c32a4c51f99246a761f5d)
               LeRobot v2.1, robot_type so100, 30 fps, 50 episodes loaded (repo: 50), 0 dropped
data files     data/chunk-000/episode_000000.parquet (4c637398084a), data/chunk-000/episode_000001.parquet (6e057e071a76), data/chunk-000/episode_000002.parquet (9dbf52bdb98e), ... (50 files)
twin           trs_so_arm100 (so_arm100.xml) from https://github.com/google-deepmind/mujoco_menagerie @ b0655057a9df2abe39ea7fc989914ba6f248301c
               dir sha256 4f3b0f21b8a2b889..., timestep 0.002 -> 0.00196078 s x 17 substeps/frame, contacts disabled
software       mujoco 3.17.0, numpy 2.5.4, scipy 1.18.1, python 3.13.18, meatspace_lab 2.0.0 (code sha256 924eb3d8364be665...)
hardware       x86_64 Intel(R) Xeon(R) Processor @ 2.80GHz; OpenBLAS kernel numpy: SkylakeX; scipy: SkylakeX
report         schema meatspace.twin-gap-report/v2
               results sha256 53e030b841a9781e20f4c5bb2045c8d97f95aaa52ca990b415edb24c143e22d9  (numbers only; any interpreter/CPU)
               content sha256 1e6889f36721a7d9394f3e4e4e3fd09bae7722e9074a7b49edf4f7bc33512128  (numbers + environment above)
```

Reproduce (from `lab/`, see README) into a scratch directory and compare:

```
python -m meatspace_lab report --dataset 00ri/so100_battery --revision f619ae763ab6c4e7488c32a4c51f99246a761f5d \
    --twin .cache/menagerie/trs_so_arm100 --out /tmp/repro/ --max-episodes 200
python -m meatspace_lab verify reports/00ri__so100_battery/report.json /tmp/repro/report.json
```
