import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
import pickle
import json
import os

class UnsupervisedHealthDetector:
    def __init__(self, data_path, feature_cols, save_dir):
        self.data_path = data_path
        self.feature_cols = feature_cols
        self.save_dir = save_dir
        self.model_path = os.path.join(save_dir, "multivariate_iforest.pkl")
        self.scaler_path = os.path.join(save_dir, "iforest_scaler.pkl")
        self.stats_path = os.path.join(save_dir, "sensor_baseline_stats.json")
        
        self.iforest = None
        self.scaler = None
        self.baseline_stats = None

    def fit_and_save(self):
        """
        Fits the Multivariate Isolation Forest and Scaler ONLY on the training data.
        Specifically, it uses rows where RUL > 100 to learn the 'Healthy' baseline.
        """
        print("--- Training Unsupervised Sensor Health Pipeline ---")
        df = pd.read_csv(self.data_path)
        
        # Determine expected degradation direction for each sensor using the whole train set.
        # Compare Healthy (RUL > 100) vs Degraded (RUL <= 20)
        healthy_df = df[df['rul_clipped'] > 100]
        degraded_df = df[df['rul_clipped'] <= 20]
        
        baseline_stats = {}
        for col in self.feature_cols:
            h_mean = healthy_df[col].mean()
            h_std = healthy_df[col].std()
            d_mean = degraded_df[col].mean()
            d_std = degraded_df[col].std()
            
            # Is the difference statistically meaningful? (e.g. means differ by at least 1 healthy std)
            if abs(d_mean - h_mean) > (1.0 * h_std):
                trend = "increasing" if d_mean > h_mean else "decreasing"
            else:
                trend = "unknown"
                
            baseline_stats[col] = {
                "healthy_mean": float(h_mean),
                "healthy_std": float(h_std),
                "degraded_mean": float(d_mean),
                "degraded_std": float(d_std),
                "trend": trend
            }
            
        # Fit Isolation Forest strictly on the healthy training subset.
        healthy_features = healthy_df[self.feature_cols].values
        
        scaler = StandardScaler()
        healthy_scaled = scaler.fit_transform(healthy_features)
        
        # Multivariate Isolation Forest.
        # contamination=0.01 implies we expect ~1% of normal data to be noise/outliers.
        iforest = IsolationForest(n_estimators=100, contamination=0.01, random_state=42)
        iforest.fit(healthy_scaled)
        
        # Save objects
        os.makedirs(self.save_dir, exist_ok=True)
        with open(self.model_path, "wb") as f:
            pickle.dump(iforest, f)
        with open(self.scaler_path, "wb") as f:
            pickle.dump(scaler, f)
        with open(self.stats_path, "w") as f:
            json.dump(baseline_stats, f, indent=4)
            
        print(f"Saved Isolation Forest, Scaler, and Baseline Stats to {self.save_dir}")

    def load(self):
        """Loads the pre-fitted unsupervised models."""
        with open(self.model_path, "rb") as f:
            self.iforest = pickle.load(f)
        with open(self.scaler_path, "rb") as f:
            self.scaler = pickle.load(f)
        with open(self.stats_path, "r") as f:
            self.baseline_stats = json.load(f)
