# Twin Gap Report: youliangtan/so100_strawberry_grape x trs_so_arm100

```
STATUS     unsupported
REASON     recorded range of motion does not fit the twin's joint range under the documented calibration convention with either sign (zero shift > 20 deg) for: shoulder_pan [52.11, 135.0] vs MJCF [-110.01, 110.01]; this robot's calibration does not follow the convention, so no mapping is asserted
```

No sim-vs-real numbers are reported for this dataset: they would rest on an unverified unit or joint mapping.

Mapping checks (1st-99th percentile of FIT-episode states vs MJCF range, deg):

```
joint          recorded p1..p99  MJCF range         shift (doc sign)  shift (flipped)  decision
-------------  ----------------  -----------------  ----------------  ---------------  ---------------------------------------------------------------------------
shoulder_pan   [52.11, 135.0]    [-110.01, 110.01]  24.99             24.99            rejected
shoulder_lift  [52.56, 176.84]   [-190.22, 9.97]    166.88            0.0              flipped sign (documented sign does not fit the MJCF range)
elbow_flex     [49.48, 168.13]   [-9.97, 179.91]    0.0               158.17           documented sign
wrist_flex     [14.32, 91.49]    [-95.11, 95.11]    0.0               0.0              documented sign (flipped sign would also fit: sign not identified by range)
wrist_roll     [-125.24, 48.62]  [-159.86, 159.86]  0.0               0.0              documented sign (flipped sign would also fit: sign not identified by range)
```

Same gate on other episode subsets (robustness, not used): fit: rejected, shift (doc sign) [24.99, 166.88, 0.0, 0.0, 0.0]; all_episodes: rejected, shift (doc sign) [25.52, 166.6, 0.0, 0.0, 0.0]; heldout_only: rejected, shift (doc sign) [26.57, 163.79, 0.0, 0.0, 0.0]

Forward kinematics under the documented mapping (evidence only; assumes the base sits on the work surface): gripper lowest point minus base lowest point (m) {'p1': 0.039, 'p5': 0.048, 'p50': 0.073, 'min': 0.027}; frames more than 2 cm below the base: 0.0; frames beyond a stock MJCF limit: {'shoulder_pan': 0.1586, 'shoulder_lift': 0.0, 'elbow_flex': 0.0, 'wrist_flex': 0.0057, 'wrist_roll': 0.0}.

Units verdict: legacy LeRobot degrees (tick = 180/2048 deg verified on every arm joint)

## Provenance and reproduction

```
dataset        youliangtan/so100_strawberry_grape @ 824bec87a1befd17bf4b0985f41cc0a00191b2db (requested 824bec87a1befd17bf4b0985f41cc0a00191b2db)
               LeRobot v2.1, robot_type so100, 30 fps, 40 episodes loaded (repo: 40), 0 dropped
data files     data/chunk-000/episode_000000.parquet (4b914fa31382), data/chunk-000/episode_000001.parquet (9d8a1ef74883), data/chunk-000/episode_000002.parquet (44989c8d6927), ... (40 files)
twin           trs_so_arm100 (so_arm100.xml) from https://github.com/google-deepmind/mujoco_menagerie @ b0655057a9df2abe39ea7fc989914ba6f248301c
               dir sha256 4f3b0f21b8a2b889..., timestep 0.002 -> 0.00196078 s x 17 substeps/frame, contacts disabled
software       mujoco 3.17.0, numpy 2.5.4, scipy 1.18.1, python 3.13.18, meatspace_lab 2.0.0 (code sha256 924eb3d8364be665...)
hardware       x86_64 Intel(R) Xeon(R) Processor @ 2.80GHz; OpenBLAS kernel numpy: SkylakeX; scipy: SkylakeX
report         schema meatspace.twin-gap-report/v2
               results sha256 b86e28fbe7bb5ad4ebed04ca6e4312310be483cc56be83867cea3a95a464ac80  (numbers only; any interpreter/CPU)
               content sha256 2f815cd36159ba1dd831d05f7e56b6fd5870aedd49e90dce363759ac139d54e6  (numbers + environment above)
```

Reproduce (from `lab/`, see README) into a scratch directory and compare:

```
python -m meatspace_lab report --dataset youliangtan/so100_strawberry_grape --revision 824bec87a1befd17bf4b0985f41cc0a00191b2db \
    --twin .cache/menagerie/trs_so_arm100 --out /tmp/repro/ --max-episodes 200
python -m meatspace_lab verify reports/youliangtan__so100_strawberry_grape/report.json /tmp/repro/report.json
```
