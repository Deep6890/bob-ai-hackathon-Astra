"""
run.py
======
Entry point for the Flask development server.
Run: python run.py  OR  flask run
"""

from app import create_app

app = create_app()

if __name__ == "__main__":
    # Debug mode auto-reloads on file changes — disable in production
    app.run(debug=True, host="0.0.0.0", port=5000)
