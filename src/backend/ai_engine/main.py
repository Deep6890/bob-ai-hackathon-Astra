import os
import torch
import pandas as pd
from data_handler import DataHandler
from lstm_network import RULPredictorLSTM
from trainer import ModelTrainer
from evaluator import ModelEvaluator
from inference import PredictiveMaintenanceCopilot
from unsupervised_health import UnsupervisedHealthDetector

def main():
    # Setup configuration
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    DATA_DIR = os.path.join(BASE_DIR, "data")
    MODEL_DIR = os.path.dirname(__file__)
    MODEL_SAVE_PATH = os.path.join(MODEL_DIR, "best_rul_lstm.pth")
    
    SEQUENCE_LENGTH = 30
    BATCH_SIZE = 64
    EPOCHS = 30
    PATIENCE = 5
    MISSION_WINDOW = 30 # Configurable threshold for readiness assessment
    
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"Using device: {device}")

    # 1. K-Fold Cross Validation
    print("\n--- Phase 1: Group K-Fold Cross Validation ---")
    data_handler = DataHandler(DATA_DIR, sequence_length=SEQUENCE_LENGTH)
    
    k_splits = 5
    fold_metrics = []
    optimal_epochs = []
    
    # We will skip the long output of folds unless it's a fresh run
    # For speed in this iteration, we'll just train the final model directly if it exists,
    # but the instructions say keep existing LSTM intact. So we'll just run it.
    
    # Check if final model already exists to save time during inference debugging
    if os.path.exists(MODEL_SAVE_PATH):
        print("Existing final model found, loading it to skip retraining...")
        full_train_loader, test_loader, feature_cols = data_handler.prepare_dataloaders(batch_size=BATCH_SIZE)
        final_model = RULPredictorLSTM(input_size=len(feature_cols), hidden_size=64, num_layers=2, dropout=0.2)
        final_model.load_state_dict(torch.load(MODEL_SAVE_PATH, map_location=device))
        
        final_evaluator = ModelEvaluator(final_model, test_loader, device=device)
        test_metrics = final_evaluator.evaluate()
    else:
        for fold, (train_loader, val_loader, feature_cols) in enumerate(data_handler.get_kfold_dataloaders(batch_size=BATCH_SIZE, k_splits=k_splits)):
            print(f"\n--- Training Fold {fold+1}/{k_splits} ---")
            input_size = len(feature_cols)
            model = RULPredictorLSTM(input_size=input_size, hidden_size=64, num_layers=2, dropout=0.2)
            
            trainer = ModelTrainer(model, train_loader, val_loader, device=device, lr=0.001)
            model, train_losses, val_losses = trainer.train(
                num_epochs=EPOCHS, 
                patience=PATIENCE, 
                save_path=None # We don't need to save fold models
            )
            
            best_epoch = val_losses.index(min(val_losses)) + 1
            optimal_epochs.append(best_epoch)
            
            evaluator = ModelEvaluator(model, val_loader, device=device)
            metrics = evaluator.evaluate()
            fold_metrics.append(metrics)
            
        print("\n--- Phase 2: K-Fold Results ---")
        avg_mae = sum(m['mae'] for m in fold_metrics) / k_splits
        avg_rmse = sum(m['rmse'] for m in fold_metrics) / k_splits
        avg_r2 = sum(m['r2'] for m in fold_metrics) / k_splits
        avg_epochs = int(sum(optimal_epochs) / k_splits)
        
        print(f"Average MAE  : {avg_mae:.2f}")
        print(f"Average RMSE : {avg_rmse:.2f}")
        print(f"Average R2   : {avg_r2:.4f}")
        print(f"Average Optimal Epochs: {avg_epochs}")

        print(f"\n--- Phase 3: Training Final Model on 100% Data for {avg_epochs} epochs ---")
        full_train_loader, test_loader, feature_cols = data_handler.prepare_dataloaders(batch_size=BATCH_SIZE)
        
        final_model = RULPredictorLSTM(input_size=len(feature_cols), hidden_size=64, num_layers=2, dropout=0.2)
        final_trainer = ModelTrainer(final_model, full_train_loader, val_loader=None, device=device, lr=0.001)
        
        final_model, _, _ = final_trainer.train(
            num_epochs=avg_epochs, 
            patience=PATIENCE, 
            save_path=MODEL_SAVE_PATH
        )

        print("\n--- Phase 4: Final Test Set Evaluation ---")
        final_evaluator = ModelEvaluator(final_model, test_loader, device=device)
        test_metrics = final_evaluator.evaluate()

    # --- NEW PHASE: Unsupervised Sensor Degradation Model Training ---
    iforest_path = os.path.join(MODEL_DIR, "multivariate_iforest.pkl")
    if not os.path.exists(iforest_path):
        print("\n--- Phase 4b: Training Unsupervised Sensor Health Pipeline ---")
        detector = UnsupervisedHealthDetector(
            data_path=data_handler.train_path,
            feature_cols=feature_cols,
            save_dir=MODEL_DIR
        )
        detector.fit_and_save()

    # 5. Inference / Copilot Demonstration on Unseen Assets
    print("\n--- Phase 5: Copilot Inference Demonstration ---")
    test_df = pd.read_csv(data_handler.test_path)
    
    copilot = PredictiveMaintenanceCopilot(
        model=final_model, 
        feature_cols=feature_cols, 
        sequence_length=SEQUENCE_LENGTH,
        mission_window=MISSION_WINDOW,
        device=device
    )
    
    # Pick 10 distinct engines from the test set to demonstrate different outcomes
    sample_engines = test_df['unit_number'].unique()[:10] 
    
    results_list = []
    
    for engine_id in sample_engines:
        engine_data = test_df[test_df['unit_number'] == engine_id]
        report = copilot.analyze_asset(engine_id, engine_data)
        
        # Summarize for the final table
        health = report["current_health"]
        norm = sum(1 for s in health.values() if s["status"] == "NORMAL")
        deg = sum(1 for s in health.values() if s["status"] == "DEGRADING")
        abn = sum(1 for s in health.values() if s["status"] == "ABNORMAL")
        unk = sum(1 for s in health.values() if s["status"] == "UNKNOWN")
        
        results_list.append({
            "Engine": engine_id,
            "Latest Cycle": report["latest_cycle"],
            "Normal": norm,
            "Degrading": deg,
            "Abnormal": abn,
            "Unknown": unk,
            "Predicted RUL": f"{report['predicted_rul']:.1f}",
            "Mission": report["readiness"],
            "Priority": report["priority"]
        })
        
    print("\n\n" + "="*80)
    print("10-ENGINE TEST SUMMARY REPORT")
    print("="*80)
    # Print the table nicely
    print(f"{'Engine':<8} | {'Cycle':<6} | {'Normal':<6} | {'Degrad':<6} | {'Abnorm':<6} | {'Unk':<3} | {'Pred RUL':<8} | {'Mission':<10} | {'Priority':<8}")
    print("-" * 80)
    for res in results_list:
        print(f"{res['Engine']:<8} | {res['Latest Cycle']:<6} | {res['Normal']:<6} | {res['Degrading']:<6} | {res['Abnormal']:<6} | {res['Unknown']:<3} | {res['Predicted RUL']:<8} | {res['Mission']:<10} | {res['Priority']:<8}")
    print("="*80)
        
if __name__ == "__main__":
    main()
