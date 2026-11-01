# Twin Gap Report: lerobot/svla_so101_pickplace x robotstudio_so101

```
HELD-OUT sim-vs-real joint RMSE, mean of 5 arm joints, deg  [95% bootstrap CI over episodes]
change = calibrated/reference - 1 (negative = better), paired by episode

FUTURE BLOCK (10 episodes)
  stock twin             5.35 [5.14, 5.54]
  aligned stock          1.01 [0.98, 1.05]   (stock dynamics + delay + released limits)
  lag-filter baseline    0.63 [0.61, 0.66]   (no physics: 3 params/joint)
  calibrated twin        0.46 [0.44, 0.48]
  change vs stock        -91% [-92, -91]   per-episode median -91% (range -93% .. -90%); 10/10 improved
  change vs baseline     -28% [-32, -24]   10/10 improved
  verdict                closes most of the gap (-91% [-92, -91] vs stock, residual 0.46 deg); calibrated twin beats the physics-free lag filter (-28% [-32, -24])

INTERLEAVED HELD-OUT (10 episodes)
  stock twin             5.00 [4.66, 5.32]
  aligned stock          1.01 [0.96, 1.06]   (stock dynamics + delay + released limits)
  lag-filter baseline    0.64 [0.62, 0.66]   (no physics: 3 params/joint)
  calibrated twin        0.43 [0.41, 0.45]
  change vs stock        -91% [-92, -91]   per-episode median -92% (range -92% .. -90%); 10/10 improved
  change vs baseline     -33% [-37, -29]   10/10 improved
  verdict                closes most of the gap (-91% [-92, -91] vs stock, residual 0.43 deg); calibrated twin beats the physics-free lag filter (-33% [-37, -29])

command->state lag, interleaved held-out, ms per joint (real / stock / calibrated):
  shoulder_pan 133/27/132  shoulder_lift 136/29/136  elbow_flex 137/26/142  wrist_flex 130/26/130  wrist_roll 131/26/131
  max |twin - real| over joints: stock 111.3 ms, calibrated 5.0 ms
```

![future-block held-out episode](heldout_episode.svg)

![per-joint RMSE, future block](rmse_by_joint_future.svg)

![per-joint RMSE, interleaved held-out](rmse_by_joint.svg)

## Future block (held out: the last 20% of episodes by index, recorded after every fit episode), n = 10

Per joint, mean over episodes [95% CI]. Degrees. Change = calibrated vs stock, negative = better.

```
sim-vs-real RMSE  stock                         aligned stock      baseline           calibrated                    change vs stock  vs baseline
----------------  ----------------------------  -----------------  -----------------  ----------------------------  ---------------  ---------------
shoulder_pan      7.24 [6.97, 7.50] (p90 7.78)  0.63 [0.59, 0.66]  0.30 [0.29, 0.31]  0.33 [0.31, 0.34] (p90 0.35)  -96% [-96, -95]  +9% [+6, +12]
shoulder_lift     5.09 [4.81, 5.39] (p90 5.84)  1.01 [0.93, 1.10]  0.59 [0.53, 0.65]  0.44 [0.41, 0.46] (p90 0.47)  -91% [-92, -91]  -26% [-33, -19]
elbow_flex        4.48 [4.24, 4.71] (p90 4.96)  2.26 [2.15, 2.36]  1.58 [1.54, 1.62]  0.87 [0.81, 0.92] (p90 0.98)  -81% [-82, -79]  -45% [-49, -41]
wrist_flex        3.09 [2.70, 3.50] (p90 3.85)  0.52 [0.48, 0.57]  0.37 [0.34, 0.41]  0.31 [0.27, 0.35] (p90 0.40)  -90% [-92, -88]  -17% [-23, -12]
wrist_roll        6.85 [6.61, 7.10] (p90 7.46)  0.64 [0.60, 0.68]  0.34 [0.30, 0.38]  0.36 [0.32, 0.41] (p90 0.44)  -95% [-95, -94]  +6% [-2, +15]
arm_mean          5.35 [5.14, 5.54] (p90 5.66)  1.01 [0.98, 1.05]  0.63 [0.61, 0.66]  0.46 [0.44, 0.48] (p90 0.48)  -91% [-92, -91]  -28% [-32, -24]

static-frame RMSE (quasi-static holds)  stock              baseline           calibrated         episodes with >= 10 static frames
--------------------------------------  -----------------  -----------------  -----------------  ---------------------------------
shoulder_pan                            0.37 [0.33, 0.40]  0.40 [0.38, 0.43]  0.28 [0.28, 0.28]  2
shoulder_lift                           3.03 [2.53, 3.53]  0.23 [0.17, 0.29]  0.26 [0.22, 0.30]  2
elbow_flex                              0.23 [0.06, 0.41]  1.83 [1.78, 1.87]  0.92 [0.90, 0.94]  2
wrist_flex                              0.22 [0.11, 0.34]  0.26 [0.20, 0.32]  0.16 [0.16, 0.16]  2
wrist_roll                              3.29 [0.18, 6.41]  0.28 [0.13, 0.43]  0.20 [0.09, 0.30]  2
arm_mean                                1.43 [0.91, 1.95]  0.60 [0.55, 0.65]  0.36 [0.36, 0.37]  2

command tracking RMSE  real robot         stock twin         calibrated twin
---------------------  -----------------  -----------------  -----------------
shoulder_pan           6.76 [6.49, 7.02]  0.51 [0.49, 0.53]  6.68 [6.44, 6.90]
shoulder_lift          4.59 [4.29, 4.90]  2.36 [2.25, 2.52]  4.71 [4.45, 4.99]
elbow_flex             4.27 [4.06, 4.48]  0.58 [0.54, 0.62]  4.43 [4.22, 4.64]
wrist_flex             2.80 [2.48, 3.10]  0.50 [0.23, 1.01]  2.81 [2.51, 3.10]
wrist_roll             5.25 [4.97, 5.55]  4.35 [4.04, 4.64]  5.08 [4.84, 5.32]

lag (frames)   real               stock              calibrated         real ms  stock ms  calib ms
-------------  -----------------  -----------------  -----------------  -------  --------  --------
shoulder_pan   3.99 [3.98, 4.00]  0.79 [0.79, 0.80]  3.96 [3.96, 3.96]  133      26        132
shoulder_lift  4.00 [3.97, 4.03]  0.91 [0.83, 0.99]  4.12 [4.09, 4.14]  133      30        137
elbow_flex     4.12 [4.10, 4.14]  0.77 [0.76, 0.78]  4.37 [4.30, 4.44]  137      26        146
wrist_flex     3.87 [3.85, 3.90]  0.79 [0.78, 0.80]  3.91 [3.90, 3.93]  129      26        130
wrist_roll     4.00 [3.98, 4.02]  0.80 [0.78, 0.82]  3.91 [3.91, 3.92]  133      27        130

final-pose gap  stock              calibrated
--------------  -----------------  -----------------
shoulder_pan    0.21 [0.12, 0.31]  0.16 [0.09, 0.24]
shoulder_lift   2.98 [2.33, 3.45]  0.32 [0.18, 0.47]
elbow_flex      0.33 [0.22, 0.44]  1.18 [1.09, 1.26]
wrist_flex      0.35 [0.19, 0.57]  0.29 [0.15, 0.50]
wrist_roll      0.24 [0.18, 0.28]  0.10 [0.06, 0.14]

fraction of states outside the fit episodes' range of motion +-2 deg: {'shoulder_pan': 0.3219, 'shoulder_lift': 0.0, 'elbow_flex': 0.0, 'wrist_flex': 0.0, 'wrist_roll': 0.2523}
fraction of states outside the twin's joint range: stock {'shoulder_pan': 0.0, 'shoulder_lift': 0.3538, 'elbow_flex': 0.3534, 'wrist_flex': 0.0152, 'wrist_roll': 0.2472}; calibrated {'shoulder_pan': 0.0, 'shoulder_lift': 0.0, 'elbow_flex': 0.0, 'wrist_flex': 0.0, 'wrist_roll': 0.0}
```

## Interleaved held-out (random episodes from the same period as the fit episodes), n = 10

Per joint, mean over episodes [95% CI]. Degrees. Change = calibrated vs stock, negative = better.

```
sim-vs-real RMSE  stock                         aligned stock      baseline           calibrated                    change vs stock  vs baseline
----------------  ----------------------------  -----------------  -----------------  ----------------------------  ---------------  ---------------
shoulder_pan      5.96 [5.38, 6.64] (p90 7.05)  0.55 [0.49, 0.62]  0.31 [0.28, 0.34]  0.32 [0.29, 0.36] (p90 0.39)  -95% [-95, -94]  +3% [-2, +9]
shoulder_lift     6.56 [6.21, 6.93] (p90 7.35)  1.27 [1.19, 1.34]  0.83 [0.78, 0.87]  0.50 [0.47, 0.53] (p90 0.55)  -92% [-93, -92]  -40% [-44, -35]
elbow_flex        4.82 [4.58, 5.05] (p90 5.30)  2.17 [2.02, 2.33]  1.45 [1.36, 1.54]  0.86 [0.80, 0.92] (p90 1.00)  -82% [-83, -81]  -41% [-46, -34]
wrist_flex        3.86 [3.46, 4.27] (p90 4.77)  0.59 [0.52, 0.66]  0.33 [0.30, 0.35]  0.23 [0.20, 0.25] (p90 0.26)  -94% [-95, -93]  -31% [-36, -26]
wrist_roll        3.79 [3.26, 4.50] (p90 4.38)  0.48 [0.44, 0.53]  0.27 [0.25, 0.29]  0.23 [0.21, 0.26] (p90 0.28)  -94% [-95, -93]  -13% [-22, -1]
arm_mean          5.00 [4.66, 5.32] (p90 5.49)  1.01 [0.96, 1.06]  0.64 [0.62, 0.66]  0.43 [0.41, 0.45] (p90 0.46)  -91% [-92, -91]  -33% [-37, -29]

static-frame RMSE (quasi-static holds)  stock  baseline  calibrated  episodes with >= 10 static frames
--------------------------------------  -----  --------  ----------  ---------------------------------
shoulder_pan                            0.15   0.08      0.06        1
shoulder_lift                           3.53   0.51      0.10        1
elbow_flex                              0.23   2.05      0.73        1
wrist_flex                              0.36   0.45      0.31        1
wrist_roll                              0.26   0.22      0.11        1
arm_mean                                0.91   0.66      0.26        1

command tracking RMSE  real robot         stock twin         calibrated twin
---------------------  -----------------  -----------------  -----------------
shoulder_pan           5.60 [5.04, 6.26]  0.43 [0.40, 0.46]  5.54 [5.02, 6.15]
shoulder_lift          6.06 [5.69, 6.47]  2.31 [2.19, 2.44]  6.04 [5.72, 6.40]
elbow_flex             4.60 [4.36, 4.82]  0.54 [0.51, 0.56]  4.72 [4.50, 4.89]
wrist_flex             3.54 [3.16, 3.93]  0.76 [0.49, 1.03]  3.53 [3.18, 3.90]
wrist_roll             3.52 [3.03, 4.19]  0.31 [0.27, 0.35]  3.50 [3.04, 4.12]

lag (frames)   real               stock              calibrated         real ms  stock ms  calib ms
-------------  -----------------  -----------------  -----------------  -------  --------  --------
shoulder_pan   3.99 [3.96, 4.02]  0.82 [0.80, 0.84]  3.97 [3.96, 3.97]  133      27        132
shoulder_lift  4.07 [4.05, 4.10]  0.88 [0.84, 0.92]  4.09 [4.08, 4.10]  136      29        136
elbow_flex     4.12 [4.10, 4.14]  0.78 [0.77, 0.79]  4.27 [4.22, 4.32]  137      26        142
wrist_flex     3.89 [3.88, 3.91]  0.78 [0.77, 0.78]  3.91 [3.90, 3.93]  130      26        130
wrist_roll     3.92 [3.90, 3.95]  0.79 [0.78, 0.79]  3.94 [3.93, 3.94]  131      26        131

final-pose gap  stock              calibrated
--------------  -----------------  -----------------
shoulder_pan    0.17 [0.09, 0.26]  0.15 [0.08, 0.23]
shoulder_lift   3.48 [3.41, 3.56]  0.34 [0.23, 0.45]
elbow_flex      0.17 [0.13, 0.20]  1.10 [0.98, 1.21]
wrist_flex      0.21 [0.14, 0.30]  0.13 [0.08, 0.19]
wrist_roll      0.33 [0.21, 0.45]  0.20 [0.12, 0.30]

fraction of states outside the fit episodes' range of motion +-2 deg: {'shoulder_pan': 0.0, 'shoulder_lift': 0.0, 'elbow_flex': 0.0, 'wrist_flex': 0.0, 'wrist_roll': 0.0}
fraction of states outside the twin's joint range: stock {'shoulder_pan': 0.0, 'shoulder_lift': 0.3391, 'elbow_flex': 0.2759, 'wrist_flex': 0.0483, 'wrist_roll': 0.0}; calibrated {'shoulder_pan': 0.0, 'shoulder_lift': 0.0, 'elbow_flex': 0.0, 'wrist_flex': 0.0, 'wrist_roll': 0.0}
```

## Fit episodes (used by the fit), n = 30

Per joint, mean over episodes [95% CI]. Degrees. Change = calibrated vs stock, negative = better.

```
sim-vs-real RMSE  stock                         aligned stock      baseline           calibrated                    change vs stock  vs baseline
----------------  ----------------------------  -----------------  -----------------  ----------------------------  ---------------  ---------------
shoulder_pan      5.86 [5.55, 6.17] (p90 7.02)  0.53 [0.49, 0.57]  0.29 [0.27, 0.32]  0.29 [0.28, 0.30] (p90 0.32)  -95% [-95, -95]  -1% [-6, +3]
shoulder_lift     6.13 [5.93, 6.34] (p90 6.71)  1.28 [1.20, 1.34]  0.83 [0.78, 0.88]  0.46 [0.44, 0.48] (p90 0.54)  -93% [-93, -92]  -45% [-48, -41]
elbow_flex        4.66 [4.51, 4.82] (p90 5.15)  2.21 [2.11, 2.30]  1.53 [1.49, 1.58]  0.83 [0.80, 0.86] (p90 0.93)  -82% [-83, -81]  -46% [-48, -43]
wrist_flex        3.56 [3.31, 3.83] (p90 4.45)  0.56 [0.53, 0.60]  0.34 [0.32, 0.37]  0.25 [0.23, 0.27] (p90 0.33)  -93% [-94, -92]  -28% [-31, -23]
wrist_roll        3.87 [3.61, 4.14] (p90 4.80)  0.48 [0.46, 0.51]  0.27 [0.25, 0.29]  0.23 [0.22, 0.24] (p90 0.27)  -94% [-94, -94]  -15% [-20, -11]
arm_mean          4.82 [4.67, 4.96] (p90 5.26)  1.01 [0.99, 1.04]  0.65 [0.64, 0.67]  0.41 [0.40, 0.42] (p90 0.46)  -91% [-92, -91]  -37% [-39, -35]

static-frame RMSE (quasi-static holds)  stock              baseline           calibrated         episodes with >= 10 static frames
--------------------------------------  -----------------  -----------------  -----------------  ---------------------------------
shoulder_pan                            0.15 [0.07, 0.28]  0.18 [0.10, 0.31]  0.16 [0.04, 0.26]  3
shoulder_lift                           3.54 [3.45, 3.71]  0.29 [0.18, 0.44]  0.23 [0.12, 0.37]  3
elbow_flex                              0.32 [0.23, 0.51]  2.02 [1.96, 2.05]  0.84 [0.67, 1.09]  3
wrist_flex                              0.26 [0.05, 0.50]  0.25 [0.12, 0.41]  0.13 [0.09, 0.15]  3
wrist_roll                              0.21 [0.18, 0.25]  0.17 [0.13, 0.21]  0.10 [0.06, 0.15]  3
arm_mean                                0.90 [0.85, 0.94]  0.58 [0.53, 0.63]  0.29 [0.25, 0.35]  3

command tracking RMSE  real robot         stock twin         calibrated twin
---------------------  -----------------  -----------------  -----------------
shoulder_pan           5.47 [5.18, 5.75]  0.43 [0.41, 0.46]  5.45 [5.17, 5.73]
shoulder_lift          5.72 [5.47, 5.96]  2.41 [2.33, 2.47]  5.72 [5.50, 5.94]
elbow_flex             4.45 [4.31, 4.60]  0.55 [0.53, 0.56]  4.55 [4.43, 4.67]
wrist_flex             3.26 [3.04, 3.50]  0.55 [0.37, 0.77]  3.25 [3.05, 3.47]
wrist_roll             3.59 [3.35, 3.85]  0.34 [0.31, 0.38]  3.58 [3.34, 3.82]

lag (frames)   real               stock              calibrated         real ms  stock ms  calib ms
-------------  -----------------  -----------------  -----------------  -------  --------  --------
shoulder_pan   3.96 [3.95, 3.97]  0.79 [0.79, 0.80]  3.97 [3.97, 3.97]  132      26        132
shoulder_lift  4.06 [4.05, 4.08]  0.94 [0.89, 0.99]  4.10 [4.08, 4.11]  135      31        137
elbow_flex     4.12 [4.10, 4.13]  0.78 [0.78, 0.79]  4.29 [4.26, 4.32]  137      26        143
wrist_flex     3.89 [3.88, 3.91]  0.79 [0.78, 0.79]  3.92 [3.91, 3.93]  130      26        131
wrist_roll     3.92 [3.91, 3.94]  0.78 [0.78, 0.79]  3.94 [3.93, 3.94]  131      26        131

final-pose gap  stock              calibrated
--------------  -----------------  -----------------
shoulder_pan    0.16 [0.12, 0.19]  0.13 [0.10, 0.16]
shoulder_lift   3.48 [3.37, 3.56]  0.36 [0.30, 0.42]
elbow_flex      0.21 [0.17, 0.26]  1.03 [0.95, 1.11]
wrist_flex      0.22 [0.17, 0.27]  0.17 [0.13, 0.20]
wrist_roll      0.24 [0.19, 0.28]  0.13 [0.10, 0.16]
```

## Calibrated twin

Package `calibrated_twin.json`, sha256 `7024ed557bf5a40b6498e8681e27d6f8cfcc0b35f76196141c5d5faef652ca3d`.
Fitted: kp[shoulder_pan], kv[shoulder_pan], frictionloss[shoulder_pan], kp[shoulder_lift], kv[shoulder_lift], frictionloss[shoulder_lift], kp[elbow_flex], kv[elbow_flex], frictionloss[elbow_flex], kp[wrist_flex], kv[wrist_flex], frictionloss[wrist_flex], kp[wrist_roll], kv[wrist_roll], frictionloss[wrist_roll]; command delay 1 frame(s) (screened train MSE by delay, deg^2: {'0': 0.33724, '1': 0.23861, '2': 0.50739, '3': 1.03098, '4': 2.6915, '5': 8.50238}). Train MSE 0.2239 deg^2. Optimizer: converged (`ftol` termination condition is satisfied.). At a bound: none.

```
joint          kp N m/rad      kv N m s/rad   frictionloss N m  armature kg m^2  zero offset deg
-------------  --------------  -------------  ----------------  ---------------  -----------------
shoulder_pan   998.2 -> 13.36  2.73 -> 0.509  0.052 -> 0.0319   0.028 (fixed)    +0.0 (documented)
shoulder_lift  998.2 -> 11.58  2.73 -> 0.287  0.052 -> 0.184    0.028 (fixed)    +0.0 (documented)
elbow_flex     998.2 -> 13.31  2.73 -> 0.292  0.052 -> 0.515    0.028 (fixed)    +0.0 (documented)
wrist_flex     998.2 -> 17.1   2.73 -> 0.744  0.052 -> 0.109    0.028 (fixed)    +0.0 (documented)
wrist_roll     998.2 -> 13.67  2.73 -> 0.5    0.052 -> 0.0533   0.028 (fixed)    +0.0 (documented)
```

Identifiable servo combinations (the individual gains are not the claim): natural frequency sqrt(kp/I_eff) and damping ratio (kv+damping)/(2 sqrt(kp I_eff)), I_eff = joint-space inertia at the median pose incl. armature; 95% CI from a linearised episode bootstrap of the fit.

```
joint          I_eff kg m^2  natural freq Hz [CI]  damping ratio [CI]
-------------  ------------  --------------------  --------------------
shoulder_pan   0.03122       3.29 [3.25, 3.34]     0.858 [0.849, 0.868]
shoulder_lift  0.03137       3.06 [3.04, 3.08]     0.736 [0.725, 0.747]
elbow_flex     0.0347        3.12 [3.05, 3.19]     0.656 [0.634, 0.677]
wrist_flex     0.02914       3.86 [3.78, 3.93]     0.952 [0.932, 0.969]
wrist_roll     0.02808       3.51 [3.47, 3.55]     0.888 [0.88, 0.895]
```

Per-parameter identifiability (condition number of J^T J 5280.0): marginal/conditional std ratio = sqrt(VIF); >= 10 means only a combination with other parameters is identified.

```
parameter                    value    95% CI            std ratio  identified alone
---------------------------  -------  ----------------  ---------  ----------------
kp[shoulder_pan]             13.36    [13, 13.8]        9.01       yes
kv[shoulder_pan]             0.509    [0.482, 0.537]    8.93       yes
frictionloss[shoulder_pan]   0.03185  [0.0273, 0.0364]  1.33       yes
kp[shoulder_lift]            11.58    [11.4, 11.8]      3.33       yes
kv[shoulder_lift]            0.2868   [0.269, 0.305]    3.4        yes
frictionloss[shoulder_lift]  0.1842   [0.172, 0.197]    1.51       yes
kp[elbow_flex]               13.31    [12.8, 13.9]      2.82       yes
kv[elbow_flex]               0.2921   [0.251, 0.332]    2.08       yes
frictionloss[elbow_flex]     0.5149   [0.471, 0.565]    2.02       yes
kp[wrist_flex]               17.1     [16.5, 17.8]      7.11       yes
kv[wrist_flex]               0.7437   [0.697, 0.791]    6.75       yes
frictionloss[wrist_flex]     0.1088   [0.0939, 0.124]   1.48       yes
kp[wrist_roll]               13.67    [13.4, 14]        8.73       yes
kv[wrist_roll]               0.5004   [0.48, 0.521]     8.46       yes
frictionloss[wrist_roll]     0.05328  [0.0475, 0.0592]  1.39       yes
```

Posterior correlations |r| > 0.95: kp[shoulder_pan] ~ kv[shoulder_pan] (+0.989); kp[wrist_roll] ~ kv[wrist_roll] (+0.988); kp[wrist_flex] ~ kv[wrist_flex] (+0.980)

Weakest directions (relative eigenvalue: top loadings): 0.00019: kp[wrist_roll] -0.97, kv[wrist_roll] -0.21, frictionloss[wrist_roll] -0.09, kp[shoulder_pan] +0.00; 0.00022: kp[wrist_flex] +0.95, kv[wrist_flex] +0.25, frictionloss[wrist_flex] +0.18, kp[shoulder_pan] +0.00; 0.00042: kp[shoulder_pan] +0.98, kv[shoulder_pan] +0.21, frictionloss[shoulder_pan] +0.05, kp[wrist_flex] +0.00

Physics-free baseline (fitted on the same fit episodes): y[t+1] = y[t] + alpha*(a[t-d] + b - y[t]), y[0] = x[0], per arm joint; alpha [0.5, 0.48, 0.3, 0.5, 0.5], delay [2, 2, 1, 2, 2] frames, bias [-0.0329, 0.8686, 1.527, 0.0967, -0.0418] deg.

## Mapping audit

Sign checks (1st-99th percentile of FIT-episode states vs MJCF range):

```
joint          recorded p1..p99 deg  MJCF range deg     shift (doc sign)  shift (flipped)  decision
-------------  --------------------  -----------------  ----------------  ---------------  ---------------------------------------------------------------------------
shoulder_pan   [-62.36, 93.21]       [-110.0, 110.0]    0.0               0.0              documented sign (flipped sign would also fit: sign not identified by range)
shoulder_lift  [-103.71, 4.28]       [-100.0, 100.0]    3.71              3.71             documented sign (flipped sign would also fit: sign not identified by range)
elbow_flex     [21.58, 97.34]        [-96.83, 96.83]    0.51              0.51             documented sign (flipped sign would also fit: sign not identified by range)
wrist_flex     [42.93, 99.18]        [-95.0, 95.0]      4.18              4.18             documented sign (flipped sign would also fit: sign not identified by range)
wrist_roll     [-157.28, -43.37]     [-157.21, 162.79]  0.07              0.0              documented sign (flipped sign would also fit: sign not identified by range)

same rule on other subsets (robustness): all_episodes: signs [1, 1, 1, 1, 1], accepted; heldout_only: signs [1, 1, 1, 1, 1], accepted -> agrees
released stock limits (crossed by fit episodes): {'shoulder_lift': {'lower': True, 'upper': False}, 'elbow_flex': {'lower': False, 'upper': True}, 'wrist_flex': {'lower': False, 'upper': True}, 'wrist_roll': {'lower': True, 'upper': False}}
```

Forward-kinematics plausibility under the shipped mapping (evidence, not a gate; assumes the base sits on the work surface):

```
gripper lowest point minus base lowest point (m): {'p1': 0.013, 'p5': 0.014, 'p50': 0.032, 'min': 0.003}; frames > 2 cm below the base: 0.0
frames within 1 deg of a stock MJCF limit: {'shoulder_pan': 0.0, 'shoulder_lift': 0.0093, 'elbow_flex': 0.3404, 'wrist_flex': 0.0058, 'wrist_roll': 0.0108}
frames beyond a stock MJCF limit: {'shoulder_pan': 0.0, 'shoulder_lift': 0.3479, 'elbow_flex': 0.0, 'wrist_flex': 0.0298, 'wrist_roll': 0.0596}
```

Gravity sag on real static frames (middle 80% of each episode, gripper >= 3 cm above the base plane): centred correlation between the servo's static error and the twin's gravity torque at the mapped pose, and the implied static stiffness (centred slope). Positive supports the mapping. Evidence, not a gate.

```
joint          corr [CI] verdict                                                                                         power (gravity std, n)  implied static K N m/rad  fitted kp
-------------  --------------------------------------------------------------------------------------------------------  ----------------------  ------------------------  ---------
shoulder_pan   not testable (gravity torque ~constant over the selected static poses; gravity std 0.0 N m, 5 frames)                                                       13.4
shoulder_lift  not testable (too few static off-table frames/episodes; gravity std 0.0341 N m, 5 frames)                                                                   11.6
elbow_flex     not testable (gravity torque ~constant over the selected static poses; gravity std 0.0055 N m, 5 frames)                                                    13.3
wrist_flex     not testable (gravity torque ~constant over the selected static poses; gravity std 0.0043 N m, 5 frames)                                                    17.1
wrist_roll     not testable (gravity torque ~constant over the selected static poses; gravity std 0.0001 N m, 5 frames)                                                    13.7
static frames: 143 (138 excluded as possible table contact) from 4 fit episodes
```

## Method

- Recording convention (lerobot-motorsbus): Current LeRobot (record_loop, `*.pos` names): x[t] is READ first (robot.get_observation), then the leader or policy is read and a[t] is SENT, so x[t] cannot reflect a[t] (observe-then-act).
- Replay: Replay (identical for both conventions): q_sim[0]=x[0] (zero velocity); for t=0..T-2 apply ctrl=a[t-d] (d = fitted integer command delay, stock d=0) for the whole frame, step `substeps` physics steps (timestep set so substeps*timestep = 1/fps exactly), record q_sim[t+1]; sim and real are compared at the same index t=1..T-1. The real sub-frame send-to-read offset (legacy: a[t] sent a few ms BEFORE x[t] is read; current: a[t] sent a few ms AFTER) is not modelled; it is absorbed by the fitted dynamics/delay, and it shifts lags between the two conventions by a fraction of a frame in opposite directions.
- Lag: lag = argmin_L Var(a[t] - y[t+L]) over a fixed window t in [0, T-10), parabolic sub-frame refinement; y = real or sim state. Includes the 1-frame sampling offset: in the replay and in observe-then-act (current LeRobot) recordings an instantaneous actuator measures 1.0 frame; in act-then-observe (legacy) recordings it would measure ~0, and a realistic servo measures its delay minus the few-ms write-to-read gap. Lags are therefore directly comparable between sim and real within one dataset, and only approximately (fraction of a frame) across codebases. Also reported in ms, since datasets differ in fps. Joints with command std < 1 deg in an episode are skipped.
- Units: LeRobot MotorNormMode.RANGE_M100_100; calibrated range recovered per joint from the tick lattice (wrist_roll full-turn = 4095 ticks confirms the recovery) (decided on the fit episodes; held-out episodes agree). Mapping to MJCF: q = sign*deg2rad(x) + deg2rad(offset); MJCF derived from TheRobotStudio so101_new_calib.xml, whose zero is the LeRobot 'middle of range' calibration pose; nominal offsets 0, documented signs +1 (checked per dataset against the recorded range of motion, mapping_checks).
- Split: future = last round(n*test_frac) episodes by index; interleaved = round(n*test_frac) episodes of the rest drawn by numpy default_rng(seed).permutation, plus every remaining episode beyond the fit cap; fit = the remaining episodes (<= max_train_episodes) (seed 0). Future: [40, 41, 42, 43, 44, 45, 46, 47, 48, 49]. Interleaved: [1, 2, 3, 4, 11, 18, 23, 24, 27, 34]. Overlap with fit: none.
- Fit: scipy.optimize.least_squares(method='trf', bounds), forward-difference Jacobian, log-parametrised kp; bounds {'kp': [1.0, 3000.0], 'kv': [0.0, 50.0], 'armature': [0.0001, 0.5], 'frictionloss': [0.0, 1.0]}; delays screened [0, 1, 2, 3, 4, 5] on 16 fit episodes (each from the best point of a coarse global servo-gain grid), final fit (30 evaluations max) on all fit episodes; budgets counted in evaluations (deterministic).
- Models compared: **stock** (Menagerie MJCF as published, documented mapping, no delay), **aligned stock** (stock dynamics + fitted delay + released limits), **baseline** (physics-free per-joint lag filter), **calibrated** (fitted kp, kv, frictionloss + delay + released limits).

## Limitations

- Dataset recorded in LeRobot RANGE_M100_100 (normalized) units; converted to degrees with the follower's calibrated range recovered from the encoder-tick lattice of observation.state (ranges in ticks: [2505, 2388, 2231, 2359, 4095]). Readings clipped at +-100 (fraction per joint: [0.0, 0.0, 0.0, 0.0, 0.0]) are true positions beyond the calibrated range and are compared as recorded.
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
- info.json robot_type is 'so100_follower' but the twin (robotstudio_so101) was chosen from the dataset name/card; SO-100 and SO-101 share servos and LeRobot code, but link geometry differs, so a hardware/twin mismatch cannot be excluded.
- Stock MJCF limits crossed by the fit episodes and released in the aligned/calibrated twins: shoulder_lift lower, elbow_flex upper, wrist_flex upper, wrist_roll lower. The stock twin is held at those limits (counted as stock-twin error).
- future held-out episodes leave the fit episodes' range of motion (+-2 deg) on more than 5% of frames: {'shoulder_pan': 0.3219, 'wrist_roll': 0.2523}.
- interleaved: final-pose (static) gap is larger for the calibrated twin than for stock on elbow_flex by point estimate; CIs separate on elbow_flex.
- future: final-pose (static) gap is larger for the calibrated twin than for stock on elbow_flex by point estimate; CIs separate on elbow_flex.

## Provenance and reproduction

```
dataset        lerobot/svla_so101_pickplace @ f641879e22172be7e8161d5e6c1503c2d2feb657 (requested f641879e22172be7e8161d5e6c1503c2d2feb657)
               LeRobot v3.0, robot_type so100_follower, 30 fps, 50 episodes loaded (repo: 50), 0 dropped
data files     data/chunk-000/file-000.parquet (579ad57e2454)
twin           robotstudio_so101 (so101.xml) from https://github.com/google-deepmind/mujoco_menagerie @ b0655057a9df2abe39ea7fc989914ba6f248301c
               dir sha256 6c00120339c328b1..., timestep 0.005 -> 0.0047619 s x 7 substeps/frame, contacts disabled
software       mujoco 3.17.0, numpy 2.5.4, scipy 1.18.1, python 3.13.18, meatspace_lab 2.0.0 (code sha256 924eb3d8364be665...)
hardware       x86_64 Intel(R) Xeon(R) Processor @ 2.80GHz; OpenBLAS kernel numpy: SkylakeX; scipy: SkylakeX
report         schema meatspace.twin-gap-report/v2
               results sha256 17a67f70aa05c8f875295b681833b2020b17cb45aeafbfdee7e5a53975be962c  (numbers only; any interpreter/CPU)
               content sha256 71fd766908a20570a63dd103021ec039f42a059d58102d6ed313e8f205000521  (numbers + environment above)
```

Reproduce (from `lab/`, see README) into a scratch directory and compare:

```
python -m meatspace_lab report --dataset lerobot/svla_so101_pickplace --revision f641879e22172be7e8161d5e6c1503c2d2feb657 \
    --twin .cache/menagerie/robotstudio_so101 --out /tmp/repro/ --max-episodes 200
python -m meatspace_lab verify reports/lerobot__svla_so101_pickplace/report.json /tmp/repro/report.json
```
