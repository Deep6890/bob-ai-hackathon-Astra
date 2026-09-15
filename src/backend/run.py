import os
from app import create_app

app = create_app()

if __name__ == '__main__':
    env = os.getenv("FLASK_ENV", "production")
    
    if env == "development":
        app.run(host='0.0.0.0', port=5000, debug=True)
    else:
        from waitress import serve
        print("Starting production server with waitress on port 5000...")
        serve(app, host='0.0.0.0', port=5000)
