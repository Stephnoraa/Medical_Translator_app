

# Medical Translator App

**Live User Guide & Docs:** https://v0-medi-bridge-app-redesign.vercel.app/

<img src="https://via.placeholder.com/800x400?text=Healthcare+Translation+App" alt="Healthcare Translation App" width="100%"/>

A web-based application for real-time, multilingual translation between patients and healthcare providers. Converts spoken input into text, provides live transcripts, and offers translated audio playback.

## 🌟 Features

- **Voice-to-Text with AI Enhancement**: Convert spoken input into text transcripts with improved accuracy for medical terminology
- **Real-Time Translation**: Translate between 12+ languages instantly
- **Audio Playback**: Listen to translated text with natural-sounding speech
- **Mobile-First Design**: Responsive interface that works on smartphones, tablets, and desktops
- **Conversation History**: Save and export conversation transcripts
- **Privacy-Focused**: No conversation data stored on servers

## 🔧 Technologies Used

- **Backend**: Flask (Python)
- **Frontend**: HTML, CSS, JavaScript
- **Speech Recognition**: Web Speech API
- **Translation**: Google Translate API (via deep-translator)
- **Text-to-Speech**: YarnGPT (Nigerian languages), gTTS (others)

## 📋 Requirements

- Python 3.10+
- Flask 3.x
- python-dotenv
- Modern web browser (Chrome, Edge, or Safari recommended for best speech recognition support)


## 🚀 Installation & Setup

1. **Clone the repository:**
  ```bash
  git clone https://github.com/Stephnoraa/Medical_Translator_app.git
  cd Medical_Translator_app
  ```




2. **Create and activate a virtual environment:**

  ```sh
  # Windows
  python -m venv .venv
  .venv\Scripts\activate

  # macOS/Linux
  python3 -m venv .venv
  source .venv/bin/activate
  ```



3. **Install dependencies:**

  ```sh
  pip install -r requirements.txt
  ```



4. **Set up environment variables:**

  - Create a `.env` file in the project root:
    ```env
    YARNGPT_API_KEY=your_yarngpt_api_key_here
    GOOGLE_API_KEY=your_google_api_key_here
    ```
  - Never commit your `.env` file to version control!

5. **Run the application (development):**

  ```sh
  python app.py
  ```

  Or for production (recommended):

  ```sh
  python run_waitress.py
  ```

6. **Open your browser and navigate to:**

  http://127.0.0.1:5000





## 📱 Usage

1. **Select Languages**: Choose the provider and patient languages from the dropdown menus
2. **Start Recording**: Click the "Start Recording" button and speak
3. **View Translation**: See the original and translated text in real-time
4. **Play Audio**: Click the "Play Audio" button to hear the translation
5. **Switch Roles**: Use the "Switch Speaker" button to change between provider and patient
6. **Export Conversation**: Click "Export" to save the conversation history



## 🌐 Supported Languages

- English
- Spanish
- French
- German
- Italian
- Portuguese
- Russian
- Chinese
- Arabic
- Hindi
- Japanese
- Korean



## 🔒 Privacy & Security

- No conversation data is permanently stored on our servers
- Audio recordings are processed in real-time and immediately discarded
- Translations are performed using secure API connections
- No patient identifying information is collected

## ⚠️ Notes

- Do **not** commit your `.env` file or any files in `static/audio/` to public repositories.
- For YarnGPT and Google Translate features, you must provide valid API keys in your `.env` file.
- If you deploy to a cloud service, set environment variables in your deployment settings.

---

For questions or contributions, open an issue or pull request on GitHub.

  

