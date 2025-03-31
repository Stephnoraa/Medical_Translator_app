from waitress import serve
from app import app
import os

if __name__ == '__main__':
    # Create necessary directories
    os.makedirs(os.path.join('static', 'audio'), exist_ok=True)

    # Get port from environment variable or use default
    port = int(os.environ.get("PORT", 5000))

    print(f"Medical Translation API is running at http://127.0.0.1:{port}")
    print("Serving with Waitress (production server)")

    # Run with Waitress
    serve(app, host='127.0.0.1', port=port)