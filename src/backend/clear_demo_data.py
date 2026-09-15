"""
clear_demo_data.py
==================
ONE-TIME script to clear pre-existing training/demo data from the production database.

Run this manually before deploying or during fresh setup:
    python clear_demo_data.py

This is NOT called automatically on app startup.
It ONLY removes production analysis data — model artifacts (.pth, .pkl, .json) are unchanged.
"""
import sqlite3
import os

db_paths = ['instance/app.db', 'app.db']

def clear_db(db_path):
    if not os.path.exists(db_path):
        print(f'  {db_path}: not found, skipping')
        return

    size = os.path.getsize(db_path)
    if size == 0:
        print(f'  {db_path}: already empty (0 bytes)')
        return

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    # Check if tables exist
    cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = {r[0] for r in cur.fetchall()}

    if 'assets' not in tables:
        print(f'  {db_path}: no assets table, schema not initialized')
        conn.close()
        return

    # Count before
    counts = {}
    for t in ['assets', 'sensor_readings', 'predictions', 'sensor_analysis', 'readiness_results', 'missions']:
        if t in tables:
            cur.execute(f"SELECT COUNT(*) FROM \"{t}\"")
            counts[t] = cur.fetchone()[0]

    if all(v == 0 for v in counts.values()):
        print(f'  {db_path}: already empty')
        conn.close()
        return

    print(f'  {db_path}: clearing {counts}')

    # Delete in FK dependency order
    for t in ['sensor_analysis', 'readiness_results', 'sensor_readings', 'predictions', 'missions', 'assets']:
        if t in tables:
            cur.execute(f"DELETE FROM \"{t}\"")

    conn.commit()

    # Verify
    for t in ['assets', 'sensor_readings', 'predictions', 'sensor_analysis', 'readiness_results', 'missions']:
        if t in tables:
            cur.execute(f"SELECT COUNT(*) FROM \"{t}\"")
            print(f'    After clear — {t}: {cur.fetchone()[0]} rows')

    conn.close()
    print(f'  {db_path}: cleared successfully')

print('Clearing demo/training data from production databases...')
print('Model artifacts (.pth, .pkl, .json) are NOT affected.')
print()
for path in db_paths:
    clear_db(path)

print()
print('Done. Production database is now empty.')
print('Upload a CSV via the frontend to begin a fresh analysis.')
