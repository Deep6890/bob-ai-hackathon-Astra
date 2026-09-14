import os
import pandas as pd
import numpy as np
import torch
from torch.utils.data import Dataset, DataLoader

class CMAPSSDataset(Dataset):
    """PyTorch Dataset for sequence data."""
    def __init__(self, sequences, targets):
        self.sequences = torch.tensor(sequences, dtype=torch.float32)
        self.targets = torch.tensor(targets, dtype=torch.float32)

    def __len__(self):
        return len(self.sequences)

    def __getitem__(self, idx):
        return self.sequences[idx], self.targets[idx]

class DataHandler:
    def __init__(self, data_dir, sequence_length=30):
        self.data_dir = data_dir
        self.sequence_length = sequence_length
        self.train_path = os.path.join(self.data_dir, "processed", "train_ready.csv")
        self.test_path = os.path.join(self.data_dir, "processed", "test_ready.csv")
        
        # We explicitly exclude future/target derived columns from inputs
        self.exclude_cols = [
            'unit_number', 'time_cycles', 'rul', 'rul_clipped',
            'predicted_failure_TTE', 'mission_duration',
            'margin_of_safety', 'CRITICAL_OVERLAP_RISK'
        ]
        self.feature_cols = None

    def _create_sequences(self, df, feature_cols):
        """Creates rolling window sequences and corresponding targets."""
        sequences = []
        targets = []
        
        # Group by unit_number to prevent crossing boundaries
        for unit, group in df.groupby("unit_number"):
            data = group[feature_cols].values
            # RUL at the end of the sequence window
            target_data = group["rul_clipped"].values
            
            for i in range(len(data) - self.sequence_length + 1):
                seq = data[i:i + self.sequence_length]
                label = target_data[i + self.sequence_length - 1]
                sequences.append(seq)
                targets.append(label)
                
        return np.array(sequences), np.array(targets)

    def get_kfold_dataloaders(self, batch_size=64, k_splits=5):
        """Yields K folds of train/val DataLoaders, split by unit_number."""
        train_df = pd.read_csv(self.train_path)
        self.feature_cols = [c for c in train_df.columns if c not in self.exclude_cols]
        
        unique_units = train_df["unit_number"].unique()
        # Ensure reproducibility
        rng = np.random.default_rng(42)
        rng.shuffle(unique_units)
        
        fold_sizes = np.full(k_splits, len(unique_units) // k_splits, dtype=int)
        fold_sizes[:len(unique_units) % k_splits] += 1
        current = 0
        
        for i in range(k_splits):
            start, stop = current, current + fold_sizes[i]
            val_units = unique_units[start:stop]
            train_units = np.concatenate((unique_units[:start], unique_units[stop:]))
            current = stop
            
            train_split = train_df[train_df["unit_number"].isin(train_units)]
            val_split = train_df[train_df["unit_number"].isin(val_units)]
            
            X_train, y_train = self._create_sequences(train_split, self.feature_cols)
            X_val, y_val = self._create_sequences(val_split, self.feature_cols)
            
            train_dataset = CMAPSSDataset(X_train, y_train)
            val_dataset = CMAPSSDataset(X_val, y_val)
            
            train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)
            val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False)
            
            yield train_loader, val_loader, self.feature_cols

    def prepare_dataloaders(self, batch_size=64):
        """Loads data and returns a 100% Train DataLoader and a Test DataLoader."""
        train_df = pd.read_csv(self.train_path)
        test_df = pd.read_csv(self.test_path)
        
        self.feature_cols = [c for c in train_df.columns if c not in self.exclude_cols]

        X_train, y_train = self._create_sequences(train_df, self.feature_cols)
        X_test, y_test = self._create_test_sequences(test_df, self.feature_cols)

        train_dataset = CMAPSSDataset(X_train, y_train)
        test_dataset = CMAPSSDataset(X_test, y_test)
        
        train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)
        test_loader = DataLoader(test_dataset, batch_size=batch_size, shuffle=False)
        
        return train_loader, test_loader, self.feature_cols

    def _create_test_sequences(self, df, feature_cols):
        """
        For testing, we usually want to predict the RUL at the end of the 
        currently available data for each unit. If a unit has fewer cycles 
        than sequence_length, we pad it.
        """
        sequences = []
        targets = []
        
        for unit, group in df.groupby("unit_number"):
            data = group[feature_cols].values
            target_data = group["rul_clipped"].values
            
            # If engine history is shorter than sequence length, pad with zeros at the beginning
            if len(data) < self.sequence_length:
                pad_size = self.sequence_length - len(data)
                pad_data = np.zeros((pad_size, data.shape[1]))
                seq = np.vstack([pad_data, data])
            else:
                seq = data[-self.sequence_length:]
                
            label = target_data[-1]
            sequences.append(seq)
            targets.append(label)
            
        return np.array(sequences), np.array(targets)
