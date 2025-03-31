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
    const jargonTerms = document.getElementById('jargonTerms');
    const voiceAssistantBtn = document.getElementById('voiceAssistantBtn');
    const voiceAssistantModal = document.getElementById('voiceAssistantModal');
    const closeVoiceAssistantModal = document.getElementById('closeVoiceAssistantModal');
    const startVoiceAssistantBtn = document.getElementById('startVoiceAssistantBtn');
    const jargonContent = document.getElementById('jargonContent');
    const jargonPlaceholder = document.querySelector('.jargon-placeholder');
    const jargonLanguageSelect = document.getElementById('jargonLanguage');

    // State
    let isRecording = false;
    let recognition = null;
    let currentSpeaker = 'provider'; // 'provider' or 'patient'
    let transcript = '';
    let translatedText = '';
    let isOnline = navigator.onLine;
    let voiceAssistantActive = false;
    let voiceCommandRecognition = null;
    let medicalCategories = [];
    let lastProcessedText = '';
    let voiceCommandFeedbackTimeout = null;
    let continuousListeningMode = false;
    let isProcessingCommand = false;
    let currentJargonLanguage = 'en';
    let translatedJargonTerms = {};

    // Language mapping
    const LANGUAGES = {
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
        "ko": "Korean",
        "auto": "Auto Detect"
    };

    // Debug log to verify script is loading
    console.log('MedLingo script loaded');

    // Check if elements exist before using them
    function checkElements() {
        const elements = [
            providerBox, patientBox, providerRecordBtn, patientRecordBtn,
            providerPlayBtn, patientPlayBtn, providerLanguage, patientLanguage,
            switchSpeakerBtn, switchLanguagesBtn, conversationHistory, audioPlayer,
            clearHistoryBtn, exportHistoryBtn, privacyLink, privacyModal,
            closePrivacyModal, loadingOverlay, errorToast, errorMessage,
            dismissError, connectionStatus, providerSpeaking, patientSpeaking,
            providerStatus, patientStatus, jargonTerms, voiceAssistantBtn,
            voiceAssistantModal, closeVoiceAssistantModal, startVoiceAssistantBtn,
            jargonContent, jargonPlaceholder
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

                // Check for medical terms in real-time
                if ((transcript || interimTranscript) && (transcript || interimTranscript) !== lastProcessedText) {
                    lastProcessedText = transcript || interimTranscript;
                    checkForMedicalTerms(lastProcessedText);
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

    // Initialize voice assistant
    function initVoiceAssistant() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            voiceCommandRecognition = new SpeechRecognition();
            voiceCommandRecognition.continuous = true;
            voiceCommandRecognition.interimResults = false;

            voiceCommandRecognition.onresult = function(event) {
                if (isProcessingCommand) return;

                isProcessingCommand = true;
                const command = event.results[event.resultIndex][0].transcript.toLowerCase().trim();
                console.log('Voice command detected:', command);

                // Show visual feedback for command recognition
                showVoiceCommandFeedback(command);

                // Process command on server
                processVoiceCommand(command);
            };

            voiceCommandRecognition.onerror = function(event) {
                console.error('Voice assistant error', event.error);
                if (event.error !== 'no-speech') {
                    showError(`Voice assistant error: ${event.error}`);
                    stopVoiceAssistant();
                }
            };

            voiceCommandRecognition.onend = function() {
                isProcessingCommand = false;
                if (voiceAssistantActive) {
                    // Restart voice command recognition if still active
                    try {
                        voiceCommandRecognition.start();
                    } catch (error) {
                        console.error('Error restarting voice command recognition:', error);
                    }
                }
            };

            return true;
        } else {
            showError('Speech recognition is not supported in your browser. Please try Chrome, Edge, or Safari.');
            return false;
        }
    }

    // Process voice command
    function processVoiceCommand(command) {
        fetch('/process-voice-command', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                command: command
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Server responded with status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Command processed:', data);

            // Execute the command
            if (data.success) {
                switch (data.command) {
                    case 'translate':
                        startRecording();
                        break;
                    case 'stop':
                        stopRecording();
                        break;
                    case 'play':
                        playAudio();
                        break;
                    case 'switch_speaker':
                        switchSpeaker();
                        break;
                    case 'switch_language':
                        switchLanguages();
                        break;
                    case 'clear':
                        clearHistory();
                        break;
                    case 'help':
                        showVoiceCommandHelp();
                        break;
                    case 'translate_jargon':
                        translateJargon();
                        break;
                    case 'search_term':
                        promptSearchTerm();
                        break;
                    case 'continuous_mode':
                        toggleContinuousListening();
                        break;
                    case 'filter_category':
                        promptFilterCategory();
                        break;
                }
            }

            // Show response in status
            showStatus(data.response);
        })
        .catch(error => {
            console.error('Error processing voice command:', error);
            showError('Error processing voice command. Please try again.');
        });
    }

    // Prompt for search term via voice
    function promptSearchTerm() {
        showVoicePrompt('What medical term would you like to search for?', (term) => {
            if (term) {
                searchMedicalTerm(term);
            }
        });
    }

    // Prompt for category filter via voice
    function promptFilterCategory() {
        if (medicalCategories.length === 0) {
            showStatus('Loading medical categories...');
            loadMedicalCategories(() => {
                showCategoryPrompt();
            });
        } else {
            showCategoryPrompt();
        }
    }

    // Show category prompt
    function showCategoryPrompt() {
        const categoryOptions = medicalCategories.map(cat => `"${cat}"`).join(', ');
        showVoicePrompt(`Which category would you like to filter by? Options are: ${categoryOptions}`, (category) => {
            if (category && medicalCategories.includes(category.toLowerCase())) {
                fetchTermsByCategory(category.toLowerCase());
            } else {
                showStatus('Category not recognized. Please try again.');
            }
        });
    }

    // Show voice prompt
    function showVoicePrompt(question, callback) {
        // Create prompt modal
        const promptModal = document.createElement('div');
        promptModal.className = 'modal active';
        promptModal.id = 'voicePromptModal';

        promptModal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Voice Assistant</h2>
                    <button class="close-modal" id="closePromptModal">&times;</button>
                </div>
                <div class="modal-body">
                    <p>${question}</p>
                    <div class="voice-prompt-status">Listening...</div>
                    <div class="voice-prompt-result"></div>
                </div>
            </div>
        `;

        document.body.appendChild(promptModal);

        // Add close button event listener
        document.getElementById('closePromptModal').addEventListener('click', () => {
            document.body.removeChild(promptModal);
            callback(null);
        });

        // Start listening for response
        const promptRecognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        promptRecognition.lang = 'en-US';
        promptRecognition.interimResults = true;

        promptRecognition.onresult = function(event) {
            const resultDiv = promptModal.querySelector('.voice-prompt-result');
            const result = event.results[0][0].transcript;
            resultDiv.textContent = result;

            if (event.results[0].isFinal) {
                promptModal.querySelector('.voice-prompt-status').textContent = 'Got it!';
                setTimeout(() => {
                    document.body.removeChild(promptModal);
                    callback(result.toLowerCase());
                }, 1000);
            }
        };

        promptRecognition.onerror = function(event) {
            promptModal.querySelector('.voice-prompt-status').textContent = 'Error: ' + event.error;
            setTimeout(() => {
                document.body.removeChild(promptModal);
                callback(null);
            }, 2000);
        };

        promptRecognition.start();
    }

    // Translate medical jargon
    function translateJargon() {
        // Get the target language from the patient language selector
        const targetLang = patientLanguage.value;

        if (targetLang === 'en') {
            showStatus('Medical terms are already in English.');
            return;
        }

        // Get all displayed medical terms
        const termElements = document.querySelectorAll('.jargon-term');
        if (termElements.length === 0) {
            showStatus('No medical terms to translate.');
            return;
        }

        showStatus('Translating medical terms...');

        // For each term, translate it and its definition
        let translationPromises = [];

        termElements.forEach(termElement => {
            const termTitle = termElement.querySelector('.jargon-term-title').textContent;
            const termDefinition = termElement.querySelector('.jargon-term-definition').textContent;

            const promise = fetch('/translate-medical-term', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    term: termTitle,
                    definition: termDefinition,
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
                // Store the translated term for later use
                if (!translatedJargonTerms[targetLang]) {
                    translatedJargonTerms[targetLang] = {};
                }
                translatedJargonTerms[targetLang][termTitle] = {
                    term: data.translated_term,
                    definition: data.translated_definition
                };

                return data;
            });

            translationPromises.push(promise);
        });

        // When all translations are done, update the UI
        Promise.all(translationPromises)
            .then(() => {
                updateJargonLanguage(targetLang);
                showStatus(`Medical terms translated to ${LANGUAGES[targetLang]}.`);
            })
            .catch(error => {
                console.error('Error translating medical terms:', error);
                showError('Error translating medical terms. Please try again.');
            });
    }

    // Update jargon language display
    function updateJargonLanguage(lang) {
        currentJargonLanguage = lang;

        // Update the language selector if it exists
        if (jargonLanguageSelect) {
            jargonLanguageSelect.value = lang;
        }

        // Update all term displays
        const termElements = document.querySelectorAll('.jargon-term');

        termElements.forEach(termElement => {
            const termTitle = termElement.querySelector('.jargon-term-title');
            const termDefinition = termElement.querySelector('.jargon-term-definition');
            const originalTerm = termTitle.getAttribute('data-original') || termTitle.textContent;

            // If we have translations for this language and term
            if (lang !== 'en' && translatedJargonTerms[lang] && translatedJargonTerms[lang][originalTerm]) {
                termTitle.textContent = translatedJargonTerms[lang][originalTerm].term;
                termDefinition.textContent = translatedJargonTerms[lang][originalTerm].definition;
            } else {
                // Revert to English
                termTitle.textContent = originalTerm;
                const originalDef = termElement.querySelector('.jargon-term-definition').getAttribute('data-original');
                if (originalDef) {
                    termDefinition.textContent = originalDef;
                }
            }
        });
    }

    // Show voice command feedback
    function showVoiceCommandFeedback(command) {
        // Create or update feedback element
        let feedbackEl = document.getElementById('voiceCommandFeedback');
        if (!feedbackEl) {
            feedbackEl = document.createElement('div');
            feedbackEl.id = 'voiceCommandFeedback';
            feedbackEl.className = 'voice-command-feedback';
            document.body.appendChild(feedbackEl);
        }

        // Show the command
        feedbackEl.textContent = `"${command}"`;
        feedbackEl.classList.add('active');

        // Clear previous timeout
        if (voiceCommandFeedbackTimeout) {
            clearTimeout(voiceCommandFeedbackTimeout);
        }

        // Hide after 3 seconds
        voiceCommandFeedbackTimeout = setTimeout(() => {
            feedbackEl.classList.remove('active');
        }, 3000);
    }

    // Show voice command help
    function showVoiceCommandHelp() {
        const helpModal = document.createElement('div');
        helpModal.className = 'modal active';
        helpModal.id = 'voiceCommandHelpModal';

        helpModal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Voice Assistant Commands</h2>
                    <button class="close-modal" id="closeHelpModal">&times;</button>
                </div>
                <div class="modal-body">
                    <p>You can use the following voice commands:</p>
                    <ul>
                        <li><strong>"Translate"</strong> - Start recording for translation</li>
                        <li><strong>"Stop"</strong> - Stop recording</li>
                        <li><strong>"Play"</strong> - Play the translated audio</li>
                        <li><strong>"Switch speaker"</strong> - Switch between provider and patient</li>
                        <li><strong>"Switch language"</strong> - Swap the selected languages</li>
                        <li><strong>"Clear"</strong> - Clear the conversation history</li>
                        <li><strong>"Help"</strong> - Show this help dialog</li>
                        <li><strong>"Translate jargon"</strong> - Translate medical terms to patient language</li>
                        <li><strong>"Search term"</strong> - Search for a specific medical term</li>
                        <li><strong>"Continuous mode"</strong> - Toggle continuous listening mode</li>
                        <li><strong>"Filter category"</strong> - Filter medical terms by category</li>
                    </ul>
                </div>
            </div>
        `;

        document.body.appendChild(helpModal);

        // Add close button event listener
        document.getElementById('closeHelpModal').addEventListener('click', () => {
            document.body.removeChild(helpModal);
        });

        // Close when clicking outside
        helpModal.addEventListener('click', (e) => {
            if (e.target === helpModal) {
                document.body.removeChild(helpModal);
            }
        });
    }

    // Start voice assistant
    function startVoiceAssistant() {
        if (!voiceCommandRecognition && !initVoiceAssistant()) {
            return;
        }

        try {
            voiceCommandRecognition.start();
            voiceAssistantActive = true;
            voiceAssistantModal.classList.remove('active');
            showStatus('Voice assistant activated. Try saying "Help" for a list of commands.');

            // Update button text
            voiceAssistantBtn.innerHTML = `
                <svg class="btn-icon mic-icon" viewBox="0 0 24 24">
                    <path d="M12 15c1.66 0 2.99-1.34 2.99-3L15 6c0-1.66-1.34-3-3-3S9 4.34 9 6v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 15 6.7 12H5c0 3.42 2.72 6.23 6 6.72V22h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
                </svg>
                Voice Assistant: ON
            `;
            voiceAssistantBtn.classList.add('recording');

            // Add visual indicator for voice assistant
            addVoiceAssistantIndicator();
        } catch (error) {
            console.error('Error starting voice assistant:', error);
            showError('Error starting voice assistant. Please refresh the page and try again.');
        }
    }

    // Add voice assistant visual indicator
    function addVoiceAssistantIndicator() {
        let indicator = document.getElementById('voiceAssistantIndicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'voiceAssistantIndicator';
            indicator.className = 'voice-assistant-indicator';
            indicator.innerHTML = `
                <div class="voice-indicator-dot"></div>
                <div class="voice-indicator-dot"></div>
                <div class="voice-indicator-dot"></div>
            `;
            document.body.appendChild(indicator);
        }
        indicator.classList.add('active');
    }

    // Remove voice assistant visual indicator
    function removeVoiceAssistantIndicator() {
        const indicator = document.getElementById('voiceAssistantIndicator');
        if (indicator) {
            indicator.classList.remove('active');
        }
    }

    // Stop voice assistant
    function stopVoiceAssistant() {
        if (voiceCommandRecognition) {
            try {
                voiceCommandRecognition.stop();
            } catch (error) {
                console.error('Error stopping voice assistant:', error);
            }
        }

        voiceAssistantActive = false;

        // Update button text
        voiceAssistantBtn.innerHTML = `
            <svg class="btn-icon mic-icon" viewBox="0 0 24 24">
                <path d="M12 15c1.66 0 2.99-1.34 2.99-3L15 6c0-1.66-1.34-3-3-3S9 4.34 9 6v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 15 6.7 12H5c0 3.42 2.72 6.23 6 6.72V22h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
            </svg>
            Voice Assistant Mode
        `;
        voiceAssistantBtn.classList.remove('recording');

        // Remove visual indicator
        removeVoiceAssistantIndicator();
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

        // Clear jargon terms
        jargonTerms.innerHTML = '';
        if (jargonPlaceholder) {
            jargonPlaceholder.style.display = 'block';
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

        // If in continuous listening mode and we have a transcript, translate automatically
        if (continuousListeningMode && transcript) {
            translateText();
        }
    }

    // Check for medical terms in real-time
    function checkForMedicalTerms(text) {
        if (!text || text.trim().length < 3) return;

        fetch('/simplify-medical-terms', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: text
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Server responded with status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.medical_terms && Object.keys(data.medical_terms).length > 0) {
                displayMedicalTerms(data.medical_terms);
            }
        })
        .catch(error => {
            console.error('Error checking for medical terms:', error);
        });
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

            // Display medical terms if any
            if (data.medical_terms && Object.keys(data.medical_terms).length > 0) {
                displayMedicalTerms(data.medical_terms);
            }

            // Generate speech
            generateSpeech(translatedText, targetLang);

            // If in continuous listening mode, start recording again after a short delay
            if (continuousListeningMode) {
                setTimeout(() => {
                    if (!isRecording) {
                        startRecording();
                    }
                }, 2000);
            }
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

    // Display medical terms
    function displayMedicalTerms(terms) {
        jargonTerms.innerHTML = '';

        if (Object.keys(terms).length === 0) {
            if (jargonPlaceholder) {
                jargonPlaceholder.style.display = 'block';
            }
            return;
        }

        // Hide placeholder if we have terms
        if (jargonPlaceholder) {
            jargonPlaceholder.style.display = 'none';
        }

        // Group terms by category
        const categorizedTerms = {};
        Object.entries(terms).forEach(([term, info]) => {
            const category = info.category || 'general';
            if (!categorizedTerms[category]) {
                categorizedTerms[category] = [];
            }
            categorizedTerms[category].push({ term, info });
        });

        // Create category sections
        Object.entries(categorizedTerms).forEach(([category, termsList]) => {
            // Create category header
            const categoryHeader = document.createElement('div');
            categoryHeader.className = 'jargon-category';
            categoryHeader.textContent = category.charAt(0).toUpperCase() + category.slice(1);
            jargonTerms.appendChild(categoryHeader);

            // Create terms for this category
            termsList.forEach(({ term, info }) => {
                const termElement = document.createElement('div');
                termElement.className = 'jargon-term';

                const titleElement = document.createElement('div');
                titleElement.className = 'jargon-term-title';
                titleElement.textContent = term;
                titleElement.setAttribute('data-original', term);

                const definitionElement = document.createElement('div');
                definitionElement.className = 'jargon-term-definition';
                definitionElement.textContent = info.definition;
                definitionElement.setAttribute('data-original', info.definition);

                // Add pronunciation if available
                if (info.pronunciation) {
                    const pronunciationElement = document.createElement('div');
                    pronunciationElement.className = 'jargon-term-pronunciation';
                    pronunciationElement.textContent = `Pronunciation: ${info.pronunciation}`;

                    // Add pronunciation audio button
                    const pronounceButton = document.createElement('button');
                    pronounceButton.className = 'pronounce-btn';
                    pronounceButton.innerHTML = `
                        <svg class="btn-icon" viewBox="0 0 24 24">
                            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
                        </svg>
                    `;
                    pronounceButton.addEventListener('click', () => {
                        speakText(term);
                    });

                    pronunciationElement.appendChild(pronounceButton);
                    termElement.appendChild(pronunciationElement);
                }

                termElement.appendChild(titleElement);
                termElement.appendChild(definitionElement);
                jargonTerms.appendChild(termElement);
            });
        });

        // Add search box for medical terms
        addMedicalTermSearch();

        // Add language selector for jargon
        addJargonLanguageSelector();
    }

    // Add jargon language selector
    function addJargonLanguageSelector() {
        // Check if selector already exists
        if (document.getElementById('jargonLanguage')) {
            return;
        }

        const langContainer = document.createElement('div');
        langContainer.className = 'jargon-language-selector';

        const langLabel = document.createElement('label');
        langLabel.htmlFor = 'jargonLanguage';
        langLabel.textContent = 'Medical terms language:';

        const langSelect = document.createElement('select');
        langSelect.id = 'jargonLanguage';

        // Add language options
        Object.entries(LANGUAGES).forEach(([code, name]) => {
            if (code !== 'auto') {
                const option = document.createElement('option');
                option.value = code;
                option.textContent = name;
                if (code === currentJargonLanguage) {
                    option.selected = true;
                }
                langSelect.appendChild(option);
            }
        });

        // Add change event
        langSelect.addEventListener('change', () => {
            const selectedLang = langSelect.value;
            if (selectedLang === currentJargonLanguage) {
                return;
            }

            if (selectedLang === 'en') {
                // Just switch back to English
                updateJargonLanguage('en');
            } else {
                // Translate to the selected language
                currentJargonLanguage = selectedLang;
                translateJargon();
            }
        });

        langContainer.appendChild(langLabel);
        langContainer.appendChild(langSelect);

        // Add to jargon content
        const searchContainer = document.querySelector('.medical-term-search');
        if (searchContainer) {
            jargonContent.insertBefore(langContainer, searchContainer.nextSibling);
        } else {
            jargonContent.insertBefore(langContainer, jargonContent.firstChild);
        }
    }

    // Add medical term search
    function addMedicalTermSearch() {
        // Check if search already exists
        if (document.getElementById('medicalTermSearch')) {
            return;
        }

        const searchContainer = document.createElement('div');
        searchContainer.className = 'medical-term-search';

        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.id = 'medicalTermSearch';
        searchInput.placeholder = 'Search for medical terms...';

        const searchButton = document.createElement('button');
        searchButton.className = 'search-btn';
        searchButton.innerHTML = `
            <svg class="btn-icon" viewBox="0 0 24 24">
                <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
        `;

        searchButton.addEventListener('click', () => {
            searchMedicalTerm(searchInput.value);
        });

        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                searchMedicalTerm(searchInput.value);
            }
        });

        searchContainer.appendChild(searchInput);
        searchContainer.appendChild(searchButton);

        // Insert at the top of jargon content
        jargonContent.insertBefore(searchContainer, jargonContent.firstChild);
    }

    // Search for medical term
    function searchMedicalTerm(term) {
        if (!term || term.trim().length < 2) {
            showError('Please enter at least 2 characters to search.');
            return;
        }

        fetch('/search-medical-term', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                term: term.trim()
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Server responded with status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.results && Object.keys(data.results).length > 0) {
                displayMedicalTerms(data.results);
            } else {
                // Show no results message
                jargonTerms.innerHTML = `
                    <div class="no-results">
                        <p>No medical terms found for "${term}".</p>
                        <p>Try another search term or check your spelling.</p>
                    </div>
                `;
                if (jargonPlaceholder) {
                    jargonPlaceholder.style.display = 'none';
                }
            }
        })
        .catch(error => {
            console.error('Error searching for medical term:', error);
            showError('Error searching for medical term. Please try again.');
        });
    }

    // Speak text (for pronunciation)
    function speakText(text) {
        if (!text) return;

        // Use browser's speech synthesis
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'en-US'; // Default to English for medical terms
            utterance.rate = 0.8; // Slightly slower for clarity
            window.speechSynthesis.speak(utterance);
        } else {
            showError('Text-to-speech is not supported in your browser.');
        }
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

            // Auto-play if in continuous mode
            if (continuousListeningMode) {
                playAudio();
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
        speakerName.textContent = speaker === 'provider' ? 'Healthcare Provider' : 'Patient';

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

        localStorage.setItem('medLingoHistory', JSON.stringify(history));
    }

    // Load history from local storage
    function loadHistoryFromLocalStorage() {
        // First try with new app name
        let history = localStorage.getItem('medLingoHistory');

        // If not found, try with old app name for backward compatibility
        if (!history) {
            history = localStorage.getItem('mediBridgeHistory');
            // If found with old name, save with new name for future
            if (history) {
                localStorage.setItem('medLingoHistory', history);
            }
        }

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
            localStorage.removeItem('medLingoHistory');
            localStorage.removeItem('mediBridgeHistory'); // Clear old history too
        }
    }

    // Export history
    function exportHistory() {
        const historyEntries = conversationHistory.querySelectorAll('.history-entry');

        if (historyEntries.length === 0) {
            showError('No conversation history to export.');
            return;
        }

        let exportText = 'MedLingo Translation Conversation History\n';
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
        a.download = `medlingo-translation-history-${new Date().toISOString().slice(0, 10)}.txt`;
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

        // Show notification
        showStatus(`Switched to ${currentSpeaker === 'provider' ? 'Healthcare Provider' : 'Patient'} mode`);
    }

    // Switch languages
    function switchLanguages() {
        const providerLang = providerLanguage.value;
        const patientLang = patientLanguage.value;

        providerLanguage.value = patientLang;
        patientLanguage.value = providerLang;

        showStatus(`Languages switched: Provider ${LANGUAGES[patientLang]}, Patient ${LANGUAGES[providerLang]}`);
    }

    // Toggle continuous listening mode
    function toggleContinuousListening() {
        continuousListeningMode = !continuousListeningMode;

        // Update UI
        const continuousBtn = document.getElementById('continuousListeningBtn');
        if (continuousBtn) {
            if (continuousListeningMode) {
                continuousBtn.classList.add('active');
                continuousBtn.innerHTML = `
                    <svg class="btn-icon" viewBox="0 0 24 24">
                        <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
                    </svg>
                    Continuous Mode: ON
                `;
            } else {
                continuousBtn.classList.remove('active');
                continuousBtn.innerHTML = `
                    <svg class="btn-icon" viewBox="0 0 24 24">
                        <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
                    </svg>
                    Continuous Mode
                `;
            }
        }

        showStatus(`Continuous listening mode ${continuousListeningMode ? 'enabled' : 'disabled'}`);
    }

    // Get language name from code
    function getLanguageName(code) {
        return LANGUAGES[code] || code;
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

        // Also show in a toast for important messages
        if (message.includes('activated') || message.includes('enabled') || message.includes('disabled') || message.includes('switched')) {
            const statusToast = document.createElement('div');
            statusToast.className = 'status-toast';
            statusToast.textContent = message;
            document.body.appendChild(statusToast);

            // Show the toast
            setTimeout(() => {
                statusToast.classList.add('active');
            }, 100);

            // Remove after 3 seconds
            setTimeout(() => {
                statusToast.classList.remove('active');
                setTimeout(() => {
                    document.body.removeChild(statusToast);
                }, 300);
            }, 3000);
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

                    // Load medical categories
                    loadMedicalCategories();
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

    // Load medical categories
    function loadMedicalCategories(callback) {
        fetch('/get-medical-categories')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Server responded with status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (data.categories && data.categories.length > 0) {
                    medicalCategories = data.categories;

                    // Add category filter to jargon section
                    addCategoryFilter();

                    if (callback && typeof callback === 'function') {
                        callback();
                    }
                }
            })
            .catch(error => {
                console.error('Error loading medical categories:', error);
                if (callback && typeof callback === 'function') {
                    callback(error);
                }
            });
    }

    // Add category filter
    function addCategoryFilter() {
        // Check if filter already exists
        if (document.getElementById('categoryFilter')) {
            return;
        }

        const filterContainer = document.createElement('div');
        filterContainer.className = 'category-filter';

        const filterLabel = document.createElement('label');
        filterLabel.htmlFor = 'categoryFilter';
        filterLabel.textContent = 'Filter by category:';

        const filterSelect = document.createElement('select');
        filterSelect.id = 'categoryFilter';

        // Add "All" option
        const allOption = document.createElement('option');
        allOption.value = 'all';
        allOption.textContent = 'All Categories';
        filterSelect.appendChild(allOption);

        // Add category options
        medicalCategories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category.charAt(0).toUpperCase() + category.slice(1);
            filterSelect.appendChild(option);
        });

        // Add change event
        filterSelect.addEventListener('change', () => {
            const selectedCategory = filterSelect.value;
            if (selectedCategory === 'all') {
                // Show all terms
                const terms = document.querySelectorAll('.jargon-term');
                const categories = document.querySelectorAll('.jargon-category');

                terms.forEach(term => {
                    term.style.display = 'block';
                });

                categories.forEach(category => {
                    category.style.display = 'block';
                });
            } else {
                // Filter by category
                fetchTermsByCategory(selectedCategory);
            }
        });

        filterContainer.appendChild(filterLabel);
        filterContainer.appendChild(filterSelect);

        // Add to jargon content
        const searchContainer = document.querySelector('.medical-term-search');
        if (searchContainer) {
            jargonContent.insertBefore(filterContainer, searchContainer.nextSibling);
        } else {
            jargonContent.insertBefore(filterContainer, jargonContent.firstChild);
        }
    }

    // Fetch terms by category
    function fetchTermsByCategory(category) {
        fetch('/get-terms-by-category', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                category: category
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Server responded with status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.terms && Object.keys(data.terms).length > 0) {
                displayMedicalTerms(data.terms);
            } else {
                jargonTerms.innerHTML = `
                    <div class="no-results">
                        <p>No medical terms found in the "${category}" category.</p>
                    </div>
                `;
                if (jargonPlaceholder) {
                    jargonPlaceholder.style.display = 'none';
                }
            }
        })
        .catch(error => {
            console.error('Error fetching terms by category:', error);
            showError('Error fetching medical terms. Please try again.');
        });
    }

    // Add continuous listening button
    function addContinuousListeningButton() {
        const controlsSection = document.querySelector('.controls-section');
        if (!controlsSection || document.getElementById('continuousListeningBtn')) {
            return;
        }

        const continuousBtn = document.createElement('button');
        continuousBtn.id = 'continuousListeningBtn';
        continuousBtn.className = 'continuous-btn';
        continuousBtn.innerHTML = `
            <svg class="btn-icon" viewBox="0 0 24 24">
                <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
            </svg>
            Continuous Mode
        `;

        continuousBtn.addEventListener('click', toggleContinuousListening);

        // Add after voice assistant button
        const voiceAssistantBtn = document.getElementById('voiceAssistantBtn');
        if (voiceAssistantBtn) {
            voiceAssistantBtn.after(continuousBtn);
        } else {
            controlsSection.appendChild(continuousBtn);
        }
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

    voiceAssistantBtn.addEventListener('click', function() {
        if (voiceAssistantActive) {
            stopVoiceAssistant();
        } else {
            voiceAssistantModal.classList.add('active');
        }
    });

    closeVoiceAssistantModal.addEventListener('click', function() {
        voiceAssistantModal.classList.remove('active');
    });

    startVoiceAssistantBtn.addEventListener('click', startVoiceAssistant);

    // Close modal when clicking outside
    privacyModal.addEventListener('click', function(e) {
        if (e.target === privacyModal) {
            privacyModal.classList.remove('active');
        }
    });

    voiceAssistantModal.addEventListener('click', function(e) {
        if (e.target === voiceAssistantModal) {
            voiceAssistantModal.classList.remove('active');
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

        // Add continuous listening button
        addContinuousListeningButton();
    }

    init();
});