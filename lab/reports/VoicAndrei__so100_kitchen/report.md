# Twin Gap Report: VoicAndrei/so100_kitchen x trs_so_arm100

```
HELD-OUT sim-vs-real joint RMSE, mean of 5 arm joints, deg  [95% bootstrap CI over episodes]
change = calibrated/reference - 1 (negative = better), paired by episode

FUTURE BLOCK (40 episodes)
  stock twin             1.98 [1.92, 2.04]
  aligned stock          1.47 [1.41, 1.53]   (stock dynamics + delay + released limits)
  lag-filter baseline    1.25 [1.19, 1.32]   (no physics: 3 params/joint)
  calibrated twin        1.09 [1.03, 1.14]
  change vs stock        -45% [-46, -44]   per-episode median -46% (range -52% .. -36%); 40/40 improved
  change vs baseline     -13% [-14, -12]   40/40 improved
  verdict                closes part of the gap (-45% [-46, -44] vs stock, residual 1.09 deg); calibrated twin beats the physics-free lag filter (-13% [-14, -12])

INTERLEAVED HELD-OUT (120 episodes)
  stock twin             1.86 [1.82, 1.89]
  aligned stock          1.47 [1.44, 1.50]   (stock dynamics + delay + released limits)
  lag-filter baseline    1.29 [1.26, 1.33]   (no physics: 3 params/joint)
  calibrated twin        1.09 [1.06, 1.12]
  change vs stock        -41% [-42, -40]   per-episode median -42% (range -50% .. -14%); 120/120 improved
  change vs baseline     -16% [-16, -15]   120/120 improved
  verdict                closes part of the gap (-41% [-42, -40] vs stock, residual 1.09 deg); calibrated twin beats the physics-free lag filter (-16% [-16, -15])

command->state lag, interleaved held-out, ms per joint (real / stock / calibrated):
  shoulder_pan 147/118/148  shoulder_lift 142/117/142  elbow_flex 155/110/170  wrist_flex 140/107/157  wrist_roll 141/106/140
  max |twin - real| over joints: stock 45.5 ms, calibrated 17.2 ms
```

![future-block held-out episode](heldout_episode.svg)

![per-joint RMSE, future block](rmse_by_joint_future.svg)

![per-joint RMSE, interleaved held-out](rmse_by_joint.svg)

## Future block (held out: the last 20% of episodes by index, recorded after every fit episode), n = 40

Per joint, mean over episodes [95% CI]. Degrees. Change = calibrated vs stock, negative = better.

```
sim-vs-real RMSE  stock                         aligned stock      baseline           calibrated                    change vs stock  vs baseline
----------------  ----------------------------  -----------------  -----------------  ----------------------------  ---------------  ---------------
shoulder_pan      1.35 [1.29, 1.41] (p90 1.61)  0.45 [0.43, 0.47]  0.47 [0.45, 0.49]  0.39 [0.37, 0.41] (p90 0.49)  -71% [-72, -70]  -18% [-21, -15]
shoulder_lift     1.02 [1.00, 1.05] (p90 1.12)  0.60 [0.58, 0.61]  0.54 [0.52, 0.56]  0.43 [0.42, 0.45] (p90 0.51)  -58% [-59, -56]  -20% [-22, -19]
elbow_flex        2.60 [2.52, 2.71] (p90 2.83)  2.04 [1.96, 2.13]  1.34 [1.23, 1.48]  1.12 [1.02, 1.25] (p90 1.28)  -57% [-60, -54]  -17% [-20, -13]
wrist_flex        4.01 [3.75, 4.28] (p90 5.07)  3.76 [3.49, 4.04]  3.41 [3.18, 3.66]  3.18 [2.96, 3.40] (p90 4.11)  -21% [-22, -20]  -7% [-8, -6]
wrist_roll        0.91 [0.86, 0.96] (p90 1.10)  0.51 [0.47, 0.56]  0.49 [0.44, 0.54]  0.32 [0.28, 0.36] (p90 0.52)  -65% [-68, -62]  -36% [-38, -33]
arm_mean          1.98 [1.92, 2.04] (p90 2.24)  1.47 [1.41, 1.53]  1.25 [1.19, 1.32]  1.09 [1.03, 1.14] (p90 1.33)  -45% [-46, -44]  -13% [-14, -12]

static-frame RMSE (quasi-static holds)  stock               baseline           calibrated         episodes with >= 10 static frames
--------------------------------------  ------------------  -----------------  -----------------  ---------------------------------
shoulder_pan                            0.66 [0.57, 0.74]   0.70 [0.62, 0.79]  0.36 [0.32, 0.40]  2
shoulder_lift                           0.34 [0.34, 0.34]   0.59 [0.59, 0.59]  0.21 [0.18, 0.24]  2
elbow_flex                              2.92 [0.61, 5.24]   4.22 [1.98, 6.46]  3.40 [1.33, 5.47]  2
wrist_flex                              7.97 [5.91, 10.04]  7.24 [5.19, 9.30]  6.16 [4.08, 8.24]  2
wrist_roll                              1.53 [1.51, 1.56]   1.43 [1.40, 1.46]  1.05 [1.03, 1.07]  2
arm_mean                                2.69 [2.65, 2.72]   2.84 [2.81, 2.86]  2.24 [2.22, 2.25]  2

command tracking RMSE  real robot         stock twin         calibrated twin
---------------------  -----------------  -----------------  -----------------
shoulder_pan           5.14 [4.96, 5.31]  3.84 [3.71, 3.96]  5.11 [4.94, 5.27]
shoulder_lift          3.65 [3.54, 3.76]  2.73 [2.64, 2.82]  3.54 [3.43, 3.65]
elbow_flex             5.17 [5.00, 5.35]  3.00 [2.89, 3.12]  5.15 [5.01, 5.29]
wrist_flex             6.16 [5.90, 6.41]  3.44 [3.30, 3.58]  5.63 [5.46, 5.81]
wrist_roll             2.48 [2.35, 2.62]  1.70 [1.61, 1.80]  2.36 [2.25, 2.48]

lag (frames)   real               stock              calibrated         real ms  stock ms  calib ms
-------------  -----------------  -----------------  -----------------  -------  --------  --------
shoulder_pan   4.40 [4.38, 4.41]  3.52 [3.51, 3.52]  4.40 [4.39, 4.41]  147      117       147
shoulder_lift  4.29 [4.27, 4.30]  3.49 [3.49, 3.50]  4.23 [4.22, 4.24]  143      116       141
elbow_flex     4.60 [4.58, 4.62]  3.28 [3.27, 3.28]  4.78 [4.74, 4.82]  153      109       159
wrist_flex     4.17 [4.14, 4.19]  3.20 [3.20, 3.21]  4.65 [4.60, 4.71]  139      107       155
wrist_roll     4.21 [4.18, 4.25]  3.13 [3.11, 3.14]  4.11 [4.08, 4.15]  140      104       137

final-pose gap  stock              calibrated
--------------  -----------------  -----------------
shoulder_pan    0.54 [0.47, 0.60]  0.25 [0.21, 0.30]
shoulder_lift   0.32 [0.28, 0.36]  0.27 [0.24, 0.31]
elbow_flex      0.75 [0.48, 1.09]  0.90 [0.62, 1.25]
wrist_flex      9.08 [8.22, 9.82]  7.21 [6.43, 7.89]
wrist_roll      0.56 [0.39, 0.75]  0.48 [0.38, 0.58]

fraction of states outside the fit episodes' range of motion +-2 deg: {'shoulder_pan': 0.0004, 'shoulder_lift': 0.0, 'elbow_flex': 0.0023, 'wrist_flex': 0.0, 'wrist_roll': 0.0031}
fraction of states outside the twin's joint range: stock {'shoulder_pan': 0.0, 'shoulder_lift': 0.0, 'elbow_flex': 0.0, 'wrist_flex': 0.0, 'wrist_roll': 0.0}; calibrated {'shoulder_pan': 0.0, 'shoulder_lift': 0.0, 'elbow_flex': 0.0, 'wrist_flex': 0.0, 'wrist_roll': 0.0}
```

## Interleaved held-out (random episodes from the same period as the fit episodes), n = 120

Per joint, mean over episodes [95% CI]. Degrees. Change = calibrated vs stock, negative = better.

```
sim-vs-real RMSE  stock                         aligned stock      baseline           calibrated                    change vs stock  vs baseline
----------------  ----------------------------  -----------------  -----------------  ----------------------------  ---------------  ---------------
shoulder_pan      1.19 [1.15, 1.23] (p90 1.42)  0.50 [0.47, 0.53]  0.51 [0.49, 0.54]  0.42 [0.39, 0.46] (p90 0.57)  -64% [-66, -62]  -17% [-19, -15]
shoulder_lift     0.85 [0.82, 0.88] (p90 1.05)  0.59 [0.56, 0.62]  0.57 [0.55, 0.59]  0.46 [0.43, 0.48] (p90 0.58)  -46% [-49, -43]  -20% [-22, -18]
elbow_flex        2.43 [2.37, 2.50] (p90 2.90)  2.10 [2.04, 2.16]  1.50 [1.41, 1.60]  1.15 [1.07, 1.23] (p90 1.88)  -53% [-55, -50]  -23% [-25, -21]
wrist_flex        3.89 [3.74, 4.05] (p90 4.66)  3.65 [3.50, 3.82]  3.40 [3.27, 3.56]  3.07 [2.94, 3.21] (p90 3.73)  -21% [-22, -20]  -10% [-10, -9]
wrist_roll        0.93 [0.90, 0.96] (p90 1.17)  0.51 [0.49, 0.54]  0.48 [0.46, 0.51]  0.36 [0.34, 0.38] (p90 0.55)  -61% [-63, -60]  -25% [-27, -23]
arm_mean          1.86 [1.82, 1.89] (p90 2.07)  1.47 [1.44, 1.50]  1.29 [1.26, 1.33]  1.09 [1.06, 1.12] (p90 1.25)  -41% [-42, -40]  -16% [-16, -15]

static-frame RMSE (quasi-static holds)  stock               baseline           calibrated         episodes with >= 10 static frames
--------------------------------------  ------------------  -----------------  -----------------  ---------------------------------
shoulder_pan                            0.49 [0.38, 0.64]   0.53 [0.45, 0.66]  0.21 [0.12, 0.36]  3
shoulder_lift                           0.08 [0.06, 0.10]   0.44 [0.32, 0.50]  0.02 [0.01, 0.02]  3
elbow_flex                              2.47 [0.71, 4.15]   3.84 [2.08, 5.51]  2.37 [0.72, 4.05]  3
wrist_flex                              9.32 [7.69, 10.46]  8.63 [7.02, 9.77]  7.86 [6.46, 8.58]  3
wrist_roll                              0.21 [0.13, 0.26]   0.29 [0.20, 0.41]  0.30 [0.09, 0.57]  3
arm_mean                                2.51 [2.37, 2.65]   2.75 [2.57, 2.89]  2.15 [2.00, 2.27]  3

command tracking RMSE  real robot         stock twin         calibrated twin
---------------------  -----------------  -----------------  -----------------
shoulder_pan           4.32 [4.19, 4.43]  3.21 [3.12, 3.29]  4.30 [4.18, 4.40]
shoulder_lift          2.93 [2.85, 3.00]  2.21 [2.16, 2.26]  2.88 [2.81, 2.94]
elbow_flex             4.24 [4.14, 4.34]  2.29 [2.22, 2.36]  4.27 [4.16, 4.37]
wrist_flex             5.80 [5.66, 5.95]  3.11 [3.03, 3.19]  5.22 [5.12, 5.32]
wrist_roll             2.59 [2.50, 2.67]  1.77 [1.71, 1.83]  2.51 [2.43, 2.59]

lag (frames)   real               stock              calibrated         real ms  stock ms  calib ms
-------------  -----------------  -----------------  -----------------  -------  --------  --------
shoulder_pan   4.42 [4.41, 4.44]  3.54 [3.54, 3.54]  4.44 [4.43, 4.45]  147      118       148
shoulder_lift  4.26 [4.22, 4.29]  3.51 [3.51, 3.52]  4.26 [4.26, 4.27]  142      117       142
elbow_flex     4.66 [4.62, 4.69]  3.29 [3.29, 3.30]  5.10 [5.05, 5.16]  155      110       170
wrist_flex     4.19 [4.16, 4.22]  3.21 [3.21, 3.22]  4.71 [4.67, 4.75]  140      107       157
wrist_roll     4.22 [4.20, 4.23]  3.18 [3.17, 3.19]  4.20 [4.18, 4.21]  141      106       140

final-pose gap  stock              calibrated
--------------  -----------------  -----------------
shoulder_pan    0.48 [0.44, 0.53]  0.24 [0.21, 0.27]
shoulder_lift   0.29 [0.24, 0.34]  0.23 [0.20, 0.28]
elbow_flex      1.29 [1.02, 1.58]  1.30 [1.04, 1.58]
wrist_flex      9.27 [8.91, 9.59]  7.39 [7.05, 7.71]
wrist_roll      0.82 [0.69, 0.95]  0.69 [0.61, 0.77]

fraction of states outside the fit episodes' range of motion +-2 deg: {'shoulder_pan': 0.0001, 'shoulder_lift': 0.0, 'elbow_flex': 0.0, 'wrist_flex': 0.0, 'wrist_roll': 0.0009}
fraction of states outside the twin's joint range: stock {'shoulder_pan': 0.0, 'shoulder_lift': 0.0, 'elbow_flex': 0.0, 'wrist_flex': 0.0, 'wrist_roll': 0.0}; calibrated {'shoulder_pan': 0.0, 'shoulder_lift': 0.0, 'elbow_flex': 0.0, 'wrist_flex': 0.0, 'wrist_roll': 0.0}
```

## Fit episodes (used by the fit), n = 40

Per joint, mean over episodes [95% CI]. Degrees. Change = calibrated vs stock, negative = better.

```
sim-vs-real RMSE  stock                         aligned stock      baseline           calibrated                    change vs stock  vs baseline
----------------  ----------------------------  -----------------  -----------------  ----------------------------  ---------------  ---------------
shoulder_pan      1.15 [1.08, 1.23] (p90 1.40)  0.49 [0.45, 0.53]  0.50 [0.47, 0.54]  0.41 [0.37, 0.46] (p90 0.56)  -64% [-67, -61]  -18% [-21, -14]
shoulder_lift     0.79 [0.74, 0.84] (p90 0.95)  0.60 [0.57, 0.62]  0.57 [0.55, 0.59]  0.44 [0.42, 0.47] (p90 0.54)  -44% [-48, -38]  -22% [-25, -19]
elbow_flex        2.48 [2.37, 2.59] (p90 3.03)  2.15 [2.04, 2.27]  1.55 [1.39, 1.73]  1.17 [1.02, 1.34] (p90 1.96)  -53% [-58, -48]  -24% [-28, -21]
wrist_flex        3.89 [3.69, 4.10] (p90 4.73)  3.62 [3.40, 3.84]  3.38 [3.19, 3.57]  3.08 [2.92, 3.24] (p90 3.73)  -21% [-22, -20]  -9% [-10, -8]
wrist_roll        0.90 [0.86, 0.95] (p90 1.08)  0.52 [0.47, 0.57]  0.48 [0.44, 0.54]  0.38 [0.34, 0.42] (p90 0.52)  -58% [-61, -55]  -22% [-24, -19]
arm_mean          1.84 [1.79, 1.90] (p90 2.04)  1.48 [1.43, 1.52]  1.30 [1.25, 1.34]  1.10 [1.06, 1.13] (p90 1.24)  -41% [-42, -39]  -15% [-17, -14]

static-frame RMSE (quasi-static holds)  stock  baseline  calibrated  episodes with >= 10 static frames
--------------------------------------  -----  --------  ----------  ---------------------------------
shoulder_pan                            0.48   0.60      0.15        1
shoulder_lift                           0.34   0.59      0.26        1
elbow_flex                              0.43   1.81      0.28        1
wrist_flex                              10.32  9.55      8.50        1
wrist_roll                              2.08   2.03      1.61        1
arm_mean                                2.73   2.92      2.16        1

command tracking RMSE  real robot         stock twin         calibrated twin
---------------------  -----------------  -----------------  -----------------
shoulder_pan           4.22 [4.01, 4.42]  3.14 [3.00, 3.28]  4.21 [4.03, 4.38]
shoulder_lift          2.80 [2.67, 2.94]  2.15 [2.07, 2.24]  2.80 [2.69, 2.92]
elbow_flex             4.20 [4.03, 4.38]  2.20 [2.07, 2.33]  4.20 [4.05, 4.34]
wrist_flex             5.87 [5.64, 6.10]  3.15 [3.02, 3.29]  5.27 [5.12, 5.41]
wrist_roll             2.51 [2.40, 2.63]  1.74 [1.66, 1.82]  2.48 [2.38, 2.59]

lag (frames)   real               stock              calibrated         real ms  stock ms  calib ms
-------------  -----------------  -----------------  -----------------  -------  --------  --------
shoulder_pan   4.42 [4.40, 4.45]  3.55 [3.54, 3.55]  4.45 [4.43, 4.47]  147      118       148
shoulder_lift  4.20 [4.12, 4.26]  3.52 [3.51, 3.52]  4.27 [4.26, 4.28]  140      117       142
elbow_flex     4.74 [4.67, 4.81]  3.30 [3.29, 3.31]  5.21 [5.09, 5.35]  158      110       174
wrist_flex     4.25 [4.19, 4.30]  3.21 [3.21, 3.22]  4.67 [4.61, 4.75]  142      107       156
wrist_roll     4.17 [4.15, 4.20]  3.18 [3.17, 3.20]  4.21 [4.18, 4.24]  139      106       140

final-pose gap  stock              calibrated
--------------  -----------------  -----------------
shoulder_pan    0.55 [0.48, 0.62]  0.27 [0.22, 0.32]
shoulder_lift   0.28 [0.24, 0.31]  0.22 [0.19, 0.25]
elbow_flex      1.60 [1.03, 2.25]  1.61 [1.06, 2.23]
wrist_flex      8.88 [8.10, 9.55]  7.25 [6.61, 7.80]
wrist_roll      0.87 [0.64, 1.10]  0.76 [0.62, 0.91]
```

## Calibrated twin

Package `calibrated_twin.json`, sha256 `948f094b10aedd2045fd951cf018d1160a0f1cb8802eb022c56858035219a19d`.
Fitted: kp[shoulder_pan], kv[shoulder_pan], frictionloss[shoulder_pan], kp[shoulder_lift], kv[shoulder_lift], frictionloss[shoulder_lift], kp[elbow_flex], kv[elbow_flex], frictionloss[elbow_flex], kp[wrist_flex], kv[wrist_flex], frictionloss[wrist_flex], kp[wrist_roll], kv[wrist_roll], frictionloss[wrist_roll]; command delay 0 frame(s) (screened train MSE by delay, deg^2: {'0': 2.25678, '1': 2.63842, '2': 3.62975, '3': 4.04007, '4': 4.86301, '5': 6.73419}). Train MSE 2.38588 deg^2. Optimizer: converged (`ftol` termination condition is satisfied.). At a bound: frictionloss[wrist_flex].

```
joint          kp N m/rad   kv N m s/rad  frictionloss N m  armature kg m^2  zero offset deg
-------------  -----------  ------------  ----------------  ---------------  -----------------
shoulder_pan   50 -> 20.78  5.13 -> 2.61  0.1 -> 0.163      0.1 (fixed)      +0.0 (documented)
shoulder_lift  50 -> 19.01  4.96 -> 2.22  0.1 -> 0.0839     0.1 (fixed)      +0.0 (documented)
elbow_flex     50 -> 13.9   4.63 -> 1.53  0.1 -> 0.467      0.1 (fixed)      +0.0 (documented)
wrist_flex     50 -> 26.44  4.49 -> 2.83  0.1 -> 1          0.1 (fixed)      +0.0 (documented)
wrist_roll     50 -> 31.82  4.47 -> 3.56  0.1 -> 0.314      0.1 (fixed)      +0.0 (documented)
```

Identifiable servo combinations (the individual gains are not the claim): natural frequency sqrt(kp/I_eff) and damping ratio (kv+damping)/(2 sqrt(kp I_eff)), I_eff = joint-space inertia at the median pose incl. armature; 95% CI from a linearised episode bootstrap of the fit.

```
joint          I_eff kg m^2  natural freq Hz [CI]  damping ratio [CI]
-------------  ------------  --------------------  --------------------
shoulder_pan   0.104         2.25 [2.22, 2.28]     0.888 [0.874, 0.904]
shoulder_lift  0.1071        2.12 [2.07, 2.17]     0.779 [0.751, 0.802]
elbow_flex     0.1085        1.8 [1.75, 1.86]      0.625 [0.591, 0.659]
wrist_flex     0.1011        2.57 [2.43, 2.72]     0.866 [0.774, 0.942]
wrist_roll     0.1           2.84 [2.79, 2.9]      0.997 [0.967, 1.02]
```

Per-parameter identifiability (condition number of J^T J 2630.0): marginal/conditional std ratio = sqrt(VIF); >= 10 means only a combination with other parameters is identified.

```
parameter                    value    95% CI            std ratio  identified alone
---------------------------  -------  ----------------  ---------  ----------------
kp[shoulder_pan]             20.78    [20.2, 21.4]      6.89       yes
kv[shoulder_pan]             2.612    [2.54, 2.69]      6.56       yes
frictionloss[shoulder_pan]   0.1632   [0.147, 0.179]    1.6        yes
kp[shoulder_lift]            19.01    [18, 20]          4.61       yes
kv[shoulder_lift]            2.223    [2.09, 2.34]      4.69       yes
frictionloss[shoulder_lift]  0.08394  [0.0662, 0.103]   1.75       yes
kp[elbow_flex]               13.9     [13.1, 14.9]      2.49       yes
kv[elbow_flex]               1.534    [1.42, 1.66]      2.35       yes
frictionloss[elbow_flex]     0.4669   [0.419, 0.525]    1.65       yes
kp[wrist_flex]               26.44    [23.6, 29.6]      3.72       yes
kv[wrist_flex]               2.831    [2.4, 3.24]       3.72       yes
frictionloss[wrist_flex]     0.9999   fixed (at bound)  n/a        -
kp[wrist_roll]               31.82    [30.7, 33.1]      8.75       yes
kv[wrist_roll]               3.559    [3.41, 3.71]      7.59       yes
frictionloss[wrist_roll]     0.3136   [0.273, 0.358]    2.27       yes
```

Posterior correlations |r| > 0.95: kp[wrist_roll] ~ kv[wrist_roll] (+0.976); kp[shoulder_pan] ~ kv[shoulder_pan] (+0.974); kp[wrist_flex] ~ kv[wrist_flex] (+0.963)

Weakest directions (relative eigenvalue: top loadings): 0.00038: kp[wrist_roll] -0.71, frictionloss[wrist_roll] -0.51, kv[wrist_roll] -0.48, frictionloss[elbow_flex] +0.00; 0.0019: frictionloss[wrist_roll] +0.85, kv[wrist_roll] -0.43, kp[wrist_roll] -0.31, kp[shoulder_lift] +0.00; 0.0024: kp[shoulder_pan] +0.82, frictionloss[shoulder_pan] +0.41, kv[shoulder_pan] +0.40, kp[shoulder_lift] +0.00

Physics-free baseline (fitted on the same fit episodes): y[t+1] = y[t] + alpha*(a[t-d] + b - y[t]), y[0] = x[0], per arm joint; alpha [0.28, 0.44, 0.2, 0.22, 0.3], delay [1, 2, 0, 0, 1] frames, bias [-0.042, -0.2348, 1.7346, -0.7101, -0.096] deg.

## Mapping audit

Sign checks (1st-99th percentile of FIT-episode states vs MJCF range):

```
joint          recorded p1..p99 deg  MJCF range deg     shift (doc sign)  shift (flipped)  decision
-------------  --------------------  -----------------  ----------------  ---------------  ---------------------------------------------------------------------------
shoulder_pan   [-70.26, 7.56]        [-110.01, 110.01]  0.0               0.0              documented sign (flipped sign would also fit: sign not identified by range)
shoulder_lift  [128.76, 182.58]      [-190.22, 9.97]    172.61            0.0              flipped sign (documented sign does not fit the MJCF range)
elbow_flex     [105.47, 172.0]       [-9.97, 179.91]    0.0               162.03           documented sign
wrist_flex     [-16.96, 83.67]       [-95.11, 95.11]    0.0               0.0              documented sign (flipped sign would also fit: sign not identified by range)
wrist_roll     [-132.36, -74.53]     [-159.86, 159.86]  0.0               0.0              documented sign (flipped sign would also fit: sign not identified by range)

same rule on other subsets (robustness): all_episodes: signs [1, -1, 1, 1, 1], accepted; heldout_only: signs [1, -1, 1, 1, 1], accepted -> agrees
released stock limits (crossed by fit episodes): {}
```

Forward-kinematics plausibility under the shipped mapping (evidence, not a gate; assumes the base sits on the work surface):

```
gripper lowest point minus base lowest point (m): {'p1': 0.049, 'p5': 0.05, 'p50': 0.259, 'min': 0.044}; frames > 2 cm below the base: 0.0
frames within 1 deg of a stock MJCF limit: {'shoulder_pan': 0.0, 'shoulder_lift': 0.0, 'elbow_flex': 0.0, 'wrist_flex': 0.0, 'wrist_roll': 0.0}
frames beyond a stock MJCF limit: {'shoulder_pan': 0.0, 'shoulder_lift': 0.0, 'elbow_flex': 0.0, 'wrist_flex': 0.0, 'wrist_roll': 0.0}
```

Gravity sag on real static frames (middle 80% of each episode, gripper >= 3 cm above the base plane): centred correlation between the servo's static error and the twin's gravity torque at the mapped pose, and the implied static stiffness (centred slope). Positive supports the mapping. Evidence, not a gate.

```
joint          corr [CI] verdict                                                                                       power (gravity std, n)  implied static K N m/rad  fitted kp
-------------  ------------------------------------------------------------------------------------------------------  ----------------------  ------------------------  ---------
shoulder_pan   not testable (gravity torque ~constant over the selected static poses; gravity std 0.0 N m, 14 frames)                                                    20.8
shoulder_lift  not testable (gravity torque ~constant over the selected static poses; gravity std 0.0 N m, 14 frames)                                                    19
elbow_flex     not testable (gravity torque ~constant over the selected static poses; gravity std 0.0 N m, 14 frames)                                                    13.9
wrist_flex     not testable (gravity torque ~constant over the selected static poses; gravity std 0.0 N m, 14 frames)                                                    26.4
wrist_roll     not testable (gravity torque ~constant over the selected static poses; gravity std 0.0 N m, 14 frames)                                                    31.8
static frames: 14 (0 excluded as possible table contact) from 1 fit episodes
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
- Fitted parameters at a bound (within BOUND_TOL): frictionloss[wrist_flex]; the value is a bound, not an estimate.
- interleaved: final-pose (static) gap is larger for the calibrated twin than for stock on elbow_flex by point estimate; CIs overlap on all of them.
- future: final-pose (static) gap is larger for the calibrated twin than for stock on elbow_flex by point estimate; CIs overlap on all of them.
- Joint direction flipped relative to the documented convention for shoulder_lift (chosen from the recorded range of motion vs the MJCF range; see mapping_checks).

## Provenance and reproduction

```
dataset        VoicAndrei/so100_kitchen @ 838ad7bb6d118630c1c49cc2ee8ab9edef933c79 (requested 838ad7bb6d118630c1c49cc2ee8ab9edef933c79)
               LeRobot v2.1, robot_type so100, 30 fps, 200 episodes loaded (repo: 1801), 0 dropped
data files     data/chunk-000/episode_000000.parquet (54d9b8169f48), data/chunk-000/episode_000001.parquet (4baf63a46ea0), data/chunk-000/episode_000002.parquet (5fa70e3d82e3), ... (200 files)
twin           trs_so_arm100 (so_arm100.xml) from https://github.com/google-deepmind/mujoco_menagerie @ b0655057a9df2abe39ea7fc989914ba6f248301c
               dir sha256 4f3b0f21b8a2b889..., timestep 0.002 -> 0.00196078 s x 17 substeps/frame, contacts disabled
software       mujoco 3.17.0, numpy 2.5.4, scipy 1.18.1, python 3.13.18, meatspace_lab 2.0.0 (code sha256 924eb3d8364be665...)
hardware       x86_64 Intel(R) Xeon(R) Processor @ 2.80GHz; OpenBLAS kernel numpy: SkylakeX; scipy: SkylakeX
report         schema meatspace.twin-gap-report/v2
               results sha256 61a93ca7076fcc22bb939a2ffd414292cc3491fa6d17f946f2405f7b7cb2b14e  (numbers only; any interpreter/CPU)
               content sha256 8a66cf09fb25a4c0e149f2228b3d3f733a157de1f086b1f1331590e8c8c39972  (numbers + environment above)
```

Reproduce (from `lab/`, see README) into a scratch directory and compare:

```
python -m meatspace_lab report --dataset VoicAndrei/so100_kitchen --revision 838ad7bb6d118630c1c49cc2ee8ab9edef933c79 \
    --twin .cache/menagerie/trs_so_arm100 --out /tmp/repro/ --max-episodes 200
python -m meatspace_lab verify reports/VoicAndrei__so100_kitchen/report.json /tmp/repro/report.json
```
