# Twin Gap Report: apayan/so100_ball8 x trs_so_arm100

```
HELD-OUT sim-vs-real joint RMSE, mean of 5 arm joints, deg  [95% bootstrap CI over episodes]
change = calibrated/reference - 1 (negative = better), paired by episode

FUTURE BLOCK (21 episodes)
  stock twin             0.71 [0.69, 0.74]
  aligned stock          0.71 [0.69, 0.74]   (stock dynamics + delay + released limits)
  lag-filter baseline    0.70 [0.68, 0.72]   (no physics: 3 params/joint)
  calibrated twin        0.48 [0.45, 0.52]
  change vs stock        -33% [-37, -29]   per-episode median -36% (range -45% .. -12%); 21/21 improved
  change vs baseline     -31% [-35, -28]   21/21 improved
  verdict                closes part of the gap (-33% [-37, -29] vs stock, residual 0.48 deg); calibrated twin beats the physics-free lag filter (-31% [-35, -28])

INTERLEAVED HELD-OUT (42 episodes)
  stock twin             0.69 [0.68, 0.71]
  aligned stock          0.69 [0.68, 0.71]   (stock dynamics + delay + released limits)
  lag-filter baseline    0.66 [0.65, 0.68]   (no physics: 3 params/joint)
  calibrated twin        0.43 [0.42, 0.44]
  change vs stock        -38% [-39, -36]   per-episode median -39% (range -46% .. -22%); 42/42 improved
  change vs baseline     -35% [-37, -33]   42/42 improved
  verdict                closes part of the gap (-38% [-39, -36] vs stock, residual 0.43 deg); calibrated twin beats the physics-free lag filter (-35% [-37, -33])

command->state lag, interleaved held-out, ms per joint (real / stock / calibrated):
  shoulder_pan 112/124/115  shoulder_lift 135/120/145  elbow_flex 133/112/150  wrist_flex 109/108/117  wrist_roll 112/106/115
  max |twin - real| over joints: stock 21.3 ms, calibrated 16.5 ms
```

![future-block held-out episode](heldout_episode.svg)

![per-joint RMSE, future block](rmse_by_joint_future.svg)

![per-joint RMSE, interleaved held-out](rmse_by_joint.svg)

## Future block (held out: the last 20% of episodes by index, recorded after every fit episode), n = 21

Per joint, mean over episodes [95% CI]. Degrees. Change = calibrated vs stock, negative = better.

```
sim-vs-real RMSE  stock                         aligned stock      baseline           calibrated                    change vs stock  vs baseline
----------------  ----------------------------  -----------------  -----------------  ----------------------------  ---------------  ---------------
shoulder_pan      0.36 [0.34, 0.39] (p90 0.43)  0.36 [0.34, 0.39]  0.37 [0.35, 0.40]  0.24 [0.22, 0.27] (p90 0.32)  -32% [-36, -29]  -34% [-39, -30]
shoulder_lift     1.15 [1.02, 1.28] (p90 1.58)  1.15 [1.02, 1.28]  1.01 [0.92, 1.11]  0.81 [0.70, 0.94] (p90 1.26)  -30% [-36, -23]  -20% [-27, -13]
elbow_flex        1.25 [1.18, 1.32] (p90 1.46)  1.25 [1.18, 1.32]  1.23 [1.19, 1.27]  0.80 [0.75, 0.86] (p90 1.01)  -36% [-42, -28]  -35% [-39, -30]
wrist_flex        0.45 [0.43, 0.48] (p90 0.51)  0.45 [0.43, 0.48]  0.48 [0.47, 0.50]  0.25 [0.24, 0.27] (p90 0.27)  -43% [-47, -40]  -47% [-50, -45]
wrist_roll        0.36 [0.34, 0.38] (p90 0.43)  0.36 [0.34, 0.38]  0.40 [0.37, 0.43]  0.29 [0.27, 0.31] (p90 0.36)  -19% [-23, -16]  -27% [-32, -21]
arm_mean          0.71 [0.69, 0.74] (p90 0.78)  0.71 [0.69, 0.74]  0.70 [0.68, 0.72]  0.48 [0.45, 0.52] (p90 0.56)  -33% [-37, -29]  -31% [-35, -28]

static-frame RMSE (quasi-static holds)  stock              baseline           calibrated         episodes with >= 10 static frames
--------------------------------------  -----------------  -----------------  -----------------  ---------------------------------
shoulder_pan                            0.29 [0.24, 0.34]  0.35 [0.31, 0.40]  0.21 [0.17, 0.27]  21
shoulder_lift                           0.85 [0.64, 1.11]  0.67 [0.50, 0.87]  0.70 [0.53, 0.92]  21
elbow_flex                              1.44 [1.28, 1.61]  1.42 [1.31, 1.53]  0.74 [0.66, 0.83]  21
wrist_flex                              0.41 [0.35, 0.48]  0.56 [0.52, 0.60]  0.23 [0.20, 0.26]  21
wrist_roll                              0.34 [0.30, 0.39]  0.36 [0.31, 0.42]  0.27 [0.23, 0.30]  21
arm_mean                                0.67 [0.62, 0.71]  0.67 [0.63, 0.72]  0.43 [0.39, 0.48]  21

command tracking RMSE  real robot         stock twin         calibrated twin
---------------------  -----------------  -----------------  -----------------
shoulder_pan           0.96 [0.85, 1.06]  1.04 [0.90, 1.17]  0.91 [0.81, 1.00]
shoulder_lift          2.12 [1.97, 2.27]  1.44 [1.28, 1.60]  2.01 [1.86, 2.16]
elbow_flex             1.84 [1.64, 2.03]  1.07 [0.93, 1.22]  1.78 [1.62, 1.94]
wrist_flex             1.02 [0.98, 1.06]  0.85 [0.81, 0.89]  1.07 [1.02, 1.11]
wrist_roll             1.58 [1.52, 1.64]  1.45 [1.40, 1.50]  1.65 [1.60, 1.70]

lag (frames)   real               stock              calibrated         real ms  stock ms  calib ms
-------------  -----------------  -----------------  -----------------  -------  --------  --------
shoulder_pan   3.31 [3.23, 3.41]  3.68 [3.65, 3.72]  3.31 [3.20, 3.47]  110      123       110
shoulder_lift  4.01 [3.89, 4.16]  3.59 [3.58, 3.61]  4.33 [4.14, 4.54]  134      120       144
elbow_flex     4.04 [3.79, 4.33]  3.36 [3.34, 3.39]  4.48 [4.07, 4.99]  135      112       149
wrist_flex     3.25 [3.22, 3.28]  3.24 [3.22, 3.25]  3.54 [3.50, 3.58]  108      108       118
wrist_roll     3.32 [3.28, 3.36]  3.19 [3.19, 3.19]  3.47 [3.46, 3.48]  111      106       116

final-pose gap  stock              calibrated
--------------  -----------------  -----------------
shoulder_pan    0.17 [0.13, 0.21]  0.09 [0.06, 0.13]
shoulder_lift   1.19 [0.95, 1.50]  0.76 [0.51, 1.08]
elbow_flex      0.76 [0.63, 0.87]  0.63 [0.50, 0.75]
wrist_flex      0.28 [0.24, 0.31]  0.20 [0.15, 0.24]
wrist_roll      0.26 [0.19, 0.32]  0.16 [0.12, 0.21]

fraction of states outside the fit episodes' range of motion +-2 deg: {'shoulder_pan': 0.0, 'shoulder_lift': 0.0, 'elbow_flex': 0.0, 'wrist_flex': 0.0, 'wrist_roll': 0.0}
fraction of states outside the twin's joint range: stock {'shoulder_pan': 0.0, 'shoulder_lift': 0.0, 'elbow_flex': 0.0, 'wrist_flex': 0.0, 'wrist_roll': 0.0}; calibrated {'shoulder_pan': 0.0, 'shoulder_lift': 0.0, 'elbow_flex': 0.0, 'wrist_flex': 0.0, 'wrist_roll': 0.0}
```

## Interleaved held-out (random episodes from the same period as the fit episodes), n = 42

Per joint, mean over episodes [95% CI]. Degrees. Change = calibrated vs stock, negative = better.

```
sim-vs-real RMSE  stock                         aligned stock      baseline           calibrated                    change vs stock  vs baseline
----------------  ----------------------------  -----------------  -----------------  ----------------------------  ---------------  ---------------
shoulder_pan      0.32 [0.30, 0.34] (p90 0.40)  0.32 [0.30, 0.34]  0.35 [0.33, 0.36]  0.23 [0.22, 0.24] (p90 0.31)  -29% [-30, -27]  -34% [-36, -32]
shoulder_lift     1.09 [1.02, 1.16] (p90 1.39)  1.09 [1.02, 1.16]  0.97 [0.91, 1.03]  0.68 [0.66, 0.72] (p90 0.84)  -37% [-40, -34]  -29% [-33, -26]
elbow_flex        1.24 [1.19, 1.29] (p90 1.45)  1.24 [1.19, 1.29]  1.18 [1.14, 1.22]  0.73 [0.70, 0.77] (p90 0.86)  -41% [-44, -38]  -38% [-40, -35]
wrist_flex        0.46 [0.44, 0.48] (p90 0.54)  0.46 [0.44, 0.48]  0.46 [0.45, 0.47]  0.24 [0.23, 0.25] (p90 0.29)  -47% [-49, -44]  -47% [-49, -45]
wrist_roll        0.37 [0.35, 0.38] (p90 0.43)  0.37 [0.35, 0.38]  0.37 [0.35, 0.39]  0.27 [0.26, 0.29] (p90 0.34)  -25% [-28, -22]  -26% [-32, -20]
arm_mean          0.69 [0.68, 0.71] (p90 0.75)  0.69 [0.68, 0.71]  0.66 [0.65, 0.68]  0.43 [0.42, 0.44] (p90 0.47)  -38% [-39, -36]  -35% [-37, -33]

static-frame RMSE (quasi-static holds)  stock              baseline           calibrated         episodes with >= 10 static frames
--------------------------------------  -----------------  -----------------  -----------------  ---------------------------------
shoulder_pan                            0.30 [0.27, 0.33]  0.36 [0.32, 0.39]  0.20 [0.18, 0.23]  42
shoulder_lift                           0.60 [0.50, 0.71]  0.67 [0.58, 0.76]  0.59 [0.52, 0.67]  42
elbow_flex                              1.59 [1.49, 1.68]  1.39 [1.30, 1.48]  0.60 [0.53, 0.67]  42
wrist_flex                              0.46 [0.40, 0.51]  0.51 [0.48, 0.54]  0.21 [0.19, 0.24]  42
wrist_roll                              0.35 [0.33, 0.37]  0.33 [0.31, 0.37]  0.26 [0.24, 0.29]  42
arm_mean                                0.66 [0.64, 0.68]  0.65 [0.63, 0.67]  0.37 [0.36, 0.39]  42

command tracking RMSE  real robot         stock twin         calibrated twin
---------------------  -----------------  -----------------  -----------------
shoulder_pan           0.81 [0.74, 0.88]  0.83 [0.75, 0.92]  0.78 [0.72, 0.83]
shoulder_lift          2.02 [1.92, 2.12]  1.37 [1.28, 1.44]  1.98 [1.90, 2.06]
elbow_flex             1.85 [1.75, 1.94]  1.01 [0.94, 1.08]  1.79 [1.72, 1.87]
wrist_flex             1.03 [1.00, 1.07]  0.83 [0.80, 0.87]  1.05 [1.01, 1.08]
wrist_roll             1.61 [1.56, 1.65]  1.44 [1.40, 1.47]  1.63 [1.59, 1.67]

lag (frames)   real               stock              calibrated         real ms  stock ms  calib ms
-------------  -----------------  -----------------  -----------------  -------  --------  --------
shoulder_pan   3.36 [3.32, 3.40]  3.72 [3.70, 3.74]  3.44 [3.36, 3.52]  112      124       115
shoulder_lift  4.06 [3.96, 4.19]  3.60 [3.59, 3.61]  4.36 [4.23, 4.51]  135      120       145
elbow_flex     4.00 [3.90, 4.12]  3.36 [3.35, 3.38]  4.50 [4.30, 4.71]  133      112       150
wrist_flex     3.28 [3.25, 3.31]  3.23 [3.22, 3.24]  3.51 [3.48, 3.55]  109      108       117
wrist_roll     3.37 [3.35, 3.40]  3.18 [3.18, 3.19]  3.45 [3.44, 3.46]  112      106       115

final-pose gap  stock              calibrated
--------------  -----------------  -----------------
shoulder_pan    0.20 [0.16, 0.24]  0.13 [0.09, 0.16]
shoulder_lift   1.06 [0.96, 1.21]  0.60 [0.49, 0.76]
elbow_flex      0.74 [0.67, 0.81]  0.60 [0.51, 0.69]
wrist_flex      0.26 [0.23, 0.28]  0.14 [0.11, 0.17]
wrist_roll      0.26 [0.22, 0.30]  0.13 [0.10, 0.16]

fraction of states outside the fit episodes' range of motion +-2 deg: {'shoulder_pan': 0.0, 'shoulder_lift': 0.0043, 'elbow_flex': 0.0036, 'wrist_flex': 0.0, 'wrist_roll': 0.0}
fraction of states outside the twin's joint range: stock {'shoulder_pan': 0.0, 'shoulder_lift': 0.0, 'elbow_flex': 0.0, 'wrist_flex': 0.0, 'wrist_roll': 0.0}; calibrated {'shoulder_pan': 0.0, 'shoulder_lift': 0.0, 'elbow_flex': 0.0, 'wrist_flex': 0.0, 'wrist_roll': 0.0}
```

## Fit episodes (used by the fit), n = 40

Per joint, mean over episodes [95% CI]. Degrees. Change = calibrated vs stock, negative = better.

```
sim-vs-real RMSE  stock                         aligned stock      baseline           calibrated                    change vs stock  vs baseline
----------------  ----------------------------  -----------------  -----------------  ----------------------------  ---------------  ---------------
shoulder_pan      0.31 [0.30, 0.33] (p90 0.35)  0.31 [0.30, 0.33]  0.34 [0.33, 0.35]  0.23 [0.22, 0.24] (p90 0.26)  -28% [-30, -25]  -33% [-35, -30]
shoulder_lift     1.09 [1.01, 1.16] (p90 1.48)  1.09 [1.01, 1.16]  0.98 [0.91, 1.05]  0.69 [0.66, 0.72] (p90 0.82)  -37% [-40, -34]  -30% [-33, -26]
elbow_flex        1.23 [1.17, 1.29] (p90 1.50)  1.23 [1.17, 1.29]  1.16 [1.12, 1.20]  0.72 [0.70, 0.75] (p90 0.82)  -41% [-44, -38]  -38% [-40, -35]
wrist_flex        0.46 [0.45, 0.48] (p90 0.54)  0.46 [0.45, 0.48]  0.47 [0.46, 0.48]  0.24 [0.23, 0.25] (p90 0.28)  -48% [-50, -46]  -49% [-50, -47]
wrist_roll        0.38 [0.36, 0.40] (p90 0.47)  0.38 [0.36, 0.40]  0.36 [0.34, 0.38]  0.28 [0.26, 0.30] (p90 0.35)  -25% [-28, -22]  -21% [-27, -15]
arm_mean          0.69 [0.68, 0.71] (p90 0.77)  0.69 [0.68, 0.71]  0.66 [0.65, 0.68]  0.43 [0.42, 0.44] (p90 0.47)  -38% [-39, -36]  -35% [-36, -33]

static-frame RMSE (quasi-static holds)  stock              baseline           calibrated         episodes with >= 10 static frames
--------------------------------------  -----------------  -----------------  -----------------  ---------------------------------
shoulder_pan                            0.28 [0.25, 0.30]  0.35 [0.31, 0.38]  0.19 [0.17, 0.21]  40
shoulder_lift                           0.53 [0.45, 0.61]  0.63 [0.58, 0.69]  0.63 [0.56, 0.70]  40
elbow_flex                              1.57 [1.45, 1.70]  1.36 [1.26, 1.47]  0.57 [0.50, 0.65]  40
wrist_flex                              0.44 [0.40, 0.49]  0.50 [0.47, 0.53]  0.19 [0.17, 0.22]  40
wrist_roll                              0.35 [0.32, 0.38]  0.34 [0.31, 0.37]  0.27 [0.24, 0.30]  40
arm_mean                                0.63 [0.61, 0.66]  0.64 [0.62, 0.65]  0.37 [0.35, 0.40]  40

command tracking RMSE  real robot         stock twin         calibrated twin
---------------------  -----------------  -----------------  -----------------
shoulder_pan           0.77 [0.72, 0.82]  0.78 [0.72, 0.85]  0.74 [0.70, 0.79]
shoulder_lift          2.12 [2.01, 2.22]  1.47 [1.39, 1.55]  2.05 [1.98, 2.13]
elbow_flex             1.90 [1.80, 2.02]  1.10 [1.02, 1.19]  1.86 [1.79, 1.94]
wrist_flex             1.02 [0.99, 1.04]  0.81 [0.79, 0.84]  1.03 [1.01, 1.05]
wrist_roll             1.65 [1.60, 1.70]  1.45 [1.41, 1.49]  1.65 [1.60, 1.69]

lag (frames)   real               stock              calibrated         real ms  stock ms  calib ms
-------------  -----------------  -----------------  -----------------  -------  --------  --------
shoulder_pan   3.39 [3.35, 3.42]  3.73 [3.71, 3.75]  3.46 [3.40, 3.53]  113      124       115
shoulder_lift  4.00 [3.94, 4.07]  3.58 [3.57, 3.59]  4.17 [4.08, 4.27]  133      119       139
elbow_flex     3.91 [3.82, 4.01]  3.35 [3.34, 3.37]  4.26 [4.07, 4.47]  130      112       142
wrist_flex     3.29 [3.27, 3.32]  3.23 [3.23, 3.24]  3.52 [3.49, 3.56]  110      108       117
wrist_roll     3.41 [3.39, 3.44]  3.18 [3.18, 3.19]  3.45 [3.44, 3.46]  114      106       115

final-pose gap  stock              calibrated
--------------  -----------------  -----------------
shoulder_pan    0.22 [0.18, 0.25]  0.15 [0.12, 0.18]
shoulder_lift   0.99 [0.94, 1.05]  0.59 [0.50, 0.70]
elbow_flex      0.77 [0.69, 0.84]  0.71 [0.60, 0.82]
wrist_flex      0.23 [0.20, 0.26]  0.16 [0.13, 0.19]
wrist_roll      0.32 [0.27, 0.37]  0.20 [0.16, 0.24]
```

## Calibrated twin

Package `calibrated_twin.json`, sha256 `c80286ababcbaa2e81ad58b5d55c159cd59d35b308b3a81a4ad66ede76ae84bd`.
Fitted: kp[shoulder_pan], kv[shoulder_pan], frictionloss[shoulder_pan], kp[shoulder_lift], kv[shoulder_lift], frictionloss[shoulder_lift], kp[elbow_flex], kv[elbow_flex], frictionloss[elbow_flex], kp[wrist_flex], kv[wrist_flex], frictionloss[wrist_flex], kp[wrist_roll], kv[wrist_roll], frictionloss[wrist_roll]; command delay 0 frame(s) (screened train MSE by delay, deg^2: {'0': 0.23299, '1': 0.28411, '2': 0.37999, '3': 0.6375, '4': 1.01868, '5': 1.73462}). Train MSE 0.24164 deg^2. Optimizer: converged (`ftol` termination condition is satisfied.). At a bound: none.

```
joint          kp N m/rad   kv N m s/rad  frictionloss N m  armature kg m^2  zero offset deg
-------------  -----------  ------------  ----------------  ---------------  -----------------
shoulder_pan   50 -> 40.84  5.13 -> 3.12  0.1 -> 0.291      0.1 (fixed)      +0.0 (documented)
shoulder_lift  50 -> 18.31  4.96 -> 1.49  0.1 -> 0.36       0.1 (fixed)      +0.0 (documented)
elbow_flex     50 -> 25.02  4.63 -> 1.73  0.1 -> 0.615      0.1 (fixed)      +0.0 (documented)
wrist_flex     50 -> 24.46  4.49 -> 1.95  0.1 -> 0.269      0.1 (fixed)      +0.0 (documented)
wrist_roll     50 -> 28.59  4.47 -> 2.66  0.1 -> 0.237      0.1 (fixed)      +0.0 (documented)
```

Identifiable servo combinations (the individual gains are not the claim): natural frequency sqrt(kp/I_eff) and damping ratio (kv+damping)/(2 sqrt(kp I_eff)), I_eff = joint-space inertia at the median pose incl. armature; 95% CI from a linearised episode bootstrap of the fit.

```
joint          I_eff kg m^2  natural freq Hz [CI]  damping ratio [CI]
-------------  ------------  --------------------  --------------------
shoulder_pan   0.1058        3.13 [2.92, 3.34]     0.75 [0.688, 0.796]
shoulder_lift  0.1052        2.1 [2.06, 2.14]      0.538 [0.506, 0.568]
elbow_flex     0.1088        2.41 [2.34, 2.5]      0.523 [0.492, 0.551]
wrist_flex     0.1011        2.47 [2.42, 2.53]     0.62 [0.602, 0.636]
wrist_roll     0.1           2.69 [2.62, 2.76]     0.785 [0.761, 0.806]
```

Per-parameter identifiability (condition number of J^T J 8500.0): marginal/conditional std ratio = sqrt(VIF); >= 10 means only a combination with other parameters is identified.

```
parameter                    value   95% CI          std ratio  identified alone
---------------------------  ------  --------------  ---------  ----------------
kp[shoulder_pan]             40.84   [35.6, 46.7]    11.9       NO
kv[shoulder_pan]             3.116   [2.68, 3.53]    8.78       yes
frictionloss[shoulder_pan]   0.2914  [0.252, 0.332]  4.69       yes
kp[shoulder_lift]            18.31   [17.6, 19.1]    1.99       yes
kv[shoulder_lift]            1.493   [1.38, 1.61]    1.98       yes
frictionloss[shoulder_lift]  0.3599  [0.337, 0.383]  1.29       yes
kp[elbow_flex]               25.02   [23.5, 26.8]    2.42       yes
kv[elbow_flex]               1.726   [1.61, 1.85]    1.48       yes
frictionloss[elbow_flex]     0.615   [0.55, 0.688]   2.1        yes
kp[wrist_flex]               24.46   [23.4, 25.5]    3.47       yes
kv[wrist_flex]               1.951   [1.86, 2.04]    2.58       yes
frictionloss[wrist_flex]     0.2689  [0.256, 0.281]  1.89       yes
kp[wrist_roll]               28.59   [27, 30]        8.35       yes
kv[wrist_roll]               2.657   [2.51, 2.79]    7.8        yes
frictionloss[wrist_roll]     0.2366  [0.22, 0.252]   1.55       yes
```

Posterior correlations |r| > 0.95: kp[shoulder_pan] ~ kv[shoulder_pan] (+0.990); kp[wrist_roll] ~ kv[wrist_roll] (+0.989); kp[shoulder_pan] ~ frictionloss[shoulder_pan] (+0.966)

Weakest directions (relative eigenvalue: top loadings): 0.00012: kp[shoulder_pan] +0.76, kv[shoulder_pan] +0.46, frictionloss[shoulder_pan] +0.46, frictionloss[shoulder_lift] +0.00; 0.0013: kp[wrist_roll] -0.80, frictionloss[wrist_roll] -0.43, kv[wrist_roll] -0.42, kp[wrist_flex] +0.00; 0.003: kp[wrist_flex] +0.81, frictionloss[wrist_flex] +0.52, kv[wrist_flex] +0.28, frictionloss[elbow_flex] +0.00

Physics-free baseline (fitted on the same fit episodes): y[t+1] = y[t] + alpha*(a[t-d] + b - y[t]), y[0] = x[0], per arm joint; alpha [0.3, 0.5, 0.26, 0.3, 0.4], delay [0, 2, 0, 0, 1] frames, bias [-0.0909, -0.9221, 0.9515, 0.3659, 0.1469] deg.

## Mapping audit

Sign checks (1st-99th percentile of FIT-episode states vs MJCF range):

```
joint          recorded p1..p99 deg  MJCF range deg     shift (doc sign)  shift (flipped)  decision
-------------  --------------------  -----------------  ----------------  ---------------  ---------------------------------------------------------------------------
shoulder_pan   [-69.66, 94.23]       [-110.01, 110.01]  0.0               0.0              documented sign (flipped sign would also fit: sign not identified by range)
shoulder_lift  [33.49, 185.89]       [-190.22, 9.97]    175.92            0.0              flipped sign (documented sign does not fit the MJCF range)
elbow_flex     [52.82, 177.98]       [-9.97, 179.91]    0.0               168.01           documented sign
wrist_flex     [-14.59, 54.05]       [-95.11, 95.11]    0.0               0.0              documented sign (flipped sign would also fit: sign not identified by range)
wrist_roll     [-99.05, 0.62]        [-159.86, 159.86]  0.0               0.0              documented sign (flipped sign would also fit: sign not identified by range)

same rule on other subsets (robustness): all_episodes: signs [1, -1, 1, 1, 1], accepted; heldout_only: signs [1, -1, 1, 1, 1], accepted -> agrees
released stock limits (crossed by fit episodes): {}
```

Forward-kinematics plausibility under the shipped mapping (evidence, not a gate; assumes the base sits on the work surface):

```
gripper lowest point minus base lowest point (m): {'p1': 0.028, 'p5': 0.038, 'p50': 0.09, 'min': 0.022}; frames > 2 cm below the base: 0.0
frames within 1 deg of a stock MJCF limit: {'shoulder_pan': 0.0, 'shoulder_lift': 0.0, 'elbow_flex': 0.0, 'wrist_flex': 0.0, 'wrist_roll': 0.0}
frames beyond a stock MJCF limit: {'shoulder_pan': 0.0, 'shoulder_lift': 0.0, 'elbow_flex': 0.0, 'wrist_flex': 0.0, 'wrist_roll': 0.0}
```

Gravity sag on real static frames (middle 80% of each episode, gripper >= 3 cm above the base plane): centred correlation between the servo's static error and the twin's gravity torque at the mapped pose, and the implied static stiffness (centred slope). Positive supports the mapping. Evidence, not a gate.

```
joint          corr [CI] verdict                                                                                            power (gravity std, n)  implied static K N m/rad  fitted kp
-------------  -----------------------------------------------------------------------------------------------------------  ----------------------  ------------------------  ---------
shoulder_pan   not testable (gravity torque ~constant over the selected static poses; gravity std 0.0 N m, 2907 frames)                                                       40.8
shoulder_lift  -0.11 [-0.27, +0.07] inconclusive                                                                            0.3254 N m, 2907 fr     n/a                       18.3
elbow_flex     -0.19 [-0.32, -0.06] negative                                                                                0.0454 N m, 2907 fr     n/a                       25
wrist_flex     not testable (gravity torque ~constant over the selected static poses; gravity std 0.0104 N m, 2907 frames)                                                    24.5
wrist_roll     not testable (gravity torque ~constant over the selected static poses; gravity std 0.0007 N m, 2907 frames)                                                    28.6
static frames: 3079 (172 excluded as possible table contact) from 40 fit episodes
```

## Method

- Recording convention (lerobot-legacy): Legacy LeRobot (ManipulatorRobot.teleop_step, `main_*` names): the goal a[t] is WRITTEN to the follower first and the follower state x[t] is READ afterwards (a few ms later), so x[t] may already contain a few ms of response to a[t] (act-then-observe).
- Replay: Replay (identical for both conventions): q_sim[0]=x[0] (zero velocity); for t=0..T-2 apply ctrl=a[t-d] (d = fitted integer command delay, stock d=0) for the whole frame, step `substeps` physics steps (timestep set so substeps*timestep = 1/fps exactly), record q_sim[t+1]; sim and real are compared at the same index t=1..T-1. The real sub-frame send-to-read offset (legacy: a[t] sent a few ms BEFORE x[t] is read; current: a[t] sent a few ms AFTER) is not modelled; it is absorbed by the fitted dynamics/delay, and it shifts lags between the two conventions by a fraction of a frame in opposite directions.
- Lag: lag = argmin_L Var(a[t] - y[t+L]) over a fixed window t in [0, T-10), parabolic sub-frame refinement; y = real or sim state. Includes the 1-frame sampling offset: in the replay and in observe-then-act (current LeRobot) recordings an instantaneous actuator measures 1.0 frame; in act-then-observe (legacy) recordings it would measure ~0, and a realistic servo measures its delay minus the few-ms write-to-read gap. Lags are therefore directly comparable between sim and real within one dataset, and only approximately (fraction of a frame) across codebases. Also reported in ms, since datasets differ in fps. Joints with command std < 1 deg in an episode are skipped.
- Units: legacy LeRobot degrees (tick = 180/2048 deg verified on every arm joint) (decided on the fit episodes; held-out episodes agree). Mapping to MJCF: q = sign*deg2rad(x) + deg2rad(offset); legacy LeRobot zero pose = arm straight horizontal (feetech_calibration.py); the MJCF zero (from the SO-ARM100 URDF) is also the arm stretched horizontally forward, so nominal offsets are 0. Documented signs +1 (MJCF joint axes); legacy LeRobot sets each motor's direction from the user's 'rotated position', so signs are checked per dataset against the recorded range of motion (mapping_checks).
- Split: future = last round(n*test_frac) episodes by index; interleaved = round(n*test_frac) episodes of the rest drawn by numpy default_rng(seed).permutation, plus every remaining episode beyond the fit cap; fit = the remaining episodes (<= max_train_episodes) (seed 0). Future: [83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103]. Interleaved: [4, 5, 7, 8, 9, 11, 13, 14, 16, 19, 20, 25, 30, 32, 33, 34, 35, 39, 42, 43, 47, 49, 54, 55, 56, 57, 59, 60, 64, 65, 67, 68, 69, 70, 71, 73, 74, 75, 78, 80, 81, 82]. Overlap with fit: none.
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
- Confidence intervals are percentile bootstraps over episodes (whole episodes resampled, 10,000 draws, fixed seed); with 21 future / 42 interleaved held-out episodes they are approximate and tend to be slightly too narrow. They do not cover the choice of split, of fit configuration, or of dataset.
- Recorded with legacy LeRobot (act-then-observe); lags are not exactly comparable with current-LeRobot (observe-then-act) datasets (see conventions).
- Not identified individually (marginal/conditional std ratio >= 10): kp[shoulder_pan]. Only combinations of them are constrained by the data (see identifiability); individual values are not meaningful.
- Joint direction flipped relative to the documented convention for shoulder_lift (chosen from the recorded range of motion vs the MJCF range; see mapping_checks).

## Provenance and reproduction

```
dataset        apayan/so100_ball8 @ f318cc9490b327bd1382e29c528f7d7348aa4716 (requested f318cc9490b327bd1382e29c528f7d7348aa4716)
               LeRobot v2.1, robot_type so100, 30 fps, 104 episodes loaded (repo: 104), 1 dropped
data files     data/chunk-000/episode_000000.parquet (edf4cf3ab422), data/chunk-000/episode_000001.parquet (73634a6edd91), data/chunk-000/episode_000002.parquet (175fb490846f), ... (104 files)
twin           trs_so_arm100 (so_arm100.xml) from https://github.com/google-deepmind/mujoco_menagerie @ b0655057a9df2abe39ea7fc989914ba6f248301c
               dir sha256 4f3b0f21b8a2b889..., timestep 0.002 -> 0.00196078 s x 17 substeps/frame, contacts disabled
software       mujoco 3.17.0, numpy 2.5.4, scipy 1.18.1, python 3.13.18, meatspace_lab 2.0.0 (code sha256 924eb3d8364be665...)
hardware       x86_64 Intel(R) Xeon(R) Processor @ 2.80GHz; OpenBLAS kernel numpy: SkylakeX; scipy: SkylakeX
report         schema meatspace.twin-gap-report/v2
               results sha256 0f2b5062b38c9744735ca9d824fe6c3880dbf60341abb3f652ed382e38abf23b  (numbers only; any interpreter/CPU)
               content sha256 ee1cf819aed4bee35724b05849d8b1bf80ef6ced727dc57f75b3a640afa8c545  (numbers + environment above)
```

Reproduce (from `lab/`, see README) into a scratch directory and compare:

```
python -m meatspace_lab report --dataset apayan/so100_ball8 --revision f318cc9490b327bd1382e29c528f7d7348aa4716 \
    --twin .cache/menagerie/trs_so_arm100 --out /tmp/repro/ --max-episodes 200
python -m meatspace_lab verify reports/apayan__so100_ball8/report.json /tmp/repro/report.json
```
