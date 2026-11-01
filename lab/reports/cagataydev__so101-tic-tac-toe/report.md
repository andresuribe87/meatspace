# Twin Gap Report: cagataydev/so101-tic-tac-toe x robotstudio_so101

```
HELD-OUT sim-vs-real joint RMSE, mean of 5 arm joints, deg  [95% bootstrap CI over episodes]
change = calibrated/reference - 1 (negative = better), paired by episode

FUTURE BLOCK (40 episodes)
  stock twin             2.82 [2.71, 2.94]
  aligned stock          1.04 [0.99, 1.10]   (stock dynamics + delay + released limits)
  lag-filter baseline    0.69 [0.61, 0.80]   (no physics: 3 params/joint)
  calibrated twin        0.38 [0.34, 0.42]
  change vs stock        -87% [-88, -85]   per-episode median -88% (range -91% .. -66%); 40/40 improved
  change vs baseline     -46% [-49, -43]   40/40 improved
  verdict                closes most of the gap (-87% [-88, -85] vs stock, residual 0.38 deg); calibrated twin beats the physics-free lag filter (-46% [-49, -43])

INTERLEAVED HELD-OUT (120 episodes)
  stock twin             2.66 [2.59, 2.73]
  aligned stock          1.05 [1.00, 1.11]   (stock dynamics + delay + released limits)
  lag-filter baseline    0.64 [0.59, 0.72]   (no physics: 3 params/joint)
  calibrated twin        0.39 [0.35, 0.46]
  change vs stock        -85% [-87, -83]   per-episode median -87% (range -91% .. -31%); 120/120 improved
  change vs baseline     -39% [-42, -35]   120/120 improved
  verdict                closes most of the gap (-85% [-87, -83] vs stock, residual 0.39 deg); calibrated twin beats the physics-free lag filter (-39% [-42, -35])

command->state lag, interleaved held-out, ms per joint (real / stock / calibrated):
  shoulder_pan 116/26/116  shoulder_lift 128/26/128  elbow_flex 133/31/140  wrist_flex 115/27/117  wrist_roll 113/28/116
  max |twin - real| over joints: stock 101.4 ms, calibrated 6.8 ms
```

![future-block held-out episode](heldout_episode.svg)

![per-joint RMSE, future block](rmse_by_joint_future.svg)

![per-joint RMSE, interleaved held-out](rmse_by_joint.svg)

## Future block (held out: the last 20% of episodes by index, recorded after every fit episode), n = 40

Per joint, mean over episodes [95% CI]. Degrees. Change = calibrated vs stock, negative = better.

```
sim-vs-real RMSE  stock                         aligned stock      baseline           calibrated                    change vs stock  vs baseline
----------------  ----------------------------  -----------------  -----------------  ----------------------------  ---------------  ---------------
shoulder_pan      2.23 [2.11, 2.35] (p90 2.72)  0.48 [0.44, 0.53]  0.38 [0.35, 0.43]  0.26 [0.23, 0.30] (p90 0.32)  -88% [-89, -86]  -31% [-34, -28]
shoulder_lift     4.08 [3.93, 4.23] (p90 4.54)  1.56 [1.44, 1.70]  1.09 [0.96, 1.25]  0.60 [0.54, 0.67] (p90 0.74)  -85% [-87, -84]  -45% [-48, -41]
elbow_flex        3.69 [3.44, 3.94] (p90 4.65)  2.01 [1.88, 2.15]  1.31 [1.03, 1.68]  0.57 [0.45, 0.71] (p90 1.32)  -85% [-88, -81]  -57% [-61, -52]
wrist_flex        2.03 [1.86, 2.22] (p90 2.75)  0.64 [0.59, 0.69]  0.40 [0.37, 0.44]  0.27 [0.24, 0.31] (p90 0.37)  -87% [-88, -85]  -32% [-37, -28]
wrist_roll        2.06 [1.90, 2.22] (p90 2.77)  0.53 [0.50, 0.56]  0.29 [0.28, 0.31]  0.18 [0.17, 0.19] (p90 0.22)  -91% [-92, -91]  -40% [-42, -37]
arm_mean          2.82 [2.71, 2.94] (p90 3.33)  1.04 [0.99, 1.10]  0.69 [0.61, 0.80]  0.38 [0.34, 0.42] (p90 0.56)  -87% [-88, -85]  -46% [-49, -43]

static-frame RMSE (quasi-static holds)  stock              baseline           calibrated         episodes with >= 10 static frames
--------------------------------------  -----------------  -----------------  -----------------  ---------------------------------
shoulder_pan                            0.38 [0.31, 0.45]  0.35 [0.28, 0.41]  0.18 [0.13, 0.24]  24
shoulder_lift                           1.41 [0.99, 1.87]  1.04 [0.82, 1.30]  0.51 [0.39, 0.64]  24
elbow_flex                              1.24 [0.93, 1.56]  1.19 [1.10, 1.27]  0.24 [0.19, 0.29]  24
wrist_flex                              0.43 [0.34, 0.54]  0.33 [0.25, 0.43]  0.17 [0.12, 0.23]  24
wrist_roll                              0.28 [0.25, 0.32]  0.25 [0.22, 0.28]  0.10 [0.08, 0.12]  24
arm_mean                                0.75 [0.66, 0.84]  0.63 [0.58, 0.68]  0.24 [0.21, 0.27]  24

command tracking RMSE  real robot         stock twin         calibrated twin
---------------------  -----------------  -----------------  -----------------
shoulder_pan           2.04 [1.93, 2.15]  0.24 [0.21, 0.28]  1.92 [1.83, 2.02]
shoulder_lift          3.85 [3.71, 4.01]  0.43 [0.34, 0.57]  3.72 [3.60, 3.84]
elbow_flex             3.99 [3.52, 4.57]  0.92 [0.43, 1.56]  3.84 [3.48, 4.28]
wrist_flex             1.81 [1.67, 1.97]  0.64 [0.46, 0.83]  1.87 [1.74, 2.01]
wrist_roll             1.89 [1.74, 2.04]  0.22 [0.20, 0.24]  1.94 [1.80, 2.08]

lag (frames)   real               stock              calibrated         real ms  stock ms  calib ms
-------------  -----------------  -----------------  -----------------  -------  --------  --------
shoulder_pan   3.58 [3.55, 3.64]  0.77 [0.74, 0.83]  3.47 [3.45, 3.49]  119      26        116
shoulder_lift  3.80 [3.75, 3.86]  0.80 [0.74, 0.87]  3.76 [3.72, 3.80]  127      27        125
elbow_flex     4.14 [3.82, 4.58]  1.23 [0.85, 1.71]  4.09 [3.84, 4.44]  138      41        136
wrist_flex     3.35 [3.31, 3.41]  0.83 [0.79, 0.89]  3.49 [3.46, 3.52]  112      28        116
wrist_roll     3.37 [3.34, 3.39]  0.79 [0.78, 0.81]  3.48 [3.46, 3.49]  112      26        116

final-pose gap  stock              calibrated
--------------  -----------------  -----------------
shoulder_pan    0.34 [0.27, 0.40]  0.15 [0.12, 0.19]
shoulder_lift   0.38 [0.31, 0.45]  0.84 [0.76, 0.92]
elbow_flex      1.56 [1.20, 1.93]  0.30 [0.24, 0.36]
wrist_flex      0.32 [0.22, 0.43]  0.19 [0.16, 0.22]
wrist_roll      0.29 [0.24, 0.34]  0.10 [0.08, 0.12]

fraction of states outside the fit episodes' range of motion +-2 deg: {'shoulder_pan': 0.0, 'shoulder_lift': 0.0, 'elbow_flex': 0.0, 'wrist_flex': 0.0, 'wrist_roll': 0.0}
fraction of states outside the twin's joint range: stock {'shoulder_pan': 0.0, 'shoulder_lift': 0.0, 'elbow_flex': 0.0, 'wrist_flex': 0.0555, 'wrist_roll': 0.0}; calibrated {'shoulder_pan': 0.0, 'shoulder_lift': 0.0, 'elbow_flex': 0.0, 'wrist_flex': 0.0, 'wrist_roll': 0.0}
```

## Interleaved held-out (random episodes from the same period as the fit episodes), n = 120

Per joint, mean over episodes [95% CI]. Degrees. Change = calibrated vs stock, negative = better.

```
sim-vs-real RMSE  stock                         aligned stock      baseline           calibrated                    change vs stock  vs baseline
----------------  ----------------------------  -----------------  -----------------  ----------------------------  ---------------  ---------------
shoulder_pan      2.21 [2.12, 2.29] (p90 2.87)  0.49 [0.45, 0.52]  0.33 [0.30, 0.37]  0.24 [0.22, 0.27] (p90 0.33)  -89% [-90, -88]  -27% [-30, -25]
shoulder_lift     3.72 [3.62, 3.82] (p90 4.34)  1.41 [1.35, 1.48]  0.94 [0.86, 1.05]  0.61 [0.57, 0.68] (p90 0.69)  -83% [-85, -82]  -35% [-39, -31]
elbow_flex        3.01 [2.81, 3.30] (p90 3.90)  2.02 [1.85, 2.30]  1.17 [0.98, 1.47]  0.59 [0.44, 0.86] (p90 0.64)  -80% [-85, -74]  -50% [-56, -40]
wrist_flex        2.35 [2.24, 2.46] (p90 3.16)  0.74 [0.70, 0.78]  0.46 [0.43, 0.51]  0.31 [0.28, 0.35] (p90 0.44)  -87% [-88, -85]  -32% [-35, -29]
wrist_roll        2.01 [1.90, 2.14] (p90 2.78)  0.58 [0.54, 0.62]  0.32 [0.30, 0.36]  0.22 [0.19, 0.25] (p90 0.29)  -89% [-90, -88]  -33% [-36, -30]
arm_mean          2.66 [2.59, 2.73] (p90 3.10)  1.05 [1.00, 1.11]  0.64 [0.59, 0.72]  0.39 [0.35, 0.46] (p90 0.51)  -85% [-87, -83]  -39% [-42, -35]

static-frame RMSE (quasi-static holds)  stock              baseline           calibrated         episodes with >= 10 static frames
--------------------------------------  -----------------  -----------------  -----------------  ---------------------------------
shoulder_pan                            0.32 [0.28, 0.36]  0.31 [0.27, 0.34]  0.12 [0.10, 0.15]  39
shoulder_lift                           0.81 [0.62, 1.02]  0.77 [0.67, 0.87]  0.48 [0.41, 0.56]  39
elbow_flex                              1.13 [0.85, 1.42]  1.12 [1.01, 1.22]  0.39 [0.33, 0.45]  39
wrist_flex                              0.55 [0.45, 0.65]  0.48 [0.39, 0.57]  0.25 [0.19, 0.32]  39
wrist_roll                              0.26 [0.22, 0.30]  0.25 [0.21, 0.28]  0.11 [0.09, 0.13]  39
arm_mean                                0.61 [0.54, 0.69]  0.58 [0.55, 0.62]  0.27 [0.25, 0.30]  39

command tracking RMSE  real robot         stock twin         calibrated twin
---------------------  -----------------  -----------------  -----------------
shoulder_pan           2.01 [1.93, 2.10]  0.26 [0.23, 0.30]  1.99 [1.92, 2.06]
shoulder_lift          3.50 [3.40, 3.61]  0.39 [0.33, 0.47]  3.43 [3.35, 3.51]
elbow_flex             3.05 [2.78, 3.40]  0.44 [0.27, 0.66]  2.95 [2.79, 3.15]
wrist_flex             2.15 [2.05, 2.26]  0.52 [0.44, 0.61]  2.14 [2.05, 2.23]
wrist_roll             1.87 [1.76, 1.98]  0.25 [0.21, 0.30]  1.89 [1.79, 1.99]

lag (frames)   real               stock              calibrated         real ms  stock ms  calib ms
-------------  -----------------  -----------------  -----------------  -------  --------  --------
shoulder_pan   3.47 [3.44, 3.50]  0.77 [0.75, 0.80]  3.48 [3.47, 3.49]  116      26        116
shoulder_lift  3.84 [3.79, 3.91]  0.79 [0.76, 0.86]  3.85 [3.81, 3.90]  128      26        128
elbow_flex     3.98 [3.86, 4.14]  0.94 [0.83, 1.09]  4.19 [4.09, 4.31]  133      31        140
wrist_flex     3.44 [3.41, 3.48]  0.82 [0.80, 0.86]  3.50 [3.49, 3.52]  115      27        117
wrist_roll     3.39 [3.36, 3.41]  0.83 [0.81, 0.86]  3.48 [3.47, 3.49]  113      28        116

final-pose gap  stock              calibrated
--------------  -----------------  -----------------
shoulder_pan    0.34 [0.29, 0.39]  0.12 [0.10, 0.14]
shoulder_lift   0.88 [0.76, 0.99]  0.57 [0.52, 0.62]
elbow_flex      1.35 [1.14, 1.56]  0.33 [0.29, 0.37]
wrist_flex      0.39 [0.28, 0.53]  0.16 [0.15, 0.18]
wrist_roll      0.31 [0.27, 0.34]  0.10 [0.09, 0.12]

fraction of states outside the fit episodes' range of motion +-2 deg: {'shoulder_pan': 0.0, 'shoulder_lift': 0.0, 'elbow_flex': 0.0005, 'wrist_flex': 0.0015, 'wrist_roll': 0.0109}
fraction of states outside the twin's joint range: stock {'shoulder_pan': 0.0, 'shoulder_lift': 0.01, 'elbow_flex': 0.0, 'wrist_flex': 0.0288, 'wrist_roll': 0.0}; calibrated {'shoulder_pan': 0.0, 'shoulder_lift': 0.0, 'elbow_flex': 0.0, 'wrist_flex': 0.0, 'wrist_roll': 0.0}
```

## Fit episodes (used by the fit), n = 40

Per joint, mean over episodes [95% CI]. Degrees. Change = calibrated vs stock, negative = better.

```
sim-vs-real RMSE  stock                         aligned stock      baseline           calibrated                    change vs stock  vs baseline
----------------  ----------------------------  -----------------  -----------------  ----------------------------  ---------------  ---------------
shoulder_pan      2.20 [2.05, 2.36] (p90 2.94)  0.48 [0.44, 0.51]  0.31 [0.28, 0.35]  0.23 [0.21, 0.27] (p90 0.34)  -89% [-91, -88]  -25% [-29, -20]
shoulder_lift     3.58 [3.39, 3.76] (p90 4.38)  1.44 [1.34, 1.54]  0.86 [0.78, 0.97]  0.58 [0.52, 0.68] (p90 0.71)  -84% [-86, -81]  -33% [-38, -28]
elbow_flex        2.94 [2.71, 3.19] (p90 4.13)  1.94 [1.81, 2.07]  1.05 [0.96, 1.18]  0.50 [0.41, 0.61] (p90 0.73)  -83% [-86, -79]  -52% [-58, -46]
wrist_flex        2.22 [2.02, 2.43] (p90 3.00)  0.76 [0.67, 0.88]  0.50 [0.42, 0.64]  0.33 [0.27, 0.43] (p90 0.50)  -85% [-88, -81]  -34% [-38, -30]
wrist_roll        2.22 [1.99, 2.45] (p90 3.21)  0.57 [0.51, 0.64]  0.33 [0.29, 0.38]  0.21 [0.18, 0.26] (p90 0.25)  -90% [-92, -88]  -35% [-40, -30]
arm_mean          2.63 [2.52, 2.74] (p90 3.10)  1.04 [0.98, 1.10]  0.61 [0.56, 0.67]  0.37 [0.33, 0.43] (p90 0.46)  -86% [-88, -84]  -39% [-43, -35]

static-frame RMSE (quasi-static holds)  stock              baseline           calibrated         episodes with >= 10 static frames
--------------------------------------  -----------------  -----------------  -----------------  ---------------------------------
shoulder_pan                            0.33 [0.25, 0.41]  0.32 [0.26, 0.38]  0.14 [0.10, 0.20]  16
shoulder_lift                           1.23 [0.92, 1.54]  0.66 [0.52, 0.81]  0.40 [0.28, 0.55]  16
elbow_flex                              1.48 [1.05, 1.91]  0.96 [0.71, 1.19]  0.36 [0.25, 0.50]  16
wrist_flex                              0.81 [0.38, 1.47]  0.48 [0.38, 0.60]  0.24 [0.17, 0.33]  16
wrist_roll                              0.23 [0.18, 0.28]  0.21 [0.17, 0.25]  0.10 [0.07, 0.13]  16
arm_mean                                0.82 [0.68, 0.97]  0.53 [0.46, 0.59]  0.25 [0.21, 0.29]  16

command tracking RMSE  real robot         stock twin         calibrated twin
---------------------  -----------------  -----------------  -----------------
shoulder_pan           2.00 [1.86, 2.14]  0.24 [0.22, 0.26]  1.98 [1.85, 2.12]
shoulder_lift          3.34 [3.18, 3.50]  0.31 [0.28, 0.35]  3.30 [3.15, 3.44]
elbow_flex             2.94 [2.66, 3.26]  0.33 [0.16, 0.59]  2.90 [2.66, 3.17]
wrist_flex             2.04 [1.83, 2.29]  0.59 [0.38, 0.86]  2.00 [1.82, 2.19]
wrist_roll             2.05 [1.84, 2.27]  0.25 [0.21, 0.33]  2.05 [1.85, 2.24]

lag (frames)   real               stock              calibrated         real ms  stock ms  calib ms
-------------  -----------------  -----------------  -----------------  -------  --------  --------
shoulder_pan   3.46 [3.44, 3.49]  0.76 [0.75, 0.77]  3.48 [3.47, 3.50]  115      25        116
shoulder_lift  3.85 [3.82, 3.89]  0.75 [0.74, 0.75]  3.88 [3.83, 3.93]  128      25        129
elbow_flex     3.94 [3.79, 4.10]  0.89 [0.79, 1.04]  4.17 [4.02, 4.36]  131      30        139
wrist_flex     3.50 [3.43, 3.60]  0.85 [0.76, 0.97]  3.55 [3.50, 3.60]  117      28        118
wrist_roll     3.41 [3.38, 3.46]  0.82 [0.78, 0.87]  3.47 [3.45, 3.49]  114      27        116

final-pose gap  stock              calibrated
--------------  -----------------  -----------------
shoulder_pan    0.31 [0.25, 0.37]  0.12 [0.09, 0.15]
shoulder_lift   1.10 [0.90, 1.30]  0.51 [0.41, 0.61]
elbow_flex      1.30 [0.93, 1.67]  0.34 [0.25, 0.43]
wrist_flex      0.54 [0.31, 0.85]  0.19 [0.15, 0.22]
wrist_roll      0.26 [0.21, 0.31]  0.11 [0.09, 0.14]
```

## Calibrated twin

Package `calibrated_twin.json`, sha256 `b35b3a32c727fbdfd279a662b1f85e3eba6b4978faaf590b97f7297447308408`.
Fitted: kp[shoulder_pan], kv[shoulder_pan], frictionloss[shoulder_pan], kp[shoulder_lift], kv[shoulder_lift], frictionloss[shoulder_lift], kp[elbow_flex], kv[elbow_flex], frictionloss[elbow_flex], kp[wrist_flex], kv[wrist_flex], frictionloss[wrist_flex], kp[wrist_roll], kv[wrist_roll], frictionloss[wrist_roll]; command delay 0 frame(s) (screened train MSE by delay, deg^2: {'0': 0.21898, '1': 0.30132, '2': 0.50743, '3': 0.80573, '4': 2.17597, '5': 4.03689}). Train MSE 0.21717 deg^2. Optimizer: converged (`ftol` termination condition is satisfied.). At a bound: none.

```
joint          kp N m/rad      kv N m s/rad   frictionloss N m  armature kg m^2  zero offset deg
-------------  --------------  -------------  ----------------  ---------------  -----------------
shoulder_pan   998.2 -> 13.93  2.73 -> 0.706  0.052 -> 0.0808   0.028 (fixed)    +0.0 (documented)
shoulder_lift  998.2 -> 17.07  2.73 -> 0.926  0.052 -> 0.349    0.028 (fixed)    +0.0 (documented)
elbow_flex     998.2 -> 14.01  2.73 -> 0.669  0.052 -> 0.328    0.028 (fixed)    +0.0 (documented)
wrist_flex     998.2 -> 13.93  2.73 -> 0.703  0.052 -> 0.108    0.028 (fixed)    +0.0 (documented)
wrist_roll     998.2 -> 13.78  2.73 -> 0.737  0.052 -> 0.065    0.028 (fixed)    +0.0 (documented)
```

Identifiable servo combinations (the individual gains are not the claim): natural frequency sqrt(kp/I_eff) and damping ratio (kv+damping)/(2 sqrt(kp I_eff)), I_eff = joint-space inertia at the median pose incl. armature; 95% CI from a linearised episode bootstrap of the fit.

```
joint          I_eff kg m^2  natural freq Hz [CI]  damping ratio [CI]
-------------  ------------  --------------------  --------------------
shoulder_pan   0.03949       2.99 [2.92, 3.07]     0.88 [0.861, 0.897]
shoulder_lift  0.03918       3.32 [3.26, 3.39]     0.933 [0.908, 0.956]
elbow_flex     0.03488       3.19 [3.11, 3.27]     0.908 [0.847, 0.963]
wrist_flex     0.02913       3.48 [3.24, 3.79]     1.02 [0.925, 1.12]
wrist_roll     0.02808       3.53 [3.38, 3.73]     1.08 [1.03, 1.14]
```

Per-parameter identifiability (condition number of J^T J 2230.0): marginal/conditional std ratio = sqrt(VIF); >= 10 means only a combination with other parameters is identified.

```
parameter                    value    95% CI            std ratio  identified alone
---------------------------  -------  ----------------  ---------  ----------------
kp[shoulder_pan]             13.93    [13.3, 14.7]      10.7       NO
kv[shoulder_pan]             0.7057   [0.65, 0.764]     9.89       yes
frictionloss[shoulder_pan]   0.0808   [0.072, 0.0901]   1.77       yes
kp[shoulder_lift]            17.07    [16.5, 17.7]      2.69       yes
kv[shoulder_lift]            0.9263   [0.865, 0.987]    2.81       yes
frictionloss[shoulder_lift]  0.349    [0.321, 0.381]    1.47       yes
kp[elbow_flex]               14.01    [13.3, 14.7]      2.22       yes
kv[elbow_flex]               0.6693   [0.558, 0.776]    1.81       yes
frictionloss[elbow_flex]     0.328    [0.304, 0.354]    1.63       yes
kp[wrist_flex]               13.93    [12.1, 16.5]      6.9        yes
kv[wrist_flex]               0.7033   [0.498, 0.955]    6.31       yes
frictionloss[wrist_flex]     0.1079   [0.0916, 0.125]   1.64       yes
kp[wrist_roll]               13.78    [12.7, 15.4]      11         NO
kv[wrist_roll]               0.7373   [0.628, 0.894]    10.4       NO
frictionloss[wrist_roll]     0.06496  [0.0587, 0.0724]  1.57       yes
```

Posterior correlations |r| > 0.95: kp[wrist_roll] ~ kv[wrist_roll] (+0.992); kp[shoulder_pan] ~ kv[shoulder_pan] (+0.991); kp[wrist_flex] ~ kv[wrist_flex] (+0.977)

Weakest directions (relative eigenvalue: top loadings): 0.00045: kp[wrist_roll] -0.96, kv[wrist_roll] -0.26, frictionloss[wrist_roll] -0.11, kp[shoulder_pan] +0.00; 0.00045: kp[shoulder_pan] +0.96, kv[shoulder_pan] +0.25, frictionloss[shoulder_pan] +0.14, kp[wrist_flex] +0.00; 0.00096: kp[wrist_flex] -0.95, kv[wrist_flex] -0.25, frictionloss[wrist_flex] -0.18, kp[elbow_flex] +0.00

Physics-free baseline (fitted on the same fit episodes): y[t+1] = y[t] + alpha*(a[t-d] + b - y[t]), y[0] = x[0], per arm joint; alpha [0.4, 0.54, 0.24, 0.28, 0.28], delay [1, 2, 0, 0, 0] frames, bias [-0.0962, 1.2011, 1.6176, 0.2478, -0.0026] deg.

## Mapping audit

Sign checks (1st-99th percentile of FIT-episode states vs MJCF range):

```
joint          recorded p1..p99 deg  MJCF range deg     shift (doc sign)  shift (flipped)  decision
-------------  --------------------  -----------------  ----------------  ---------------  ---------------------------------------------------------------------------
shoulder_pan   [-30.59, 76.64]       [-110.0, 110.0]    0.0               0.0              documented sign (flipped sign would also fit: sign not identified by range)
shoulder_lift  [-68.86, 59.19]       [-100.0, 100.0]    0.0               0.0              documented sign (flipped sign would also fit: sign not identified by range)
elbow_flex     [-60.5, 64.73]        [-96.83, 96.83]    0.0               0.0              documented sign (flipped sign would also fit: sign not identified by range)
wrist_flex     [28.34, 100.06]       [-95.0, 95.0]      5.06              5.06             documented sign (flipped sign would also fit: sign not identified by range)
wrist_roll     [-45.04, 111.49]      [-157.21, 162.79]  0.0               0.0              documented sign (flipped sign would also fit: sign not identified by range)

same rule on other subsets (robustness): all_episodes: signs [1, 1, 1, 1, 1], accepted; heldout_only: signs [1, 1, 1, 1, 1], accepted -> agrees
released stock limits (crossed by fit episodes): {'shoulder_lift': {'lower': True, 'upper': False}, 'wrist_flex': {'lower': False, 'upper': True}}
```

Forward-kinematics plausibility under the shipped mapping (evidence, not a gate; assumes the base sits on the work surface):

```
gripper lowest point minus base lowest point (m): {'p1': 0.016, 'p5': 0.027, 'p50': 0.088, 'min': 0.005}; frames > 2 cm below the base: 0.0
frames within 1 deg of a stock MJCF limit: {'shoulder_pan': 0.0, 'shoulder_lift': 0.0001, 'elbow_flex': 0.0052, 'wrist_flex': 0.0139, 'wrist_roll': 0.0}
frames beyond a stock MJCF limit: {'shoulder_pan': 0.0, 'shoulder_lift': 0.0065, 'elbow_flex': 0.0, 'wrist_flex': 0.0304, 'wrist_roll': 0.0}
```

Gravity sag on real static frames (middle 80% of each episode, gripper >= 3 cm above the base plane): centred correlation between the servo's static error and the twin's gravity torque at the mapped pose, and the implied static stiffness (centred slope). Positive supports the mapping. Evidence, not a gate.

```
joint          corr [CI] verdict                                                                                          power (gravity std, n)  implied static K N m/rad  fitted kp
-------------  ---------------------------------------------------------------------------------------------------------  ----------------------  ------------------------  ---------
shoulder_pan   not testable (gravity torque ~constant over the selected static poses; gravity std 0.0 N m, 547 frames)                                                      13.9
shoulder_lift  +0.01 [-0.42, +0.30] inconclusive                                                                          0.1884 N m, 547 fr      n/a                       17.1
elbow_flex     +0.30 [-0.02, +0.63] inconclusive                                                                          0.0378 N m, 547 fr      n/a                       14
wrist_flex     +0.13 [-0.19, +0.46] inconclusive                                                                          0.0382 N m, 547 fr      n/a                       13.9
wrist_roll     not testable (gravity torque ~constant over the selected static poses; gravity std 0.002 N m, 547 frames)                                                    13.8
static frames: 561 (14 excluded as possible table contact) from 36 fit episodes
```

## Method

- Recording convention (lerobot-motorsbus): Current LeRobot (record_loop, `*.pos` names): x[t] is READ first (robot.get_observation), then the leader or policy is read and a[t] is SENT, so x[t] cannot reflect a[t] (observe-then-act).
- Replay: Replay (identical for both conventions): q_sim[0]=x[0] (zero velocity); for t=0..T-2 apply ctrl=a[t-d] (d = fitted integer command delay, stock d=0) for the whole frame, step `substeps` physics steps (timestep set so substeps*timestep = 1/fps exactly), record q_sim[t+1]; sim and real are compared at the same index t=1..T-1. The real sub-frame send-to-read offset (legacy: a[t] sent a few ms BEFORE x[t] is read; current: a[t] sent a few ms AFTER) is not modelled; it is absorbed by the fitted dynamics/delay, and it shifts lags between the two conventions by a fraction of a frame in opposite directions.
- Lag: lag = argmin_L Var(a[t] - y[t+L]) over a fixed window t in [0, T-10), parabolic sub-frame refinement; y = real or sim state. Includes the 1-frame sampling offset: in the replay and in observe-then-act (current LeRobot) recordings an instantaneous actuator measures 1.0 frame; in act-then-observe (legacy) recordings it would measure ~0, and a realistic servo measures its delay minus the few-ms write-to-read gap. Lags are therefore directly comparable between sim and real within one dataset, and only approximately (fraction of a frame) across codebases. Also reported in ms, since datasets differ in fps. Joints with command std < 1 deg in an episode are skipped.
- Units: LeRobot MotorNormMode.DEGREES (tick = 360/4095 units verified on every arm joint) (decided on the fit episodes; held-out episodes agree). Mapping to MJCF: q = sign*deg2rad(x) + deg2rad(offset); MJCF derived from TheRobotStudio so101_new_calib.xml, whose zero is the LeRobot 'middle of range' calibration pose; nominal offsets 0, documented signs +1 (checked per dataset against the recorded range of motion, mapping_checks).
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
- info.json robot_type is the generic 'so_follower' (LeRobot's shared SO-100/SO-101 class); the twin (robotstudio_so101) was chosen from the dataset name/card.
- Stock MJCF limits crossed by the fit episodes and released in the aligned/calibrated twins: shoulder_lift lower, wrist_flex upper. The stock twin is held at those limits (counted as stock-twin error).
- Not identified individually (marginal/conditional std ratio >= 10): kp[shoulder_pan], kp[wrist_roll], kv[wrist_roll]. Only combinations of them are constrained by the data (see identifiability); individual values are not meaningful.
- future: final-pose (static) gap is larger for the calibrated twin than for stock on shoulder_lift by point estimate; CIs separate on shoulder_lift.

## Provenance and reproduction

```
dataset        cagataydev/so101-tic-tac-toe @ b9a751f9641e42294fb57222bbf8f25c8fa3250f (requested b9a751f9641e42294fb57222bbf8f25c8fa3250f)
               LeRobot v3.0, robot_type so_follower, 30 fps, 200 episodes loaded (repo: 210), 0 dropped
data files     data/chunk-000/file-000.parquet (0bdff48c5bb2), data/chunk-000/file-001.parquet (4db7caf46d5b), data/chunk-000/file-002.parquet (f7ca4e26c4b3), ... (21 files)
twin           robotstudio_so101 (so101.xml) from https://github.com/google-deepmind/mujoco_menagerie @ b0655057a9df2abe39ea7fc989914ba6f248301c
               dir sha256 6c00120339c328b1..., timestep 0.005 -> 0.0047619 s x 7 substeps/frame, contacts disabled
software       mujoco 3.17.0, numpy 2.5.4, scipy 1.18.1, python 3.13.18, meatspace_lab 2.0.0 (code sha256 924eb3d8364be665...)
hardware       x86_64 Intel(R) Xeon(R) Processor @ 2.80GHz; OpenBLAS kernel numpy: SkylakeX; scipy: SkylakeX
report         schema meatspace.twin-gap-report/v2
               results sha256 3c7956b3875613653918d55e1c35b6ea1109727d7e07ba769cea47f5b651fbd0  (numbers only; any interpreter/CPU)
               content sha256 70b28ba4769f67f99c92fb67216beb8d27e492847a1d6a990b71042191551e7f  (numbers + environment above)
```

Reproduce (from `lab/`, see README) into a scratch directory and compare:

```
python -m meatspace_lab report --dataset cagataydev/so101-tic-tac-toe --revision b9a751f9641e42294fb57222bbf8f25c8fa3250f \
    --twin .cache/menagerie/robotstudio_so101 --out /tmp/repro/ --max-episodes 200
python -m meatspace_lab verify reports/cagataydev__so101-tic-tac-toe/report.json /tmp/repro/report.json
```
