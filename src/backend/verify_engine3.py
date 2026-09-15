import urllib.request
import json
import sqlite3

# Connect to database and trim Engine 3's readings to 126
conn = sqlite3.connect('E:/BoB/bob-ai-hackathon-Astra/src/backend/instance/app.db')
cursor = conn.cursor()

# Get Engine 3's asset_id
cursor.execute("SELECT id FROM assets WHERE unit_number = 3")
asset_id = cursor.fetchone()[0]

# Delete readings for Engine 3 beyond cycle 126
cursor.execute("DELETE FROM sensor_readings WHERE asset_id = ? AND time_cycles > 126", (asset_id,))
conn.commit()
conn.close()

print("Trimmed Engine 3 to 126 cycles.")

# Force an analysis
print("Forcing analysis for Engine 3...")
req = urllib.request.Request("http://127.0.0.1:5000/api/v1/engines/3/analyze", method='POST')
try:
    resp = urllib.request.urlopen(req)
    print("Analysis successful.")
except Exception as e:
    print(f"Failed to analyze: {e}")

# Check mission readiness for a 30 cycle mission
print("\nChecking Mission Readiness (Duration = 30)...")
headers = {'Content-Type': 'application/json'}
payload = json.dumps({"engine_id": 3, "mission_duration": 30}).encode('utf-8')
req = urllib.request.Request("http://127.0.0.1:5000/api/v1/mission/readiness", data=payload, headers=headers)

try:
    resp = urllib.request.urlopen(req)
    data = json.loads(resp.read().decode('utf-8'))
    print(json.dumps(data, indent=2))
except Exception as e:
    print(f"Error: {e}")
