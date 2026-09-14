# EDA Summary — NASA CMAPSS FD001 Turbofan Degradation
*Mission Readiness & Predictive Maintenance Hackathon*
*Generated: 2026-09-14 20:30*

---

## 1. Dataset Overview

| Property | Value |
|---|---|
| Dataset | NASA CMAPSS — FD001 (single fault: HPC Degradation) |
| Training engines | 100 |
| Test engines | 100 |
| Training rows | 20,631 |
| Test rows | 13,096 |
| Raw columns | 26 (unit_number, time_cycles, 3 op settings, 21 sensors) |
| ML-ready columns | 22 |
| Operating condition | Single (FD001 has constant altitude/speed/throttle) |

Engine lifespans ranged from **128 to 362 cycles**
(mean approx 206 cycles). This is the operational window the model must cover.

---

## 2. Dropped Sensors & Why

The following sensors were **dropped** because they carry essentially zero variance in FD001.
A sensor that never changes cannot tell the model anything useful — it's pure noise overhead.

- `op_setting_3`
- `sensor_1`
- `sensor_5`
- `sensor_6`
- `sensor_10`
- `sensor_16`
- `sensor_18`
- `sensor_19`

> **Note:** `op_setting_3` is always `100.0` in FD001 (single operating condition).
> Sensors 1, 5, 6, 10, 16, 18, 19 are physically constant for this fault mode.

---

## 3. Top Predictive Sensors

These 14 sensors showed the strongest correlation with **Remaining Useful Life (RUL)**
and were retained as features (after smoothing + scaling):

| Sensor | Corr w/ RUL | Corr w/ Cycle |
|--------|-------------|---------------|
| sensor_11       | -0.696 | +0.634 |
| sensor_4        | -0.679 | +0.625 |
| sensor_12       | +0.672 | -0.611 |
| sensor_7        | +0.657 | -0.596 |
| sensor_15       | -0.643 | +0.589 |
| sensor_21       | +0.636 | -0.586 |
| sensor_20       | +0.629 | -0.584 |
| sensor_2        | -0.606 | +0.550 |
| sensor_17       | -0.606 | +0.567 |
| sensor_3        | -0.585 | +0.544 |

**How to read this:** A sensor with `corr_with_rul = -0.75` means it rises as the engine
approaches failure — a classic degradation signature (e.g., exhaust temperature rising
as compressor efficiency drops).

---

## 4. RUL Computation

- **Training:** `RUL = max_cycle_of_engine - current_cycle`
- **Test:** back-calculated using provided ground-truth RUL file
  `RUL[row] = true_rul_at_last_cycle + (max_test_cycle - current_cycle)`
- **Clipping at 125 cycles:** Standard CMAPSS practice. Very early healthy cycles
  (RUL > 125) look identical and would skew model training. We clip them so
  the model focuses on the degradation window that actually matters.

Training RUL after clipping: min=0, max=125

---

## 5. Mission Window Logic

The key business question is: *"Will this engine survive the next planned mission?"*

```
predicted_failure_TTE = RUL (predicted by ML model)
margin_of_safety      = predicted_failure_TTE - mission_duration
CRITICAL_OVERLAP_RISK = (margin_of_safety < 0)   -> True means: GROUND THIS ASSET!
```

The function `apply_mission_window(df, mission_duration)` accepts **any mission duration**
in cycles, making it reusable for different asset classes (helicopter, jet, UAV) with
different sortie lengths. The backend team can call it with the mission_duration value
stored per asset in the PostgreSQL config table.

**Example:** An engine with RUL=20 and a 30-cycle mission -> margin=-10 -> CRITICAL RISK
**Example:** An engine with RUL=80 and a 30-cycle mission -> margin=+50 -> MISSION READY

---

## 6. Data Processing Pipeline Summary

```
Raw TXT files
    |  load_data()                -- assign headers, strip blank columns
    |  analyze_cycle_structure()  -- lifespan analysis + plots
    |  clean_and_smooth()         -- drop constants, rolling-mean smoothing (window=5)
    |  extract_critical_sensors() -- correlation-based feature ranking
    |  compute_rul()              -- training & test RUL + clipping
    |  apply_mission_window()     -- business logic layer
    v  normalize_and_export()     -- StandardScaler + CSV + schema.json export
```

---

## 7. Output Files

| File | Purpose |
|------|---------|
| `processed/train_ready.csv` | ML training set (scaled, 22 features) |
| `processed/test_ready.csv`  | ML test set (scaled, same schema) |
| `processed/schema.json`     | Column names + dtypes + PostgreSQL types |
| `processed/scaler.pkl`      | Fitted StandardScaler for inference pipeline |
| `processed/plots/*.png`     | 7 diagnostic plots (see plots/ folder) |

---

*For questions, contact the Data Science sub-team.*
