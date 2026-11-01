# Twin Gap Report: siyavash/so101_test x robotstudio_so101

```
STATUS     unsupported
REASON     twin robotstudio_so101 has no documented mapping for zero reference 'calibration_zero_pose'
```

No sim-vs-real numbers are reported for this dataset: they would rest on an unverified unit or joint mapping.

Units verdict: legacy LeRobot degrees (tick = 180/2048 deg verified on every arm joint)

## Provenance and reproduction

```
dataset        siyavash/so101_test @ 91435fb531908146edeb823d0a5499d796798c35 (requested 91435fb531908146edeb823d0a5499d796798c35)
               LeRobot v2.1, robot_type so101, 30 fps, 50 episodes loaded (repo: 50), 0 dropped
data files     data/chunk-000/episode_000000.parquet (426101efa56f), data/chunk-000/episode_000001.parquet (ebb415cad63d), data/chunk-000/episode_000002.parquet (114ff37fc5bd), ... (50 files)
twin           robotstudio_so101 (so101.xml) from https://github.com/google-deepmind/mujoco_menagerie @ b0655057a9df2abe39ea7fc989914ba6f248301c
               dir sha256 6c00120339c328b1..., timestep 0.005 -> 0.0047619 s x 7 substeps/frame, contacts disabled
software       mujoco 3.17.0, numpy 2.5.4, scipy 1.18.1, python 3.13.18, meatspace_lab 2.0.0 (code sha256 924eb3d8364be665...)
hardware       x86_64 Intel(R) Xeon(R) Processor @ 2.80GHz; OpenBLAS kernel numpy: SkylakeX; scipy: SkylakeX
report         schema meatspace.twin-gap-report/v2
               results sha256 0937975a79cb1cc425311b2bdb173af23c2644a4a93eb4396d1fc2f9d7aa8d6b  (numbers only; any interpreter/CPU)
               content sha256 51b1894976146801a29aa7051c410f4d846dd6ba78f478bc000c55fee54599e1  (numbers + environment above)
```

Reproduce (from `lab/`, see README) into a scratch directory and compare:

```
python -m meatspace_lab report --dataset siyavash/so101_test --revision 91435fb531908146edeb823d0a5499d796798c35 \
    --twin .cache/menagerie/robotstudio_so101 --out /tmp/repro/ --max-episodes 200
python -m meatspace_lab verify reports/siyavash__so101_test/report.json /tmp/repro/report.json
```
