import os
from app import create_app
from app.config import Config

app = create_app()

if __name__ == '__main__':
    port = Config.FLASK_PORT
    print(f"Starting Kuber API server on http://localhost:{port}")
    app.run(host='0.0.0.0', port=port, debug=True)

