# Copilot Architecture Documentation

## Overview

The Mission Readiness & Predictive Maintenance Copilot is designed to leverage historical sensor data to assess the current health of an asset (engine), predict its future degradation (Remaining Useful Life), and output an actionable mission readiness assessment and maintenance priority.

The solution adopts a decoupled, object-oriented design built on PyTorch.

## Core Modules (`src/backend/ai_engine/`)

1. **`data_handler.py`**
   - **Responsibility:** Load processed CSVs, ensure absolute leakage prevention, split assets for training/validation, and generate time-series sliding windows.
   - **Leakage Strategy:** Strips out `rul`, `rul_clipped`, `mission_duration`, `margin_of_safety`, `CRITICAL_OVERLAP_RISK`, `predicted_failure_TTE` from features. Features strictly consist of historical sensor signals.
   - **Split Strategy:** 80/20 train/val split strictly grouped by `unit_number`. No single engine's data spans both train and val sets.

2. **`lstm_network.py`**
   - **Responsibility:** Define the PyTorch `nn.Module` for the LSTM network.
   - **Architecture:** `LSTM` layer(s) to process sequence windows -> `Dropout` for regularization -> `Linear` layers -> 1-dimensional output (predicted RUL).

3. **`trainer.py`**
   - **Responsibility:** Encapsulate the training epoch loop and validation logic.

## System Architecture

The Copilot is structured into two independent branches that converge only at the final Mission Assessment stage:

```text
       HISTORICAL SENSOR SEQUENCE (Cycles 1...n)
                  |
    +-------------+-------------+
    |                           |
    v                           v
 CURRENT HEALTH                LSTM
 (Unsupervised)             (Supervised)
    |                           |
    v                           v
 Sensor Status             Predicted RUL
    |                           |
    +-------------+-------------+
                  |
                  v
          MISSION ASSESSMENT
                  |
                  v
         MAINTENANCE PRIORITY
```

### 1. Future Risk (LSTM Pipeline)
The right branch uses a `Sequence-to-Vector LSTM` to map chronological sequences of 14 smooth sensor signals up to cycle $n$ to a single continuous `Remaining Useful Life (RUL)` estimation.
* **Leakage Prevention**: Future n+1 data and derived RUL targets are strictly removed from the input features.
* **Training**: Group K-Fold Cross Validation ensures robust pattern learning without overlapping engines.

### 2. Current Health (Unsupervised Pipeline)
The left branch evaluates the *current* health of the 14 sensors based on observed behaviour. 
* **Detector**: A Multivariate `IsolationForest` (from `scikit-learn`) learns the normal operating distribution using ONLY healthy reference data (training rows where RUL > 100).
* **Temporal Logic**: For inference on an unseen engine, a recent 5-cycle window is evaluated. The system calculates:
  1. **Persistence**: Percentage of the 5 cycles flagged as anomalous by the Isolation Forest.
  2. **Slope**: The linear trend (numpy.polyfit) of the 5 cycles.
  3. **Baseline Deviation**: Normalised distance from the healthy baseline mean.
* **Status**: A sensor is marked `DEGRADING` if it shows persistent abnormal behaviour AND its slope aligns with its historically known degradation direction. Otherwise, it may be `ABNORMAL` or `UNKNOWN`.

### 3. Mission Assessment & Priority
The Copilot brings the branches together to formulate an actionable summary:
* **Mission Status**: If the Predicted RUL is less than the required Mission Window, it's `NOT READY`. If sensors show severe degradation despite acceptable RUL, it's `WARNING`. Otherwise `READY`.
* **Priority**: Based on the severity of the mission margin and sensor degradation, ranging from `LOW` to `HIGH`.

6. **`main.py`**
   - **Responsibility:** Orchestrate the pipeline from training to final inference demonstration.
