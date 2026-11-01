# Twin Gap Report: lerobot/svla_so100_pickplace x trs_so_arm100

```
STATUS     unsupported
REASON     recorded range of motion does not fit the twin's joint range under the documented calibration convention with either sign (zero shift > 20 deg) for: shoulder_lift [-88.68, 38.24] vs MJCF [-190.22, 9.97]; this robot's calibration does not follow the convention, so no mapping is asserted
```

No sim-vs-real numbers are reported for this dataset: they would rest on an unverified unit or joint mapping.

Mapping checks (1st-99th percentile of FIT-episode states vs MJCF range, deg):

```
joint          recorded p1..p99  MJCF range         shift (doc sign)  shift (flipped)  decision
-------------  ----------------  -----------------  ----------------  ---------------  ---------------------------------------------------------------------------
shoulder_pan   [-32.78, 69.79]   [-110.01, 110.01]  0.0               0.0              documented sign (flipped sign would also fit: sign not identified by range)
shoulder_lift  [-88.68, 38.24]   [-190.22, 9.97]    28.27             78.71            rejected
elbow_flex     [-28.12, 74.97]   [-9.97, 179.91]    18.16             65.0             documented sign
wrist_flex     [20.73, 88.15]    [-95.11, 95.11]    0.0               0.0              documented sign (flipped sign would also fit: sign not identified by range)
wrist_roll     [68.73, 120.32]   [-159.86, 159.86]  0.0               0.0              documented sign (flipped sign would also fit: sign not identified by range)
```

Same gate on other episode subsets (robustness, not used): fit: rejected, shift (doc sign) [0.0, 28.27, 18.16, 0.0, 0.0]; all_episodes: accepted, shift (doc sign) [0.0, 17.45, 4.44, 0.0, 0.0]; heldout_only: accepted, shift (doc sign) [0.0, 2.86, 0.0, 0.0, 0.0]

Forward kinematics under the documented mapping (evidence only; assumes the base sits on the work surface): gripper lowest point minus base lowest point (m) {'p1': -0.132, 'p5': -0.113, 'p50': 0.136, 'min': -0.139}; frames more than 2 cm below the base: 0.2392; frames beyond a stock MJCF limit: {'shoulder_pan': 0.0, 'shoulder_lift': 0.0598, 'elbow_flex': 0.0116, 'wrist_flex': 0.0, 'wrist_roll': 0.0}.

- The mapping gate is FRAGILE for this dataset: the same rule on other episode subsets gives a different decision (all episodes: accepted, held-out only: accepted); the decision on the fit episodes is the one used.

Units verdict: legacy LeRobot degrees (tick = 180/2048 deg verified on every arm joint)

## Provenance and reproduction

```
dataset        lerobot/svla_so100_pickplace @ 728583b5eaf9e739a7f119e2def466fa1d552402 (requested 728583b5eaf9e739a7f119e2def466fa1d552402)
               LeRobot v3.0, robot_type so100, 30 fps, 50 episodes loaded (repo: 50), 0 dropped
data files     data/chunk-000/file-000.parquet (e74b2786f24b)
twin           trs_so_arm100 (so_arm100.xml) from https://github.com/google-deepmind/mujoco_menagerie @ b0655057a9df2abe39ea7fc989914ba6f248301c
               dir sha256 4f3b0f21b8a2b889..., timestep 0.002 -> 0.00196078 s x 17 substeps/frame, contacts disabled
software       mujoco 3.17.0, numpy 2.5.4, scipy 1.18.1, python 3.13.18, meatspace_lab 2.0.0 (code sha256 924eb3d8364be665...)
hardware       x86_64 Intel(R) Xeon(R) Processor @ 2.80GHz; OpenBLAS kernel numpy: SkylakeX; scipy: SkylakeX
report         schema meatspace.twin-gap-report/v2
               results sha256 3be7b06ef86449680eebab3d62edc2397aba177bf8a5d0fc5d48a2f7092af852  (numbers only; any interpreter/CPU)
               content sha256 2ced9b252f3ad0b0daa8d3bb1746eaefc09cba5398cc0e0f29c900760c4966e8  (numbers + environment above)
```

Reproduce (from `lab/`, see README) into a scratch directory and compare:

```
python -m meatspace_lab report --dataset lerobot/svla_so100_pickplace --revision 728583b5eaf9e739a7f119e2def466fa1d552402 \
    --twin .cache/menagerie/trs_so_arm100 --out /tmp/repro/ --max-episodes 200
python -m meatspace_lab verify reports/lerobot__svla_so100_pickplace/report.json /tmp/repro/report.json
```
