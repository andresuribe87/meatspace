# Twin Gap Report: IlyaGusev/so101_pick_gum x robotstudio_so101

```
HELD-OUT sim-vs-real joint RMSE, mean of 5 arm joints, deg  [95% bootstrap CI over episodes]
change = calibrated/reference - 1 (negative = better), paired by episode

FUTURE BLOCK (31 episodes)
  stock twin             5.63 [5.53, 5.74]
  aligned stock          2.41 [2.20, 2.64]   (stock dynamics + delay + released limits)
  lag-filter baseline    1.69 [1.48, 1.93]   (no physics: 3 params/joint)
  calibrated twin        1.33 [1.12, 1.58]
  change vs stock        -76% [-80, -72]   per-episode median -80% (range -87% .. -45%); 31/31 improved
  change vs baseline     -21% [-25, -18]   31/31 improved
  verdict                closes most of the gap (-76% [-80, -72] vs stock, residual 1.33 deg); calibrated twin beats the physics-free lag filter (-21% [-25, -18])

INTERLEAVED HELD-OUT (84 episodes)
  stock twin             4.19 [3.96, 4.43]
  aligned stock          2.13 [2.00, 2.26]   (stock dynamics + delay + released limits)
  lag-filter baseline    1.34 [1.22, 1.47]   (no physics: 3 params/joint)
  calibrated twin        0.93 [0.80, 1.07]
  change vs stock        -78% [-80, -75]   per-episode median -83% (range -89% .. -23%); 84/84 improved
  change vs baseline     -30% [-34, -26]   84/84 improved
  verdict                closes most of the gap (-78% [-80, -75] vs stock, residual 0.93 deg); calibrated twin beats the physics-free lag filter (-30% [-34, -26])

command->state lag, interleaved held-out, ms per joint (real / stock / calibrated):
  shoulder_pan 168/40/169  shoulder_lift 173/41/175  elbow_flex 173/43/174  wrist_flex 150/46/165  wrist_roll 159/48/166
  max |twin - real| over joints: stock 131.8 ms, calibrated 14.5 ms
```

![future-block held-out episode](heldout_episode.svg)

![per-joint RMSE, future block](rmse_by_joint_future.svg)

![per-joint RMSE, interleaved held-out](rmse_by_joint.svg)

## Future block (held out: the last 20% of episodes by index, recorded after every fit episode), n = 31

Per joint, mean over episodes [95% CI]. Degrees. Change = calibrated vs stock, negative = better.

```
sim-vs-real RMSE  stock                         aligned stock      baseline           calibrated                    change vs stock  vs baseline
----------------  ----------------------------  -----------------  -----------------  ----------------------------  ---------------  ---------------
shoulder_pan      3.09 [2.94, 3.24] (p90 3.59)  1.03 [1.00, 1.07]  0.70 [0.67, 0.72]  0.27 [0.25, 0.29] (p90 0.30)  -91% [-92, -91]  -62% [-65, -59]
shoulder_lift     8.83 [8.59, 9.07] (p90 9.68)  2.81 [2.71, 2.94]  1.89 [1.82, 1.98]  1.34 [1.29, 1.38] (p90 1.48)  -85% [-85, -84]  -29% [-32, -27]
elbow_flex        9.08 [8.81, 9.36] (p90 9.98)  2.81 [2.75, 2.87]  1.89 [1.83, 1.95]  1.41 [1.35, 1.48] (p90 1.63)  -84% [-85, -84]  -25% [-29, -22]
wrist_flex        4.43 [4.11, 4.75] (p90 5.60)  4.19 [3.22, 5.28]  3.46 [2.48, 4.57]  3.39 [2.36, 4.54] (p90 8.19)  -23% [-44, -3]   -2% [-6, -0]
wrist_roll        2.74 [2.40, 3.11] (p90 4.00)  1.19 [1.11, 1.27]  0.52 [0.48, 0.56]  0.28 [0.22, 0.34] (p90 0.43)  -90% [-91, -89]  -47% [-54, -39]
arm_mean          5.63 [5.53, 5.74] (p90 6.00)  2.41 [2.20, 2.64]  1.69 [1.48, 1.93]  1.33 [1.12, 1.58] (p90 2.22)  -76% [-80, -72]  -21% [-25, -18]

static-frame RMSE (quasi-static holds)  stock              baseline           calibrated         episodes with >= 10 static frames
--------------------------------------  -----------------  -----------------  -----------------  ---------------------------------
shoulder_pan                            0.57 [0.46, 0.69]  0.58 [0.47, 0.70]  0.16 [0.12, 0.21]  18
shoulder_lift                           0.45 [0.31, 0.59]  2.03 [1.82, 2.24]  1.22 [1.09, 1.33]  18
elbow_flex                              0.58 [0.53, 0.64]  3.26 [3.16, 3.33]  0.69 [0.64, 0.74]  18
wrist_flex                              0.10 [0.07, 0.12]  0.37 [0.34, 0.41]  0.11 [0.09, 0.13]  18
wrist_roll                              0.62 [0.52, 0.72]  0.59 [0.49, 0.67]  0.19 [0.13, 0.24]  18
arm_mean                                0.46 [0.41, 0.52]  1.37 [1.32, 1.41]  0.47 [0.45, 0.49]  18

command tracking RMSE  real robot         stock twin         calibrated twin
---------------------  -----------------  -----------------  -----------------
shoulder_pan           2.83 [2.70, 2.97]  0.32 [0.31, 0.34]  2.78 [2.66, 2.90]
shoulder_lift          8.43 [8.18, 8.68]  0.78 [0.74, 0.82]  8.08 [7.85, 8.32]
elbow_flex             8.75 [8.47, 9.05]  0.65 [0.59, 0.73]  8.34 [8.13, 8.58]
wrist_flex             5.40 [4.58, 6.36]  1.84 [1.20, 2.58]  3.76 [3.56, 3.98]
wrist_roll             2.54 [2.23, 2.89]  0.30 [0.26, 0.33]  2.48 [2.21, 2.76]

lag (frames)   real               stock              calibrated         real ms  stock ms  calib ms
-------------  -----------------  -----------------  -----------------  -------  --------  --------
shoulder_pan   3.36 [3.33, 3.38]  0.79 [0.78, 0.80]  3.33 [3.31, 3.36]  168      39        167
shoulder_lift  3.45 [3.43, 3.47]  0.87 [0.86, 0.90]  3.36 [3.34, 3.39]  173      44        168
elbow_flex     3.57 [3.55, 3.60]  0.91 [0.89, 0.94]  3.38 [3.37, 3.39]  179      46        169
wrist_flex     3.13 [3.08, 3.18]  0.86 [0.84, 0.88]  3.19 [3.17, 3.21]  156      43        159
wrist_roll     3.12 [3.09, 3.16]  0.86 [0.84, 0.89]  3.12 [3.10, 3.15]  156      43        156

final-pose gap  stock              calibrated
--------------  -----------------  -----------------
shoulder_pan    0.79 [0.66, 0.91]  0.17 [0.13, 0.21]
shoulder_lift   0.54 [0.42, 0.65]  1.22 [1.04, 1.39]
elbow_flex      0.48 [0.39, 0.58]  0.59 [0.51, 0.67]
wrist_flex      0.17 [0.09, 0.28]  0.16 [0.12, 0.20]
wrist_roll      0.62 [0.54, 0.70]  0.11 [0.08, 0.15]

fraction of states outside the fit episodes' range of motion +-2 deg: {'shoulder_pan': 0.0, 'shoulder_lift': 0.0, 'elbow_flex': 0.0, 'wrist_flex': 0.0, 'wrist_roll': 0.022}
fraction of states outside the twin's joint range: stock {'shoulder_pan': 0.0, 'shoulder_lift': 0.025, 'elbow_flex': 0.0, 'wrist_flex': 0.0, 'wrist_roll': 0.0}; calibrated {'shoulder_pan': 0.0, 'shoulder_lift': 0.0, 'elbow_flex': 0.0, 'wrist_flex': 0.0, 'wrist_roll': 0.0}
```

## Interleaved held-out (random episodes from the same period as the fit episodes), n = 84

Per joint, mean over episodes [95% CI]. Degrees. Change = calibrated vs stock, negative = better.

```
sim-vs-real RMSE  stock                          aligned stock      baseline           calibrated                    change vs stock  vs baseline
----------------  -----------------------------  -----------------  -----------------  ----------------------------  ---------------  ---------------
shoulder_pan      2.90 [2.77, 3.03] (p90 3.62)   1.04 [1.00, 1.08]  0.74 [0.71, 0.77]  0.28 [0.26, 0.30] (p90 0.39)  -90% [-91, -90]  -63% [-65, -60]
shoulder_lift     6.43 [6.00, 6.86] (p90 9.47)   2.99 [2.90, 3.08]  1.69 [1.63, 1.75]  1.12 [1.06, 1.19] (p90 1.59)  -83% [-83, -82]  -34% [-37, -30]
elbow_flex        6.97 [6.51, 7.45] (p90 10.11)  2.90 [2.80, 3.00]  1.46 [1.39, 1.52]  0.95 [0.86, 1.04] (p90 1.58)  -86% [-87, -85]  -35% [-39, -31]
wrist_flex        2.89 [2.61, 3.18] (p90 5.01)   2.81 [2.22, 3.43]  2.34 [1.78, 2.94]  2.11 [1.51, 2.75] (p90 6.78)  -27% [-43, -12]  -10% [-15, -6]
wrist_roll        1.74 [1.56, 1.95] (p90 2.59)   0.91 [0.85, 0.98]  0.45 [0.43, 0.49]  0.21 [0.18, 0.25] (p90 0.25)  -88% [-89, -87]  -54% [-59, -48]
arm_mean          4.19 [3.96, 4.43] (p90 6.19)   2.13 [2.00, 2.26]  1.34 [1.22, 1.47]  0.93 [0.80, 1.07] (p90 2.02)  -78% [-80, -75]  -30% [-34, -26]

static-frame RMSE (quasi-static holds)  stock              baseline           calibrated         episodes with >= 10 static frames
--------------------------------------  -----------------  -----------------  -----------------  ---------------------------------
shoulder_pan                            0.88 [0.68, 1.06]  0.87 [0.67, 1.04]  0.12 [0.08, 0.16]  9
shoulder_lift                           0.80 [0.54, 1.07]  1.67 [1.37, 2.00]  0.68 [0.33, 1.01]  9
elbow_flex                              1.48 [0.78, 2.30]  1.69 [1.20, 2.21]  0.42 [0.29, 0.55]  9
wrist_flex                              0.47 [0.18, 0.82]  0.80 [0.46, 1.18]  0.15 [0.09, 0.20]  9
wrist_roll                              0.49 [0.35, 0.61]  0.47 [0.34, 0.58]  0.10 [0.06, 0.14]  9
arm_mean                                0.83 [0.66, 1.00]  1.10 [0.95, 1.25]  0.29 [0.20, 0.38]  9

command tracking RMSE  real robot         stock twin         calibrated twin
---------------------  -----------------  -----------------  -----------------
shoulder_pan           2.66 [2.54, 2.78]  0.31 [0.29, 0.33]  2.62 [2.52, 2.72]
shoulder_lift          6.06 [5.66, 6.49]  0.66 [0.61, 0.71]  5.97 [5.64, 6.30]
elbow_flex             6.75 [6.29, 7.23]  0.44 [0.39, 0.49]  6.67 [6.28, 7.06]
wrist_flex             3.57 [3.00, 4.18]  1.27 [0.91, 1.67]  2.72 [2.52, 2.92]
wrist_roll             1.66 [1.49, 1.87]  0.20 [0.17, 0.23]  1.67 [1.52, 1.84]

lag (frames)   real               stock              calibrated         real ms  stock ms  calib ms
-------------  -----------------  -----------------  -----------------  -------  --------  --------
shoulder_pan   3.37 [3.34, 3.39]  0.79 [0.78, 0.80]  3.37 [3.33, 3.41]  168      40        169
shoulder_lift  3.46 [3.42, 3.49]  0.82 [0.80, 0.84]  3.49 [3.45, 3.54]  173      41        175
elbow_flex     3.46 [3.41, 3.51]  0.87 [0.85, 0.88]  3.48 [3.44, 3.53]  173      43        174
wrist_flex     3.00 [2.91, 3.08]  0.91 [0.86, 0.97]  3.29 [3.26, 3.33]  150      46        165
wrist_roll     3.18 [3.12, 3.27]  0.96 [0.92, 1.02]  3.32 [3.25, 3.41]  159      48        166

final-pose gap  stock              calibrated
--------------  -----------------  -----------------
shoulder_pan    1.62 [1.32, 1.95]  0.17 [0.14, 0.20]
shoulder_lift   3.40 [2.74, 4.09]  0.97 [0.88, 1.07]
elbow_flex      3.04 [2.56, 3.55]  0.73 [0.64, 0.82]
wrist_flex      0.80 [0.53, 1.13]  0.40 [0.24, 0.69]
wrist_roll      0.53 [0.42, 0.65]  0.12 [0.10, 0.14]

fraction of states outside the fit episodes' range of motion +-2 deg: {'shoulder_pan': 0.0, 'shoulder_lift': 0.0, 'elbow_flex': 0.0, 'wrist_flex': 0.0, 'wrist_roll': 0.0127}
fraction of states outside the twin's joint range: stock {'shoulder_pan': 0.0, 'shoulder_lift': 0.0145, 'elbow_flex': 0.0001, 'wrist_flex': 0.0, 'wrist_roll': 0.0}; calibrated {'shoulder_pan': 0.0, 'shoulder_lift': 0.0, 'elbow_flex': 0.0001, 'wrist_flex': 0.0, 'wrist_roll': 0.0}
```

## Fit episodes (used by the fit), n = 40

Per joint, mean over episodes [95% CI]. Degrees. Change = calibrated vs stock, negative = better.

```
sim-vs-real RMSE  stock                         aligned stock      baseline           calibrated                    change vs stock  vs baseline
----------------  ----------------------------  -----------------  -----------------  ----------------------------  ---------------  ---------------
shoulder_pan      2.81 [2.61, 2.99] (p90 3.61)  0.98 [0.93, 1.02]  0.72 [0.69, 0.76]  0.26 [0.24, 0.28] (p90 0.34)  -91% [-92, -90]  -64% [-66, -61]
shoulder_lift     5.91 [5.45, 6.39] (p90 8.09)  3.08 [2.95, 3.22]  1.74 [1.65, 1.84]  0.97 [0.90, 1.05] (p90 1.26)  -84% [-85, -82]  -44% [-48, -41]
elbow_flex        6.37 [5.83, 6.92] (p90 8.09)  3.07 [2.89, 3.25]  1.38 [1.30, 1.46]  0.83 [0.74, 0.92] (p90 1.22)  -87% [-88, -85]  -40% [-45, -34]
wrist_flex        2.76 [2.34, 3.21] (p90 5.16)  2.38 [1.59, 3.31]  2.02 [1.27, 2.92]  1.70 [0.90, 2.64] (p90 6.37)  -39% [-63, -13]  -16% [-29, -9]
wrist_roll        1.74 [1.48, 2.03] (p90 3.00)  0.87 [0.79, 0.96]  0.46 [0.44, 0.49]  0.19 [0.17, 0.22] (p90 0.26)  -89% [-90, -87]  -58% [-62, -54]
arm_mean          3.92 [3.66, 4.19] (p90 5.31)  2.08 [1.91, 2.26]  1.27 [1.11, 1.45]  0.79 [0.62, 0.99] (p90 1.64)  -80% [-84, -76]  -38% [-44, -31]

static-frame RMSE (quasi-static holds)  stock              baseline           calibrated         episodes with >= 10 static frames
--------------------------------------  -----------------  -----------------  -----------------  ---------------------------------
shoulder_pan                            0.65 [0.61, 0.70]  0.65 [0.62, 0.69]  0.11 [0.06, 0.16]  2
shoulder_lift                           2.36 [0.71, 4.00]  1.66 [1.54, 1.77]  0.21 [0.05, 0.37]  2
elbow_flex                              0.22 [0.21, 0.23]  2.50 [2.50, 2.50]  0.46 [0.45, 0.48]  2
wrist_flex                              0.59 [0.43, 0.75]  0.98 [0.81, 1.15]  0.27 [0.10, 0.43]  2
wrist_roll                              0.54 [0.46, 0.62]  0.48 [0.37, 0.58]  0.04 [0.04, 0.04]  2
arm_mean                                0.87 [0.51, 1.24]  1.25 [1.18, 1.32]  0.22 [0.14, 0.30]  2

command tracking RMSE  real robot         stock twin         calibrated twin
---------------------  -----------------  -----------------  -----------------
shoulder_pan           2.58 [2.40, 2.74]  0.30 [0.27, 0.32]  2.56 [2.41, 2.71]
shoulder_lift          5.56 [5.12, 6.01]  0.55 [0.50, 0.60]  5.52 [5.15, 5.89]
elbow_flex             6.14 [5.63, 6.64]  0.36 [0.31, 0.40]  6.10 [5.65, 6.52]
wrist_flex             3.25 [2.46, 4.17]  1.03 [0.56, 1.60]  2.60 [2.32, 2.90]
wrist_roll             1.65 [1.41, 1.91]  0.19 [0.15, 0.23]  1.66 [1.43, 1.91]

lag (frames)   real               stock              calibrated         real ms  stock ms  calib ms
-------------  -----------------  -----------------  -----------------  -------  --------  --------
shoulder_pan   3.37 [3.32, 3.41]  0.79 [0.78, 0.80]  3.41 [3.35, 3.48]  168      39        171
shoulder_lift  3.50 [3.45, 3.54]  0.80 [0.79, 0.82]  3.57 [3.49, 3.66]  175      40        179
elbow_flex     3.38 [3.32, 3.44]  0.86 [0.84, 0.87]  3.48 [3.39, 3.61]  169      43        174
wrist_flex     3.07 [2.96, 3.18]  0.92 [0.86, 1.00]  3.32 [3.27, 3.38]  154      46        166
wrist_roll     3.16 [3.09, 3.24]  0.93 [0.89, 0.98]  3.31 [3.24, 3.39]  158      46        165

final-pose gap  stock              calibrated
--------------  -----------------  -----------------
shoulder_pan    2.19 [1.52, 2.96]  0.17 [0.13, 0.22]
shoulder_lift   3.48 [2.61, 4.41]  0.79 [0.67, 0.92]
elbow_flex      3.00 [2.44, 3.53]  0.74 [0.62, 0.88]
wrist_flex      0.80 [0.37, 1.36]  0.57 [0.20, 1.25]
wrist_roll      0.53 [0.40, 0.69]  0.14 [0.10, 0.17]
```

## Calibrated twin

Package `calibrated_twin.json`, sha256 `c614ff53e91c3f2cc10412c0c46a9627bcf693a1eb62f1bd57085a58a1d097fe`.
Fitted: kp[shoulder_pan], kv[shoulder_pan], frictionloss[shoulder_pan], kp[shoulder_lift], kv[shoulder_lift], frictionloss[shoulder_lift], kp[elbow_flex], kv[elbow_flex], frictionloss[elbow_flex], kp[wrist_flex], kv[wrist_flex], frictionloss[wrist_flex], kp[wrist_roll], kv[wrist_roll], frictionloss[wrist_roll]; command delay 0 frame(s) (screened train MSE by delay, deg^2: {'0': 0.41876, '1': 0.72693, '2': 1.83529, '3': 3.7853, '4': 8.44844, '5': 15.21006}). Train MSE 2.57383 deg^2. Optimizer: converged (`ftol` termination condition is satisfied.). At a bound: none.

```
joint          kp N m/rad      kv N m s/rad   frictionloss N m  armature kg m^2  zero offset deg
-------------  --------------  -------------  ----------------  ---------------  -----------------
shoulder_pan   998.2 -> 8.086  2.73 -> 0.386  0.052 -> 0.157    0.028 (fixed)    +0.0 (documented)
shoulder_lift  998.2 -> 9.754  2.73 -> 0.562  0.052 -> 0.426    0.028 (fixed)    +0.0 (documented)
elbow_flex     998.2 -> 9.127  2.73 -> 0.64   0.052 -> 0.268    0.028 (fixed)    +0.0 (documented)
wrist_flex     998.2 -> 7.981  2.73 -> 0.47   0.052 -> 0.0911   0.028 (fixed)    +0.0 (documented)
wrist_roll     998.2 -> 7.295  2.73 -> 0.324  0.052 -> 0.0774   0.028 (fixed)    +0.0 (documented)
```

Identifiable servo combinations (the individual gains are not the claim): natural frequency sqrt(kp/I_eff) and damping ratio (kv+damping)/(2 sqrt(kp I_eff)), I_eff = joint-space inertia at the median pose incl. armature; 95% CI from a linearised episode bootstrap of the fit.

```
joint          I_eff kg m^2  natural freq Hz [CI]  damping ratio [CI]
-------------  ------------  --------------------  --------------------
shoulder_pan   0.04262       2.19 [2.16, 2.22]     0.839 [0.822, 0.855]
shoulder_lift  0.03999       2.49 [2.46, 2.51]     0.93 [0.894, 0.957]
elbow_flex     0.03512       2.57 [2.49, 2.63]     1.1 [1.04, 1.15]
wrist_flex     0.02913       2.63 [1.84, 3.65]     1.11 [0.785, 1.34]
wrist_roll     0.02808       2.57 [2.47, 2.68]     1.02 [0.983, 1.05]
```

Per-parameter identifiability (condition number of J^T J 7880.0): marginal/conditional std ratio = sqrt(VIF); >= 10 means only a combination with other parameters is identified.

```
parameter                    value    95% CI            std ratio  identified alone
---------------------------  -------  ----------------  ---------  ----------------
kp[shoulder_pan]             8.086    [7.88, 8.31]      6.81       yes
kv[shoulder_pan]             0.3856   [0.358, 0.411]    5.41       yes
frictionloss[shoulder_pan]   0.1565   [0.148, 0.165]    2.4        yes
kp[shoulder_lift]            9.754    [9.55, 9.95]      2.22       yes
kv[shoulder_lift]            0.5617   [0.516, 0.597]    2.35       yes
frictionloss[shoulder_lift]  0.4259   [0.4, 0.455]      1.39       yes
kp[elbow_flex]               9.127    [8.62, 9.62]      3.77       yes
kv[elbow_flex]               0.64     [0.546, 0.731]    2.8        yes
frictionloss[elbow_flex]     0.2679   [0.238, 0.296]    1.97       yes
kp[wrist_flex]               7.981    [3.91, 15.3]      7.48       yes
kv[wrist_flex]               0.4701   [0, 1.17]         6.82       yes
frictionloss[wrist_flex]     0.09106  [0, 0.189]        1.66       yes
kp[wrist_roll]               7.295    [6.75, 7.94]      8.53       yes
kv[wrist_roll]               0.3243   [0.264, 0.377]    7.36       yes
frictionloss[wrist_roll]     0.07737  [0.0683, 0.0875]  2.29       yes
```

Posterior correlations |r| > 0.95: kp[wrist_roll] ~ kv[wrist_roll] (+0.987); kp[wrist_flex] ~ kv[wrist_flex] (+0.984); kp[shoulder_pan] ~ kv[shoulder_pan] (+0.967)

Weakest directions (relative eigenvalue: top loadings): 0.00013: kp[wrist_roll] -0.97, kv[wrist_roll] -0.18, frictionloss[wrist_roll] -0.14, kp[wrist_flex] +0.00; 0.00034: kp[wrist_flex] -0.97, kv[wrist_flex] -0.21, frictionloss[wrist_flex] -0.15, kp[shoulder_pan] +0.00; 0.0004: kp[shoulder_pan] -0.94, frictionloss[shoulder_pan] -0.28, kv[shoulder_pan] -0.18, kp[wrist_flex] +0.00

Physics-free baseline (fitted on the same fit episodes): y[t+1] = y[t] + alpha*(a[t-d] + b - y[t]), y[0] = x[0], per arm joint; alpha [0.38, 0.38, 0.38, 0.3, 0.3], delay [1, 1, 1, 0, 0] frames, bias [0.0166, 2.3982, 2.7511, -0.4014, 0.0055] deg.

## Mapping audit

Sign checks (1st-99th percentile of FIT-episode states vs MJCF range):

```
joint          recorded p1..p99 deg  MJCF range deg     shift (doc sign)  shift (flipped)  decision
-------------  --------------------  -----------------  ----------------  ---------------  ---------------------------------------------------------------------------
shoulder_pan   [-59.15, 16.79]       [-110.0, 110.0]    0.0               0.0              documented sign (flipped sign would also fit: sign not identified by range)
shoulder_lift  [-99.89, 60.86]       [-100.0, 100.0]    0.0               0.0              documented sign (flipped sign would also fit: sign not identified by range)
elbow_flex     [-61.52, 96.41]       [-96.83, 96.83]    0.0               0.0              documented sign (flipped sign would also fit: sign not identified by range)
wrist_flex     [1.55, 87.67]         [-95.0, 95.0]      0.0               0.0              documented sign (flipped sign would also fit: sign not identified by range)
wrist_roll     [-33.09, 100.85]      [-157.21, 162.79]  0.0               0.0              documented sign (flipped sign would also fit: sign not identified by range)

same rule on other subsets (robustness): all_episodes: signs [1, 1, 1, 1, 1], accepted; heldout_only: signs [1, 1, 1, 1, 1], accepted -> agrees
released stock limits (crossed by fit episodes): {'shoulder_lift': {'lower': True, 'upper': False}, 'wrist_flex': {'lower': False, 'upper': True}}
```

Forward-kinematics plausibility under the shipped mapping (evidence, not a gate; assumes the base sits on the work surface):

```
gripper lowest point minus base lowest point (m): {'p1': -0.001, 'p5': 0.007, 'p50': 0.045, 'min': -0.015}; frames > 2 cm below the base: 0.0
frames within 1 deg of a stock MJCF limit: {'shoulder_pan': 0.0, 'shoulder_lift': 0.04, 'elbow_flex': 0.101, 'wrist_flex': 0.0, 'wrist_roll': 0.0}
frames beyond a stock MJCF limit: {'shoulder_pan': 0.0, 'shoulder_lift': 0.0, 'elbow_flex': 0.0, 'wrist_flex': 0.0, 'wrist_roll': 0.0}
```

Gravity sag on real static frames (middle 80% of each episode, gripper >= 3 cm above the base plane): centred correlation between the servo's static error and the twin's gravity torque at the mapped pose, and the implied static stiffness (centred slope). Positive supports the mapping. Evidence, not a gate.

```
joint          corr [CI] verdict                                                                                          power (gravity std, n)  implied static K N m/rad  fitted kp
-------------  ---------------------------------------------------------------------------------------------------------  ----------------------  ------------------------  ---------
shoulder_pan   not testable (gravity torque ~constant over the selected static poses; gravity std 0.0 N m, 94 frames)                                                       8.09
shoulder_lift  +0.54 [+0.12, +0.77] positive                                                                              0.2801 N m, 94 fr       23.6 [12.5, 275]          9.75
elbow_flex     -0.04 [-0.67, +0.31] inconclusive                                                                          0.0443 N m, 94 fr       n/a                       9.13
wrist_flex     +0.51 [+0.12, +0.81] positive                                                                              0.046 N m, 94 fr        0.82 [0.37, 23.7]         7.98
wrist_roll     not testable (gravity torque ~constant over the selected static poses; gravity std 0.0023 N m, 94 frames)                                                    7.3
static frames: 108 (14 excluded as possible table contact) from 18 fit episodes
```

## Method

- Recording convention (lerobot-motorsbus): Current LeRobot (record_loop, `*.pos` names): x[t] is READ first (robot.get_observation), then the leader or policy is read and a[t] is SENT, so x[t] cannot reflect a[t] (observe-then-act).
- Replay: Replay (identical for both conventions): q_sim[0]=x[0] (zero velocity); for t=0..T-2 apply ctrl=a[t-d] (d = fitted integer command delay, stock d=0) for the whole frame, step `substeps` physics steps (timestep set so substeps*timestep = 1/fps exactly), record q_sim[t+1]; sim and real are compared at the same index t=1..T-1. The real sub-frame send-to-read offset (legacy: a[t] sent a few ms BEFORE x[t] is read; current: a[t] sent a few ms AFTER) is not modelled; it is absorbed by the fitted dynamics/delay, and it shifts lags between the two conventions by a fraction of a frame in opposite directions.
- Lag: lag = argmin_L Var(a[t] - y[t+L]) over a fixed window t in [0, T-10), parabolic sub-frame refinement; y = real or sim state. Includes the 1-frame sampling offset: in the replay and in observe-then-act (current LeRobot) recordings an instantaneous actuator measures 1.0 frame; in act-then-observe (legacy) recordings it would measure ~0, and a realistic servo measures its delay minus the few-ms write-to-read gap. Lags are therefore directly comparable between sim and real within one dataset, and only approximately (fraction of a frame) across codebases. Also reported in ms, since datasets differ in fps. Joints with command std < 1 deg in an episode are skipped.
- Units: LeRobot MotorNormMode.DEGREES (tick = 360/4095 units verified on every arm joint) (decided on the fit episodes; held-out episodes agree). Mapping to MJCF: q = sign*deg2rad(x) + deg2rad(offset); MJCF derived from TheRobotStudio so101_new_calib.xml, whose zero is the LeRobot 'middle of range' calibration pose; nominal offsets 0, documented signs +1 (checked per dataset against the recorded range of motion, mapping_checks).
- Split: future = last round(n*test_frac) episodes by index; interleaved = round(n*test_frac) episodes of the rest drawn by numpy default_rng(seed).permutation, plus every remaining episode beyond the fit cap; fit = the remaining episodes (<= max_train_episodes) (seed 0). Future: [124, 125, 126, 127, 128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 152, 153, 154]. Interleaved: [0, 1, 5, 7, 10, 11, 12, 13, 14, 16, 20, 21, 23, 26, 27, 29, 31, 32, 33, 34, 36, 37, 38, 39, 40, 41, 44, 45, 46, 47, 48, 49, 50, 51, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 68, 69, 70, 73, 75, 76, 77, 78, 79, 80, 84, 85, 86, 88, 89, 92, 95, 96, 97, 98, 101, 102, 103, 104, 106, 108, 109, 110, 111, 113, 114, 115, 117, 118, 119, 120, 121, 122, 123]. Overlap with fit: none.
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
- Confidence intervals are percentile bootstraps over episodes (whole episodes resampled, 10,000 draws, fixed seed); with 31 future / 84 interleaved held-out episodes they are approximate and tend to be slightly too narrow. They do not cover the choice of split, of fit configuration, or of dataset.
- info.json robot_type is the generic 'so_follower' (LeRobot's shared SO-100/SO-101 class); the twin (robotstudio_so101) was chosen from the dataset name/card.
- Stock MJCF limits crossed by the fit episodes and released in the aligned/calibrated twins: shoulder_lift lower, wrist_flex upper. The stock twin is held at those limits (counted as stock-twin error).
- future: final-pose (static) gap is larger for the calibrated twin than for stock on shoulder_lift, elbow_flex by point estimate; CIs separate on shoulder_lift.

## Provenance and reproduction

```
dataset        IlyaGusev/so101_pick_gum @ 82136b23ac2a6bbb9927baca8e79ae98da53db79 (requested 82136b23ac2a6bbb9927baca8e79ae98da53db79)
               LeRobot v3.0, robot_type so_follower, 20 fps, 155 episodes loaded (repo: 155), 0 dropped
data files     data/chunk-000/file-000.parquet (45dfb2de6f04), data/chunk-000/file-001.parquet (4286c047a8c5), data/chunk-000/file-002.parquet (f3f2001bf2e0), ... (4 files)
twin           robotstudio_so101 (so101.xml) from https://github.com/google-deepmind/mujoco_menagerie @ b0655057a9df2abe39ea7fc989914ba6f248301c
               dir sha256 6c00120339c328b1..., timestep 0.005 -> 0.005 s x 10 substeps/frame, contacts disabled
software       mujoco 3.17.0, numpy 2.5.4, scipy 1.18.1, python 3.13.18, meatspace_lab 2.0.0 (code sha256 924eb3d8364be665...)
hardware       x86_64 Intel(R) Xeon(R) Processor @ 2.80GHz; OpenBLAS kernel numpy: SkylakeX; scipy: SkylakeX
report         schema meatspace.twin-gap-report/v2
               results sha256 efe099d44eebfb851cfacad41ccbea29fa107a212ef5f1fde36c0423c9fe17f6  (numbers only; any interpreter/CPU)
               content sha256 0731cab02a4ec223bbbd7ef57f13dc2a8930e8e186bd5d5750ad9d914add8f34  (numbers + environment above)
```

Reproduce (from `lab/`, see README) into a scratch directory and compare:

```
python -m meatspace_lab report --dataset IlyaGusev/so101_pick_gum --revision 82136b23ac2a6bbb9927baca8e79ae98da53db79 \
    --twin .cache/menagerie/robotstudio_so101 --out /tmp/repro/ --max-episodes 200
python -m meatspace_lab verify reports/IlyaGusev__so101_pick_gum/report.json /tmp/repro/report.json
```
