
# Healthcare Translation Web App

# Read User Guide and Code Documentation here: https://v0-medi-bridge-app-redesign.vercel.app/

![Healthcare Translation App](https://via.placeholder.com/800x400?text=Healthcare+Translation+App)

A web-based application that enables real-time, multilingual translation between patients and healthcare providers. This tool converts spoken input into text, provides a live transcript, and offers a translated version with audio playback.

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
- **Translation**: LibreTranslate API with Google Translate fallback
- **Text-to-Speech**: gTTS (Google Text-to-Speech)

## 📋 Requirements

- Python 3.7+
- Flask 2.0.1
- Modern web browser (Chrome, Edge, or Safari recommended for best speech recognition support)

## 🚀 Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/healthcare-translator.git
   cd healthcare-translator
  ```



2. Create and activate a virtual environment:

```shellscript
# Windows
python -m venv .venv
.venv\Scripts\activate

# macOS/Linux
python -m venv .venv
source .venv/bin/activate
```


3. Install dependencies:

```shellscript
pip install -r requirements.txt
```


4. Run the application:

```shellscript
python app.py
```


5. Open your browser and navigate to:

```plaintext
http://127.0.0.1:5000
```




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

  

