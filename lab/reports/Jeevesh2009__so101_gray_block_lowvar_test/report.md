# Twin Gap Report: Jeevesh2009/so101_gray_block_lowvar_test x robotstudio_so101

```
STATUS     unsupported
REASON     twin robotstudio_so101 has no documented mapping for zero reference 'calibration_zero_pose'
```

No sim-vs-real numbers are reported for this dataset: they would rest on an unverified unit or joint mapping.

Units verdict: legacy LeRobot degrees (tick = 180/2048 deg verified on every arm joint)

## Provenance and reproduction

```
dataset        Jeevesh2009/so101_gray_block_lowvar_test @ 649f2f48bf5ddc9ab289c221aa72976996903e38 (requested 649f2f48bf5ddc9ab289c221aa72976996903e38)
               LeRobot v2.1, robot_type so101, 30 fps, 100 episodes loaded (repo: 100), 0 dropped
data files     data/chunk-000/episode_000000.parquet (9ef59e49e964), data/chunk-000/episode_000001.parquet (1e135e423f3d), data/chunk-000/episode_000002.parquet (ccf0d63fbd65), ... (100 files)
twin           robotstudio_so101 (so101.xml) from https://github.com/google-deepmind/mujoco_menagerie @ b0655057a9df2abe39ea7fc989914ba6f248301c
               dir sha256 6c00120339c328b1..., timestep 0.005 -> 0.0047619 s x 7 substeps/frame, contacts disabled
software       mujoco 3.17.0, numpy 2.5.4, scipy 1.18.1, python 3.13.18, meatspace_lab 2.0.0 (code sha256 924eb3d8364be665...)
hardware       x86_64 Intel(R) Xeon(R) Processor @ 2.80GHz; OpenBLAS kernel numpy: SkylakeX; scipy: SkylakeX
report         schema meatspace.twin-gap-report/v2
               results sha256 e4db406b734bcb160c1e93ce613dc664b9c35ed858f7383923d4602ac4ee2e32  (numbers only; any interpreter/CPU)
               content sha256 e124fc9801b37b34603bdd5596a79a8edb6f48718f15f7b4d46a5ad479c8c51a  (numbers + environment above)
```

Reproduce (from `lab/`, see README) into a scratch directory and compare:

```
python -m meatspace_lab report --dataset Jeevesh2009/so101_gray_block_lowvar_test --revision 649f2f48bf5ddc9ab289c221aa72976996903e38 \
    --twin .cache/menagerie/robotstudio_so101 --out /tmp/repro/ --max-episodes 200
python -m meatspace_lab verify reports/Jeevesh2009__so101_gray_block_lowvar_test/report.json /tmp/repro/report.json
```
