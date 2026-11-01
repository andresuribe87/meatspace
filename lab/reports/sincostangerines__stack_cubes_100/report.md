# Twin Gap Report: sincostangerines/stack_cubes_100 x robotstudio_so101

```
STATUS     unsupported
REASON     twin robotstudio_so101 has no documented mapping for zero reference 'calibration_zero_pose'
```

No sim-vs-real numbers are reported for this dataset: they would rest on an unverified unit or joint mapping.

Units verdict: legacy LeRobot degrees (tick = 180/2048 deg verified on every arm joint)

## Provenance and reproduction

```
dataset        sincostangerines/stack_cubes_100 @ ee6ddf88fc34cdb62431989c4f99ebab3003c68a (requested ee6ddf88fc34cdb62431989c4f99ebab3003c68a)
               LeRobot v2.1, robot_type so101, 30 fps, 31 episodes loaded (repo: 31), 0 dropped
data files     data/chunk-000/episode_000000.parquet (f0662604b601), data/chunk-000/episode_000001.parquet (3cbebe003cde), data/chunk-000/episode_000002.parquet (c8e2e70f6a9a), ... (31 files)
twin           robotstudio_so101 (so101.xml) from https://github.com/google-deepmind/mujoco_menagerie @ b0655057a9df2abe39ea7fc989914ba6f248301c
               dir sha256 6c00120339c328b1..., timestep 0.005 -> 0.0047619 s x 7 substeps/frame, contacts disabled
software       mujoco 3.17.0, numpy 2.5.4, scipy 1.18.1, python 3.13.18, meatspace_lab 2.0.0 (code sha256 924eb3d8364be665...)
hardware       x86_64 Intel(R) Xeon(R) Processor @ 2.80GHz; OpenBLAS kernel numpy: SkylakeX; scipy: SkylakeX
report         schema meatspace.twin-gap-report/v2
               results sha256 d254826ecabb5fb18cd41750ce89e4a1957bdc77cd9f9482e43dd3205de36f4c  (numbers only; any interpreter/CPU)
               content sha256 1f11c5b966e759c1dfe6b3d3ae35d5c5daadbf0169fdfa35439cd5b8246c1185  (numbers + environment above)
```

Reproduce (from `lab/`, see README) into a scratch directory and compare:

```
python -m meatspace_lab report --dataset sincostangerines/stack_cubes_100 --revision ee6ddf88fc34cdb62431989c4f99ebab3003c68a \
    --twin .cache/menagerie/robotstudio_so101 --out /tmp/repro/ --max-episodes 200
python -m meatspace_lab verify reports/sincostangerines__stack_cubes_100/report.json /tmp/repro/report.json
```
