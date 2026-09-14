import torch
import torch.nn as nn
import torch.optim as optim
import os
import copy

class ModelTrainer:
    def __init__(self, model, train_loader, val_loader=None, device="cpu", lr=0.001):
        self.model = model.to(device)
        self.train_loader = train_loader
        self.val_loader = val_loader
        self.device = device
        
        self.criterion = nn.MSELoss()
        self.optimizer = optim.Adam(self.model.parameters(), lr=lr)
        
    def train(self, num_epochs=50, patience=10, save_path="best_model.pth"):
        print(f"Training on device: {self.device}")
        
        best_val_loss = float('inf')
        patience_counter = 0
        best_model_weights = copy.deepcopy(self.model.state_dict())
        
        train_losses = []
        val_losses = []

        for epoch in range(num_epochs):
            # Training Phase
            self.model.train()
            running_train_loss = 0.0
            for X_batch, y_batch in self.train_loader:
                X_batch = X_batch.to(self.device)
                y_batch = y_batch.to(self.device)
                
                self.optimizer.zero_grad()
                outputs = self.model(X_batch)
                loss = self.criterion(outputs, y_batch)
                loss.backward()
                self.optimizer.step()
                
                running_train_loss += loss.item() * X_batch.size(0)
                
            epoch_train_loss = running_train_loss / len(self.train_loader.dataset)
            train_losses.append(epoch_train_loss)
            
            # Validation Phase
            if self.val_loader is not None:
                self.model.eval()
                running_val_loss = 0.0
                with torch.no_grad():
                    for X_batch, y_batch in self.val_loader:
                        X_batch = X_batch.to(self.device)
                        y_batch = y_batch.to(self.device)
                        
                        outputs = self.model(X_batch)
                        loss = self.criterion(outputs, y_batch)
                        running_val_loss += loss.item() * X_batch.size(0)
                        
                epoch_val_loss = running_val_loss / len(self.val_loader.dataset)
                val_losses.append(epoch_val_loss)
                
                print(f"Epoch {epoch+1:03d}/{num_epochs:03d} | Train Loss: {epoch_train_loss:.2f} | Val Loss: {epoch_val_loss:.2f}")
                
                # Early Stopping
                if epoch_val_loss < best_val_loss:
                    best_val_loss = epoch_val_loss
                    patience_counter = 0
                    best_model_weights = copy.deepcopy(self.model.state_dict())
                    if save_path:
                        torch.save(best_model_weights, save_path)
                else:
                    patience_counter += 1
                    
                if patience_counter >= patience:
                    print(f"Early stopping triggered at epoch {epoch+1}")
                    break
            else:
                # No validation phase
                print(f"Epoch {epoch+1:03d}/{num_epochs:03d} | Train Loss: {epoch_train_loss:.2f}")
                best_model_weights = copy.deepcopy(self.model.state_dict())
                if save_path:
                    torch.save(best_model_weights, save_path)
                
        print("Training complete.")
        self.model.load_state_dict(best_model_weights)
        return self.model, train_losses, val_losses
