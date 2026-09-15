import os
import requests
import sqlite3
import pandas as pd
import time
import json

BASE_URL = "http://127.0.0.1:5000/api/v1"
DB_PATH = "E:/BoB/bob-ai-hackathon-Astra/src/backend/instance/app.db"

def run_tests():
    print("=== STARTING FULL PRODUCTION VERIFICATION SUITE ===")
    
    # 1. Prepare dummy CSV data with 2 engines (Engine 98 and Engine 99)
    # We will give Engine 98 only 5 cycles and Engine 99 10 cycles to test isolation
    data = []
    # Engine 98
    for i in range(1, 6):
        row = {"unit_number": 98, "time_cycles": i}
        for sensor in [2,3,4,7,8,9,11,12,13,14,15,17,20,21]:
            row[f"sensor_{sensor}_smooth"] = float(i) * 0.1
        data.append(row)
    
    # Engine 99
    for i in range(1, 11):
        row = {"unit_number": 99, "time_cycles": i}
        for sensor in [2,3,4,7,8,9,11,12,13,14,15,17,20,21]:
            row[f"sensor_{sensor}_smooth"] = float(i) * 0.5
        data.append(row)
        
    df = pd.DataFrame(data)
    df.to_csv("test_upload.csv", index=False)
    print("\n[+] 1. Prepared dummy CSV with Engine 98 and Engine 99.")
    
    # 2. Upload CSV and test multiple engines behavior
    print("[+] 2. Uploading CSV...")
    with open("test_upload.csv", "rb") as f:
        resp = requests.post(f"{BASE_URL}/data/upload", files={"file": f})
    
    assert resp.status_code == 200, f"Upload failed: {resp.text}"
    result = resp.json()
    assert 98 in result["engines_affected"], "Engine 98 not in response"
    assert 99 in result["engines_affected"], "Engine 99 not in response"
    print("  -> Upload success. Background analysis triggered.")
    
    # 3. Wait for background thread to process (post-commit processing test)
    print("[+] 3. Waiting 10 seconds for background analysis to finish...")
    time.sleep(10)
    
    # 4. Verify DB Insertions and Per-Engine Isolation
    print("[+] 4. Verifying DB Insertions & Isolation...")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Check Engine 98
    cursor.execute("SELECT id FROM assets WHERE unit_number = 98")
    e98_id = cursor.fetchone()
    assert e98_id, "Engine 98 not found in DB"
    
    cursor.execute("SELECT COUNT(*) FROM sensor_readings WHERE asset_id = ?", (e98_id[0],))
    e98_readings = cursor.fetchone()[0]
    assert e98_readings == 5, f"Expected 5 readings for Engine 98, got {e98_readings}"
    
    cursor.execute("SELECT prediction_cycle FROM predictions WHERE asset_id = ? ORDER BY predicted_at DESC LIMIT 1", (e98_id[0],))
    e98_pred = cursor.fetchone()
    assert e98_pred, "No prediction found for Engine 98"
    assert e98_pred[0] == 5, f"Prediction cycle should be 5, got {e98_pred[0]}"
    
    # Check Engine 99
    cursor.execute("SELECT id FROM assets WHERE unit_number = 99")
    e99_id = cursor.fetchone()
    assert e99_id, "Engine 99 not found in DB"
    
    cursor.execute("SELECT COUNT(*) FROM sensor_readings WHERE asset_id = ?", (e99_id[0],))
    e99_readings = cursor.fetchone()[0]
    assert e99_readings == 10, f"Expected 10 readings for Engine 99, got {e99_readings}"
    
    cursor.execute("SELECT prediction_cycle FROM predictions WHERE asset_id = ? ORDER BY predicted_at DESC LIMIT 1", (e99_id[0],))
    e99_pred = cursor.fetchone()
    assert e99_pred[0] == 10, f"Prediction cycle should be 10, got {e99_pred[0]}"
    
    print("  -> Engine isolation confirmed! Background jobs saved correct cycles.")
    
    # 5. Duplicate CSV Upload Test (Idempotency)
    print("[+] 5. Testing CSV Idempotency (Duplicate Upload)...")
    with open("test_upload.csv", "rb") as f:
        resp = requests.post(f"{BASE_URL}/data/upload", files={"file": f})
    assert resp.status_code == 200
    
    # Wait for possible background job
    time.sleep(2)
    
    cursor.execute("SELECT COUNT(*) FROM sensor_readings WHERE asset_id = ?", (e98_id[0],))
    e98_readings_after = cursor.fetchone()[0]
    assert e98_readings_after == 5, f"Duplicate readings found! Expected 5, got {e98_readings_after}"
    print("  -> Idempotency confirmed! Duplicate rows were not inserted.")
    
    # 6. Per-sensor persistence test
    print("[+] 6. Verifying per-sensor persistence...")
    cursor.execute("SELECT id FROM predictions WHERE asset_id = ? ORDER BY predicted_at DESC LIMIT 1", (e98_id[0],))
    pred_id = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM sensor_analysis WHERE prediction_id = ?", (pred_id,))
    sensor_count = cursor.fetchone()[0]
    assert sensor_count == 14, f"Expected 14 sensor analysis rows, got {sensor_count}"
    print("  -> Sensor analysis persistence confirmed! 14 sensors saved.")
    
    # 7. Engine 3 Result Regression
    print("[+] 7. Engine 3 API Regression Test...")
    headers = {'Content-Type': 'application/json'}
    payload = {"engine_id": 3, "mission_duration": 30}
    resp = requests.post(f"{BASE_URL}/mission/readiness", json=payload, headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    
    print("Engine 3 JSON Contract:")
    print(json.dumps(data, indent=2))
    assert "rul_assessment" in data, "Contract missing rul_assessment"
    assert "current_health" in data, "Contract missing current_health"
    assert "combined_assessment" in data, "Contract missing combined_assessment"
    print("  -> Engine 3 API Contract strictly matches requirements!")
    
    conn.close()
    
    print("\n=== VERIFICATION SUITE PASSED SUCCESSFULLY ===")

if __name__ == "__main__":
    run_tests()
