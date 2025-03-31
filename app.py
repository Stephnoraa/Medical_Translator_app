from flask import Flask, request, jsonify, render_template, send_from_directory
from flask_cors import CORS
import os
import uuid
import requests
from gtts import gTTS
import json
import time
from deep_translator import GoogleTranslator

app = Flask(__name__, static_folder='static', static_url_path='/static')
CORS(app)  # Enable CORS for all routes

# Dictionary of supported languages with their codes
LANGUAGES = {
    "en": "English",
    "es": "Spanish",
    "fr": "French",
    "de": "German",
    "it": "Italian",
    "pt": "Portuguese",
    "ru": "Russian",
    "zh": "Chinese",
    "ar": "Arabic",
    "hi": "Hindi",
    "ja": "Japanese",
    "ko": "Korean"
}

# LibreTranslate API endpoint (free and open source)
LIBRETRANSLATE_URL = "https://libretranslate.de/translate"


@app.route('/')
def index():
    return render_template('index.html', languages=LANGUAGES)


@app.route('/translate', methods=['POST'])
def translate_text():
    """Translate text using LibreTranslate API with fallback to deep_translator"""
    data = request.json
    text = data.get('text')
    source_lang = data.get('source_lang')
    target_lang = data.get('target_lang')

    if not all([text, target_lang]):
        return jsonify({"error": "Missing required parameters"}), 400

    # First try with LibreTranslate
    try:
        # Prepare the request to LibreTranslate
        payload = {
            "q": text,
            "source": source_lang if source_lang != 'auto' else 'auto',
            "target": target_lang,
            "format": "text"
        }

        headers = {
            "Content-Type": "application/json"
        }

        # Make the request to LibreTranslate with a timeout
        response = requests.post(LIBRETRANSLATE_URL, json=payload, headers=headers, timeout=5)

        if response.status_code == 200:
            result = response.json()
            translated_text = result.get("translatedText", "")

            return jsonify({
                "original_text": text,
                "translated_text": translated_text,
                "source_lang": source_lang,
                "target_lang": target_lang,
                "service": "LibreTranslate"
            })
    except Exception as e:
        print(f"LibreTranslate error: {str(e)}")
        # Continue to fallback

    # Fallback to deep_translator (Google Translate)
    try:
        print("Falling back to deep_translator...")

        # Handle 'auto' source language
        if source_lang == 'auto':
            source_lang = 'auto'

        # Use deep_translator's GoogleTranslator
        translator = GoogleTranslator(source=source_lang, target=target_lang)
        translated_text = translator.translate(text)

        return jsonify({
            "original_text": text,
            "translated_text": translated_text,
            "source_lang": source_lang,
            "target_lang": target_lang,
            "service": "GoogleTranslator (fallback)"
        })
    except Exception as e:
        print(f"Fallback translation error: {str(e)}")
        return jsonify({"error": f"Translation failed: {str(e)}"}), 500


@app.route('/text-to-speech', methods=['POST'])
def text_to_speech():
    """Convert text to speech using gTTS"""
    data = request.json
    text = data.get('text')
    lang = data.get('lang')

    if not all([text, lang]):
        return jsonify({"error": "Missing required parameters"}), 400

    try:
        # Create audio directory if it doesn't exist
        audio_dir = os.path.join('static', 'audio')
        os.makedirs(audio_dir, exist_ok=True)

        # Generate a unique filename
        filename = f"speech_{uuid.uuid4()}.mp3"
        filepath = os.path.join(audio_dir, filename)

        # Generate speech using gTTS
        tts = gTTS(text=text, lang=lang.split('-')[0])  # gTTS uses primary language code
        tts.save(filepath)

        return jsonify({
            "audio_url": f"/static/audio/{filename}"
        })
    except Exception as e:
        print(f"Text-to-speech error: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "services": {
            "translation": ["LibreTranslate", "GoogleTranslator (fallback)"],
            "tts": "gTTS"
        }
    }), 200


@app.route('/supported-languages', methods=['GET'])
def supported_languages():
    """Return supported languages"""
    return jsonify(LANGUAGES), 200


@app.route('/static/<path:path>')
def serve_static(path):
    """Explicitly serve static files"""
    return send_from_directory('static', path)


@app.route('/css-check')
def css_check():
    """Test endpoint to verify CSS is accessible"""
    return jsonify({"status": "CSS endpoint reached successfully"})


if __name__ == '__main__':
    # Create necessary directories
    os.makedirs(os.path.join('static', 'audio'), exist_ok=True)

    # Get port from environment variable or use default
    port = int(os.environ.get("PORT", 5000))

    print(f"Medical Translation API is running at http://127.0.0.1:{port}")
    print("Note: For local development, you can safely ignore any browser warnings about insecure connections.")

    # Run the app with localhost instead of 0.0.0.0 to reduce security warnings
    app.run(host='127.0.0.1', port=port, debug=True)

print("Medical Translation API is running!")