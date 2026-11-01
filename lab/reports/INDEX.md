# Twin Gap Report index

Every row: open-loop replay of the recorded commands in the Menagerie twin, then a system-identification fit on the fit episodes; numbers are on **held-out episodes** the fit never saw, in two sets: the **future block** (the last 20% of episodes by index, recorded after every fit episode) and the **interleaved** set (random episodes from the same period). RMSE = sim-vs-real joint trajectory RMSE in degrees, mean over the 5 arm joints (gripper excluded) and over episodes, [95% bootstrap CI over episodes]. **Change = calibrated/reference - 1, paired by episode; negative = better.** Baseline = a physics-free per-joint lag filter (3 parameters per joint) fitted on the same episodes: "vs baseline" is what the MuJoCo physics adds.

Selection: every candidate of the pool below whose compatibility scan passed was run with the same pipeline and is listed whatever its result (see `candidates.json`; v1 reported 6 of the 23 without a rule).

## Future block (chronological hold-out)

| dataset | twin | units | fps | eps fit/interl./future | stock | aligned stock | baseline | calibrated | change vs stock | change vs baseline | improved | verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| [00ri/so100_battery](00ri__so100_battery/report.md) | trs_so_arm100 | legacy_degrees | 30 | 30/10/10 | 0.57 [0.55, 0.60] | 0.57 [0.55, 0.60] | 0.49 [0.47, 0.50] | 0.34 [0.32, 0.36] | -41% [-43, -38] | -31% [-33, -28] | 10/10 | closes part of the gap; beats baseline |
| [aaronsu11/so100_instrument](aaronsu11__so100_instrument/report.md) | trs_so_arm100 | legacy_degrees | 30 | 40/60/25 | 0.94 [0.85, 1.04] | 0.74 [0.72, 0.76] | 0.63 [0.61, 0.64] | 0.58 [0.55, 0.60] | -39% [-44, -33] | -8% [-11, -4] | 25/25 | closes part of the gap; beats baseline |
| [Aneysait/so101_pick_red_all](Aneysait__so101_pick_red_all/report.md) | robotstudio_so101 | degrees_mode | 30 | 40/53/23 | 4.18 [4.12, 4.26] | 1.39 [1.36, 1.42] | 1.00 [0.98, 1.02] | 0.68 [0.67, 0.70] | -84% [-84, -83] | -32% [-34, -30] | 23/23 | closes most of the gap; beats baseline |
| [apayan/so100_ball8](apayan__so100_ball8/report.md) | trs_so_arm100 | legacy_degrees | 30 | 40/42/21 | 0.71 [0.69, 0.74] | 0.71 [0.69, 0.74] | 0.70 [0.68, 0.72] | 0.48 [0.45, 0.52] | -33% [-37, -29] | -31% [-35, -28] | 21/21 | closes part of the gap; beats baseline |
| [cagataydev/so101-tic-tac-toe](cagataydev__so101-tic-tac-toe/report.md) | robotstudio_so101 | degrees_mode | 30 | 40/120/40 | 2.82 [2.71, 2.94] | 1.04 [0.99, 1.10] | 0.69 [0.61, 0.80] | 0.38 [0.34, 0.42] | -87% [-88, -85] | -46% [-49, -43] | 40/40 | closes most of the gap; beats baseline |
| [CarolinePascal/plug_socket_moved](CarolinePascal__plug_socket_moved/report.md) | trs_so_arm100 | legacy_degrees | 30 | 26/9/9 | 3.39 [3.10, 3.68] | 3.95 [3.72, 4.19] | 3.30 [3.13, 3.46] | 3.42 [3.18, 3.67] | +1% [-1, +4] | +4% [+0, +7] | 3/9 | no clear change; WORSE than baseline |
| [Chojins/chess_game_001_blue_stereo](Chojins__chess_game_001_blue_stereo/report.md) | trs_so_arm100 | legacy_degrees | 30 | 40/120/40 | 1.12 [1.05, 1.20] | 1.31 [1.05, 1.64] | 1.18 [0.94, 1.48] | 1.10 [0.84, 1.44] | -2% [-21, +21] | -6% [-11, -3] | 36/40 | no clear change; beats baseline |
| [hungho77/so101_left_arm_pick_red_cube_into_pot](hungho77__so101_left_arm_pick_red_cube_into_pot/report.md) | robotstudio_so101 | degrees_mode | 30 | 30/10/10 | 3.02 [2.90, 3.13] | 1.34 [1.20, 1.52] | 0.77 [0.66, 0.93] | 0.47 [0.36, 0.64] | -84% [-88, -79] | -39% [-46, -31] | 10/10 | closes most of the gap; beats baseline |
| [IlyaGusev/so101_pick_gum](IlyaGusev__so101_pick_gum/report.md) | robotstudio_so101 | degrees_mode | 20 | 40/84/31 | 5.63 [5.53, 5.74] | 2.41 [2.20, 2.64] | 1.69 [1.48, 1.93] | 1.33 [1.12, 1.58] | -76% [-80, -72] | -21% [-25, -18] | 31/31 | closes most of the gap; beats baseline |
| [jccj/so100_block_in_cup](jccj__so100_block_in_cup/report.md) | trs_so_arm100 | legacy_degrees | 30 | 30/10/10 | 0.90 [0.83, 0.95] | 0.88 [0.79, 0.96] | 0.76 [0.67, 0.84] | 0.62 [0.54, 0.69] | -31% [-36, -26] | -18% [-20, -16] | 10/10 | closes part of the gap; beats baseline |
| [julyfun/so100_pick_and_place_v4_50](julyfun__so100_pick_and_place_v4_50/report.md) | trs_so_arm100 | legacy_degrees | 30 | 30/10/10 | 1.64 [1.52, 1.77] | 0.67 [0.62, 0.73] | 0.52 [0.49, 0.57] | 0.37 [0.34, 0.41] | -77% [-79, -76] | -28% [-32, -25] | 10/10 | closes most of the gap; beats baseline |
| [lerobot/svla_so101_pickplace](lerobot__svla_so101_pickplace/report.md) | robotstudio_so101 | range_m100_100 | 30 | 30/10/10 | 5.35 [5.14, 5.54] | 1.01 [0.98, 1.05] | 0.63 [0.61, 0.66] | 0.46 [0.44, 0.48] | -91% [-92, -91] | -28% [-32, -24] | 10/10 | closes most of the gap; beats baseline |
| [Loki0929/so100_lan](Loki0929__so100_lan/report.md) | trs_so_arm100 | legacy_degrees | 30 | 40/120/40 | 1.71 [1.57, 1.86] | 1.04 [0.97, 1.11] | 1.05 [0.98, 1.12] | 0.89 [0.82, 0.97] | -48% [-49, -46] | -15% [-17, -13] | 40/40 | closes part of the gap; beats baseline |
| [samsitol/so100_PnPacorn](samsitol__so100_PnPacorn/report.md) | trs_so_arm100 | legacy_degrees | 30 | 40/80/30 | 1.47 [1.39, 1.55] | 1.24 [1.20, 1.27] | 1.01 [0.98, 1.03] | 0.93 [0.90, 0.96] | -37% [-39, -34] | -8% [-9, -6] | 30/30 | closes part of the gap; beats baseline |
| [shubham4413/so100_smolvla_rc](shubham4413__so100_smolvla_rc/report.md) | trs_so_arm100 | degrees_mode | 30 | 40/88/32 | 2.06 [1.94, 2.20] | 1.68 [1.60, 1.78] | 1.44 [1.38, 1.51] | 1.14 [1.08, 1.21] | -45% [-47, -42] | -21% [-24, -18] | 32/32 | closes part of the gap; beats baseline |
| [shylee/so100_pengripG](shylee__so100_pengripG/report.md) | trs_so_arm100 | legacy_degrees | 30 | 40/120/40 | 1.18 [1.15, 1.20] | 1.21 [1.19, 1.23] | 0.83 [0.81, 0.85] | 0.62 [0.60, 0.64] | -47% [-49, -45] | -25% [-27, -23] | 40/40 | closes part of the gap; beats baseline |
| [VoicAndrei/so100_kitchen](VoicAndrei__so100_kitchen/report.md) | trs_so_arm100 | legacy_degrees | 30 | 40/120/40 | 1.98 [1.92, 2.04] | 1.47 [1.41, 1.53] | 1.25 [1.19, 1.32] | 1.09 [1.03, 1.14] | -45% [-46, -44] | -13% [-14, -12] | 40/40 | closes part of the gap; beats baseline |
| [xsatvik/mixer_on_off_new_1](xsatvik__mixer_on_off_new_1/report.md) | trs_so_arm100 | legacy_degrees | 30 | 34/12/12 | 1.55 [1.49, 1.63] | 1.45 [1.38, 1.54] | 1.22 [1.14, 1.31] | 1.08 [0.99, 1.18] | -30% [-34, -27] | -11% [-14, -8] | 12/12 | closes part of the gap; beats baseline |

## Interleaved held-out

| dataset | twin | units | fps | eps fit/interl./future | stock | aligned stock | baseline | calibrated | change vs stock | change vs baseline | improved | verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| [00ri/so100_battery](00ri__so100_battery/report.md) | trs_so_arm100 | legacy_degrees | 30 | 30/10/10 | 0.56 [0.55, 0.58] | 0.56 [0.55, 0.58] | 0.49 [0.48, 0.51] | 0.33 [0.32, 0.35] | -41% [-44, -39] | -33% [-36, -29] | 10/10 | closes part of the gap; beats baseline |
| [aaronsu11/so100_instrument](aaronsu11__so100_instrument/report.md) | trs_so_arm100 | legacy_degrees | 30 | 40/60/25 | 1.22 [1.04, 1.43] | 0.96 [0.74, 1.30] | 0.89 [0.68, 1.23] | 0.76 [0.55, 1.10] | -38% [-52, -18] | -15% [-20, -10] | 58/60 | closes part of the gap; beats baseline |
| [Aneysait/so101_pick_red_all](Aneysait__so101_pick_red_all/report.md) | robotstudio_so101 | degrees_mode | 30 | 40/53/23 | 3.97 [3.88, 4.07] | 1.41 [1.38, 1.45] | 1.00 [0.98, 1.03] | 0.69 [0.67, 0.71] | -83% [-83, -82] | -31% [-32, -30] | 53/53 | closes most of the gap; beats baseline |
| [apayan/so100_ball8](apayan__so100_ball8/report.md) | trs_so_arm100 | legacy_degrees | 30 | 40/42/21 | 0.69 [0.68, 0.71] | 0.69 [0.68, 0.71] | 0.66 [0.65, 0.68] | 0.43 [0.42, 0.44] | -38% [-39, -36] | -35% [-37, -33] | 42/42 | closes part of the gap; beats baseline |
| [cagataydev/so101-tic-tac-toe](cagataydev__so101-tic-tac-toe/report.md) | robotstudio_so101 | degrees_mode | 30 | 40/120/40 | 2.66 [2.59, 2.73] | 1.05 [1.00, 1.11] | 0.64 [0.59, 0.72] | 0.39 [0.35, 0.46] | -85% [-87, -83] | -39% [-42, -35] | 120/120 | closes most of the gap; beats baseline |
| [CarolinePascal/plug_socket_moved](CarolinePascal__plug_socket_moved/report.md) | trs_so_arm100 | legacy_degrees | 30 | 26/9/9 | 3.38 [3.05, 3.76] | 3.93 [3.62, 4.26] | 3.30 [3.08, 3.55] | 3.39 [3.11, 3.70] | +0% [-3, +4] | +3% [+0, +5] | 5/9 | no clear change; WORSE than baseline |
| [Chojins/chess_game_001_blue_stereo](Chojins__chess_game_001_blue_stereo/report.md) | trs_so_arm100 | legacy_degrees | 30 | 40/120/40 | 1.07 [1.03, 1.11] | 1.07 [1.00, 1.17] | 0.96 [0.89, 1.05] | 0.90 [0.83, 1.00] | -16% [-21, -9] | -6% [-9, -4] | 112/120 | small improvement; most of the gap remains; beats baseline |
| [hungho77/so101_left_arm_pick_red_cube_into_pot](hungho77__so101_left_arm_pick_red_cube_into_pot/report.md) | robotstudio_so101 | degrees_mode | 30 | 30/10/10 | 2.85 [2.68, 3.04] | 1.28 [1.17, 1.45] | 0.73 [0.64, 0.88] | 0.45 [0.36, 0.60] | -84% [-87, -80] | -39% [-44, -32] | 10/10 | closes most of the gap; beats baseline |
| [IlyaGusev/so101_pick_gum](IlyaGusev__so101_pick_gum/report.md) | robotstudio_so101 | degrees_mode | 20 | 40/84/31 | 4.19 [3.96, 4.43] | 2.13 [2.00, 2.26] | 1.34 [1.22, 1.47] | 0.93 [0.80, 1.07] | -78% [-80, -75] | -30% [-34, -26] | 84/84 | closes most of the gap; beats baseline |
| [jccj/so100_block_in_cup](jccj__so100_block_in_cup/report.md) | trs_so_arm100 | legacy_degrees | 30 | 30/10/10 | 0.81 [0.73, 0.90] | 0.76 [0.67, 0.88] | 0.64 [0.55, 0.77] | 0.48 [0.39, 0.59] | -41% [-48, -33] | -25% [-30, -21] | 10/10 | closes part of the gap; beats baseline |
| [julyfun/so100_pick_and_place_v4_50](julyfun__so100_pick_and_place_v4_50/report.md) | trs_so_arm100 | legacy_degrees | 30 | 30/10/10 | 1.67 [1.57, 1.76] | 0.75 [0.70, 0.81] | 0.55 [0.49, 0.61] | 0.38 [0.34, 0.43] | -77% [-79, -75] | -30% [-33, -27] | 10/10 | closes most of the gap; beats baseline |
| [lerobot/svla_so101_pickplace](lerobot__svla_so101_pickplace/report.md) | robotstudio_so101 | range_m100_100 | 30 | 30/10/10 | 5.00 [4.66, 5.32] | 1.01 [0.96, 1.06] | 0.64 [0.62, 0.66] | 0.43 [0.41, 0.45] | -91% [-92, -91] | -33% [-37, -29] | 10/10 | closes most of the gap; beats baseline |
| [Loki0929/so100_lan](Loki0929__so100_lan/report.md) | trs_so_arm100 | legacy_degrees | 30 | 40/120/40 | 1.78 [1.69, 1.88] | 1.18 [1.13, 1.22] | 1.16 [1.12, 1.21] | 1.04 [0.99, 1.10] | -42% [-43, -40] | -11% [-12, -10] | 120/120 | closes part of the gap; beats baseline |
| [samsitol/so100_PnPacorn](samsitol__so100_PnPacorn/report.md) | trs_so_arm100 | legacy_degrees | 30 | 40/80/30 | 1.54 [1.47, 1.61] | 1.26 [1.23, 1.30] | 1.03 [1.00, 1.06] | 0.87 [0.85, 0.90] | -43% [-45, -41] | -15% [-17, -13] | 80/80 | closes part of the gap; beats baseline |
| [shubham4413/so100_smolvla_rc](shubham4413__so100_smolvla_rc/report.md) | trs_so_arm100 | degrees_mode | 30 | 40/88/32 | 1.98 [1.90, 2.07] | 1.78 [1.73, 1.83] | 1.48 [1.44, 1.52] | 1.20 [1.16, 1.25] | -40% [-41, -38] | -19% [-20, -17] | 88/88 | closes part of the gap; beats baseline |
| [shylee/so100_pengripG](shylee__so100_pengripG/report.md) | trs_so_arm100 | legacy_degrees | 30 | 40/120/40 | 1.16 [1.14, 1.18] | 1.20 [1.18, 1.22] | 0.82 [0.80, 0.83] | 0.62 [0.60, 0.64] | -46% [-48, -45] | -24% [-26, -23] | 120/120 | closes part of the gap; beats baseline |
| [VoicAndrei/so100_kitchen](VoicAndrei__so100_kitchen/report.md) | trs_so_arm100 | legacy_degrees | 30 | 40/120/40 | 1.86 [1.82, 1.89] | 1.47 [1.44, 1.50] | 1.29 [1.26, 1.33] | 1.09 [1.06, 1.12] | -41% [-42, -40] | -16% [-16, -15] | 120/120 | closes part of the gap; beats baseline |
| [xsatvik/mixer_on_off_new_1](xsatvik__mixer_on_off_new_1/report.md) | trs_so_arm100 | legacy_degrees | 30 | 34/12/12 | 1.72 [1.59, 1.86] | 1.62 [1.49, 1.77] | 1.39 [1.25, 1.53] | 1.27 [1.14, 1.42] | -26% [-29, -23] | -8% [-11, -6] | 12/12 | closes part of the gap; beats baseline |

## Dynamics (interleaved held-out)

Lag in ms (real / stock / calibrated, median over joints) and the largest per-joint |twin - real| lag mismatch. Natural frequency = sqrt(kp/I_eff) of the fitted servo model (range over the 5 joints): the identifiable bandwidth. kp alone is only meaningful given the armature held fixed at stock (see each report).

| dataset | recording convention | lag ms real / stock / calibrated | max lag mismatch ms stock / calibrated | fitted delay | natural freq Hz | fit converged | parameters not identified alone |
|---|---|---|---|---|---|---|---|
| [00ri/so100_battery](00ri__so100_battery/report.md) | lerobot-legacy | 113 / 111 / 118 | 15.5 / 7.8 | 0 | 2.0-3.6 | yes | 4 of 15 |
| [aaronsu11/so100_instrument](aaronsu11__so100_instrument/report.md) | lerobot-legacy | 114 / 111 / 122 | 17.8 / 14.4 | 0 | 2.0-3.2 | yes | 1 of 15 |
| [Aneysait/so101_pick_red_all](Aneysait__so101_pick_red_all/report.md) | lerobot-motorsbus | 135 / 26 / 135 | 151.7 / 13.8 | 0 | 2.8-3.4 | yes | 0 of 15 |
| [apayan/so100_ball8](apayan__so100_ball8/report.md) | lerobot-legacy | 112 / 112 / 117 | 21.3 / 16.5 | 0 | 2.1-3.1 | yes | 1 of 15 |
| [cagataydev/so101-tic-tac-toe](cagataydev__so101-tic-tac-toe/report.md) | lerobot-motorsbus | 116 / 27 / 117 | 101.4 / 6.8 | 0 | 3.0-3.5 | yes | 3 of 15 |
| [CarolinePascal/plug_socket_moved](CarolinePascal__plug_socket_moved/report.md) | lerobot-legacy | 130 / 122 / 142 | 131.4 / 42.9 | 1 | 1.8-6.4 | yes | 0 of 15 |
| [Chojins/chess_game_001_blue_stereo](Chojins__chess_game_001_blue_stereo/report.md) | lerobot-legacy | 116 / 110 / 134 | 16.3 / 25.8 | 0 | 1.6-5.1 | yes | 6 of 15 |
| [hungho77/so101_left_arm_pick_red_cube_into_pot](hungho77__so101_left_arm_pick_red_cube_into_pot/report.md) | lerobot-motorsbus | 124 / 25 / 126 | 104.5 / 9.3 | 0 | 2.5-4.0 | yes | 2 of 15 |
| [IlyaGusev/so101_pick_gum](IlyaGusev__so101_pick_gum/report.md) | lerobot-motorsbus | 168 / 43 / 169 | 131.8 / 14.5 | 0 | 2.2-2.6 | yes | 0 of 15 |
| [jccj/so100_block_in_cup](jccj__so100_block_in_cup/report.md) | lerobot-legacy | 117 / 111 / 123 | 14.9 / 12.6 | 0 | 2.1-3.4 | yes | 1 of 15 |
| [julyfun/so100_pick_and_place_v4_50](julyfun__so100_pick_and_place_v4_50/report.md) | lerobot-legacy | 125 / 114 / 127 | 26.6 / 34.0 | 0 | 1.8-4.0 | yes | 3 of 15 |
| [lerobot/svla_so101_pickplace](lerobot__svla_so101_pickplace/report.md) | lerobot-motorsbus | 133 / 26 / 132 | 111.3 / 5.0 | 1 | 3.1-3.9 | yes | 0 of 15 |
| [Loki0929/so100_lan](Loki0929__so100_lan/report.md) | lerobot-legacy | 146 / 108 / 143 | 44.8 / 14.2 | 0 | 1.9-2.8 | yes | 0 of 15 |
| [samsitol/so100_PnPacorn](samsitol__so100_PnPacorn/report.md) | lerobot-legacy | 106 / 110 / 116 | 45.7 / 21.4 | 0 | 2.0-6.0 | yes | 3 of 15 |
| [shubham4413/so100_smolvla_rc](shubham4413__so100_smolvla_rc/report.md) | lerobot-motorsbus | 141 / 109 / 148 | 51.2 / 28.2 | 0 | 1.4-2.5 | yes | 0 of 15 |
| [shylee/so100_pengripG](shylee__so100_pengripG/report.md) | lerobot-legacy | 126 / 113 / 135 | 25.7 / 14.4 | 0 | 2.0-2.9 | yes | 1 of 15 |
| [VoicAndrei/so100_kitchen](VoicAndrei__so100_kitchen/report.md) | lerobot-legacy | 142 / 110 / 148 | 45.5 / 17.2 | 0 | 1.8-2.8 | yes | 0 of 15 |
| [xsatvik/mixer_on_off_new_1](xsatvik__mixer_on_off_new_1/report.md) | lerobot-legacy | 273 / 125 / 307 | 211.8 / 48.1 | 0 | 1.3-4.2 | yes | 1 of 15 |

## Run but not reported (units or mapping not verified)

| dataset | twin | reason |
|---|---|---|
| [Jeevesh2009/so101_gray_block_lowvar_test](Jeevesh2009__so101_gray_block_lowvar_test/report.md) | robotstudio_so101 | twin robotstudio_so101 has no documented mapping for zero reference 'calibration_zero_pose' |
| [lerobot/svla_so100_pickplace](lerobot__svla_so100_pickplace/report.md) | trs_so_arm100 | recorded range of motion does not fit the twin's joint range under the documented calibration convention with either sign (zero shift > 20 deg) for: shoulder_lift [-88.68, 38.24] vs MJCF [-190.22, 9.97]; this robot's calibration does not follow the convention, so no mapping is asserted |
| [sincostangerines/stack_cubes_100](sincostangerines__stack_cubes_100/report.md) | robotstudio_so101 | twin robotstudio_so101 has no documented mapping for zero reference 'calibration_zero_pose' |
| [siyavash/so101_test](siyavash__so101_test/report.md) | robotstudio_so101 | twin robotstudio_so101 has no documented mapping for zero reference 'calibration_zero_pose' |
| [youliangtan/so100_strawberry_grape](youliangtan__so100_strawberry_grape/report.md) | trs_so_arm100 | recorded range of motion does not fit the twin's joint range under the documented calibration convention with either sign (zero shift > 20 deg) for: shoulder_pan [52.11, 135.0] vs MJCF [-110.01, 110.01]; this robot's calibration does not follow the convention, so no mapping is asserted |

## Candidate pool

2 seed datasets named in the project brief, plus 28 single-arm SO-100/SO-101 candidates hand-picked by the v1 builder from the top-60 Hugging Face Hub search results for 'so100' and 'so101' (2026-11-01). The criterion of that hand-pick was not recorded. The pick and the scan (14:01-14:04) preceded every v1 report run (first at ~14:24); before that, sim-vs-real numbers existed only for the two seeds (a prior quick replay).

Rule: v2 (pre-declared, outcome-independent): every candidate whose scan verdict is 'ok' is run with the same pipeline and configuration and listed in INDEX.md whatever its result; at most the first 200 episodes by index are loaded (compute cap). Twin: robotstudio_so101 if 'so101' appears in the dataset id or robot_type, else trs_so_arm100.

| dataset | source | scan verdict | outcome |
|---|---|---|---|
| lerobot/svla_so100_pickplace | seed (named in the project brief) | ok | unsupported (see table above) |
| lerobot/svla_so101_pickplace | seed (named in the project brief) | ok | reported: closes most of the gap (future block) |
| jchandru08/so100_press_red_button | scan pool | not a single SO arm: cannot map joint 'shoulder_pan' in names ['left_shoulder_pan', 'left_shoulder_lift', 'left_elbow_flex', 'left_wrist_flex', 'left_wrist_roll | not run (scan failed) |
| Chojins/chess_game_001_blue_stereo | scan pool | ok | reported: no clear change (future block) |
| VoicAndrei/so100_kitchen | scan pool | ok | reported: closes part of the gap (future block) |
| shubham4413/so100_smolvla_rc | scan pool | ok | reported: closes part of the gap (future block) |
| Loki0929/so100_lan | scan pool | ok | reported: closes part of the gap (future block) |
| xsatvik/mixer_on_off_new_1 | scan pool | ok | reported: closes part of the gap (future block) |
| shylee/so100_pengripG | scan pool | ok | reported: closes part of the gap (future block) |
| apayan/so100_ball8 | scan pool | ok | reported: closes part of the gap (future block) |
| CarolinePascal/plug_socket_moved | scan pool | ok | reported: no clear change (future block) |
| 00ri/so100_battery | scan pool | ok | reported: closes part of the gap (future block) |
| jccj/so100_block_in_cup | scan pool | ok | reported: closes part of the gap (future block) |
| samsitol/so100_PnPacorn | scan pool | ok | reported: closes part of the gap (future block) |
| youliangtan/so100_strawberry_grape | scan pool | ok | unsupported (see table above) |
| julyfun/so100_pick_and_place_v4_50 | scan pool | ok | reported: closes most of the gap (future block) |
| aaronsu11/so100_instrument | scan pool | ok | reported: closes part of the gap (future block) |
| IlyaGusev/so101_pick_gum | scan pool | ok | reported: closes most of the gap (future block) |
| hungho77/so101_left_arm_pick_red_cube_into_pot | scan pool | ok | reported: closes most of the gap (future block) |
| G3nadh/so101_pick_place | scan pool | error: RemoteEntryNotFoundError: 404 Client Error. (Request ID: Root=1-6ae746bb-27d5ed1a14b0d48840c88af4;35b8d28e-224b-4210-9909-51dd9773f8b4) | not run (scan failed) |
| QianGroup/so101_pick_place | scan pool | error: RemoteEntryNotFoundError: 404 Client Error. (Request ID: Root=1-6ae746bc-5ef164f90a309c4d03209f6c;b2112d3d-b9cd-4185-a0e2-fac1d987b3ea) | not run (scan failed) |
| legalaspro/so101-pick-and-place-cube-lerobot-30hz | scan pool | unsupported units | not run (scan failed) |
| theconstruct-ai/so101_pickplace_auto_v1 | scan pool | unsupported units | not run (scan failed) |
| cagataydev/so101-tic-tac-toe | scan pool | ok | reported: closes most of the gap (future block) |
| aswinkumar99/LeRobot-SO101-Pick-Place | scan pool | error: RemoteEntryNotFoundError: 404 Client Error. (Request ID: Root=1-6ae746c2-4c9769a530ac3e8043c53985;c6e5a758-1624-43d4-b011-e65f923de903) | not run (scan failed) |
| Jeevesh2009/so101_gray_block_lowvar_test | scan pool | ok | unsupported (see table above) |
| siyavash/so101_test | scan pool | ok | unsupported (see table above) |
| sincostangerines/stack_cubes_100 | scan pool | ok | unsupported (see table above) |
| Aneysait/so101_pick_red_all | scan pool | ok | reported: closes most of the gap (future block) |
| gpudad/so101_pick_cube_chunked | scan pool | unsupported units | not run (scan failed) |

Regenerate: `python -m meatspace_lab index --reports reports` (from `lab/`).
