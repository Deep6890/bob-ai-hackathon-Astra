import torch
import numpy as np
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

class ModelEvaluator:
    def __init__(self, model, test_loader, device="cpu"):
        self.model = model.to(device)
        self.test_loader = test_loader
        self.device = device
        
    def evaluate(self):
        self.model.eval()
        
        all_preds = []
        all_targets = []
        
        with torch.no_grad():
            for X_batch, y_batch in self.test_loader:
                X_batch = X_batch.to(self.device)
                
                outputs = self.model(X_batch)
                
                all_preds.extend(outputs.cpu().numpy())
                all_targets.extend(y_batch.numpy())
                
        all_preds = np.array(all_preds)
        all_targets = np.array(all_targets)
        
        mae = mean_absolute_error(all_targets, all_preds)
        rmse = np.sqrt(mean_squared_error(all_targets, all_preds))
        r2 = r2_score(all_targets, all_preds)
        
        print("\n" + "="*40)
        print("TEST SET EVALUATION METRICS")
        print("="*40)
        print(f"Mean Absolute Error (MAE) : {mae:.2f}")
        print(f"Root Mean Sq Error (RMSE) : {rmse:.2f}")
        print(f"R-squared (R2)            : {r2:.4f}")
        print("="*40)
        
        return {"mae": mae, "rmse": rmse, "r2": r2}
