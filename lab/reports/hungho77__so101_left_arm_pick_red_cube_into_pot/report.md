# Twin Gap Report: hungho77/so101_left_arm_pick_red_cube_into_pot x robotstudio_so101

```
HELD-OUT sim-vs-real joint RMSE, mean of 5 arm joints, deg  [95% bootstrap CI over episodes]
change = calibrated/reference - 1 (negative = better), paired by episode

FUTURE BLOCK (10 episodes)
  stock twin             3.02 [2.90, 3.13]
  aligned stock          1.34 [1.20, 1.52]   (stock dynamics + delay + released limits)
  lag-filter baseline    0.77 [0.66, 0.93]   (no physics: 3 params/joint)
  calibrated twin        0.47 [0.36, 0.64]
  change vs stock        -84% [-88, -79]   per-episode median -87% (range -89% .. -67%); 10/10 improved
  change vs baseline     -39% [-46, -31]   10/10 improved
  verdict                closes most of the gap (-84% [-88, -79] vs stock, residual 0.47 deg); calibrated twin beats the physics-free lag filter (-39% [-46, -31])

INTERLEAVED HELD-OUT (10 episodes)
  stock twin             2.85 [2.68, 3.04]
  aligned stock          1.28 [1.17, 1.45]   (stock dynamics + delay + released limits)
  lag-filter baseline    0.73 [0.64, 0.88]   (no physics: 3 params/joint)
  calibrated twin        0.45 [0.36, 0.60]
  change vs stock        -84% [-87, -80]   per-episode median -86% (range -88% .. -69%); 10/10 improved
  change vs baseline     -39% [-44, -32]   10/10 improved
  verdict                closes most of the gap (-84% [-87, -80] vs stock, residual 0.45 deg); calibrated twin beats the physics-free lag filter (-39% [-44, -32])

command->state lag, interleaved held-out, ms per joint (real / stock / calibrated):
  shoulder_pan 126/25/126  shoulder_lift 124/25/125  elbow_flex 129/25/133  wrist_flex 112/26/114  wrist_roll 117/26/127
  max |twin - real| over joints: stock 104.5 ms, calibrated 9.3 ms
```

![future-block held-out episode](heldout_episode.svg)

![per-joint RMSE, future block](rmse_by_joint_future.svg)

![per-joint RMSE, interleaved held-out](rmse_by_joint.svg)

## Future block (held out: the last 20% of episodes by index, recorded after every fit episode), n = 10

Per joint, mean over episodes [95% CI]. Degrees. Change = calibrated vs stock, negative = better.

```
sim-vs-real RMSE  stock                         aligned stock      baseline           calibrated                    change vs stock  vs baseline
----------------  ----------------------------  -----------------  -----------------  ----------------------------  ---------------  ---------------
shoulder_pan      1.94 [1.69, 2.23] (p90 2.51)  0.46 [0.43, 0.49]  0.39 [0.36, 0.41]  0.28 [0.26, 0.30] (p90 0.32)  -86% [-87, -84]  -28% [-34, -21]
shoulder_lift     4.03 [3.84, 4.28] (p90 4.36)  1.87 [1.78, 1.94]  0.98 [0.91, 1.03]  0.47 [0.44, 0.51] (p90 0.54)  -88% [-89, -88]  -52% [-56, -47]
elbow_flex        4.35 [4.11, 4.62] (p90 4.81)  2.63 [2.53, 2.73]  1.04 [0.99, 1.09]  0.38 [0.36, 0.40] (p90 0.42)  -91% [-92, -90]  -63% [-65, -62]
wrist_flex        1.96 [1.85, 2.06] (p90 2.15)  0.61 [0.59, 0.63]  0.35 [0.33, 0.36]  0.20 [0.18, 0.21] (p90 0.23)  -90% [-91, -89]  -43% [-47, -39]
wrist_roll        2.83 [2.15, 3.55] (p90 4.14)  1.11 [0.51, 1.94]  1.09 [0.53, 1.88]  1.02 [0.46, 1.80] (p90 2.37)  -64% [-81, -45]  -7% [-20, -1]
arm_mean          3.02 [2.90, 3.13] (p90 3.18)  1.34 [1.20, 1.52]  0.77 [0.66, 0.93]  0.47 [0.36, 0.64] (p90 0.73)  -84% [-88, -79]  -39% [-46, -31]

static-frame RMSE (quasi-static holds)  stock              baseline           calibrated         episodes with >= 10 static frames
--------------------------------------  -----------------  -----------------  -----------------  ---------------------------------
shoulder_pan                            0.58 [0.43, 0.73]  0.43 [0.31, 0.54]  0.27 [0.20, 0.34]  7
shoulder_lift                           0.81 [0.63, 1.00]  0.94 [0.81, 1.05]  0.60 [0.50, 0.73]  7
elbow_flex                              2.93 [2.28, 3.49]  1.39 [1.16, 1.67]  0.37 [0.29, 0.44]  7
wrist_flex                              0.47 [0.36, 0.59]  0.33 [0.25, 0.39]  0.18 [0.13, 0.25]  7
wrist_roll                              1.50 [0.35, 3.64]  1.52 [0.38, 3.58]  1.36 [0.24, 3.48]  7
arm_mean                                1.26 [0.91, 1.74]  0.92 [0.67, 1.33]  0.56 [0.33, 0.97]  7

command tracking RMSE  real robot         stock twin         calibrated twin
---------------------  -----------------  -----------------  -----------------
shoulder_pan           1.78 [1.56, 2.04]  0.18 [0.16, 0.21]  1.76 [1.56, 1.99]
shoulder_lift          3.73 [3.56, 3.97]  0.96 [0.90, 1.04]  3.75 [3.60, 3.92]
elbow_flex             4.16 [3.94, 4.39]  0.31 [0.30, 0.34]  4.19 [4.01, 4.39]
wrist_flex             1.79 [1.69, 1.87]  0.37 [0.22, 0.55]  1.81 [1.72, 1.90]
wrist_roll             2.65 [1.99, 3.37]  0.22 [0.18, 0.25]  2.41 [2.02, 2.71]

lag (frames)   real               stock              calibrated         real ms  stock ms  calib ms
-------------  -----------------  -----------------  -----------------  -------  --------  --------
shoulder_pan   3.78 [3.75, 3.80]  0.75 [0.74, 0.76]  3.80 [3.73, 3.85]  126      25        127
shoulder_lift  3.71 [3.69, 3.73]  0.74 [0.74, 0.75]  3.73 [3.68, 3.77]  124      25        124
elbow_flex     3.86 [3.83, 3.89]  0.74 [0.74, 0.74]  3.94 [3.88, 3.99]  129      25        131
wrist_flex     3.36 [3.35, 3.38]  0.78 [0.77, 0.78]  3.44 [3.42, 3.46]  112      26        115
wrist_roll     3.59 [3.52, 3.66]  0.78 [0.77, 0.79]  3.74 [3.66, 3.86]  120      26        125

final-pose gap  stock              calibrated
--------------  -----------------  -----------------
shoulder_pan    0.38 [0.28, 0.47]  0.15 [0.09, 0.22]
shoulder_lift   2.52 [2.45, 2.57]  0.49 [0.41, 0.56]
elbow_flex      0.34 [0.28, 0.39]  0.42 [0.38, 0.47]
wrist_flex      0.34 [0.19, 0.52]  0.12 [0.08, 0.16]
wrist_roll      0.22 [0.11, 0.39]  0.29 [0.15, 0.44]

fraction of states outside the fit episodes' range of motion +-2 deg: {'shoulder_pan': 0.03, 'shoulder_lift': 0.0, 'elbow_flex': 0.0047, 'wrist_flex': 0.0, 'wrist_roll': 0.0}
fraction of states outside the twin's joint range: stock {'shoulder_pan': 0.0, 'shoulder_lift': 0.0947, 'elbow_flex': 0.0107, 'wrist_flex': 0.0218, 'wrist_roll': 0.0}; calibrated {'shoulder_pan': 0.0, 'shoulder_lift': 0.0, 'elbow_flex': 0.0, 'wrist_flex': 0.0, 'wrist_roll': 0.0}
```

## Interleaved held-out (random episodes from the same period as the fit episodes), n = 10

Per joint, mean over episodes [95% CI]. Degrees. Change = calibrated vs stock, negative = better.

```
sim-vs-real RMSE  stock                         aligned stock      baseline           calibrated                    change vs stock  vs baseline
----------------  ----------------------------  -----------------  -----------------  ----------------------------  ---------------  ---------------
shoulder_pan      1.88 [1.68, 2.08] (p90 2.26)  0.47 [0.44, 0.50]  0.38 [0.35, 0.40]  0.26 [0.24, 0.28] (p90 0.30)  -86% [-87, -85]  -30% [-37, -22]
shoulder_lift     3.89 [3.66, 4.15] (p90 4.39)  1.83 [1.74, 1.90]  1.01 [0.98, 1.04]  0.48 [0.46, 0.49] (p90 0.50)  -88% [-88, -87]  -53% [-55, -51]
elbow_flex        4.21 [3.88, 4.55] (p90 4.97)  2.53 [2.41, 2.64]  1.04 [0.97, 1.11]  0.40 [0.39, 0.42] (p90 0.43)  -91% [-91, -89]  -62% [-64, -59]
wrist_flex        2.11 [1.81, 2.38] (p90 2.75)  0.62 [0.60, 0.64]  0.32 [0.30, 0.33]  0.21 [0.19, 0.22] (p90 0.25)  -90% [-91, -89]  -34% [-40, -27]
wrist_roll        2.15 [1.57, 2.94] (p90 3.15)  0.93 [0.45, 1.72]  0.91 [0.47, 1.65]  0.89 [0.46, 1.63] (p90 1.40)  -59% [-74, -42]  -2% [-6, +2]
arm_mean          2.85 [2.68, 3.04] (p90 3.18)  1.28 [1.17, 1.45]  0.73 [0.64, 0.88]  0.45 [0.36, 0.60] (p90 0.54)  -84% [-87, -80]  -39% [-44, -32]

static-frame RMSE (quasi-static holds)  stock              baseline           calibrated         episodes with >= 10 static frames
--------------------------------------  -----------------  -----------------  -----------------  ---------------------------------
shoulder_pan                            0.52 [0.41, 0.66]  0.39 [0.33, 0.47]  0.22 [0.19, 0.27]  8
shoulder_lift                           0.92 [0.74, 1.16]  0.98 [0.83, 1.11]  0.46 [0.36, 0.56]  8
elbow_flex                              2.67 [2.34, 2.99]  1.16 [0.96, 1.35]  0.23 [0.17, 0.28]  8
wrist_flex                              0.44 [0.34, 0.52]  0.29 [0.25, 0.32]  0.12 [0.10, 0.14]  8
wrist_roll                              1.13 [0.31, 2.60]  1.18 [0.43, 2.58]  1.09 [0.35, 2.46]  8
arm_mean                                1.14 [0.94, 1.47]  0.80 [0.63, 1.06]  0.42 [0.27, 0.71]  8

command tracking RMSE  real robot         stock twin         calibrated twin
---------------------  -----------------  -----------------  -----------------
shoulder_pan           1.73 [1.55, 1.91]  0.17 [0.15, 0.19]  1.71 [1.56, 1.85]
shoulder_lift          3.60 [3.39, 3.84]  0.94 [0.90, 0.98]  3.59 [3.40, 3.81]
elbow_flex             4.03 [3.73, 4.33]  0.31 [0.27, 0.35]  4.10 [3.84, 4.35]
wrist_flex             1.92 [1.65, 2.16]  0.37 [0.23, 0.54]  1.93 [1.70, 2.16]
wrist_roll             2.02 [1.45, 2.81]  0.17 [0.14, 0.20]  1.94 [1.66, 2.23]

lag (frames)   real               stock              calibrated         real ms  stock ms  calib ms
-------------  -----------------  -----------------  -----------------  -------  --------  --------
shoulder_pan   3.77 [3.75, 3.78]  0.74 [0.74, 0.75]  3.79 [3.73, 3.86]  126      25        126
shoulder_lift  3.72 [3.69, 3.75]  0.74 [0.74, 0.75]  3.76 [3.71, 3.82]  124      25        125
elbow_flex     3.87 [3.85, 3.90]  0.74 [0.74, 0.75]  3.98 [3.90, 4.07]  129      25        133
wrist_flex     3.36 [3.31, 3.39]  0.78 [0.77, 0.78]  3.42 [3.39, 3.44]  112      26        114
wrist_roll     3.52 [3.45, 3.59]  0.78 [0.77, 0.79]  3.80 [3.71, 3.88]  117      26        127

final-pose gap  stock              calibrated
--------------  -----------------  -----------------
shoulder_pan    0.37 [0.27, 0.47]  0.20 [0.14, 0.25]
shoulder_lift   2.48 [2.41, 2.54]  0.44 [0.34, 0.53]
elbow_flex      0.32 [0.23, 0.41]  0.46 [0.37, 0.55]
wrist_flex      0.40 [0.25, 0.55]  0.11 [0.07, 0.14]
wrist_roll      0.13 [0.08, 0.18]  0.19 [0.09, 0.28]

fraction of states outside the fit episodes' range of motion +-2 deg: {'shoulder_pan': 0.0193, 'shoulder_lift': 0.0033, 'elbow_flex': 0.0, 'wrist_flex': 0.0, 'wrist_roll': 0.0}
fraction of states outside the twin's joint range: stock {'shoulder_pan': 0.0, 'shoulder_lift': 0.0992, 'elbow_flex': 0.0044, 'wrist_flex': 0.0113, 'wrist_roll': 0.0}; calibrated {'shoulder_pan': 0.0, 'shoulder_lift': 0.0, 'elbow_flex': 0.0, 'wrist_flex': 0.0, 'wrist_roll': 0.0}
```

## Fit episodes (used by the fit), n = 30

Per joint, mean over episodes [95% CI]. Degrees. Change = calibrated vs stock, negative = better.

```
sim-vs-real RMSE  stock                         aligned stock      baseline           calibrated                    change vs stock  vs baseline
----------------  ----------------------------  -----------------  -----------------  ----------------------------  ---------------  ---------------
shoulder_pan      1.84 [1.65, 2.04] (p90 2.51)  0.48 [0.46, 0.49]  0.38 [0.37, 0.39]  0.27 [0.25, 0.28] (p90 0.31)  -85% [-87, -84]  -29% [-33, -25]
shoulder_lift     3.82 [3.73, 3.91] (p90 4.14)  1.81 [1.74, 1.87]  0.99 [0.97, 1.02]  0.47 [0.46, 0.49] (p90 0.54)  -88% [-88, -87]  -53% [-55, -50]
elbow_flex        4.20 [4.01, 4.38] (p90 4.78)  2.61 [2.54, 2.67]  1.09 [1.05, 1.13]  0.41 [0.40, 0.43] (p90 0.48)  -90% [-91, -89]  -62% [-63, -60]
wrist_flex        2.17 [2.00, 2.33] (p90 2.67)  0.64 [0.62, 0.66]  0.33 [0.32, 0.35]  0.21 [0.20, 0.23] (p90 0.25)  -90% [-91, -89]  -36% [-40, -32]
wrist_roll        2.65 [2.02, 3.34] (p90 4.89)  1.51 [0.86, 2.26]  1.49 [0.86, 2.20]  1.45 [0.83, 2.17] (p90 4.23)  -45% [-61, -34]  -3% [-7, -0]
arm_mean          2.93 [2.80, 3.08] (p90 3.50)  1.41 [1.28, 1.57]  0.86 [0.73, 1.01]  0.56 [0.44, 0.71] (p90 1.12)  -81% [-84, -77]  -34% [-40, -29]

static-frame RMSE (quasi-static holds)  stock              baseline           calibrated         episodes with >= 10 static frames
--------------------------------------  -----------------  -----------------  -----------------  ---------------------------------
shoulder_pan                            0.58 [0.50, 0.65]  0.43 [0.39, 0.47]  0.27 [0.24, 0.30]  24
shoulder_lift                           1.02 [0.87, 1.21]  0.87 [0.77, 0.96]  0.52 [0.44, 0.61]  24
elbow_flex                              3.02 [2.75, 3.25]  1.19 [1.04, 1.35]  0.39 [0.30, 0.49]  24
wrist_flex                              0.51 [0.46, 0.55]  0.34 [0.30, 0.38]  0.20 [0.17, 0.24]  24
wrist_roll                              0.91 [0.35, 1.73]  1.02 [0.48, 1.81]  0.89 [0.35, 1.68]  24
arm_mean                                1.21 [1.07, 1.38]  0.77 [0.65, 0.93]  0.45 [0.34, 0.61]  24

command tracking RMSE  real robot         stock twin         calibrated twin
---------------------  -----------------  -----------------  -----------------
shoulder_pan           1.69 [1.53, 1.87]  0.17 [0.15, 0.19]  1.67 [1.53, 1.84]
shoulder_lift          3.53 [3.44, 3.61]  0.96 [0.91, 1.02]  3.52 [3.43, 3.60]
elbow_flex             4.03 [3.85, 4.19]  0.31 [0.29, 0.33]  4.04 [3.89, 4.18]
wrist_flex             1.97 [1.82, 2.12]  0.36 [0.28, 0.46]  1.97 [1.83, 2.10]
wrist_roll             2.52 [1.90, 3.22]  0.18 [0.15, 0.20]  1.99 [1.74, 2.22]

lag (frames)   real               stock              calibrated         real ms  stock ms  calib ms
-------------  -----------------  -----------------  -----------------  -------  --------  --------
shoulder_pan   3.76 [3.74, 3.79]  0.75 [0.75, 0.76]  3.82 [3.77, 3.86]  125      25        127
shoulder_lift  3.73 [3.72, 3.74]  0.74 [0.74, 0.75]  3.75 [3.73, 3.77]  124      25        125
elbow_flex     3.89 [3.87, 3.90]  0.74 [0.74, 0.75]  3.96 [3.91, 4.01]  130      25        132
wrist_flex     3.36 [3.35, 3.38]  0.77 [0.77, 0.78]  3.41 [3.39, 3.43]  112      26        114
wrist_roll     3.57 [3.49, 3.66]  0.78 [0.77, 0.79]  3.83 [3.75, 3.92]  119      26        128

final-pose gap  stock              calibrated
--------------  -----------------  -----------------
shoulder_pan    0.37 [0.27, 0.48]  0.11 [0.09, 0.14]
shoulder_lift   2.22 [1.97, 2.43]  0.40 [0.34, 0.47]
elbow_flex      0.56 [0.40, 0.75]  0.50 [0.45, 0.55]
wrist_flex      0.37 [0.27, 0.47]  0.12 [0.09, 0.16]
wrist_roll      0.31 [0.19, 0.44]  0.35 [0.24, 0.48]
```

## Calibrated twin

Package `calibrated_twin.json`, sha256 `ae932b571576cc4f8cdf4d5174de0d8b83af72f2eba0a390d958bf7b09b20df6`.
Fitted: kp[shoulder_pan], kv[shoulder_pan], frictionloss[shoulder_pan], kp[shoulder_lift], kv[shoulder_lift], frictionloss[shoulder_lift], kp[elbow_flex], kv[elbow_flex], frictionloss[elbow_flex], kp[wrist_flex], kv[wrist_flex], frictionloss[wrist_flex], kp[wrist_roll], kv[wrist_roll], frictionloss[wrist_roll]; command delay 0 frame(s) (screened train MSE by delay, deg^2: {'0': 0.87698, '1': 0.96966, '2': 1.28291, '3': 1.83523, '4': 3.88247, '5': 6.20066}). Train MSE 1.24979 deg^2. Optimizer: converged (`ftol` termination condition is satisfied.). At a bound: none.

```
joint          kp N m/rad      kv N m s/rad   frictionloss N m  armature kg m^2  zero offset deg
-------------  --------------  -------------  ----------------  ---------------  -----------------
shoulder_pan   998.2 -> 10.1   2.73 -> 0.356  0.052 -> 0.103    0.028 (fixed)    +0.0 (documented)
shoulder_lift  998.2 -> 13.64  2.73 -> 0.528  0.052 -> 0.301    0.028 (fixed)    +0.0 (documented)
elbow_flex     998.2 -> 10.81  2.73 -> 0.336  0.052 -> 0.317    0.028 (fixed)    +0.0 (documented)
wrist_flex     998.2 -> 13.05  2.73 -> 0.59   0.052 -> 0.0923   0.028 (fixed)    +0.0 (documented)
wrist_roll     998.2 -> 17.99  2.73 -> 1.11   0.052 -> 0.287    0.028 (fixed)    +0.0 (documented)
```

Identifiable servo combinations (the individual gains are not the claim): natural frequency sqrt(kp/I_eff) and damping ratio (kv+damping)/(2 sqrt(kp I_eff)), I_eff = joint-space inertia at the median pose incl. armature; 95% CI from a linearised episode bootstrap of the fit.

```
joint          I_eff kg m^2  natural freq Hz [CI]  damping ratio [CI]
-------------  ------------  --------------------  --------------------
shoulder_pan   0.03946       2.55 [2.5, 2.6]       0.757 [0.739, 0.772]
shoulder_lift  0.0384        3 [2.98, 3.02]        0.779 [0.766, 0.791]
elbow_flex     0.03526       2.79 [2.77, 2.8]      0.758 [0.744, 0.77]
wrist_flex     0.02913       3.37 [3.32, 3.41]     0.965 [0.941, 0.987]
wrist_roll     0.02808       4.03 [2.9, 5.83]      1.2 [0.613, 1.45]
```

Per-parameter identifiability (condition number of J^T J 10200.0): marginal/conditional std ratio = sqrt(VIF); >= 10 means only a combination with other parameters is identified.

```
parameter                    value    95% CI           std ratio  identified alone
---------------------------  -------  ---------------  ---------  ----------------
kp[shoulder_pan]             10.1     [9.71, 10.5]     7.72       yes
kv[shoulder_pan]             0.3563   [0.327, 0.385]   6.63       yes
frictionloss[shoulder_pan]   0.1029   [0.0952, 0.111]  2.09       yes
kp[shoulder_lift]            13.64    [13.5, 13.8]     2.2        yes
kv[shoulder_lift]            0.5279   [0.506, 0.549]   2.52       yes
frictionloss[shoulder_lift]  0.3012   [0.289, 0.314]   1.56       yes
kp[elbow_flex]               10.81    [10.7, 10.9]     2.31       yes
kv[elbow_flex]               0.3363   [0.317, 0.352]   1.78       yes
frictionloss[elbow_flex]     0.317    [0.307, 0.327]   1.83       yes
kp[wrist_flex]               13.05    [12.7, 13.4]     6.43       yes
kv[wrist_flex]               0.5903   [0.545, 0.631]   5.85       yes
frictionloss[wrist_flex]     0.09229  [0.088, 0.0965]  1.64       yes
kp[wrist_roll]               17.99    [9.32, 37.6]     13.2       NO
kv[wrist_roll]               1.111    [0, 2.38]        10.5       NO
frictionloss[wrist_roll]     0.2874   [0.0679, 0.54]   4.02       yes
```

Posterior correlations |r| > 0.95: kp[wrist_roll] ~ kv[wrist_roll] (+0.992); kp[shoulder_pan] ~ kv[shoulder_pan] (+0.981); kp[wrist_flex] ~ kv[wrist_flex] (+0.973)

Weakest directions (relative eigenvalue: top loadings): 9.8e-05: kp[wrist_roll] -0.81, frictionloss[wrist_roll] -0.53, kv[wrist_roll] -0.27, kp[shoulder_pan] +0.00; 0.00029: kp[shoulder_pan] +0.97, kv[shoulder_pan] +0.18, frictionloss[shoulder_pan] +0.17, kp[wrist_flex] +0.00; 0.00053: kp[wrist_flex] -0.96, kv[wrist_flex] -0.22, frictionloss[wrist_flex] -0.18, kp[elbow_flex] +0.00

Physics-free baseline (fitted on the same fit episodes): y[t+1] = y[t] + alpha*(a[t-d] + b - y[t]), y[0] = x[0], per arm joint; alpha [0.36, 0.58, 0.26, 0.4, 0.26], delay [1, 2, 0, 1, 0] frames, bias [-0.2669, 1.5793, 2.4085, 0.3138, 0.3472] deg.

## Mapping audit

Sign checks (1st-99th percentile of FIT-episode states vs MJCF range):

```
joint          recorded p1..p99 deg  MJCF range deg     shift (doc sign)  shift (flipped)  decision
-------------  --------------------  -----------------  ----------------  ---------------  ---------------------------------------------------------------------------
shoulder_pan   [-48.3, 36.95]        [-110.0, 110.0]    0.0               0.0              documented sign (flipped sign would also fit: sign not identified by range)
shoulder_lift  [-102.57, 43.42]      [-100.0, 100.0]    2.57              2.57             documented sign (flipped sign would also fit: sign not identified by range)
elbow_flex     [-56.42, 97.43]       [-96.83, 96.83]    0.6               0.6              documented sign (flipped sign would also fit: sign not identified by range)
wrist_flex     [21.58, 96.37]        [-95.0, 95.0]      1.37              1.37             documented sign (flipped sign would also fit: sign not identified by range)
wrist_roll     [-91.89, 47.77]       [-157.21, 162.79]  0.0               0.0              documented sign (flipped sign would also fit: sign not identified by range)

same rule on other subsets (robustness): all_episodes: signs [1, 1, 1, 1, 1], accepted; heldout_only: signs [1, 1, 1, 1, 1], accepted -> agrees
released stock limits (crossed by fit episodes): {'shoulder_lift': {'lower': True, 'upper': False}, 'elbow_flex': {'lower': False, 'upper': True}, 'wrist_flex': {'lower': False, 'upper': True}}
```

Forward-kinematics plausibility under the shipped mapping (evidence, not a gate; assumes the base sits on the work surface):

```
gripper lowest point minus base lowest point (m): {'p1': 0.025, 'p5': 0.03, 'p50': 0.092, 'min': 0.007}; frames > 2 cm below the base: 0.0
frames within 1 deg of a stock MJCF limit: {'shoulder_pan': 0.0, 'shoulder_lift': 0.0067, 'elbow_flex': 0.0175, 'wrist_flex': 0.0041, 'wrist_roll': 0.0}
frames beyond a stock MJCF limit: {'shoulder_pan': 0.0, 'shoulder_lift': 0.0996, 'elbow_flex': 0.0045, 'wrist_flex': 0.0124, 'wrist_roll': 0.0}
```

Gravity sag on real static frames (middle 80% of each episode, gripper >= 3 cm above the base plane): centred correlation between the servo's static error and the twin's gravity torque at the mapped pose, and the implied static stiffness (centred slope). Positive supports the mapping. Evidence, not a gate.

```
joint          corr [CI] verdict                                                                                           power (gravity std, n)  implied static K N m/rad  fitted kp
-------------  ----------------------------------------------------------------------------------------------------------  ----------------------  ------------------------  ---------
shoulder_pan   not testable (gravity torque ~constant over the selected static poses; gravity std 0.0 N m, 587 frames)                                                       10.1
shoulder_lift  +0.47 [+0.10, +0.87] positive                                                                               0.1738 N m, 587 fr      37.3 [19.4, 116]          13.6
elbow_flex     +0.41 [+0.16, +0.62] positive                                                                               0.0603 N m, 587 fr      7.04 [4.93, 16.7]         10.8
wrist_flex     +0.72 [+0.59, +0.83] positive                                                                               0.0464 N m, 587 fr      10.4 [8.8, 12.5]          13.1
wrist_roll     not testable (gravity torque ~constant over the selected static poses; gravity std 0.0024 N m, 587 frames)                                                    18
static frames: 724 (137 excluded as possible table contact) from 30 fit episodes
```

## Method

- Recording convention (lerobot-motorsbus): Current LeRobot (record_loop, `*.pos` names): x[t] is READ first (robot.get_observation), then the leader or policy is read and a[t] is SENT, so x[t] cannot reflect a[t] (observe-then-act).
- Replay: Replay (identical for both conventions): q_sim[0]=x[0] (zero velocity); for t=0..T-2 apply ctrl=a[t-d] (d = fitted integer command delay, stock d=0) for the whole frame, step `substeps` physics steps (timestep set so substeps*timestep = 1/fps exactly), record q_sim[t+1]; sim and real are compared at the same index t=1..T-1. The real sub-frame send-to-read offset (legacy: a[t] sent a few ms BEFORE x[t] is read; current: a[t] sent a few ms AFTER) is not modelled; it is absorbed by the fitted dynamics/delay, and it shifts lags between the two conventions by a fraction of a frame in opposite directions.
- Lag: lag = argmin_L Var(a[t] - y[t+L]) over a fixed window t in [0, T-10), parabolic sub-frame refinement; y = real or sim state. Includes the 1-frame sampling offset: in the replay and in observe-then-act (current LeRobot) recordings an instantaneous actuator measures 1.0 frame; in act-then-observe (legacy) recordings it would measure ~0, and a realistic servo measures its delay minus the few-ms write-to-read gap. Lags are therefore directly comparable between sim and real within one dataset, and only approximately (fraction of a frame) across codebases. Also reported in ms, since datasets differ in fps. Joints with command std < 1 deg in an episode are skipped.
- Units: LeRobot MotorNormMode.DEGREES (tick = 360/4095 units verified on every arm joint) (decided on the fit episodes; held-out episodes agree). Mapping to MJCF: q = sign*deg2rad(x) + deg2rad(offset); MJCF derived from TheRobotStudio so101_new_calib.xml, whose zero is the LeRobot 'middle of range' calibration pose; nominal offsets 0, documented signs +1 (checked per dataset against the recorded range of motion, mapping_checks).
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
- info.json robot_type is the generic 'so_follower' (LeRobot's shared SO-100/SO-101 class); the twin (robotstudio_so101) was chosen from the dataset name/card.
- Stock MJCF limits crossed by the fit episodes and released in the aligned/calibrated twins: shoulder_lift lower, elbow_flex upper, wrist_flex upper. The stock twin is held at those limits (counted as stock-twin error).
- Not identified individually (marginal/conditional std ratio >= 10): kp[wrist_roll], kv[wrist_roll]. Only combinations of them are constrained by the data (see identifiability); individual values are not meaningful.
- interleaved: final-pose (static) gap is larger for the calibrated twin than for stock on elbow_flex, wrist_roll by point estimate; CIs overlap on all of them.
- future: final-pose (static) gap is larger for the calibrated twin than for stock on elbow_flex, wrist_roll by point estimate; CIs overlap on all of them.

## Provenance and reproduction

```
dataset        hungho77/so101_left_arm_pick_red_cube_into_pot @ 62d3cb12cc705fd39c851833853ec49b2ca20fe4 (requested 62d3cb12cc705fd39c851833853ec49b2ca20fe4)
               LeRobot v3.0, robot_type so_follower, 30 fps, 50 episodes loaded (repo: 50), 0 dropped
data files     data/chunk-000/file-000.parquet (9bec400a37ed)
twin           robotstudio_so101 (so101.xml) from https://github.com/google-deepmind/mujoco_menagerie @ b0655057a9df2abe39ea7fc989914ba6f248301c
               dir sha256 6c00120339c328b1..., timestep 0.005 -> 0.0047619 s x 7 substeps/frame, contacts disabled
software       mujoco 3.17.0, numpy 2.5.4, scipy 1.18.1, python 3.13.18, meatspace_lab 2.0.0 (code sha256 924eb3d8364be665...)
hardware       x86_64 Intel(R) Xeon(R) Processor @ 2.80GHz; OpenBLAS kernel numpy: SkylakeX; scipy: SkylakeX
report         schema meatspace.twin-gap-report/v2
               results sha256 e989e19b28fda0dee5753d14c7c72c284be96e4ece28167679d48f2a43f0e5db  (numbers only; any interpreter/CPU)
               content sha256 9ddea33ac9b0f4d3924aaadf6dfba5ac07c4f13625c36dd1a326b61aa7446330  (numbers + environment above)
```

Reproduce (from `lab/`, see README) into a scratch directory and compare:

```
python -m meatspace_lab report --dataset hungho77/so101_left_arm_pick_red_cube_into_pot --revision 62d3cb12cc705fd39c851833853ec49b2ca20fe4 \
    --twin .cache/menagerie/robotstudio_so101 --out /tmp/repro/ --max-episodes 200
python -m meatspace_lab verify reports/hungho77__so101_left_arm_pick_red_cube_into_pot/report.json /tmp/repro/report.json
```
