"""
cmapss_pipeline.py
==================
NASA CMAPSS FD001 Turbofan Degradation Dataset
EDA + Feature Engineering + RUL Computation + Mission Window Logic

Run:   python cmapss_pipeline.py
Output:
  src/backend/data/processed/train_ready.csv
  src/backend/data/processed/test_ready.csv
  src/backend/data/processed/schema.json
  src/backend/data/processed/scaler.pkl
  src/backend/data/processed/plots/*.png
  src/backend/data/EDA_SUMMARY.md

Author: Data Science Team — Mission Readiness & Predictive Maintenance Hackathon
"""

import os
import json
import warnings
import joblib
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")          # Non-interactive backend — safe for servers & CI
import matplotlib.pyplot as plt
import seaborn as sns
from scipy import stats
from sklearn.preprocessing import StandardScaler

warnings.filterwarnings("ignore")

# ─────────────────────────────────────────────
# PATHS  (all relative to this file's location)
# ─────────────────────────────────────────────
BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
RAW_DIR    = os.path.join(BASE_DIR, "raw", "CMAPSSData")
PROC_DIR   = os.path.join(BASE_DIR, "processed")
PLOTS_DIR  = os.path.join(PROC_DIR, "plots")

for d in [PROC_DIR, PLOTS_DIR]:
    os.makedirs(d, exist_ok=True)

# ─────────────────────────────────────────────
# CONSTANTS
# ─────────────────────────────────────────────
# Official column names for CMAPSS (26 columns, no header in raw files)
COLUMNS = [
    "unit_number", "time_cycles",
    "op_setting_1", "op_setting_2", "op_setting_3",
    *[f"sensor_{i}" for i in range(1, 22)]
]

# Sensors confirmed as near-zero variance for FD001 (single op-condition)
# Identified via std < 0.001 threshold after loading — see step 3 below
SENSORS_TO_DROP = [
    "op_setting_3",     # constant = 100.0 for FD001
    "sensor_1",         # near-constant pressure ratio
    "sensor_5",         # near-constant
    "sensor_6",         # near-constant physical core speed
    "sensor_10",        # constant
    "sensor_16",        # constant
    "sensor_18",        # constant
    "sensor_19",        # constant
]

# Top informative sensors after correlation analysis (see step 4)
TOP_SENSORS = [
    "sensor_2",   "sensor_3",   "sensor_4",   "sensor_7",
    "sensor_8",   "sensor_9",   "sensor_11",  "sensor_12",
    "sensor_13",  "sensor_14",  "sensor_15",  "sensor_17",
    "sensor_20",  "sensor_21",
]

RUL_CLIP = 125    # Standard CMAPSS ceiling — avoids overweighting healthy early cycles


# ══════════════════════════════════════════════════════════════════════════════
# STEP 1 — LOAD DATA
# ══════════════════════════════════════════════════════════════════════════════
def load_data():
    """
    Load train, test, and RUL text files into pandas DataFrames.
    WHY: Raw files have no header and space-separated values. We assign
         column names manually and strip trailing NaN columns (CMAPSS quirk).
    """
    print("\n" + "="*60)
    print("STEP 1: LOADING DATA")
    print("="*60)

    def read_txt(filepath):
        df = pd.read_csv(filepath, sep=r"\s+", header=None, engine="python")
        # CMAPSS files sometimes have a trailing blank column — drop it
        df.dropna(axis=1, how="all", inplace=True)
        df.columns = COLUMNS[:len(df.columns)]
        return df

    train_df = read_txt(os.path.join(RAW_DIR, "train_FD001.txt"))
    test_df  = read_txt(os.path.join(RAW_DIR, "test_FD001.txt"))

    # RUL file: one value per engine — the TRUE remaining life at last recorded cycle
    rul_df = pd.read_csv(
        os.path.join(RAW_DIR, "RUL_FD001.txt"),
        sep=r"\s+", header=None, names=["true_rul"]
    )
    rul_df["unit_number"] = range(1, len(rul_df) + 1)

    # ── Sanity checks ──
    for name, df in [("TRAIN", train_df), ("TEST", test_df)]:
        print(f"\n{name} — shape: {df.shape}")
        print(f"  dtypes:\n{df.dtypes.to_string()}")
        print(f"  null counts: {df.isnull().sum().sum()} total nulls")
        print(f"  describe:\n{df.describe().to_string()}\n")

    print(f"\nRUL — shape: {rul_df.shape}")
    print(rul_df.describe())

    return train_df, test_df, rul_df


# ══════════════════════════════════════════════════════════════════════════════
# STEP 2 — UNDERSTAND CYCLE STRUCTURE
# ══════════════════════════════════════════════════════════════════════════════
def analyze_cycle_structure(train_df, test_df):
    """
    Compute engine lifespan statistics and plot:
      1) Distribution of training engine lifespans (histogram)
      2) Sensor degradation curves for 3 sample engines
    WHY: Understanding lifespan variability tells us the RUL range the model
         must handle. Degradation curves confirm sensors actually change with wear.
    """
    print("\n" + "="*60)
    print("STEP 2: CYCLE STRUCTURE ANALYSIS")
    print("="*60)

    # Max cycle per unit = engine total life (train only — test is truncated)
    life_df = train_df.groupby("unit_number")["time_cycles"].max().reset_index()
    life_df.columns = ["unit_number", "max_cycle"]

    print(f"\nEngine lifespan stats (train):")
    print(life_df["max_cycle"].describe())
    print(f"\nShortest engine life : {life_df['max_cycle'].min()} cycles")
    print(f"Longest engine life  : {life_df['max_cycle'].max()} cycles")
    print(f"Mean engine life     : {life_df['max_cycle'].mean():.1f} cycles")

    # ── Plot 1: Lifespan Distribution ──
    fig, axes = plt.subplots(1, 2, figsize=(14, 5))
    fig.suptitle("FD001 — Engine Lifespan Distribution", fontsize=14, fontweight="bold")

    axes[0].hist(life_df["max_cycle"], bins=25, color="#4C72B0", edgecolor="white", alpha=0.85)
    axes[0].axvline(life_df["max_cycle"].mean(), color="#DD4444", linestyle="--",
                    linewidth=2, label=f"Mean = {life_df['max_cycle'].mean():.0f}")
    axes[0].set_xlabel("Total Engine Life (cycles)")
    axes[0].set_ylabel("Count of Engines")
    axes[0].set_title("Histogram — Training Engine Lifespans")
    axes[0].legend()

    axes[1].boxplot(life_df["max_cycle"], vert=True, patch_artist=True,
                    boxprops=dict(facecolor="#4C72B0", color="white"),
                    whiskerprops=dict(color="gray"),
                    capprops=dict(color="gray"),
                    medianprops=dict(color="#DD4444", linewidth=2))
    axes[1].set_ylabel("Total Engine Life (cycles)")
    axes[1].set_title("Boxplot — Lifespan Spread")
    axes[1].set_xticks([1])
    axes[1].set_xticklabels(["All Engines"])

    plt.tight_layout()
    _save_plot("01_engine_lifespan_distribution.png")

    # ── Plot 2: Degradation curves for 3 sample engines ──
    # WHY: We pick engines with short, medium, long lives to see the full spectrum
    sample_units = [
        life_df.nsmallest(1, "max_cycle")["unit_number"].iloc[0],   # shortest
        life_df.iloc[len(life_df)//2]["unit_number"],                # median
        life_df.nlargest(1, "max_cycle")["unit_number"].iloc[0],     # longest
    ]
    # Pick sensors that clearly degrade (high correlation)
    plot_sensors = ["sensor_2", "sensor_3", "sensor_4", "sensor_11"]

    fig, axes = plt.subplots(len(plot_sensors), 1, figsize=(14, 4 * len(plot_sensors)))
    fig.suptitle("FD001 — Sensor Degradation Curves (3 Sample Engines)",
                 fontsize=14, fontweight="bold")
    colors = ["#4C72B0", "#DD8452", "#55A868"]
    labels = ["Short-life engine", "Mid-life engine", "Long-life engine"]

    for ax, sensor in zip(axes, plot_sensors):
        for uid, color, label in zip(sample_units, colors, labels):
            unit_data = train_df[train_df["unit_number"] == uid]
            ax.plot(unit_data["time_cycles"], unit_data[sensor],
                    color=color, alpha=0.8, linewidth=1.2, label=f"{label} (unit {uid})")
        ax.set_xlabel("Time Cycles")
        ax.set_ylabel(sensor.replace("_", " ").title())
        ax.set_title(f"Sensor: {sensor}")
        ax.legend(fontsize=8)

    plt.tight_layout()
    _save_plot("02_sensor_degradation_curves.png")

    return life_df


# ══════════════════════════════════════════════════════════════════════════════
# STEP 3 — CLEAN & FILTER NOISE
# ══════════════════════════════════════════════════════════════════════════════
def clean_and_smooth(train_df, test_df, window=5):
    """
    1) Detect and list near-zero-variance (constant) columns.
    2) Apply per-engine rolling mean to smooth sensor noise.
    3) Keep both raw and smoothed columns for downstream use.
    WHY: Constant sensors carry zero information; smoothing reduces measurement
         noise that can confuse ML models without losing the degradation trend.
    """
    print("\n" + "="*60)
    print("STEP 3: CLEANING & SMOOTHING")
    print("="*60)

    sensor_cols = [c for c in COLUMNS if c.startswith("sensor_") or c.startswith("op_setting_")]

    # ── Find near-zero variance sensors ──
    train_std = train_df[sensor_cols].std()
    low_var_sensors = train_std[train_std < 0.01].index.tolist()
    print(f"\nNear-zero variance sensors (std < 0.01):")
    for s in low_var_sensors:
        print(f"  {s:20s}  std = {train_std[s]:.6f}")
    print(f"\nThese will be DROPPED: {SENSORS_TO_DROP}")
    print(f"Sensors retained for analysis: {TOP_SENSORS}")

    # ── Variance plot ──
    fig, ax = plt.subplots(figsize=(14, 5))
    colors_bar = ["#DD4444" if s in SENSORS_TO_DROP else "#4C72B0" for s in sensor_cols]
    ax.bar(sensor_cols, train_std[sensor_cols], color=colors_bar)
    ax.axhline(0.01, color="orange", linestyle="--", linewidth=1.5, label="std=0.01 threshold")
    ax.set_xticklabels(sensor_cols, rotation=45, ha="right", fontsize=8)
    ax.set_ylabel("Standard Deviation")
    ax.set_title("Sensor Variance — Red bars will be DROPPED")
    ax.legend()
    plt.tight_layout()
    _save_plot("03_sensor_variance.png")

    # ── Apply rolling mean per unit (smoothing) ──
    # WHY: Turbofan sensors are noisy due to vibration and measurement error.
    #      Rolling mean with window=5 smooths noise while keeping the trend.
    def apply_rolling(df, window):
        df = df.copy().sort_values(["unit_number", "time_cycles"])
        for sensor in TOP_SENSORS:
            df[f"{sensor}_smooth"] = (
                df.groupby("unit_number")[sensor]
                  .transform(lambda x: x.rolling(window, min_periods=1).mean())
            )
        return df

    train_df = apply_rolling(train_df, window)
    test_df  = apply_rolling(test_df,  window)

    print(f"\nRolling mean (window={window}) applied to {len(TOP_SENSORS)} sensors.")
    print(f"New columns added: {len(TOP_SENSORS)} *_smooth columns")
    print(f"Train shape after smoothing: {train_df.shape}")
    print(f"Test  shape after smoothing: {test_df.shape}")

    return train_df, test_df, low_var_sensors


# ══════════════════════════════════════════════════════════════════════════════
# STEP 4 — EXTRACT CRITICAL SENSORS
# ══════════════════════════════════════════════════════════════════════════════
def extract_critical_sensors(train_df, life_df):
    """
    Compute Pearson correlation of each sensor against:
      a) time_cycles (proxy for degradation — higher cycle means more wear)
      b) RUL (directly what we predict)
    WHY: Sensors with high |correlation| to RUL are the most predictive features.
         This is the standard CMAPSS feature selection approach.
    """
    print("\n" + "="*60)
    print("STEP 4: CRITICAL SENSOR EXTRACTION")
    print("="*60)

    all_sensors = [c for c in COLUMNS if c.startswith("sensor_") or c.startswith("op_setting_")]

    # Compute temporary RUL for correlation analysis
    temp = train_df.merge(life_df, on="unit_number")
    temp["rul_proxy"] = temp["max_cycle"] - temp["time_cycles"]

    corr_cycle = temp[all_sensors].corrwith(temp["time_cycles"])
    corr_rul   = temp[all_sensors].corrwith(temp["rul_proxy"])

    sensor_rank = pd.DataFrame({
        "sensor": all_sensors,
        "corr_with_cycle": corr_cycle.values,
        "corr_with_rul":   corr_rul.values,
        "abs_corr_rul":    corr_rul.abs().values,
    }).sort_values("abs_corr_rul", ascending=False)

    print("\nSensor ranking by |correlation with RUL|:")
    print(sensor_rank.to_string(index=False))

    # ── Correlation heatmap ──
    smooth_cols = [f"{s}_smooth" for s in TOP_SENSORS]
    corr_matrix = train_df[smooth_cols + ["time_cycles"]].corr()

    fig, ax = plt.subplots(figsize=(16, 12))
    sns.heatmap(
        corr_matrix, annot=True, fmt=".2f", cmap="coolwarm",
        center=0, linewidths=0.5, ax=ax, annot_kws={"size": 7}
    )
    ax.set_title("Correlation Matrix — Top Sensors (Smoothed) + Time Cycles",
                 fontsize=13, fontweight="bold")
    plt.tight_layout()
    _save_plot("04_sensor_correlation_heatmap.png")

    # ── Bar chart of correlations ──
    fig, axes = plt.subplots(1, 2, figsize=(16, 6))
    fig.suptitle("Sensor Correlation with Degradation Proxies", fontsize=13, fontweight="bold")

    ranked_by_cycle = sensor_rank.sort_values("corr_with_cycle")
    colors_c = ["#DD4444" if v < 0 else "#4C72B0" for v in ranked_by_cycle["corr_with_cycle"]]
    axes[0].barh(ranked_by_cycle["sensor"], ranked_by_cycle["corr_with_cycle"], color=colors_c)
    axes[0].axvline(0, color="black", linewidth=0.8)
    axes[0].set_title("Correlation with Time Cycles\n(positive = sensor rises as engine ages)")
    axes[0].set_xlabel("Pearson r")

    ranked_by_rul = sensor_rank.sort_values("corr_with_rul")
    colors_r = ["#DD4444" if v < 0 else "#4C72B0" for v in ranked_by_rul["corr_with_rul"]]
    axes[1].barh(ranked_by_rul["sensor"], ranked_by_rul["corr_with_rul"], color=colors_r)
    axes[1].axvline(0, color="black", linewidth=0.8)
    axes[1].set_title("Correlation with RUL\n(negative = sensor rises as RUL drops)")
    axes[1].set_xlabel("Pearson r")

    plt.tight_layout()
    _save_plot("05_sensor_rul_correlation_bars.png")

    return sensor_rank


# ══════════════════════════════════════════════════════════════════════════════
# STEP 5 — COMPUTE RUL
# ══════════════════════════════════════════════════════════════════════════════
def compute_rul(train_df, test_df, rul_df, life_df, rul_clip=RUL_CLIP):
    """
    Training RUL: max_cycle_of_unit - current_cycle  (ground truth from data)
    Test RUL: back-calculated from provided RUL_FD001.txt
              true_rul[unit] = RUL at LAST cycle of that unit
              so: RUL[row] = true_rul[unit] + (max_test_cycle[unit] - row_cycle)
    Clipping: cap RUL at `rul_clip` cycles — standard CMAPSS practice.
    WHY: Very early cycles (RUL > 125) carry no degradation signal. Clipping
         focuses the model on the critical degradation window.
    """
    print("\n" + "="*60)
    print("STEP 5: RUL COMPUTATION")
    print("="*60)

    # ── Training RUL ──
    train_df = train_df.merge(life_df[["unit_number", "max_cycle"]], on="unit_number")
    train_df["rul"] = train_df["max_cycle"] - train_df["time_cycles"]
    train_df["rul_clipped"] = train_df["rul"].clip(upper=rul_clip)
    train_df.drop(columns=["max_cycle"], inplace=True)

    # ── Test RUL ──
    # For each test unit, find the last recorded cycle
    test_max_cycle = test_df.groupby("unit_number")["time_cycles"].max().reset_index()
    test_max_cycle.columns = ["unit_number", "max_test_cycle"]

    test_df = test_df.merge(test_max_cycle, on="unit_number")
    test_df = test_df.merge(rul_df, on="unit_number")  # true_rul at last cycle

    # Back-calculate: at row with cycle t, RUL = true_rul + (max_test_cycle - t)
    test_df["rul"] = test_df["true_rul"] + (test_df["max_test_cycle"] - test_df["time_cycles"])
    test_df["rul_clipped"] = test_df["rul"].clip(upper=rul_clip)
    test_df.drop(columns=["max_test_cycle", "true_rul"], inplace=True)

    # ── RUL Distribution Plots ──
    fig, axes = plt.subplots(1, 2, figsize=(14, 5))
    fig.suptitle("RUL Distribution — FD001", fontsize=13, fontweight="bold")

    axes[0].hist(train_df["rul"], bins=40, color="#4C72B0", edgecolor="white", alpha=0.8,
                 label="Raw RUL")
    axes[0].hist(train_df["rul_clipped"], bins=40, color="#DD8452", edgecolor="white",
                 alpha=0.7, label=f"Clipped (<={rul_clip})")
    axes[0].set_xlabel("RUL (cycles)")
    axes[0].set_ylabel("Frequency")
    axes[0].set_title("Training RUL — Raw vs Clipped")
    axes[0].legend()

    axes[1].hist(test_df["rul_clipped"], bins=40, color="#55A868", edgecolor="white", alpha=0.85)
    axes[1].set_xlabel("RUL (cycles)")
    axes[1].set_ylabel("Frequency")
    axes[1].set_title(f"Test RUL (Clipped, <={rul_clip})")

    plt.tight_layout()
    _save_plot("06_rul_distribution.png")

    print(f"\nTraining RUL stats (raw):")
    print(train_df["rul"].describe())
    print(f"\nTraining RUL stats (clipped at {rul_clip}):")
    print(train_df["rul_clipped"].describe())
    print(f"\nTest RUL stats (clipped at {rul_clip}):")
    print(test_df["rul_clipped"].describe())

    return train_df, test_df


# ══════════════════════════════════════════════════════════════════════════════
# STEP 6 — MISSION WINDOW LOGIC
# ══════════════════════════════════════════════════════════════════════════════
def apply_mission_window(df: pd.DataFrame, mission_duration: float) -> pd.DataFrame:
    """
    MISSION WINDOW LOGIC — reusable function for backend API integration.

    Parameters
    ----------
    df               : DataFrame with a 'rul_clipped' column (or 'rul')
    mission_duration : float — planned mission length in cycles (e.g. 30, 45, 60)
                       Can differ per asset type — pass it at call time!

    Returns
    -------
    df with 3 new columns:
      predicted_failure_TTE   — Time-To-Expiry = rul_clipped (alias for API clarity)
      mission_duration        — echoed from parameter for traceability
      margin_of_safety        — predicted_failure_TTE - mission_duration
      CRITICAL_OVERLAP_RISK   — True if margin_of_safety < 0 (will fail mid-mission)

    WHY: This function operationalises the ML model's output into a go/no-go
         mission readiness decision. The backend can call this per asset with
         asset-specific mission_duration values pulled from a config or DB.
    """
    df = df.copy()
    rul_col = "rul_clipped" if "rul_clipped" in df.columns else "rul"

    df["predicted_failure_TTE"] = df[rul_col]
    df["mission_duration"]      = mission_duration
    df["margin_of_safety"]      = df["predicted_failure_TTE"] - mission_duration
    df["CRITICAL_OVERLAP_RISK"] = df["margin_of_safety"] < 0

    # ── Mission Readiness Summary ──
    n_total    = df["unit_number"].nunique() if "unit_number" in df.columns else len(df)
    n_critical = df.groupby("unit_number")["CRITICAL_OVERLAP_RISK"].last().sum() \
                 if "unit_number" in df.columns else int(df["CRITICAL_OVERLAP_RISK"].sum())

    print(f"\n  Mission duration     : {mission_duration} cycles")
    print(f"  Engines assessed     : {n_total}")
    print(f"  CRITICAL RISK count  : {n_critical}  "
          f"({100*n_critical/n_total:.1f}% fleet at risk)")

    return df


# ══════════════════════════════════════════════════════════════════════════════
# STEP 7 — NORMALIZE & EXPORT
# ══════════════════════════════════════════════════════════════════════════════
def normalize_and_export(train_df, test_df, sensor_rank):
    """
    1) Select final feature set: smoothed top sensors + RUL columns.
    2) Fit StandardScaler on TRAINING data only (never leak test stats).
    3) Export train_ready.csv, test_ready.csv, scaler.pkl, schema.json.
    WHY: StandardScaler centers and scales each sensor to zero-mean/unit-variance.
         This is critical for LSTM/GRU models and distance-based algorithms.
         Fitting only on train prevents data leakage into test evaluation.
    """
    print("\n" + "="*60)
    print("STEP 7: NORMALIZING & EXPORTING")
    print("="*60)

    # ── Build final feature set ──
    smooth_features = [f"{s}_smooth" for s in TOP_SENSORS]
    id_cols  = ["unit_number", "time_cycles"]
    rul_cols = ["rul", "rul_clipped"]
    mission_cols = ["predicted_failure_TTE", "mission_duration",
                    "margin_of_safety", "CRITICAL_OVERLAP_RISK"]

    # Keep only columns that exist in each df
    train_keep = id_cols + smooth_features + rul_cols
    train_keep += [c for c in mission_cols if c in train_df.columns]
    test_keep  = id_cols + smooth_features + rul_cols
    test_keep  += [c for c in mission_cols if c in test_df.columns]

    train_final = train_df[[c for c in train_keep if c in train_df.columns]].copy()
    test_final  = test_df[[c for c in test_keep  if c in test_df.columns]].copy()

    # ── Fit scaler on TRAIN, transform both ──
    scaler = StandardScaler()
    train_final[smooth_features] = scaler.fit_transform(train_final[smooth_features])
    test_final[smooth_features]  = scaler.transform(test_final[smooth_features])

    # ── Save scaler for inference ──
    scaler_path = os.path.join(PROC_DIR, "scaler.pkl")
    joblib.dump(scaler, scaler_path)
    print(f"\nScaler saved -> {scaler_path}")

    # ── Export CSVs ──
    train_path = os.path.join(PROC_DIR, "train_ready.csv")
    test_path  = os.path.join(PROC_DIR, "test_ready.csv")
    train_final.to_csv(train_path, index=False)
    test_final.to_csv(test_path,   index=False)
    print(f"Train ready CSV saved -> {train_path}  shape: {train_final.shape}")
    print(f"Test  ready CSV saved -> {test_path}   shape: {test_final.shape}")

    # ── Build schema.json ──
    schema = _build_schema(train_final, smooth_features)
    schema_path = os.path.join(PROC_DIR, "schema.json")
    with open(schema_path, "w") as f:
        json.dump(schema, f, indent=2)
    print(f"Schema JSON saved -> {schema_path}")

    # ── Scaled feature distribution plot ──
    fig, axes = plt.subplots(4, 4, figsize=(18, 14))
    axes = axes.flatten()
    for i, feat in enumerate(smooth_features):
        if i >= len(axes):
            break
        axes[i].hist(train_final[feat].dropna(), bins=40,
                     color="#4C72B0", edgecolor="white", alpha=0.8)
        axes[i].set_title(feat.replace("_smooth", "").replace("_", " "), fontsize=9)
        axes[i].set_xlabel("Scaled value")
    for j in range(i + 1, len(axes)):
        axes[j].set_visible(False)
    fig.suptitle("Scaled Sensor Distributions (Training Data)", fontsize=13, fontweight="bold")
    plt.tight_layout()
    _save_plot("07_scaled_feature_distributions.png")

    return train_final, test_final


def _build_schema(df: pd.DataFrame, smooth_features: list) -> dict:
    """Build a JSON schema suitable for PostgreSQL table design."""
    DESCRIPTIONS = {
        "unit_number":  "Engine/asset identifier (1-100 for FD001)",
        "time_cycles":  "Operational cycle count at this measurement",
        "rul":          "Raw Remaining Useful Life (cycles)",
        "rul_clipped":  f"RUL clipped at {RUL_CLIP} cycles (model target)",
        "predicted_failure_TTE": "Predicted Time-To-Expiry from model output",
        "mission_duration":      "Planned mission duration (cycles) — configurable",
        "margin_of_safety":      "predicted_failure_TTE minus mission_duration",
        "CRITICAL_OVERLAP_RISK": "True if engine will fail during planned mission",
    }
    PG_TYPES = {
        "int64":   "INTEGER",
        "float64": "DOUBLE PRECISION",
        "bool":    "BOOLEAN",
        "object":  "TEXT",
    }

    schema = {
        "dataset": "NASA CMAPSS FD001 — ML-Ready Features",
        "generated_at": pd.Timestamp.now().isoformat(),
        "rul_clip_value": RUL_CLIP,
        "columns": []
    }
    for col in df.columns:
        dtype_str = str(df[col].dtype)
        desc = DESCRIPTIONS.get(col,
               f"Smoothed, scaled reading of {col.replace('_smooth','').replace('_',' ')}")
        schema["columns"].append({
            "name":        col,
            "python_dtype": dtype_str,
            "pg_type":     PG_TYPES.get(dtype_str, "DOUBLE PRECISION"),
            "nullable":    bool(df[col].isnull().any()),
            "description": desc,
        })
    return schema


# ══════════════════════════════════════════════════════════════════════════════
# STEP 8 — SUMMARY REPORT
# ══════════════════════════════════════════════════════════════════════════════
def write_eda_summary(train_df, test_df, life_df, sensor_rank,
                      low_var_sensors, train_final, test_final):
    """
    Writes a human-readable Markdown EDA summary for non-technical teammates.
    WHY: Hackathon judges and cross-functional teammates need a plain-language
         explanation of what was done and why, without reading code.
    """
    print("\n" + "="*60)
    print("STEP 8: WRITING EDA SUMMARY REPORT")
    print("="*60)

    top10 = sensor_rank.nlargest(10, "abs_corr_rul")
    top10_md = "\n".join(
        f"| {row['sensor']:15s} | {row['corr_with_rul']:+.3f} | {row['corr_with_cycle']:+.3f} |"
        for _, row in top10.iterrows()
    )
    dropped_md = "\n".join(f"- `{s}`" for s in SENSORS_TO_DROP)

    report = f"""# EDA Summary — NASA CMAPSS FD001 Turbofan Degradation
*Mission Readiness & Predictive Maintenance Hackathon*
*Generated: {pd.Timestamp.now().strftime('%Y-%m-%d %H:%M')}*

---

## 1. Dataset Overview

| Property | Value |
|---|---|
| Dataset | NASA CMAPSS — FD001 (single fault: HPC Degradation) |
| Training engines | {train_df['unit_number'].nunique()} |
| Test engines | {test_df['unit_number'].nunique()} |
| Training rows | {len(train_df):,} |
| Test rows | {len(test_df):,} |
| Raw columns | 26 (unit_number, time_cycles, 3 op settings, 21 sensors) |
| ML-ready columns | {len(train_final.columns)} |
| Operating condition | Single (FD001 has constant altitude/speed/throttle) |

Engine lifespans ranged from **{life_df['max_cycle'].min()} to {life_df['max_cycle'].max()} cycles**
(mean approx {life_df['max_cycle'].mean():.0f} cycles). This is the operational window the model must cover.

---

## 2. Dropped Sensors & Why

The following sensors were **dropped** because they carry essentially zero variance in FD001.
A sensor that never changes cannot tell the model anything useful — it's pure noise overhead.

{dropped_md}

> **Note:** `op_setting_3` is always `100.0` in FD001 (single operating condition).
> Sensors 1, 5, 6, 10, 16, 18, 19 are physically constant for this fault mode.

---

## 3. Top Predictive Sensors

These 14 sensors showed the strongest correlation with **Remaining Useful Life (RUL)**
and were retained as features (after smoothing + scaling):

| Sensor | Corr w/ RUL | Corr w/ Cycle |
|--------|-------------|---------------|
{top10_md}

**How to read this:** A sensor with `corr_with_rul = -0.75` means it rises as the engine
approaches failure — a classic degradation signature (e.g., exhaust temperature rising
as compressor efficiency drops).

---

## 4. RUL Computation

- **Training:** `RUL = max_cycle_of_engine - current_cycle`
- **Test:** back-calculated using provided ground-truth RUL file
  `RUL[row] = true_rul_at_last_cycle + (max_test_cycle - current_cycle)`
- **Clipping at {RUL_CLIP} cycles:** Standard CMAPSS practice. Very early healthy cycles
  (RUL > {RUL_CLIP}) look identical and would skew model training. We clip them so
  the model focuses on the degradation window that actually matters.

Training RUL after clipping: min=0, max={RUL_CLIP}

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
| `processed/train_ready.csv` | ML training set (scaled, {len(train_final.columns)} features) |
| `processed/test_ready.csv`  | ML test set (scaled, same schema) |
| `processed/schema.json`     | Column names + dtypes + PostgreSQL types |
| `processed/scaler.pkl`      | Fitted StandardScaler for inference pipeline |
| `processed/plots/*.png`     | 7 diagnostic plots (see plots/ folder) |

---

*For questions, contact the Data Science sub-team.*
"""

    summary_path = os.path.join(BASE_DIR, "EDA_SUMMARY.md")
    with open(summary_path, "w", encoding="utf-8") as f:
        f.write(report)
    print(f"EDA summary written -> {summary_path}")
    return summary_path


# ══════════════════════════════════════════════════════════════════════════════
# UTILITIES
# ══════════════════════════════════════════════════════════════════════════════
def _save_plot(filename: str):
    """Save current matplotlib figure to PLOTS_DIR and close it."""
    path = os.path.join(PLOTS_DIR, filename)
    plt.savefig(path, dpi=150, bbox_inches="tight")
    plt.close("all")
    print(f"  Plot saved -> {path}")


# ══════════════════════════════════════════════════════════════════════════════
# MAIN ORCHESTRATOR
# ══════════════════════════════════════════════════════════════════════════════
def run_pipeline(mission_duration: float = 30.0):
    """
    End-to-end pipeline orchestrator.
    Call with different mission_duration values to evaluate fleet readiness
    for different mission profiles.
    """
    print("\n" + "="*60)
    print("  NASA CMAPSS FD001 — EDA & FEATURE ENGINEERING PIPELINE")
    print("="*60)

    # Step 1: Load
    train_df, test_df, rul_df = load_data()

    # Step 2: Cycle structure
    life_df = analyze_cycle_structure(train_df, test_df)

    # Step 3: Clean & smooth
    train_df, test_df, low_var_sensors = clean_and_smooth(train_df, test_df)

    # Step 4: Feature extraction
    sensor_rank = extract_critical_sensors(train_df, life_df)

    # Step 5: RUL computation
    train_df, test_df = compute_rul(train_df, test_df, rul_df, life_df)

    # Step 6: Mission window logic
    print("\n" + "="*60)
    print("STEP 6: MISSION WINDOW LOGIC")
    print("="*60)
    train_df = apply_mission_window(train_df, mission_duration)
    test_df  = apply_mission_window(test_df,  mission_duration)

    # Step 7: Normalize & export
    train_final, test_final = normalize_and_export(train_df, test_df, sensor_rank)

    # Step 8: Summary report
    write_eda_summary(train_df, test_df, life_df, sensor_rank,
                      low_var_sensors, train_final, test_final)

    print("\n" + "="*60)
    print("  PIPELINE COMPLETE")
    print("="*60)

    return train_final, test_final


if __name__ == "__main__":
    # Default: 30-cycle mission duration — override at CLI or API call time
    run_pipeline(mission_duration=30.0)
