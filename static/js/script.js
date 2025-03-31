
document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const providerBox = document.getElementById('providerBox');
    const patientBox = document.getElementById('patientBox');
    const providerRecordBtn = document.getElementById('providerRecordBtn');
    const patientRecordBtn = document.getElementById('patientRecordBtn');
    const providerPlayBtn = document.getElementById('providerPlayBtn');
    const patientPlayBtn = document.getElementById('patientPlayBtn');
    const providerLanguage = document.getElementById('providerLanguage');
    const patientLanguage = document.getElementById('patientLanguage');
    const switchSpeakerBtn = document.getElementById('switchSpeakerBtn');
    const switchLanguagesBtn = document.getElementById('switchLanguagesBtn');
    const conversationHistory = document.getElementById('conversationHistory');
    const audioPlayer = document.getElementById('audioPlayer');
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');
    const exportHistoryBtn = document.getElementById('exportHistoryBtn');
    const privacyLink = document.getElementById('privacyLink');
    const privacyModal = document.getElementById('privacyModal');
    const closePrivacyModal = document.getElementById('closePrivacyModal');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const errorToast = document.getElementById('errorToast');
    const errorMessage = document.getElementById('errorMessage');
    const dismissError = document.getElementById('dismissError');
    const connectionStatus = document.getElementById('connectionStatus');
    const providerSpeaking = document.getElementById('providerSpeaking');
    const patientSpeaking = document.getElementById('patientSpeaking');
    const providerStatus = document.getElementById('providerStatus');
    const patientStatus = document.getElementById('patientStatus');



// Debug log to verify script is loading
console.log('Healthcare Translator script loaded');

// Check if elements exist before using them
function checkElements() {
    const elements = [
        providerBox, patientBox, providerRecordBtn, patientRecordBtn,
        providerPlayBtn, patientPlayBtn, providerLanguage, patientLanguage,
        switchSpeakerBtn, switchLanguagesBtn, conversationHistory, audioPlayer,
        clearHistoryBtn, exportHistoryBtn, privacyLink, privacyModal,
        closePrivacyModal, loadingOverlay, errorToast, errorMessage,
        dismissError, connectionStatus, providerSpeaking, patientSpeaking,
        providerStatus, patientStatus
    ];

    const missingElements = elements.filter(el => !el);
    if (missingElements.length > 0) {
        console.error('Missing elements:', missingElements);
        return false;
    }
    return true;
}

// Call this after initializing all element variables
if (!checkElements()) {
    showError('Some UI elements could not be found. Please refresh the page.');
}



    // State
    let isRecording = false;
    let recognition = null;
    let currentSpeaker = 'provider'; // 'provider' or 'patient'
    let transcript = '';
    let translatedText = '';
    let isOnline = navigator.onLine;

    // Update connection status
    function updateConnectionStatus() {
        const statusDot = connectionStatus.querySelector('.status-dot');
        const statusText = connectionStatus.querySelector('.status-text');

        if (isOnline) {
            statusDot.classList.remove('offline');
            statusDot.classList.add('online');
            statusText.textContent = 'Online';
        } else {
            statusDot.classList.remove('online');
            statusDot.classList.add('offline');
            statusText.textContent = 'Offline';
            showError('You are offline. Please check your internet connection.');
        }
    }

    // Initialize speech recognition
    function initSpeechRecognition() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;

            recognition.onstart = function() {
                if (currentSpeaker === 'provider') {
                    providerSpeaking.classList.add('active');
                } else {
                    patientSpeaking.classList.add('active');
                }
            };

            recognition.onresult = function(event) {
                let interimTranscript = '';
                let finalTranscript = '';

                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const result = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        finalTranscript += result;
                    } else {
                        interimTranscript += result;
                    }
                }

                if (finalTranscript) {
                    transcript = finalTranscript;
                }

                // Update the appropriate box
                if (currentSpeaker === 'provider') {
                    providerBox.textContent = transcript || interimTranscript;
                    if (transcript) {
                        providerStatus.textContent = 'Processing...';
                    }
                } else {
                    patientBox.textContent = transcript || interimTranscript;
                    if (transcript) {
                        patientStatus.textContent = 'Processing...';
                    }
                }
            };

            recognition.onerror = function(event) {
                console.error('Speech recognition error', event.error);
                if (event.error === 'no-speech') {
                    showStatus(`No speech detected. Please try again.`);
                } else if (event.error === 'audio-capture') {
                    showError('No microphone detected. Please check your device settings.');
                } else if (event.error === 'not-allowed') {
                    showError('Microphone access denied. Please allow microphone access in your browser settings.');
                } else {
                    showError(`Speech recognition error: ${event.error}`);
                }
                stopRecording();
            };

            recognition.onend = function() {
                if (currentSpeaker === 'provider') {
                    providerSpeaking.classList.remove('active');
                } else {
                    patientSpeaking.classList.remove('active');
                }

                if (isRecording) {
                    // If we're still supposed to be recording, restart
                    recognition.start();
                } else if (transcript) {
                    // If we have a transcript, translate it
                    translateText();
                }
            };

            return true;
        } else {
            showError('Speech recognition is not supported in your browser. Please try Chrome, Edge, or Safari.');
            return false;
        }
    }

    // Toggle recording
    function toggleRecording() {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    }

    // Start recording
    function startRecording() {
        if (!isOnline) {
            showError('You are offline. Please check your internet connection.');
            return;
        }

        if (!recognition && !initSpeechRecognition()) {
            return;
        }

        // Clear previous transcript
        transcript = '';
        translatedText = '';

        // Update UI
        if (currentSpeaker === 'provider') {
            providerBox.textContent = '';
            providerBox.classList.add('active-speaker');
            patientBox.classList.remove('active-speaker');
            providerStatus.textContent = 'Listening...';
            patientStatus.textContent = '';
            providerRecordBtn.innerHTML = `
                <svg class="btn-icon mic-icon" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"/>
                    <path d="M9 9h6v6H9z"/>
                </svg>
                Stop Recording
            `;
            providerRecordBtn.classList.add('recording');
            patientPlayBtn.classList.add('hidden');
        } else {
            patientBox.textContent = '';
            patientBox.classList.add('active-speaker');
            providerBox.classList.remove('active-speaker');
            patientStatus.textContent = 'Listening...';
            providerStatus.textContent = '';
            patientRecordBtn.innerHTML = `
                <svg class="btn-icon mic-icon" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"/>
                    <path d="M9 9h6v6H9z"/>
                </svg>
                Stop Recording
            `;
            patientRecordBtn.classList.add('recording');
            providerPlayBtn.classList.add('hidden');
        }

        // Set language
        recognition.lang = currentSpeaker === 'provider' ? providerLanguage.value : patientLanguage.value;

        // Start recording
        try {
            recognition.start();
            isRecording = true;
        } catch (error) {
            console.error('Error starting speech recognition:', error);
            showError('Error starting speech recognition. Please refresh the page and try again.');
        }
    }

    // Stop recording
    function stopRecording() {
        if (recognition) {
            try {
                recognition.stop();
            } catch (error) {
                console.error('Error stopping speech recognition:', error);
            }
        }

        // Update UI
        if (currentSpeaker === 'provider') {
            providerRecordBtn.innerHTML = `
                <svg class="btn-icon mic-icon" viewBox="0 0 24 24">
                    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5z"/>
                    <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                </svg>
                Start Recording
            `;
            providerRecordBtn.classList.remove('recording');
            if (!transcript) {
                providerStatus.textContent = '';
            }
        } else {
            patientRecordBtn.innerHTML = `
                <svg class="btn-icon mic-icon" viewBox="0 0 24 24">
                    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5z"/>
                    <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                </svg>
                Start Recording
            `;
            patientRecordBtn.classList.remove('recording');
            if (!transcript) {
                patientStatus.textContent = '';
            }
        }

        isRecording = false;
    }

    // Translate text
    function translateText() {
        if (!transcript) return;

        const sourceLang = currentSpeaker === 'provider' ? providerLanguage.value : patientLanguage.value;
        const targetLang = currentSpeaker === 'provider' ? patientLanguage.value : providerLanguage.value;

        // Show loading indicator
        showStatus('Translating...');

        fetch('/translate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: transcript,
                source_lang: sourceLang,
                target_lang: targetLang
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Server responded with status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            translatedText = data.translated_text;

            // Update the appropriate box
            if (currentSpeaker === 'provider') {
                patientBox.textContent = translatedText;
                patientPlayBtn.classList.remove('hidden');
                patientStatus.textContent = '';
                providerStatus.textContent = '';
            } else {
                providerBox.textContent = translatedText;
                providerPlayBtn.classList.remove('hidden');
                providerStatus.textContent = '';
                patientStatus.textContent = '';
            }

            // Add to conversation history
            addToHistory(transcript, translatedText, currentSpeaker);

            // Generate speech
            generateSpeech(translatedText, targetLang);
        })
        .catch(error => {
            console.error('Translation error:', error);
            showError('Translation error. Please try again.');

            if (currentSpeaker === 'provider') {
                patientStatus.textContent = 'Translation failed';
                providerStatus.textContent = '';
            } else {
                providerStatus.textContent = 'Translation failed';
                patientStatus.textContent = '';
            }
        });
    }

    // Generate speech
    function generateSpeech(text, lang) {
        if (!text) return;

        showStatus('Generating audio...');

        fetch('/text-to-speech', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: text,
                lang: lang
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Server responded with status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            // Set the audio source
            audioPlayer.src = data.audio_url;

            // Clear status
            if (currentSpeaker === 'provider') {
                patientStatus.textContent = 'Audio ready';
            } else {
                providerStatus.textContent = 'Audio ready';
            }
        })
        .catch(error => {
            console.error('Text-to-speech error:', error);
            showError('Error generating audio. Please try again.');

            if (currentSpeaker === 'provider') {
                patientStatus.textContent = 'Audio generation failed';
            } else {
                providerStatus.textContent = 'Audio generation failed';
            }
        });
    }

    // Play audio
    function playAudio() {
        if (audioPlayer.src) {
            audioPlayer.play()
                .catch(error => {
                    console.error('Error playing audio:', error);
                    showError('Error playing audio. Please try again.');
                });
        }
    }

    // Add to conversation history
    function addToHistory(original, translated, speaker) {
        const entry = document.createElement('div');
        entry.className = 'history-entry';

        const speakerName = document.createElement('div');
        speakerName.className = 'history-speaker';
        speakerName.textContent = speaker === 'provider' ? 'Healthcare Provider:' : 'Patient:';

        const originalText = document.createElement('div');
        originalText.className = 'history-original';
        originalText.textContent = original;

        const translatedText = document.createElement('div');
        translatedText.className = 'history-translated';
        translatedText.textContent = translated;

        const timestamp = document.createElement('div');
        timestamp.className = 'history-timestamp';
        timestamp.textContent = new Date().toLocaleTimeString();

        entry.appendChild(speakerName);
        entry.appendChild(originalText);
        entry.appendChild(translatedText);
        entry.appendChild(timestamp);

        conversationHistory.appendChild(entry);

        // Scroll to bottom of history
        conversationHistory.scrollTop = conversationHistory.scrollHeight;

        // Save to local storage
        saveHistoryToLocalStorage();
    }

    // Save history to local storage
    function saveHistoryToLocalStorage() {
        const historyEntries = conversationHistory.querySelectorAll('.history-entry');
        const history = [];

        historyEntries.forEach(entry => {
            const speaker = entry.querySelector('.history-speaker').textContent.includes('Provider') ? 'provider' : 'patient';
            const original = entry.querySelector('.history-original').textContent;
            const translated = entry.querySelector('.history-translated').textContent;
            const timestamp = entry.querySelector('.history-timestamp').textContent;

            history.push({
                speaker,
                original,
                translated,
                timestamp
            });
        });

        localStorage.setItem('healthcareTranslatorHistory', JSON.stringify(history));
    }

    // Load history from local storage
    function loadHistoryFromLocalStorage() {
        const history = localStorage.getItem('healthcareTranslatorHistory');

        if (history) {
            try {
                const historyData = JSON.parse(history);

                historyData.forEach(item => {
                    const entry = document.createElement('div');
                    entry.className = 'history-entry';

                    const speakerName = document.createElement('div');
                    speakerName.className = 'history-speaker';
                    speakerName.textContent = item.speaker === 'provider' ? 'Healthcare Provider:' : 'Patient:';

                    const originalText = document.createElement('div');
                    originalText.className = 'history-original';
                    originalText.textContent = item.original;

                    const translatedText = document.createElement('div');
                    translatedText.className = 'history-translated';
                    translatedText.textContent = item.translated;

                    const timestamp = document.createElement('div');
                    timestamp.className = 'history-timestamp';
                    timestamp.textContent = item.timestamp;

                    entry.appendChild(speakerName);
                    entry.appendChild(originalText);
                    entry.appendChild(translatedText);
                    entry.appendChild(timestamp);

                    conversationHistory.appendChild(entry);
                });
            } catch (error) {
                console.error('Error loading history from local storage:', error);
            }
        }
    }

    // Clear history
    function clearHistory() {
        if (confirm('Are you sure you want to clear the conversation history?')) {
            conversationHistory.innerHTML = '';
            localStorage.removeItem('healthcareTranslatorHistory');
        }
    }

    // Export history
    function exportHistory() {
        const historyEntries = conversationHistory.querySelectorAll('.history-entry');
        let exportText = 'Healthcare Translation Conversation History\n';
        exportText += '=====================================\n\n';
        exportText += `Exported on: ${new Date().toLocaleString()}\n\n`;

        historyEntries.forEach(entry => {
            const speaker = entry.querySelector('.history-speaker').textContent;
            const original = entry.querySelector('.history-original').textContent;
            const translated = entry.querySelector('.history-translated').textContent;
            const timestamp = entry.querySelector('.history-timestamp').textContent;

            exportText += `[${timestamp}] ${speaker}\n`;
            exportText += `Original: ${original}\n`;
            exportText += `Translated: ${translated}\n\n`;
        });

        // Create a blob and download
        const blob = new Blob([exportText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `healthcare-translation-history-${new Date().toISOString().slice(0, 10)}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Switch speaker
    function switchSpeaker() {
        currentSpeaker = currentSpeaker === 'provider' ? 'patient' : 'provider';

        // Update UI
        if (currentSpeaker === 'provider') {
            providerBox.classList.add('active-speaker');
            patientBox.classList.remove('active-speaker');
        } else {
            patientBox.classList.add('active-speaker');
            providerBox.classList.remove('active-speaker');
        }

        // Clear boxes
        providerBox.textContent = '';
        patientBox.textContent = '';

        // Hide play buttons
        providerPlayBtn.classList.add('hidden');
        patientPlayBtn.classList.add('hidden');

        // Clear status
        providerStatus.textContent = '';
        patientStatus.textContent = '';

        // Reset transcript
        transcript = '';
        translatedText = '';
    }

    // Switch languages
    function switchLanguages() {
        const providerLang = providerLanguage.value;
        const patientLang = patientLanguage.value;

        providerLanguage.value = patientLang;
        patientLanguage.value = providerLang;
    }

    // Show error toast
    function showError(message) {
        errorMessage.textContent = message;
        errorToast.classList.add('active');

        // Auto-hide after 5 seconds
        setTimeout(() => {
            errorToast.classList.remove('active');
        }, 5000);
    }

    // Show status message
    function showStatus(message) {
        if (currentSpeaker === 'provider') {
            providerStatus.textContent = message;
        } else {
            patientStatus.textContent = message;
        }
    }

    // Check server health
    function checkServerHealth() {
        fetch('/health')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Server responded with status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (data.status === 'healthy') {
                    // Server is healthy
                    loadingOverlay.classList.add('hidden');
                } else {
                    throw new Error('Server is not healthy');
                }
            })
            .catch(error => {
                console.error('Server health check error:', error);
                showError('Unable to connect to the translation server. Please try again later.');
                loadingOverlay.classList.add('hidden');
            });
    }

    // Event listeners
    providerRecordBtn.addEventListener('click', function() {
        currentSpeaker = 'provider';
        toggleRecording();
    });

    patientRecordBtn.addEventListener('click', function() {
        currentSpeaker = 'patient';
        toggleRecording();
    });

    providerPlayBtn.addEventListener('click', playAudio);
    patientPlayBtn.addEventListener('click', playAudio);

    switchSpeakerBtn.addEventListener('click', switchSpeaker);
    switchLanguagesBtn.addEventListener('click', switchLanguages);

    clearHistoryBtn.addEventListener('click', clearHistory);
    exportHistoryBtn.addEventListener('click', exportHistory);

    privacyLink.addEventListener('click', function(e) {
        e.preventDefault();
        privacyModal.classList.add('active');
    });

    closePrivacyModal.addEventListener('click', function() {
        privacyModal.classList.remove('active');
    });

    dismissError.addEventListener('click', function() {
        errorToast.classList.remove('active');
    });

    // Close modal when clicking outside
    privacyModal.addEventListener('click', function(e) {
        if (e.target === privacyModal) {
            privacyModal.classList.remove('active');
        }
    });

    // Online/offline events
    window.addEventListener('online', function() {
        isOnline = true;
        updateConnectionStatus();
    });

    window.addEventListener('offline', function() {
        isOnline = false;
        updateConnectionStatus();
    });

    // Initialize
    function init() {
        // Check online status
        updateConnectionStatus();

        // Load history from local storage
        loadHistoryFromLocalStorage();

        // Check server health
        checkServerHealth();

        // Initialize speech recognition
        initSpeechRecognition();
    }

    init();
});