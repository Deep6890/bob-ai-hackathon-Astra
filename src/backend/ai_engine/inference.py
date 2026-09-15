import torch
import numpy as np
import pandas as pd
import json
import os
import sys

# Import the new unsupervised module
from unsupervised_health import UnsupervisedHealthDetector

class PredictiveMaintenanceCopilot:
    def __init__(self, model, feature_cols, sequence_length=30, mission_window=30, device="cpu"):
        self.model = model.to(device)
        self.model.eval()
        self.feature_cols = feature_cols
        self.sequence_length = sequence_length
        self.mission_window = mission_window
        self.device = device
        
        # Load the Data-Driven Unsupervised Health Detector
        model_dir = os.path.dirname(__file__)
        self.health_detector = UnsupervisedHealthDetector(
            data_path=None, # Not needed for inference
            feature_cols=feature_cols,
            save_dir=model_dir
        )
        self.health_detector.load()
        
    def analyze_asset(self, asset_id, asset_df):
        """
        Analyzes a single unseen asset's history.
        Produces current health analysis and future prediction.
        """
        # Ensure we are sorted chronologically up to cycle n
        asset_df = asset_df.sort_values("time_cycles").copy()
        latest_cycle = asset_df['time_cycles'].max()
        
        # 1. Current Health Analysis
        current_health_results = self._assess_current_health(asset_df)
        
        # 2. Future Prediction (RUL)
        predicted_rul = self._predict_rul(asset_df)
        
        # 3. Mission Readiness & Maintenance Priority
        readiness, reason, priority = self._assess_readiness_and_priority(current_health_results, predicted_rul)
        
        self._print_report(asset_id, latest_cycle, current_health_results, predicted_rul, readiness, reason, priority)
        
        return {
            "engine_id": asset_id,
            "latest_cycle": latest_cycle,
            "current_health": current_health_results,
            "predicted_rul": predicted_rul,
            "readiness": readiness,
            "reason": reason,
            "priority": priority
        }

    def _assess_current_health(self, asset_df):
        """
        Identifies NORMAL, DEGRADING, ABNORMAL, UNKNOWN sensors using Multivariate Isolation Forest
        and 5-cycle temporal trend persistence.
        """
        window_size = min(5, len(asset_df))
        recent_window_df = asset_df.tail(window_size).copy()
        
        # Multivariate Anomaly Detection
        features = recent_window_df[self.feature_cols].values
        scaled_features = self.health_detector.scaler.transform(features)
        
        # Isolation Forest predict returns 1 (inlier), -1 (outlier)
        # decision_function returns continuous score (negative means anomaly)
        anomaly_scores = self.health_detector.iforest.decision_function(scaled_features)
        predictions = self.health_detector.iforest.predict(scaled_features)
        
        # Calculate persistence (% of recent window that is anomalous)
        is_anomalous_array = (predictions == -1)
        
        results = {}
        for idx, sensor in enumerate(self.feature_cols):
            sensor_vals = recent_window_df[sensor].values
            
            # 1. Anomaly Evidence
            avg_anomaly_score = float(np.mean(anomaly_scores))
            persistence = float(np.mean(is_anomalous_array))
            
            # 2. Trend Calculation
            if len(sensor_vals) > 1:
                slope, _ = np.polyfit(np.arange(len(sensor_vals)), sensor_vals, 1)
            else:
                slope = 0.0
                
            # 3. Normalized Deviation from Baseline
            h_mean = self.health_detector.baseline_stats[sensor]["healthy_mean"]
            h_std = self.health_detector.baseline_stats[sensor]["healthy_std"]
            hist_trend = self.health_detector.baseline_stats[sensor]["trend"]
            
            latest_val = sensor_vals[-1]
            norm_dev = (latest_val - h_mean) / h_std if h_std != 0 else 0
            
            # 4. State Decision Logic
            is_persistently_anomalous = persistence >= 0.6 # at least 3 out of 5 cycles
            is_strong_deviation = abs(norm_dev) > 3.0 # more than 3 standard deviations away
            
            # Determine if slope is meaningfully aligning with historical degradation
            trend_alignment = False
            if hist_trend == "increasing" and slope > (0.1 * h_std): 
                trend_alignment = True
            elif hist_trend == "decreasing" and slope < -(0.1 * h_std):
                trend_alignment = True
                
            status = "NORMAL"
            
            if is_persistently_anomalous or is_strong_deviation:
                if hist_trend == "unknown":
                    status = "UNKNOWN"
                elif trend_alignment:
                    status = "DEGRADING"
                else:
                    status = "ABNORMAL"
            
            results[sensor] = {
                "status": status,
                "anomaly_score": avg_anomaly_score,
                "trend": float(slope),
                "persistence": persistence,
                "norm_dev": float(norm_dev),
                "degradation_direction": hist_trend
            }
            
        return results

    def _predict_rul(self, asset_df):
        """Prepares the sequence and passes it to the LSTM for RUL prediction."""
        data = asset_df[self.feature_cols].values
        
        if len(data) < self.sequence_length:
            pad_size = self.sequence_length - len(data)
            pad_data = np.zeros((pad_size, data.shape[1]))
            seq = np.vstack([pad_data, data])
        else:
            seq = data[-self.sequence_length:]
            
        seq_tensor = torch.tensor(seq, dtype=torch.float32).unsqueeze(0).to(self.device)
        
        with torch.no_grad():
            output = self.model(seq_tensor)
            
        return max(0.0, float(output.item()))

    def _assess_readiness_and_priority(self, current_health_results, predicted_rul):
        """
        Mission Assessment completely independent of Anomaly Detector.
        """
        margin = predicted_rul - self.mission_window
        
        abnormal_count = sum(1 for s in current_health_results.values() if s["status"] == "ABNORMAL")
        degrading_count = sum(1 for s in current_health_results.values() if s["status"] == "DEGRADING")
        unknown_count = sum(1 for s in current_health_results.values() if s["status"] == "UNKNOWN")
        
        if margin < 0:
            readiness = "NOT READY"
            reason = f"Predicted RUL ({predicted_rul:.1f} cycles) is less than the required mission window ({self.mission_window} cycles)."
            priority = "HIGH"
        elif degrading_count > 0 or abnormal_count > 0:
            readiness = "WARNING"
            reason = f"Predicted RUL ({predicted_rul:.1f}) is sufficient, but sensors show severe degradation or abnormality."
            priority = "HIGH"
        elif margin < 15:
            readiness = "WARNING"
            reason = f"Predicted RUL ({predicted_rul:.1f}) is close to mission window ({self.mission_window}). Margin of safety is low."
            priority = "MEDIUM"
        elif unknown_count > 0:
            readiness = "READY"
            reason = f"Asset has sufficient RUL margin. Some anomalous behaviour detected, but historically unknown impact."
            priority = "LOW"
        else:
            readiness = "READY"
            reason = f"Asset is healthy. Predicted RUL ({predicted_rul:.1f}) provides a strong margin."
            priority = "LOW"
            
        return readiness, reason, priority

    def _print_report(self, asset_id, latest_cycle, current_health_results, predicted_rul, readiness, reason, priority):
        print("\n" + "="*50)
        print(f"COPILOT INFERENCE REPORT - Asset: Engine {asset_id}")
        print(f"Latest Observed Cycle: {latest_cycle}")
        print("="*50)
        
        print("\n[Current Health]")
        for sensor, data in current_health_results.items():
            if data["status"] != "NORMAL":
                print(f" * {sensor:20s}: {data['status']}")
                print(f"     -> Persistence: {data['persistence']:.2f}, Trend Slope: {data['trend']:.4f}, Norm. Dev: {data['norm_dev']:.2f}")
        
        counts = {"NORMAL": 0, "DEGRADING": 0, "ABNORMAL": 0, "UNKNOWN": 0}
        for data in current_health_results.values():
            counts[data["status"]] += 1
            
        print(f"\n * Sensor Summary:")
        print(f"     Normal: {counts['NORMAL']} | Degrading: {counts['DEGRADING']} | Abnormal: {counts['ABNORMAL']} | Unknown: {counts['UNKNOWN']}")

        print(f"\n[Future Risk]")
        print(f" * Predicted RUL: {predicted_rul:.1f} cycles")
        
        print(f"\n[Mission Assessment]")
        print(f" * Mission Duration: {self.mission_window} cycles")
        print(f" * Status: {readiness}")
        print(f" * Reason: {reason}")
        
        print(f"\n[Maintenance Priority]")
        print(f" * Priority: {priority}")
        if priority == "HIGH" or priority == "MEDIUM":
            print(" * Action: Prioritize inspection/maintenance based on degradation evidence.")
        print("="*50 + "\n")
