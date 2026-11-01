# Twin Gap Report: xsatvik/mixer_on_off_new_1 x trs_so_arm100

```
HELD-OUT sim-vs-real joint RMSE, mean of 5 arm joints, deg  [95% bootstrap CI over episodes]
change = calibrated/reference - 1 (negative = better), paired by episode

FUTURE BLOCK (12 episodes)
  stock twin             1.55 [1.49, 1.63]
  aligned stock          1.45 [1.38, 1.54]   (stock dynamics + delay + released limits)
  lag-filter baseline    1.22 [1.14, 1.31]   (no physics: 3 params/joint)
  calibrated twin        1.08 [0.99, 1.18]
  change vs stock        -30% [-34, -27]   per-episode median -33% (range -40% .. -23%); 12/12 improved
  change vs baseline     -11% [-14, -8]   12/12 improved
  verdict                closes part of the gap (-30% [-34, -27] vs stock, residual 1.08 deg); calibrated twin beats the physics-free lag filter (-11% [-14, -8])

INTERLEAVED HELD-OUT (12 episodes)
  stock twin             1.72 [1.59, 1.86]
  aligned stock          1.62 [1.49, 1.77]   (stock dynamics + delay + released limits)
  lag-filter baseline    1.39 [1.25, 1.53]   (no physics: 3 params/joint)
  calibrated twin        1.27 [1.14, 1.42]
  change vs stock        -26% [-29, -23]   per-episode median -27% (range -35% .. -17%); 12/12 improved
  change vs baseline     -8% [-11, -6]   12/12 improved
  verdict                closes part of the gap (-26% [-29, -23] vs stock, residual 1.27 deg); calibrated twin beats the physics-free lag filter (-8% [-11, -6])

command->state lag, interleaved held-out, ms per joint (real / stock / calibrated):
  shoulder_pan 273/139/284  shoulder_lift 268/125/296  elbow_flex 259/120/307  wrist_flex 333/122/333  wrist_roll 301/133/333
  max |twin - real| over joints: stock 211.8 ms, calibrated 48.1 ms
```

![future-block held-out episode](heldout_episode.svg)

![per-joint RMSE, future block](rmse_by_joint_future.svg)

![per-joint RMSE, interleaved held-out](rmse_by_joint.svg)

## Future block (held out: the last 20% of episodes by index, recorded after every fit episode), n = 12

Per joint, mean over episodes [95% CI]. Degrees. Change = calibrated vs stock, negative = better.

```
sim-vs-real RMSE  stock                         aligned stock      baseline           calibrated                    change vs stock  vs baseline
----------------  ----------------------------  -----------------  -----------------  ----------------------------  ---------------  ---------------
shoulder_pan      0.69 [0.63, 0.76] (p90 0.76)  0.67 [0.62, 0.75]  0.59 [0.51, 0.68]  0.58 [0.53, 0.66] (p90 0.63)  -15% [-19, -12]  -2% [-8, +6]
shoulder_lift     1.63 [1.45, 1.85] (p90 1.85)  1.66 [1.50, 1.86]  1.61 [1.47, 1.78]  1.51 [1.34, 1.73] (p90 1.75)  -7% [-11, -3]    -6% [-10, -2]
elbow_flex        2.80 [2.71, 2.90] (p90 2.98)  2.51 [2.41, 2.63]  1.98 [1.86, 2.12]  1.87 [1.75, 2.00] (p90 2.11)  -33% [-37, -30]  -6% [-9, -1]
wrist_flex        1.95 [1.83, 2.07] (p90 2.25)  1.75 [1.57, 1.92]  1.36 [1.16, 1.58]  0.89 [0.69, 1.10] (p90 1.34)  -54% [-64, -45]  -35% [-42, -29]
wrist_roll        0.71 [0.66, 0.75] (p90 0.80)  0.68 [0.63, 0.72]  0.54 [0.47, 0.61]  0.55 [0.51, 0.59] (p90 0.63)  -22% [-28, -17]  +2% [-6, +11]
arm_mean          1.55 [1.49, 1.63] (p90 1.67)  1.45 [1.38, 1.54]  1.22 [1.14, 1.31]  1.08 [0.99, 1.18] (p90 1.23)  -30% [-34, -27]  -11% [-14, -8]

static-frame RMSE (quasi-static holds)  stock              baseline           calibrated         episodes with >= 10 static frames
--------------------------------------  -----------------  -----------------  -----------------  ---------------------------------
shoulder_pan                            0.84 [0.54, 1.19]  0.80 [0.49, 1.18]  0.77 [0.61, 0.99]  10
shoulder_lift                           2.52 [1.70, 3.48]  2.42 [1.78, 3.20]  2.22 [1.67, 2.92]  10
elbow_flex                              2.19 [1.27, 3.21]  2.29 [1.15, 3.53]  2.45 [2.03, 2.96]  10
wrist_flex                              2.75 [2.53, 3.01]  1.52 [1.32, 1.72]  0.50 [0.27, 0.77]  10
wrist_roll                              0.52 [0.36, 0.68]  0.42 [0.31, 0.54]  0.49 [0.34, 0.62]  10
arm_mean                                1.76 [1.38, 2.20]  1.49 [1.10, 1.93]  1.29 [1.08, 1.53]  10

command tracking RMSE  real robot         stock twin         calibrated twin
---------------------  -----------------  -----------------  -----------------
shoulder_pan           0.79 [0.74, 0.86]  0.25 [0.23, 0.28]  0.57 [0.54, 0.59]
shoulder_lift          1.85 [1.68, 2.06]  0.53 [0.51, 0.56]  1.34 [1.29, 1.40]
elbow_flex             3.33 [3.24, 3.42]  0.81 [0.78, 0.84]  2.78 [2.72, 2.83]
wrist_flex             2.36 [2.24, 2.49]  0.91 [0.61, 1.25]  2.25 [2.21, 2.29]
wrist_roll             0.79 [0.74, 0.84]  0.22 [0.20, 0.24]  0.64 [0.61, 0.67]

lag (frames)   real                  stock              calibrated            real ms  stock ms  calib ms
-------------  --------------------  -----------------  --------------------  -------  --------  --------
shoulder_pan   8.31 [7.26, 9.28]     4.55 [4.31, 4.82]  9.63 [9.20, 10.00]    277      152       321
shoulder_lift  7.62 [6.90, 8.42]     3.76 [3.71, 3.82]  9.52 [9.20, 9.81]     254      125       317
elbow_flex     8.79 [8.41, 9.20]     3.60 [3.58, 3.62]  9.64 [9.37, 9.87]     293      120       321
wrist_flex     10.00 [10.00, 10.00]  3.71 [3.65, 3.78]  10.00 [10.00, 10.00]  333      124       333
wrist_roll     9.74 [9.28, 10.00]    4.17 [4.05, 4.31]  10.00 [10.00, 10.00]  325      139       333

final-pose gap  stock              calibrated
--------------  -----------------  -----------------
shoulder_pan    0.62 [0.49, 0.75]  0.33 [0.21, 0.46]
shoulder_lift   0.70 [0.51, 0.89]  1.27 [1.05, 1.49]
elbow_flex      0.59 [0.41, 0.79]  0.93 [0.60, 1.28]
wrist_flex      1.35 [0.90, 1.78]  0.53 [0.25, 0.89]
wrist_roll      0.59 [0.44, 0.75]  0.42 [0.22, 0.63]

fraction of states outside the fit episodes' range of motion +-2 deg: {'shoulder_pan': 0.0, 'shoulder_lift': 0.0, 'elbow_flex': 0.0, 'wrist_flex': 0.0, 'wrist_roll': 0.1157}
fraction of states outside the twin's joint range: stock {'shoulder_pan': 0.0, 'shoulder_lift': 0.0, 'elbow_flex': 0.0, 'wrist_flex': 0.0885, 'wrist_roll': 0.0}; calibrated {'shoulder_pan': 0.0, 'shoulder_lift': 0.0, 'elbow_flex': 0.0, 'wrist_flex': 0.0, 'wrist_roll': 0.0}
```

## Interleaved held-out (random episodes from the same period as the fit episodes), n = 12

Per joint, mean over episodes [95% CI]. Degrees. Change = calibrated vs stock, negative = better.

```
sim-vs-real RMSE  stock                         aligned stock      baseline           calibrated                    change vs stock  vs baseline
----------------  ----------------------------  -----------------  -----------------  ----------------------------  ---------------  ---------------
shoulder_pan      0.79 [0.67, 0.93] (p90 1.07)  0.77 [0.66, 0.89]  0.71 [0.57, 0.86]  0.67 [0.56, 0.80] (p90 0.95)  -15% [-18, -12]  -5% [-14, +4]
shoulder_lift     2.54 [2.10, 3.06] (p90 3.18)  2.53 [2.12, 3.03]  2.38 [2.01, 2.84]  2.34 [1.93, 2.84] (p90 3.00)  -8% [-9, -6]     -1% [-5, +2]
elbow_flex        2.73 [2.56, 2.91] (p90 3.11)  2.52 [2.35, 2.70]  2.10 [1.85, 2.34]  1.97 [1.75, 2.19] (p90 2.44)  -28% [-34, -22]  -6% [-12, +1]
wrist_flex        1.85 [1.74, 1.96] (p90 2.11)  1.62 [1.51, 1.73]  1.18 [1.07, 1.29]  0.83 [0.71, 0.94] (p90 1.06)  -55% [-60, -50]  -30% [-36, -25]
wrist_roll        0.69 [0.64, 0.73] (p90 0.77)  0.66 [0.62, 0.70]  0.56 [0.49, 0.64]  0.53 [0.48, 0.58] (p90 0.64)  -23% [-31, -14]  -4% [-16, +9]
arm_mean          1.72 [1.59, 1.86] (p90 1.97)  1.62 [1.49, 1.77]  1.39 [1.25, 1.53]  1.27 [1.14, 1.42] (p90 1.54)  -26% [-29, -23]  -8% [-11, -6]

static-frame RMSE (quasi-static holds)  stock  baseline  calibrated  episodes with >= 10 static frames
--------------------------------------  -----  --------  ----------  ---------------------------------
shoulder_pan                            0.19   0.11      0.17        1
shoulder_lift                           1.85   1.94      1.86        1
elbow_flex                              0.61   0.67      1.32        1
wrist_flex                              2.78   0.69      0.43        1
wrist_roll                              0.34   0.21      0.42        1
arm_mean                                1.15   0.72      0.84        1

command tracking RMSE  real robot         stock twin         calibrated twin
---------------------  -----------------  -----------------  -----------------
shoulder_pan           0.93 [0.81, 1.07]  0.32 [0.28, 0.35]  0.65 [0.62, 0.70]
shoulder_lift          2.78 [2.37, 3.28]  0.66 [0.63, 0.70]  1.61 [1.55, 1.68]
elbow_flex             3.22 [3.08, 3.38]  0.85 [0.77, 0.93]  2.81 [2.75, 2.88]
wrist_flex             2.19 [2.08, 2.31]  0.64 [0.50, 0.80]  2.16 [2.09, 2.23]
wrist_roll             0.76 [0.71, 0.81]  0.21 [0.20, 0.23]  0.65 [0.63, 0.67]

lag (frames)   real                  stock              calibrated            real ms  stock ms  calib ms
-------------  --------------------  -----------------  --------------------  -------  --------  --------
shoulder_pan   8.18 [7.07, 9.25]     4.16 [4.01, 4.33]  8.52 [7.70, 9.29]     273      139       284
shoulder_lift  8.04 [7.15, 8.89]     3.74 [3.72, 3.77]  8.88 [8.54, 9.25]     268      125       296
elbow_flex     7.77 [7.43, 8.07]     3.60 [3.55, 3.65]  9.21 [8.82, 9.60]     259      120       307
wrist_flex     10.00 [10.00, 10.00]  3.65 [3.58, 3.72]  10.00 [10.00, 10.00]  333      122       333
wrist_roll     9.02 [7.82, 10.00]    4.00 [3.89, 4.10]  10.00 [10.00, 10.00]  301      133       333

final-pose gap  stock              calibrated
--------------  -----------------  -----------------
shoulder_pan    0.52 [0.41, 0.65]  0.30 [0.17, 0.43]
shoulder_lift   0.56 [0.37, 0.74]  1.09 [0.90, 1.28]
elbow_flex      0.31 [0.21, 0.42]  1.07 [0.84, 1.30]
wrist_flex      1.35 [0.99, 1.68]  0.51 [0.32, 0.71]
wrist_roll      0.69 [0.51, 0.88]  0.36 [0.23, 0.50]

fraction of states outside the fit episodes' range of motion +-2 deg: {'shoulder_pan': 0.0, 'shoulder_lift': 0.0, 'elbow_flex': 0.0, 'wrist_flex': 0.0, 'wrist_roll': 0.0}
fraction of states outside the twin's joint range: stock {'shoulder_pan': 0.0, 'shoulder_lift': 0.0, 'elbow_flex': 0.0, 'wrist_flex': 0.0377, 'wrist_roll': 0.0}; calibrated {'shoulder_pan': 0.0, 'shoulder_lift': 0.0, 'elbow_flex': 0.0, 'wrist_flex': 0.0, 'wrist_roll': 0.0}
```

## Fit episodes (used by the fit), n = 34

Per joint, mean over episodes [95% CI]. Degrees. Change = calibrated vs stock, negative = better.

```
sim-vs-real RMSE  stock                         aligned stock      baseline           calibrated                    change vs stock  vs baseline
----------------  ----------------------------  -----------------  -----------------  ----------------------------  ---------------  ---------------
shoulder_pan      0.74 [0.67, 0.81] (p90 1.06)  0.73 [0.66, 0.80]  0.64 [0.56, 0.73]  0.64 [0.58, 0.71] (p90 0.97)  -13% [-15, -11]  +1% [-4, +6]
shoulder_lift     2.28 [2.05, 2.54] (p90 3.36)  2.31 [2.10, 2.55]  2.19 [2.00, 2.40]  2.14 [1.92, 2.37] (p90 3.12)  -6% [-7, -5]     -3% [-5, -1]
elbow_flex        2.84 [2.75, 2.94] (p90 3.17)  2.62 [2.52, 2.73]  2.27 [2.14, 2.41]  2.07 [1.95, 2.20] (p90 2.52)  -27% [-30, -24]  -9% [-11, -6]
wrist_flex        1.92 [1.83, 2.01] (p90 2.27)  1.66 [1.55, 1.77]  1.20 [1.09, 1.33]  0.86 [0.76, 0.97] (p90 1.30)  -55% [-59, -51]  -28% [-32, -24]
wrist_roll        0.68 [0.66, 0.71] (p90 0.77)  0.66 [0.63, 0.69]  0.56 [0.52, 0.60]  0.51 [0.49, 0.54] (p90 0.58)  -25% [-29, -21]  -9% [-15, -2]
arm_mean          1.69 [1.61, 1.79] (p90 2.14)  1.60 [1.51, 1.69]  1.37 [1.29, 1.47]  1.24 [1.16, 1.34] (p90 1.67)  -27% [-28, -25]  -9% [-11, -8]

static-frame RMSE (quasi-static holds)  stock              baseline           calibrated         episodes with >= 10 static frames
--------------------------------------  -----------------  -----------------  -----------------  ---------------------------------
shoulder_pan                            1.67 [0.66, 2.69]  1.63 [0.76, 2.51]  1.43 [0.55, 2.30]  4
shoulder_lift                           6.94 [4.35, 9.96]  6.30 [4.04, 8.76]  6.19 [3.79, 9.00]  4
elbow_flex                              4.93 [3.66, 6.19]  5.35 [3.90, 6.79]  4.38 [3.43, 5.36]  4
wrist_flex                              3.83 [2.80, 4.87]  2.79 [2.11, 3.59]  1.89 [0.91, 2.86]  4
wrist_roll                              0.59 [0.46, 0.73]  0.51 [0.40, 0.69]  0.52 [0.37, 0.65]  4
arm_mean                                3.59 [2.78, 4.46]  3.32 [2.56, 4.04]  2.88 [2.10, 3.81]  4

command tracking RMSE  real robot         stock twin         calibrated twin
---------------------  -----------------  -----------------  -----------------
shoulder_pan           0.86 [0.79, 0.94]  0.30 [0.27, 0.34]  0.61 [0.58, 0.64]
shoulder_lift          2.50 [2.29, 2.74]  0.63 [0.60, 0.67]  1.54 [1.49, 1.60]
elbow_flex             3.28 [3.19, 3.37]  0.87 [0.81, 0.98]  2.79 [2.73, 2.86]
wrist_flex             2.28 [2.19, 2.37]  0.64 [0.53, 0.77]  2.23 [2.18, 2.27]
wrist_roll             0.77 [0.74, 0.80]  0.22 [0.21, 0.23]  0.65 [0.63, 0.67]

lag (frames)   real                  stock              calibrated            real ms  stock ms  calib ms
-------------  --------------------  -----------------  --------------------  -------  --------  --------
shoulder_pan   7.32 [6.83, 7.84]     4.27 [4.18, 4.39]  9.20 [8.80, 9.56]     244      142       307
shoulder_lift  7.48 [7.03, 7.95]     3.77 [3.75, 3.80]  9.21 [8.98, 9.44]     249      126       307
elbow_flex     7.95 [7.67, 8.22]     3.61 [3.56, 3.69]  9.28 [8.97, 9.56]     265      120       309
wrist_flex     10.00 [10.00, 10.00]  3.62 [3.59, 3.66]  10.00 [10.00, 10.00]  333      121       333
wrist_roll     8.86 [8.34, 9.34]     4.09 [4.00, 4.19]  9.91 [9.79, 10.00]    295      136       330

final-pose gap  stock              calibrated
--------------  -----------------  -----------------
shoulder_pan    0.52 [0.42, 0.61]  0.33 [0.24, 0.43]
shoulder_lift   0.68 [0.57, 0.79]  1.21 [1.07, 1.34]
elbow_flex      0.38 [0.26, 0.52]  1.00 [0.83, 1.18]
wrist_flex      1.18 [0.96, 1.41]  0.77 [0.60, 0.96]
wrist_roll      0.63 [0.52, 0.74]  0.45 [0.37, 0.53]
```

## Calibrated twin

Package `calibrated_twin.json`, sha256 `c1455c192517fd7924e9e768430dd5d2f5b4364c7db6d855c4c70e2f240d1ced`.
Fitted: kp[shoulder_pan], kv[shoulder_pan], frictionloss[shoulder_pan], kp[shoulder_lift], kv[shoulder_lift], frictionloss[shoulder_lift], kp[elbow_flex], kv[elbow_flex], frictionloss[elbow_flex], kp[wrist_flex], kv[wrist_flex], frictionloss[wrist_flex], kp[wrist_roll], kv[wrist_roll], frictionloss[wrist_roll]; command delay 0 frame(s) (screened train MSE by delay, deg^2: {'0': 2.10248, '1': 2.19445, '2': 2.25971, '3': 2.36208, '4': 2.4831, '5': 2.64646}). Train MSE 2.19342 deg^2. Optimizer: converged (`ftol` termination condition is satisfied.). At a bound: frictionloss[shoulder_lift].

```
joint          kp N m/rad   kv N m s/rad   frictionloss N m  armature kg m^2  zero offset deg
-------------  -----------  -------------  ----------------  ---------------  -----------------
shoulder_pan   50 -> 71.82  5.13 -> 9.11   0.1 -> 0.718      0.1 (fixed)      +0.0 (documented)
shoulder_lift  50 -> 53.26  4.96 -> 8.21   0.1 -> 1          0.1 (fixed)      +0.0 (documented)
elbow_flex     50 -> 14.95  4.63 -> 0.761  0.1 -> 0.674      0.1 (fixed)      +0.0 (documented)
wrist_flex     50 -> 6.549  4.49 -> 0.914  0.1 -> 0.204      0.1 (fixed)      +0.0 (documented)
wrist_roll     50 -> 41.12  4.47 -> 4.51   0.1 -> 0.588      0.1 (fixed)      +0.0 (documented)
```

Identifiable servo combinations (the individual gains are not the claim): natural frequency sqrt(kp/I_eff) and damping ratio (kv+damping)/(2 sqrt(kp I_eff)), I_eff = joint-space inertia at the median pose incl. armature; 95% CI from a linearised episode bootstrap of the fit.

```
joint          I_eff kg m^2  natural freq Hz [CI]  damping ratio [CI]
-------------  ------------  --------------------  --------------------
shoulder_pan   0.1017        4.23 [3.56, 5.02]     1.69 [1.28, 1.93]
shoulder_lift  0.1056        3.57 [3.3, 3.86]      1.73 [1.2, 2.19]
elbow_flex     0.1055        1.89 [1.82, 1.97]     0.303 [0.215, 0.405]
wrist_flex     0.1012        1.28 [1.23, 1.34]     0.562 [0.472, 0.646]
wrist_roll     0.1           3.23 [2.53, 4.11]     1.11 [0.639, 1.4]
```

Per-parameter identifiability (condition number of J^T J 50400.0): marginal/conditional std ratio = sqrt(VIF); >= 10 means only a combination with other parameters is identified.

```
parameter                    value   95% CI            std ratio  identified alone
---------------------------  ------  ----------------  ---------  ----------------
kp[shoulder_pan]             71.82   [50.9, 101]       10.5       NO
kv[shoulder_pan]             9.114   [5.98, 12]        3.66       yes
frictionloss[shoulder_pan]   0.7182  [0.419, 1.02]     7.85       yes
kp[shoulder_lift]            53.26   [45.4, 62.1]      2.57       yes
kv[shoulder_lift]            8.211   [5.28, 11.2]      2.57       yes
frictionloss[shoulder_lift]  1       fixed (at bound)  n/a        -
kp[elbow_flex]               14.95   [13.8, 16.1]      2.38       yes
kv[elbow_flex]               0.7608  [0.539, 1.03]     1.45       yes
frictionloss[elbow_flex]     0.6741  [0.595, 0.748]    2.37       yes
kp[wrist_flex]               6.549   [6.04, 7.19]      2.64       yes
kv[wrist_flex]               0.9144  [0.75, 1.08]      1.94       yes
frictionloss[wrist_flex]     0.204   [0.186, 0.225]    2.3        yes
kp[wrist_roll]               41.12   [25.2, 66.7]      6.14       yes
kv[wrist_roll]               4.51    [2.16, 6.59]      1.98       yes
frictionloss[wrist_roll]     0.5884  [0.271, 0.896]    5.48       yes
```

Posterior correlations |r| > 0.95: kp[shoulder_pan] ~ frictionloss[shoulder_pan] (+0.981); kp[wrist_roll] ~ frictionloss[wrist_roll] (+0.951)

Weakest directions (relative eigenvalue: top loadings): 2e-05: kv[shoulder_pan] -0.67, frictionloss[shoulder_pan] -0.62, kp[shoulder_pan] -0.40, kv[shoulder_lift] +0.00; 0.00014: frictionloss[wrist_roll] +0.69, kp[wrist_roll] +0.54, kv[wrist_roll] +0.49, frictionloss[shoulder_pan] +0.00; 0.00026: kv[shoulder_pan] -0.73, frictionloss[shoulder_pan] +0.67, kp[shoulder_pan] +0.18, kv[wrist_roll] +0.00

Physics-free baseline (fitted on the same fit episodes): y[t+1] = y[t] + alpha*(a[t-d] + b - y[t]), y[0] = x[0], per arm joint; alpha [0.08, 0.1, 0.12, 0.08, 0.04], delay [0, 0, 0, 0, 0] frames, bias [0.2242, 0.3534, 1.3474, 0.9129, -0.1166] deg.

## Mapping audit

Sign checks (1st-99th percentile of FIT-episode states vs MJCF range):

```
joint          recorded p1..p99 deg  MJCF range deg     shift (doc sign)  shift (flipped)  decision
-------------  --------------------  -----------------  ----------------  ---------------  ---------------------------------------------------------------------------
shoulder_pan   [-10.63, -0.65]       [-110.01, 110.01]  0.0               0.0              documented sign (flipped sign would also fit: sign not identified by range)
shoulder_lift  [148.04, 190.02]      [-190.22, 9.97]    180.05            0.0              flipped sign (documented sign does not fit the MJCF range)
elbow_flex     [97.73, 157.24]       [-9.97, 179.91]    0.0               147.27           documented sign
wrist_flex     [64.34, 96.15]        [-95.11, 95.11]    1.04              1.04             documented sign (flipped sign would also fit: sign not identified by range)
wrist_roll     [-5.36, 4.92]         [-159.86, 159.86]  0.0               0.0              documented sign (flipped sign would also fit: sign not identified by range)

same rule on other subsets (robustness): all_episodes: signs [1, -1, 1, 1, 1], accepted; heldout_only: signs [1, -1, 1, 1, 1], accepted -> agrees
released stock limits (crossed by fit episodes): {'shoulder_lift': {'lower': True, 'upper': False}, 'wrist_flex': {'lower': False, 'upper': True}}
```

Forward-kinematics plausibility under the shipped mapping (evidence, not a gate; assumes the base sits on the work surface):

```
gripper lowest point minus base lowest point (m): {'p1': 0.093, 'p5': 0.095, 'p50': 0.179, 'min': 0.089}; frames > 2 cm below the base: 0.0
frames within 1 deg of a stock MJCF limit: {'shoulder_pan': 0.0, 'shoulder_lift': 0.2175, 'elbow_flex': 0.0, 'wrist_flex': 0.0572, 'wrist_roll': 0.0}
frames beyond a stock MJCF limit: {'shoulder_pan': 0.0, 'shoulder_lift': 0.0, 'elbow_flex': 0.0, 'wrist_flex': 0.0196, 'wrist_roll': 0.0}
```

Gravity sag on real static frames (middle 80% of each episode, gripper >= 3 cm above the base plane): centred correlation between the servo's static error and the twin's gravity torque at the mapped pose, and the implied static stiffness (centred slope). Positive supports the mapping. Evidence, not a gate.

```
joint          corr [CI] verdict                                                                                           power (gravity std, n)  implied static K N m/rad  fitted kp
-------------  ----------------------------------------------------------------------------------------------------------  ----------------------  ------------------------  ---------
shoulder_pan   not testable (gravity torque ~constant over the selected static poses; gravity std 0.0 N m, 137 frames)                                                       71.8
shoulder_lift  -0.81 [-0.91, -0.57] negative                                                                               0.0341 N m, 137 fr      n/a                       53.3
elbow_flex     not testable (gravity torque ~constant over the selected static poses; gravity std 0.017 N m, 137 frames)                                                     14.9
wrist_flex     not testable (gravity torque ~constant over the selected static poses; gravity std 0.0046 N m, 137 frames)                                                    6.55
wrist_roll     not testable (gravity torque ~constant over the selected static poses; gravity std 0.0001 N m, 137 frames)                                                    41.1
static frames: 137 (0 excluded as possible table contact) from 23 fit episodes
```

## Method

- Recording convention (lerobot-legacy): Legacy LeRobot (ManipulatorRobot.teleop_step, `main_*` names): the goal a[t] is WRITTEN to the follower first and the follower state x[t] is READ afterwards (a few ms later), so x[t] may already contain a few ms of response to a[t] (act-then-observe).
- Replay: Replay (identical for both conventions): q_sim[0]=x[0] (zero velocity); for t=0..T-2 apply ctrl=a[t-d] (d = fitted integer command delay, stock d=0) for the whole frame, step `substeps` physics steps (timestep set so substeps*timestep = 1/fps exactly), record q_sim[t+1]; sim and real are compared at the same index t=1..T-1. The real sub-frame send-to-read offset (legacy: a[t] sent a few ms BEFORE x[t] is read; current: a[t] sent a few ms AFTER) is not modelled; it is absorbed by the fitted dynamics/delay, and it shifts lags between the two conventions by a fraction of a frame in opposite directions.
- Lag: lag = argmin_L Var(a[t] - y[t+L]) over a fixed window t in [0, T-10), parabolic sub-frame refinement; y = real or sim state. Includes the 1-frame sampling offset: in the replay and in observe-then-act (current LeRobot) recordings an instantaneous actuator measures 1.0 frame; in act-then-observe (legacy) recordings it would measure ~0, and a realistic servo measures its delay minus the few-ms write-to-read gap. Lags are therefore directly comparable between sim and real within one dataset, and only approximately (fraction of a frame) across codebases. Also reported in ms, since datasets differ in fps. Joints with command std < 1 deg in an episode are skipped.
- Units: legacy LeRobot degrees (tick = 180/2048 deg verified on every arm joint) (decided on the fit episodes; held-out episodes agree). Mapping to MJCF: q = sign*deg2rad(x) + deg2rad(offset); legacy LeRobot zero pose = arm straight horizontal (feetech_calibration.py); the MJCF zero (from the SO-ARM100 URDF) is also the arm stretched horizontally forward, so nominal offsets are 0. Documented signs +1 (MJCF joint axes); legacy LeRobot sets each motor's direction from the user's 'rotated position', so signs are checked per dataset against the recorded range of motion (mapping_checks).
- Split: future = last round(n*test_frac) episodes by index; interleaved = round(n*test_frac) episodes of the rest drawn by numpy default_rng(seed).permutation, plus every remaining episode beyond the fit cap; fit = the remaining episodes (<= max_train_episodes) (seed 0). Future: [46, 47, 48, 49, 50, 51, 53, 54, 55, 56, 57, 59]. Interleaved: [1, 2, 4, 11, 18, 19, 20, 21, 23, 27, 42, 43]. Overlap with fit: none.
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
- Confidence intervals are percentile bootstraps over episodes (whole episodes resampled, 10,000 draws, fixed seed); with 12 future / 12 interleaved held-out episodes they are approximate and tend to be slightly too narrow. They do not cover the choice of split, of fit configuration, or of dataset.
- Recorded with legacy LeRobot (act-then-observe); lags are not exactly comparable with current-LeRobot (observe-then-act) datasets (see conventions).
- Stock MJCF limits crossed by the fit episodes and released in the aligned/calibrated twins: shoulder_lift lower, wrist_flex upper. The stock twin is held at those limits (counted as stock-twin error).
- future held-out episodes leave the fit episodes' range of motion (+-2 deg) on more than 5% of frames: {'wrist_roll': 0.1157}.
- Fitted parameters at a bound (within BOUND_TOL): frictionloss[shoulder_lift]; the value is a bound, not an estimate.
- Not identified individually (marginal/conditional std ratio >= 10): kp[shoulder_pan]. Only combinations of them are constrained by the data (see identifiability); individual values are not meaningful.
- interleaved: final-pose (static) gap is larger for the calibrated twin than for stock on shoulder_lift, elbow_flex by point estimate; CIs separate on shoulder_lift, elbow_flex.
- future: final-pose (static) gap is larger for the calibrated twin than for stock on shoulder_lift, elbow_flex by point estimate; CIs separate on shoulder_lift.
- Joint direction flipped relative to the documented convention for shoulder_lift (chosen from the recorded range of motion vs the MJCF range; see mapping_checks).

## Provenance and reproduction

```
dataset        xsatvik/mixer_on_off_new_1 @ 73dc943767d2bc0fb3518844d59b0afc03561a51 (requested 73dc943767d2bc0fb3518844d59b0afc03561a51)
               LeRobot v2.0, robot_type so100, 30 fps, 60 episodes loaded (repo: 60), 2 dropped
data files     data/chunk-000/episode_000000.parquet (334ac10aaf0d), data/chunk-000/episode_000001.parquet (02e3e295f522), data/chunk-000/episode_000002.parquet (f4819107e775), ... (60 files)
twin           trs_so_arm100 (so_arm100.xml) from https://github.com/google-deepmind/mujoco_menagerie @ b0655057a9df2abe39ea7fc989914ba6f248301c
               dir sha256 4f3b0f21b8a2b889..., timestep 0.002 -> 0.00196078 s x 17 substeps/frame, contacts disabled
software       mujoco 3.17.0, numpy 2.5.4, scipy 1.18.1, python 3.13.18, meatspace_lab 2.0.0 (code sha256 924eb3d8364be665...)
hardware       x86_64 Intel(R) Xeon(R) Processor @ 2.80GHz; OpenBLAS kernel numpy: SkylakeX; scipy: SkylakeX
report         schema meatspace.twin-gap-report/v2
               results sha256 4722399623b647d50e426be779c15dcef68a5772c5e304308c0e139728646890  (numbers only; any interpreter/CPU)
               content sha256 dc5aff6f62bf3ff421cf8097000d8ff6e0fe9ec149e6a5d0c83aa6cbd7099327  (numbers + environment above)
```

Reproduce (from `lab/`, see README) into a scratch directory and compare:

```
python -m meatspace_lab report --dataset xsatvik/mixer_on_off_new_1 --revision 73dc943767d2bc0fb3518844d59b0afc03561a51 \
    --twin .cache/menagerie/trs_so_arm100 --out /tmp/repro/ --max-episodes 200
python -m meatspace_lab verify reports/xsatvik__mixer_on_off_new_1/report.json /tmp/repro/report.json
```
