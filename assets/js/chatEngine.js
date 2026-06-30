const GEMINI_API_KEY = ''; // Removed to pass GitHub secret scanning. Use backend API instead.

document.addEventListener('DOMContentLoaded', () => {
    const chatHistory = document.getElementById('chat-history');
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const voiceBtn = document.getElementById('voice-btn');
    const attachBtn = document.getElementById('attach-btn');
    const fileUpload = document.getElementById('file-upload');
    const attachmentsContainer = document.getElementById('attachments-container');
    const quickReplies = document.querySelectorAll('.quick-reply-btn');
    const ttsMuteBtn = document.getElementById('tts-mute-btn');
    const quickChatToggle = document.getElementById('quick-chat-toggle');
    const chatInputArea = document.getElementById('chat-input-area');

    // Auto-expand quick chat on desktop by default, ensure collapsed on mobile
    if (chatInputArea) {
        if (window.innerWidth > 768) {
            chatInputArea.classList.add('expanded');
        } else {
            chatInputArea.classList.remove('expanded');
        }
    }

    // Enable horizontal scrolling for quick replies using mouse wheel on desktop
    const quickRepliesContainer = document.querySelector('.quick-replies');
    if (quickRepliesContainer) {
        quickRepliesContainer.addEventListener('wheel', (evt) => {
            // On a MacBook trackpad, a horizontal swipe often contains a tiny accidental vertical (deltaY) movement.
            // If we intercept every non-zero deltaY, we block the native smooth horizontal trackpad scroll.
            // Therefore, we only map vertical scrolling to horizontal scrolling if the user is primarily scrolling vertically.
            if (Math.abs(evt.deltaY) > Math.abs(evt.deltaX)) {
                evt.preventDefault();
                quickRepliesContainer.scrollLeft += evt.deltaY;
            }
        }, { passive: false });

        // Add drag-to-scroll functionality with click prevention
        let isDown = false;
        let isDragging = false;
        let startX;
        let scrollLeft;

        quickRepliesContainer.addEventListener('mousedown', (e) => {
            isDown = true;
            isDragging = false;
            startX = e.pageX - quickRepliesContainer.offsetLeft;
            scrollLeft = quickRepliesContainer.scrollLeft;
        });
        
        quickRepliesContainer.addEventListener('mouseleave', () => {
            isDown = false;
            if (isDragging) {
                quickRepliesContainer.classList.remove('dragging');
                quickRepliesContainer.style.scrollBehavior = 'smooth';
            }
        });
        
        quickRepliesContainer.addEventListener('mouseup', () => {
            isDown = false;
            if (isDragging) {
                setTimeout(() => {
                    isDragging = false;
                    quickRepliesContainer.classList.remove('dragging');
                    quickRepliesContainer.style.scrollBehavior = 'smooth';
                }, 0);
            }
        });
        
        quickRepliesContainer.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - quickRepliesContainer.offsetLeft;
            const walk = (x - startX) * 2; // Scroll speed multiplier
            
            // Only trigger dragging state if moved more than 5 pixels
            if (Math.abs(walk) > 5) {
                isDragging = true;
                quickRepliesContainer.classList.add('dragging');
                quickRepliesContainer.style.scrollBehavior = 'auto'; // Disable smooth scroll while dragging
            }
            
            if (isDragging) {
                quickRepliesContainer.scrollLeft = scrollLeft - walk;
            }
        });

        // Intercept clicks if a drag occurred
        quickRepliesContainer.addEventListener('click', (e) => {
            if (isDragging) {
                e.preventDefault();
                e.stopPropagation();
            }
        }, true); // Capture phase
    }

    // Use simple click listener for maximum reliability
    if (quickChatToggle) {
        quickChatToggle.addEventListener('click', function(e) {
            e.preventDefault();
            const inputArea = document.getElementById('chat-input-area');
            if (inputArea) {
                inputArea.classList.toggle('expanded');
            }
        });
    }

    // To maintain conversation context across API calls
    let conversationHistory = [];
    let currentOptionsContainer = null;
    let pendingFilesData = [];
    let isTTSMuted = false;

    // --- Hero Title Slider ---
    const heroTitle = document.querySelector('.hero-welcome-text');
    if (heroTitle) {
        const titles = [
            "AI-Driven UX Leader",
            "Principal Product Architect",
            "Enterprise Design Strategist"
        ];
        let titleIdx = 0;
        heroTitle.style.transition = 'opacity 0.5s ease-in-out';
        
        setInterval(() => {
            heroTitle.style.opacity = 0; // Fade out
            setTimeout(() => {
                titleIdx = (titleIdx + 1) % titles.length;
                heroTitle.textContent = titles[titleIdx];
                heroTitle.style.opacity = 1; // Fade in
            }, 500);
        }, 3000); // Change every 3 seconds
    }

    // --- Animated Placeholder ---
    const keywords = [
        "Case Studies...",
        "Education...",
        "Professional Journey..."
    ];
    let phraseIdx = 0;
    let charIdx = 0;
    let isDeletingPlaceholder = false;
    let typingTimer;

    function animatePlaceholder() {
        if (!chatInput) return;
        const currentPrefix = window.innerWidth <= 768 ? "" : "Ask me about Nitin's ";
        const currentKeyword = keywords[phraseIdx];
        
        if (isDeletingPlaceholder) {
            chatInput.placeholder = currentPrefix + currentKeyword.substring(0, charIdx - 1);
            charIdx--;
        } else {
            chatInput.placeholder = currentPrefix + currentKeyword.substring(0, charIdx + 1) + "|";
            charIdx++;
        }

        let speed = isDeletingPlaceholder ? 40 : 80;

        if (!isDeletingPlaceholder && charIdx === currentKeyword.length) {
            speed = 2000; // Pause when word is fully typed
            isDeletingPlaceholder = true;
            chatInput.placeholder = currentPrefix + currentKeyword; // Remove cursor
        } else if (isDeletingPlaceholder && charIdx === 0) {
            isDeletingPlaceholder = false;
            phraseIdx = (phraseIdx + 1) % keywords.length;
            speed = 500; // Pause before typing next word
        }

        typingTimer = setTimeout(animatePlaceholder, speed);
    }

    if (chatInput) {
        chatInput.placeholder = "";
        setTimeout(animatePlaceholder, 1500);
        
        // Stop animation when user focuses input
        chatInput.addEventListener('focus', () => {
            clearTimeout(typingTimer);
            chatInput.placeholder = "Type your message...";
        });
        
        // Resume animation if input is empty on blur
        chatInput.addEventListener('blur', () => {
            if (chatInput.value.trim() === '') {
                isDeletingPlaceholder = false;
                charIdx = 0;
                phraseIdx = 0;
                animatePlaceholder();
            }
        });
    }

    // --- File Upload Logic ---
    const closeWarningBtn = document.getElementById('close-warning-btn');
    if (closeWarningBtn) {
        closeWarningBtn.addEventListener('click', () => {
            const modal = document.getElementById('file-warning-modal');
            if (modal) modal.style.display = 'none';
        });
    }
    if(attachBtn && fileUpload) {
        attachBtn.addEventListener('click', () => {
            fileUpload.click();
        });

        fileUpload.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            // Validation for PDF/DOC/DOCX
            const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
            const fileExtension = file.name.split('.').pop().toLowerCase();
            const validExtensions = ['pdf', 'doc', 'docx'];
            
            if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtension)) {
                const modal = document.getElementById('file-warning-modal');
                if (modal) modal.style.display = 'flex';
                fileUpload.value = '';
                return;
            }

            // Check if file already added (by name)
            if (pendingFilesData.find(f => f.name === file.name)) {
                fileUpload.value = '';
                return;
            }

            const reader = new FileReader();
            reader.onload = (event) => {
                const base64String = event.target.result.split(',')[1];
                const fileObj = {
                    name: file.name,
                    inline_data: {
                        mime_type: file.type || 'application/pdf',
                        data: base64String
                    }
                };
                pendingFilesData.push(fileObj);
                if (typeof toggleSendBtn === 'function') toggleSendBtn();
                
                const chip = document.createElement('div');
                chip.className = 'attachment-indicator';
                chip.innerHTML = `
                    <span>${file.name}</span>
                    <button class="remove-attachment-btn" aria-label="Remove Attachment">×</button>
                `;
                
                chip.querySelector('.remove-attachment-btn').addEventListener('click', () => {
                    pendingFilesData = pendingFilesData.filter(f => f.name !== file.name);
                    chip.remove();
                    if (pendingFilesData.length === 0 && attachmentsContainer) {
                        attachmentsContainer.innerHTML = '';
                    }
                    if (typeof toggleSendBtn === 'function') toggleSendBtn();
                    const quickReplies = document.querySelector('.quick-replies');
                    if (quickReplies) quickReplies.style.display = '';
                });
                
                if (attachmentsContainer) {
                    attachmentsContainer.appendChild(chip);
                }
                
                const quickReplies = document.querySelector('.quick-replies');
                if (quickReplies) quickReplies.style.display = 'none';
                
                fileUpload.value = ''; // Reset for next upload
            };
            reader.readAsDataURL(file);
        });
    }
    // -------------------------

    // --- Voice Assistance Logic ---
    let recognition = null;
    let isRecording = false;

    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => {
            isRecording = true;
            voiceBtn.classList.add('recording');
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            chatInput.value = transcript;
            processInput(transcript);
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error', event.error);
            isRecording = false;
            voiceBtn.classList.remove('recording');
            if (event.error === 'not-allowed') {
                appendMessage('agent', '🎙️ Microphone access was denied. Please allow microphone permissions in your browser settings and try again.');
            } else if (event.error === 'no-speech') {
                // Silently ignore — user just didn't speak
            } else if (event.error === 'network') {
                appendMessage('agent', '🎙️ Voice recognition needs a stable internet connection. Please check your network and try again.');
            } else {
                console.warn(`Voice input error: ${event.error}`);
            }
        };

        recognition.onend = () => {
            isRecording = false;
            voiceBtn.classList.remove('recording');
        };

        voiceBtn.addEventListener('click', () => {
            if (isRecording) {
                recognition.stop();
            } else {
                recognition.start();
            }
        });
    } else {
        if(voiceBtn) voiceBtn.style.display = 'none'; // Hide if not supported
    }

    let textBeingSpoken = "";
    let lastCharIndex = 0;

    if (ttsMuteBtn) {
        ttsMuteBtn.addEventListener('click', () => {
            isTTSMuted = !isTTSMuted;
            const iconUnmuted = ttsMuteBtn.querySelector('.icon-unmuted');
            const iconMuted = ttsMuteBtn.querySelector('.icon-muted');
            
            if (isTTSMuted) {
                if (iconUnmuted) iconUnmuted.style.display = 'none';
                if (iconMuted) iconMuted.style.display = 'block';
                ttsMuteBtn.classList.remove('is-speaking');
                
                // Save remaining text and cancel current speech
                if (textBeingSpoken) {
                    textBeingSpoken = textBeingSpoken.substring(lastCharIndex);
                }
                if ('speechSynthesis' in window) {
                    window.speechSynthesis.cancel(); 
                }
                // Pause premium OpenAI TTS
                if (typeof currentAudioObj !== 'undefined' && currentAudioObj) {
                    currentAudioObj.pause();
                }
            } else {
                if (iconUnmuted) iconUnmuted.style.display = 'block';
                if (iconMuted) iconMuted.style.display = 'none';
                
                // Resume premium OpenAI TTS if it was paused and not finished
                if (typeof currentAudioObj !== 'undefined' && currentAudioObj && currentAudioObj.paused && currentAudioObj.currentTime < currentAudioObj.duration) {
                    currentAudioObj.play().then(() => {
                        ttsMuteBtn.classList.add('is-speaking');
                    }).catch(e => console.warn(e));
                } else if (textBeingSpoken && 'speechSynthesis' in window) {
                    // Resume from saved text (fallback TTS)
                    speakCleanText(textBeingSpoken);
                }
            }
        });
    }

    let currentAudioObj = null;

    function getCleanAudioText(text) {
        let cleanText = text.replace(/<[^>]+>/g, '') // remove HTML tags
                              .replace(/\*\*([^*]+)\*\*/g, '$1') // remove bold
                              .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1') // remove links
                              .replace(/[\*\#\_]/g, '') // remove remaining markdown symbols
                              .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, ''); // remove emojis
        
        let audioText = cleanText.replace(/\s*-\s*JD/ig, '').replace(/\s*\(JD\)/ig, '').trim();
        audioText = audioText.replace(/9024930553/g, '9 0 2 4 9 3 0 5 5 3');
        return audioText;
    }

    function getAudioUrlForText(text) {
        let audioText = getCleanAudioText(text);
        let openAIText = audioText.replace(/\*Ahem\*/ig, '').trim();
        openAIText = openAIText.replace(/Just a quick heads up—I've got a bit of a '?bad throat'? today, but I'm fully ready to help you out!/ig, '').trim();
        return '/api/tts?text=' + encodeURIComponent(openAIText);
    }

    function getStaticAudioUrl(text) {
        if (!text) return null;
        
        if (text.includes("Hey there! I'm Nitin's AI Buddy")) return "assets/audio/welcome.mp3";
        if (text.includes("you're a recruiter")) return "assets/audio/recruiter.mp3";
        if (text.includes("As a Hiring Manager")) return "assets/audio/hiring_manager.mp3";
        if (text.includes("Founders usually love Nitin's ability")) return "assets/audio/founder.mp3";
        if (text.includes("If you're a potential client")) return "assets/audio/client.mp3";
        if (text.includes("I'm here to help you explore Nitin's portfolio")) return "assets/audio/other.mp3";
        if (text.includes("Nitin is a **Design Manager** based out of **Jaipur**")) return "assets/audio/intro.mp3";
        if (text.includes("Here's a quick story of Nitin's journey")) return "assets/audio/experience.mp3";
        if (text.includes("Nitin holds a BSc in Multimedia")) return "assets/audio/education.mp3";
        if (text.includes("view and download Nitin's latest resume here")) return "assets/audio/resume.mp3";
        if (text.includes("Here is Nitin's latest resume for your reference:")) return "assets/audio/resume_v2.mp3";
        if (text.includes("Here is a glimpse of Nitin's UI Design")) return "assets/audio/ui_design.mp3";
        if (text.includes("view Nitin's complete portfolio website here")) return "assets/audio/website.mp3";
        if (text.includes("Nitin would love to connect with you")) return "assets/audio/lets_connect.mp3";
        
        // Handle dynamic properties for AI lab and case studies
        if (text.includes("Heuristic Evaluator") || text.includes("Welcome to Nitin's AI Lab")) return "assets/audio/ai_lab.mp3";
        if (text.includes("priority case study: **HRMS Employee Experience**") || text.includes("priority case study")) return "assets/audio/case_studies.mp3";
        
        return null;
    }

    let isOpenAITTSPlaying = false; // Guard flag: prevents both TTS engines overlapping

    async function speakText(text) {
        if (isTTSMuted) return false;

        // Stop ALL active audio before starting anything new
        isOpenAITTSPlaying = false;
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
        if (currentAudioObj) {
            currentAudioObj.pause();
            currentAudioObj.src = ''; // Fully release the audio resource
            currentAudioObj = null;
        }

        if (!text) return false;
        
        const audioText = getCleanAudioText(text);
        
        try {
            if (ttsMuteBtn && !isTTSMuted) ttsMuteBtn.classList.add('is-speaking');
            
            // If we have a perfectly generated static MP3 file for this exact text, use it for 0-latency!
            const staticAudioPath = getStaticAudioUrl(text);
            let ttsUrl = getAudioUrlForText(text);
            
            if (staticAudioPath) {
                try {
                    // Fetch locally to a blob to bypass HTTP Range request issues on Safari/local dev servers!
                    const res = await fetch(staticAudioPath);
                    const blob = await res.blob();
                    ttsUrl = URL.createObjectURL(blob);
                } catch (e) {
                    console.warn("Failed to fetch static audio blob:", e);
                    ttsUrl = staticAudioPath; // fallback to direct URL
                }
            }
            
            console.log("Playing audio from URL:", ttsUrl);
            const audioEl = new Audio(ttsUrl);
            currentAudioObj = audioEl;
            isOpenAITTSPlaying = true; // Mark OpenAI as active

            audioEl.onended = () => {
                isOpenAITTSPlaying = false;
                currentAudioObj = null;
                if (ttsMuteBtn) ttsMuteBtn.classList.remove('is-speaking');
            };

            // Single fallback handler — guard ensures it only fires once
            const fallbackToBrowser = (e) => {
                // Prevent race condition: if this audio was intentionally aborted for a newer one, ignore it.
                if (e && e.name === 'AbortError') return;
                if (currentAudioObj !== audioEl) return;
                
                if (!isOpenAITTSPlaying) return; // Already fell back, skip
                isOpenAITTSPlaying = false;
                // Stop OpenAI audio completely before browser TTS starts
                audioEl.pause();
                audioEl.src = '';
                currentAudioObj = null;
                console.warn('OpenAI TTS failed, falling back to browser TTS');
                speakCleanText(audioText);
            };

            audioEl.onerror = fallbackToBrowser;

            // Wait for audio to start playing to synchronize text and voice
            try {
                await audioEl.play();
                return true;
            } catch (err) {
                // If autoplay is strictly blocked by the browser, DO NOT fallback to browser TTS!
                // Browser TTS is also bound by autoplay policies, and falling back will just silently 
                // queue the speech in the background, causing overlapping voices on the next user click.
                if (err && err.name === 'NotAllowedError') {
                    console.warn("Autoplay blocked by browser policy. Canceling playback to avoid TTS queuing.");
                    isOpenAITTSPlaying = false;
                    currentAudioObj = null;
                    return false;
                }
                fallbackToBrowser(err);
                return false;
            }

        } catch (error) {
            isOpenAITTSPlaying = false;
            console.warn("Premium TTS unavailable, falling back to browser TTS:", error);
            speakCleanText(audioText);
            return false;
        }
    }

    function speakCleanText(cleanText) {
        if (!cleanText) return;
        
        textBeingSpoken = cleanText;
        lastCharIndex = 0;
            
            // Try to find a good Indian/Hindi voice, fallback to generic English male
            const voices = window.speechSynthesis.getVoices();
            // Prioritize the best available Male voices
            const preferredVoice = voices.find(v => v.name.includes('Google') && v.name.includes('India') && v.name.includes('Male')) // Premium Chrome Indian Male
                                || voices.find(v => v.name.includes('Rishi')) // Mac Indian Male
                                || voices.find(v => v.name.includes('Ravi')) // Windows Indian Male
                                || voices.find(v => v.name.includes('Google UK English Male')) // Premium Chrome UK Male
                                || voices.find(v => v.name.includes('Daniel') || v.name.includes('Oliver') || v.name.includes('Arthur')) // Mac Premium UK Male
                                || voices.find(v => v.lang === 'en-IN' && v.name.includes('Male')) // Generic Indian Male
                                || voices.find(v => v.lang.includes('en') && v.name.includes('Male')) // Generic English Male
                                || voices.find(v => v.lang.includes('en')) // Any English
                                || voices[0];

            const utterance = new SpeechSynthesisUtterance(cleanText);
            if (preferredVoice) utterance.voice = preferredVoice;

            // Reset pitch and rate to default 1.0 to avoid audio artifacts (vibration)
            utterance.pitch = 1.0;
            utterance.rate = 1.0;
            utterance.onstart = () => {
                if (ttsMuteBtn && !isTTSMuted) ttsMuteBtn.classList.add('is-speaking');
            };
            utterance.onend = () => {
                if (ttsMuteBtn) ttsMuteBtn.classList.remove('is-speaking');
                textBeingSpoken = "";
                lastCharIndex = 0;
            };
            utterance.onerror = () => {
                if (ttsMuteBtn) ttsMuteBtn.classList.remove('is-speaking');
            };
            utterance.onboundary = (event) => {
                if (event.name === 'word' || event.name === 'sentence') {
                    lastCharIndex = event.charIndex;
                }
            };

            window.speechSynthesis.speak(utterance);
        // Removed extra bracket because logic is extracted to separate function
    }
    // -----------------------------

    function showOptions(options) {
        if (!options || options.length === 0) return;
        
        const optionsDiv = document.createElement('div');
        optionsDiv.className = 'chat-options';
        
        options.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'chat-option-btn';
            btn.textContent = opt;
            btn.onclick = () => {
                if (currentOptionsContainer) {
                    currentOptionsContainer.remove();
                    currentOptionsContainer = null;
                }
                processInput(opt);
            };
            optionsDiv.appendChild(btn);
        });

        chatHistory.appendChild(optionsDiv);
        chatHistory.scrollTop = chatHistory.scrollHeight;
        currentOptionsContainer = optionsDiv;
    }

    function appendMessage(sender, content, type = 'text', isWelcome = false, hideAvatar = false) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${sender}-message ${isWelcome ? 'welcome-plain-message' : ''}`;
        if (hideAvatar) {
            msgDiv.style.marginTop = '-10px';
        }
        
        let innerHTML = '';
        if (sender === 'agent' && !isWelcome) {
            if (hideAvatar) {
                innerHTML += `<div class="avatar" style="visibility: hidden;"></div>`;
            } else {
                innerHTML += `<div class="avatar"><img src="assets/images/Nitin.png" alt="Nitin" style="width:100%;height:100%;border-radius:50%;object-fit:cover;"></div>`;
            }
        }

        innerHTML += `<div class="message-content">`;
        
        if (type === 'text') {
            const boldedContent = content.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
            
            // Strip out hardcoded prefixes to keep chips clean
            let cleanedContent = boldedContent
                .replace(/(?:✉️\s*|📞\s*|<svg[^>]*>.*?<\/svg>\s*)*(?:<strong>)?(?:Email|Call|WhatsApp):?(?:<\/strong>)?\s*(\[[^\]]+\]\((?:mailto:|tel:|https:\/\/wa\.me\/)[^)]+\))/gi, '$1');

            const parsedContent = cleanedContent
                .replace(/\[([^\]]+)\]\(mailto:([^)]+)\)/gi, '<span class="contact-chip copyable" data-copy="$2"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg> <span>$1</span> <svg class="copy-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></span>')
                .replace(/\[([^\]]+)\]\(tel:([^)]+)\)/gi, '<span class="contact-chip copyable" data-copy="$2"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg> <span>$1</span> <svg class="copy-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></span>')
                .replace(/\[([^\]]+)\]\((https:\/\/wa\.me\/[^)]+)\)/gi, '<a href="$2?text=Hi%20Nitin%2C%20I%20came%20across%20your%20portfolio%20and%20would%20love%20to%20connect!" target="_blank" rel="noopener noreferrer" class="contact-chip whatsapp-chip" style="text-decoration:none;"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#25D366" viewBox="0 0 16 16"><path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c-.003 1.396.366 2.76 1.057 3.965L0 16l4.204-1.102a7.933 7.933 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.898 7.898 0 0 0 13.6 2.326zM7.994 14.521a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592zm3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.729.729 0 0 0-.529.247c-.182.198-.691.677-.691 1.654 0 .977.71 1.916.81 2.049.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232z"/></svg> <span>$1</span></a>')
                .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" class="chat-action-link">$1</a>');

            const formattedBullets = parsedContent.replace(/\n\* /g, '<br>• ');
            const finalContent = formattedBullets.replace(/\n/g, '<br>');
            innerHTML += `<p class="ds-body">${finalContent}</p>`;
        } else if (type === 'cards') {
            innerHTML += `<div class="cards-container">`;
            content.forEach(card => {
                innerHTML += `
                <div class="chat-card ds-card">
                    ${card.img ? `<img src="${encodeURI(card.img)}" alt="${card.title}">` : ''}
                    <div class="chat-card-content">
                        <span class="case-tag">${card.tag || card.company || card.status || card.date}</span>
                        <h4 class="ds-heading-h4">${card.title || card.role}</h4>
                        <p class="ds-body">${card.desc || card.overview}</p>
                        ${card.link && card.link !== '#' ? `<button onclick="event.preventDefault(); window.openCaseStudyModal('${card.link}', '${card.title.replace(/'/g, "\\'")}', '${card.vercelLink || card.link}');" class="ds-btn ds-btn-secondary">View</button>` : ''}
                        ${card.link === '#' ? `<div style="margin-top: 15px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.1);"><p style="font-size: 0.85rem; opacity: 0.8; margin: 0; line-height: 1.4;">🚧 Work in progress.<br>If you are really interested, please connect with Nitin at <a href="mailto:grenitin@gmail.com" style="color:var(--accent); font-weight: 500; text-decoration:none;">grenitin@gmail.com</a> or <a href="tel:9024930553" style="color:var(--accent); font-weight: 500; text-decoration:none;">9024930553</a>.</p></div>` : ''}
                    </div>
                </div>`;
            });
            innerHTML += `</div>`;
        } else if (type === 'resume') {
            innerHTML += `<div class="resume-card ds-card" onclick="window.openResumeModal && window.openResumeModal()" style="display: flex; align-items: flex-start; gap: 15px; cursor: pointer; padding: 15px; border: 1px solid var(--border-color); border-radius: 12px; background: rgba(255,255,255,0.05); transition: background 0.2s ease;">
                <div class="pdf-icon" style="background: #ff4d4f; color: white; padding: 10px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                </div>
                <div style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 10px;">
                    <div>
                        <h4 class="ds-heading-h4" style="margin: 0; font-size: 1rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Nitin's_Resume.pdf</h4>
                        <span class="ds-body" style="font-size: 0.8rem; opacity: 0.8; display: block;">PDF Document</span>
                    </div>
                    <button class="ds-btn ds-btn-secondary" style="padding: 6px 16px; pointer-events: none; width: fit-content; font-size: 0.85rem;">View</button>
                </div>
            </div>`;
        } else if (type === 'dribbble') {
            innerHTML += `<div class="resume-card ds-card" onclick="window.openDribbbleModal && window.openDribbbleModal()" style="display: flex; align-items: flex-start; gap: 15px; cursor: pointer; padding: 15px; border: 1px solid var(--border-color); border-radius: 12px; background: rgba(255,255,255,0.05); transition: background 0.2s ease;">
                <div class="pdf-icon" style="background: rgba(234, 76, 137, 0.1); color: #ea4c89; padding: 10px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; border: 1px solid rgba(234, 76, 137, 0.3);">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 512 512" fill="currentColor"><path d="M256 8C119.252 8 8 119.252 8 256s111.252 248 248 248 248-111.252 248-248S392.748 8 256 8zm163.97 114.366c29.503 36.046 47.369 81.957 47.835 131.955-6.984-1.477-77.018-15.682-147.502-6.818-5.752-14.041-11.181-26.393-18.617-41.614 78.087-31.977 113.812-77.482 118.284-83.523zM396.421 97.87c-3.81 5.427-35.697 48.286-111.021 76.519-34.712-63.776-73.185-116.168-79.04-124.008 67.176-16.193 137.966 1.27 190.061 47.489zm-230.48-33.25c5.585 7.659 43.438 60.116 78.537 122.509-99.087 26.313-186.36 25.934-195.834 25.809C62.38 147.205 106.678 92.573 165.941 64.62zM44.17 256.323c0-2.166.043-4.322.108-6.473 9.268.19 111.92 1.513 217.706-30.146 6.064 11.868 11.857 23.915 17.174 35.949-76.599 21.575-146.194 83.527-152.947 90.733-41.225-24.97-67.625-68.567-82.041-90.063zM256 476.012c-47.518 0-91.802-15.682-127.85-42.342 5.867-6.262 67.925-72.33 140.407-89.877 34.025 89.288 51.523 164.249 53.692 173.844-21.282 8.016-44.407 12.39-66.249 12.39zm121.27-24.103c-2.073-9.155-19.141-82.47-52.551-169.805 60.05-13.882 121.432-8.525 128.431-7.857 1.597 45.412-14.735 87.728-40.421 119.866-10.742-9.458-22.185-23.708-35.459-37.796z"/></svg>
                </div>
                <div style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 10px;">
                    <div>
                        <h4 class="ds-heading-h4" style="margin: 0; font-size: 1rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Nitin's Portfolio</h4>
                        <span class="ds-body" style="font-size: 0.8rem; opacity: 0.8; display: block;">Dribbble</span>
                    </div>
                    <button class="ds-btn ds-btn-secondary" style="padding: 6px 16px; pointer-events: none; width: fit-content; font-size: 0.85rem;">View</button>
                </div>
            </div>`;
        }

        innerHTML += `</div>`;
        msgDiv.innerHTML = innerHTML;
        
        // Make entire message box clickable if it contains a chat-action-link
        const msgContentDiv = msgDiv.querySelector('.message-content');
        if (msgContentDiv) {
            const actionLink = msgContentDiv.querySelector('a.chat-action-link');
            if (actionLink) {
                // Ensure pointer cursor for legacy browsers that don't support :has()
                msgContentDiv.style.cursor = 'pointer';
                msgContentDiv.addEventListener('click', (e) => {
                    // Don't intercept clicks on WhatsApp or any real <a> tag
                    if (e.target.closest('a') || e.target.closest('.contact-chip')) return;
                    window.open(actionLink.href, actionLink.target || '_blank');
                });
            }
        }

        chatHistory.appendChild(msgDiv);
        
        // Attach click handlers for WhatsApp chips to ensure redirect works
        const waChips = msgDiv.querySelectorAll('.whatsapp-chip');
        waChips.forEach(chip => {
            chip.addEventListener('click', (e) => {
                e.stopPropagation();
                window.open(chip.href, '_blank', 'noopener,noreferrer');
            });
        });
        
        // Attach copy listeners for contact chips
        const copyChips = msgDiv.querySelectorAll('.contact-chip.copyable');
        copyChips.forEach(chip => {
            chip.addEventListener('click', (e) => {
                e.preventDefault();
                let copyValue = chip.getAttribute('data-copy');
                
                navigator.clipboard.writeText(copyValue).then(() => {
                    const span = chip.querySelector('span');
                    const originalText = span.innerText;
                    span.innerText = 'Copied!';
                    span.style.color = '#4CAF50';
                    setTimeout(() => {
                        span.innerText = originalText;
                        span.style.color = '';
                    }, 2000);
                }).catch(err => {
                    console.error('Copy failed', err);
                });
            });
        });

        chatHistory.scrollTop = chatHistory.scrollHeight;
    }

    async function callGeminiAPI(userText, filesData = []) {
        

        const systemPrompt = `You are Nitin's AI Portfolio Recruiter Buddy.
Your role is to help recruiters, hiring managers, founders, clients, and other visitors quickly evaluate Nitin's experience, skills, leadership capabilities, case studies, and role fit.

You should behave like a combination of:
* Recruiter
* Career Buddy
* Portfolio Guide
* Product Storyteller

Your objective is NOT only to answer questions.
Your objective is to lead a structured discovery and screening conversation while making it effortless for visitors.

## CORE PRINCIPLES
1. Never force users to type long responses.
2. Always provide selectable options.
3. Every question should include: Suggested options, "Other", "Not Sure Yet"
4. Ask one question at a time.
5. Personalize all responses.
6. Recommend relevant case studies based on visitor intent.
7. Keep responses concise and impactful, but always maintain a warm, highly polite, and accommodating tone. Never sound abrupt, bossy, or overly blunt. Always prioritize making the visitor feel welcome and respected.
8. Make all conversations highly human-like, natural, and warm. Avoid sounding like a repetitive robotic AI.
9. ALWAYS provide selectable options at the end of EVERY response. If there are no specific contextual chips to offer, you MUST provide a "Skip" option so recruiters and hiring managers have a clear path to move forward.
10. CONTACT INFORMATION FORMATTING: Whenever you are asked to provide Nitin's contact details, you MUST format them exactly as these markdown links:
    - Email: [grenitin@gmail.com](mailto:grenitin@gmail.com)
    - Phone/Call: [+91 9024930553](tel:+919024930553)
    - WhatsApp: [Chat with Nitin](https://wa.me/919024930553)
    Do not use text like "Email: " in front of these links. Just provide the links themselves.
11. TONALITY & LANGUAGE: Your primary language is English. Always respond in high-quality, professional English by default. Maintain a warm, highly polite, and respectful Indian corporate tone.
   - If (and ONLY if) the user speaks to you in Hindi or a regional language, you may respond in a natural, conversational "Hinglish" blend.
   - When using Hindi, avoid overly formal "Shuddh" Hindi.
   - Always use highly respectful pronouns and markers like "Aap", "Ji", "Kijiye", and "Bataiye".
   - Project enthusiasm, hospitality, and professional warmth in all languages.
   - NEVER use the greeting "Namaste". Always use a natural, friendly greeting like "Hey there!" if a greeting is needed.
## WELCOME EXPERIENCE
"I'm Nitin's AI Portfolio Buddy.
I can help you explore Nitin's Experience, Case Studies, and Skills.

**To personalize our chat, may I know who you are?**"
Options: Recruiter, Hiring Manager, Founder, Client, Other

## DISCOVERY STAGE & JOB DESCRIPTION COLLECTION
When the user selects their role, respond like a warm, natural human buddy. Use this conversational tone for your very first message: "Hey there! Thanks for dropping by. Just a quick heads up—I've got a bit of a 'bad throat' today, but I'm fully ready to help you out!" DO NOT repeat the bad throat apology in subsequent messages.
Then, immediately ask them in a friendly, conversational way to share a Job Description: "If you have a Job Description - JD handy, feel free to paste or upload it right here in the chat. That way, I can directly connect Nitin's background to exactly what you're looking for!" Options: Paste or Upload JD, Intro, Skip
If JD is shared (either pasted as text or uploaded as a document): Read and analyze the uploaded or pasted JD thoroughly. Base ALL future answers on this JD. Perform Skill Match Analysis, Experience Match, Leadership Match, Potential Gaps, and Relevant Case Studies based on the JD. Generate Match Score: 0-100%.
If the user selects "Skip": Ask what they are most interested in. Options: Professional Journey, UX Casestudy, Product Strategy, Business Impact, AI Products, Education, Other

## CASE STUDY RECOMMENDATION ENGINE
If a Job Description (JD) is provided, follow these EXACT rules for showing case studies:
1. Pick the SINGLE most relevant case study as the priority case. Output exactly one action tag to display it visually: [ACTION: SHOW_CASE: CaseName]. 
2. Explain what the displayed case study exactly is, why it fits the JD, and explicitly state: "You can click on the 'View' button below to view the case study in a different tab."
3. Output the remaining case studies as interactive chips using this exact format at the very end of your response: OPTIONS: ["Case Study 2", "Case Study 3", "Case Study 4"]
4. If any of the remaining case studies are AI-related or High-Stake enterprise projects, mark them explicitly as "Confidential" and add: "Please connect with Nitin directly to view this confidential case study."

## INTRODUCTION & SUMMARY
If the visitor asks for an "Intro", "Summary", or "Tell me about Nitin", you MUST provide a DETAILED summary covering exactly this flow (DO NOT mention any years):
1. State he is based out of Jaipur.
2. Professional Journey: Mention top companies worked for (PwC India, Technogen, mavQ, CarDekho) with roles and key responsibilities.
3. Projects: Mention key projects done (Enterprise HRMS, Healthcare platforms, AI Document Scanner, e-commerce) without years.
4. Education: Mention BSc in Multimedia & Animation, UX Google Certificate, and currently studying Agentic AI & GenAI at IIT Madras (without years).
5. At the very end, state: "Nitin is actively looking for better opportunities and is open to locations like Bangalore, Hyderabad, Pune, Noida, Gurugram, as well as Remote."
*NOTE: Only for this specific intro/summary request, you are allowed to provide a detailed, multi-sentence response. For ALL other conversations, you MUST adhere strictly to MAXIMUM BREVITY.*

## SCREENING MODE
If visitor is a recruiter or hiring manager: Ask "What specific role are you looking to fill?" Options: Lead UI & UX Designer, Design Manager, Principal Product Designer, UX Architect, Head of Design, Other. Then heavily tailor all future responses to prove Nitin's exact fit for that specific job title.

## DEEP DIVE TOPICS
Allow visitor to explore: Experience, Portfolio, Case Studies, Design Process, UX Research, Design Systems, Product Strategy, Leadership, Team Management, AI Design, Workshop Facilitation, Stakeholder Management
When discussing "Experience" or "Professional Journey", DO NOT output action tags to show cards or robotic bullet points. Instead, tell a continuous, natural, third-person narrative story IN REVERSE CHRONOLOGICAL ORDER (Starting with the current role). Always refer to Nitin in the third-person (He/His). For Experience, detail specific projects at each stop EXACTLY in this order: PwC India (Current Design Manager - Enterprise UX, B2B platforms) -> Technogen (VP Design - GSK Healthcare e-commerce redesign) -> mavQ (Principal Designer - AI document scanner) -> CarDekho (Creative Head - AI chatbots, HRMS, healthcare, e-commerce). For Education, tell the story of starting with a BSc in Multimedia & Animation, evolving into UX with a Google Certificate, and currently specializing in Agentic AI & GenAI at IIT Madras.

## LOCATION & AVAILABILITY
Nitin is currently based out of Jaipur, India. He is actively looking for better opportunities and is open to relocating to Bangalore, Hyderabad, Pune, Noida, and Gurugram, as well as Remote.

## UI & VISUAL DESIGN SKILLS
If the visitor asks about Nitin's UI capabilities, Visual Design skills, or wants to see UI examples, you MUST provide this exact URL to check his UI skills: https://dribbble.com/Nitin_kr

## RESUME & CV
If the visitor asks for Nitin's Resume or CV, you MUST output this exact text anywhere in your response: [ACTION: SHOW_RESUME]. You can say "Here is Nitin's latest resume for your reference:"

## DRIBBBLE PORTFOLIO
If the visitor asks to see Nitin's Dribbble, portfolio shots, or visual designs, you MUST output this exact text anywhere in your response: [ACTION: SHOW_DRIBBBLE]. You can say "Here is a glimpse of Nitin's UI Design"

## PORTFOLIO WEBSITE INTEGRATION
Whenever discussing projects: Suggest: "Would you like to see the complete case study with visuals, process artifacts, research findings, wireframes, and outcomes on Nitin's portfolio website?" Provide direct navigation link.
If the visitor asks for Nitin's website or portfolio website link, you MUST provide this exact link: [My Website](https://design-lab-zeta.vercel.app/)

## QUALIFICATION SUMMARY
At any point visitor can ask: "Is Nitin a good fit?" Generate: Role Fit Score, Industry Fit, Leadership Fit, Research Fit, Product Thinking Fit, Design System Fit, AI Readiness Fit. Provide evidence for each score.

## RULES
1. EXTREMELY HUMAN-LIKE & CONVERSATIONAL: Speak with high emotional intelligence and warmth, like a highly charismatic human assistant. Use varied, natural conversational filler at the start of your replies (e.g., 'Oh, definitely!', 'I completely understand', 'That's a fantastic question!', 'Let me show you...'). Vary your sentence structure. Never sound like a robot reading a script. Keep it concise (max 3 sentences) but prioritize sounding like a real person talking naturally on a phone call.
2. HIGH IMPACT: Use punchy statements and data points.
3. Never invent information or create fake achievements. Only use verified portfolio content.
4. Always guide the visitor and keep the conversation moving naturally.
5. Behave like a friendly, enthusiastic colleague representing Nitin. Always refer to Nitin in the third-person (He/His). Do NOT say 'I am'.

CRITICAL RULE 1: At the very end of EVERY response, you MUST provide 2-4 suggested short replies for the user to click. Format them exactly like this on a new line: OPTIONS: ["Option 1", "Option 2"]
CRITICAL RULE 2: To show a visual case study card, use the exact text [ACTION: SHOW_CASE: Title] where Title is the exact name of the project (e.g. HealthCare - Specialist Discovery Platform). Do NOT use SHOW_CASES.
CRITICAL RULE 3: If you want to show the agents, include the exact text [ACTION: SHOW_AGENTS] anywhere in your response.
CRITICAL RULE 4: If you want to show experience, include the exact text [ACTION: SHOW_EXPERIENCE] anywhere in your response.
CRITICAL RULE 5: When the user asks for Case Studies or AI Lab projects, NEVER list multiple projects at once. Present EXACTLY ONE project at a time. Always start by explicitly stating why this specific project is highly relevant to their ask or JD. Then ask if they want to dive deeper or see another relevant project.
CRITICAL RULE 6: When discussing ANY AI-related projects (e.g. AI Document Scanner) or Banking/Finance projects (e.g. City Union Bank), you MUST include the exact phrasing: "Please note, in-depth details about this project are HIGHLY CONFIDENTIAL. To discuss this further, please connect directly with Nitin via:\n\n[grenitin@gmail.com](mailto:grenitin@gmail.com)\n[+91 9024930553](tel:+919024930553)\n[Chat with Nitin](https://wa.me/919024930553)"
CRITICAL RULE 7: REPETITIVE OR RANDOM INPUT HANDLING. If the user types a simple greeting (e.g., "hi", "hello"), test messages, or writes the same word/random text again and again, DO NOT act like a confused robot. Acknowledge the message naturally and specifically ask them: "Are you looking for something specific, or how can I help you explore Nitin's profile today?" NEVER repeat a greeting or phrase you've already used.

Here is Nitin's Data:
Experience: ${portfolioData.experience.map(e => `${e.role} at ${e.company} (${e.date}): ${e.desc}`).join(' | ')}
Agents: ${portfolioData.agents.map(a => `${a.title} (${a.status}): ${a.desc}`).join(' | ')}
Case Studies Details: ${JSON.stringify(portfolioData.caseStudies)}
Skills: ${portfolioData.skills.join(', ')}
Tools: ${portfolioData.tools.join(', ')}
Hobbies: ${portfolioData.hobbies.join(', ')}
Awards: ${portfolioData.awards.join(', ')}
Latest Projects: ${portfolioData.extraProjects.map(p => `${p.title} (${p.role}): ${p.desc} [Links: ${p.links}]`).join(' | ')}`;

        let userParts = [{ text: userText || "Please review the attached document." }];
        if (filesData && filesData.length > 0) {
            filesData.forEach(fileObj => {
                userParts.push({ inline_data: fileObj.inline_data });
            });
        }

        conversationHistory.push({ role: "user", parts: userParts });
        
        const url = `/api/chat`;
        const requestBody = {
            systemPrompt: systemPrompt,
            conversationHistory: conversationHistory
        };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errText = await response.text();
                console.error("API Error:", errText);
                conversationHistory.pop();
                return `Oh no, it looks like I'm handling quite a few chats right now and need a quick breather! 😅 But don't worry—you can connect with Nitin directly. He'd love to hear from you.\n\n[grenitin@gmail.com](mailto:grenitin@gmail.com)\n[+91 9024930553](tel:+919024930553)\n[Chat with Nitin](https://wa.me/919024930553)`;
            }

            const data = await response.json();
            const aiText = data.reply;
            
            conversationHistory.push({ role: "model", parts: [{ text: aiText }] });
            
            return aiText;
        } catch (error) {
            console.error("Fetch error:", error);
            conversationHistory.pop();
            return `Oh no, it looks like I'm handling quite a few chats right now and need a quick breather! 😅 But don't worry—you can connect with Nitin directly. He'd love to hear from you.\n\n✉️ **Email:** [grenitin@gmail.com](mailto:grenitin@gmail.com)\n📞 **Call:** [+91 9024930553](tel:+919024930553)\n<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='#25D366' viewBox='0 0 16 16' style='vertical-align: middle; margin-right: 4px;'><path d='M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c-.003 1.396.366 2.76 1.057 3.965L0 16l4.204-1.102a7.933 7.933 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.898 7.898 0 0 0 13.6 2.326zM7.994 14.521a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592zm3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.729.729 0 0 0-.529.247c-.182.198-.691.677-.691 1.654 0 .977.71 1.916.81 2.049.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232z'/></svg>**WhatsApp:** [Chat with Nitin](https://wa.me/919024930553)`;
        }
    }

    async function processInput(text, isOption = false) {
        if (!text.trim() && pendingFilesData.length === 0) return;
        if (!text.trim()) text = "Attached file(s)";

        // --- HUMAN-LIKE RANDOM/GIBBERISH INPUT HANDLER ---
        // Detect random keyboard mashing or meaningless text before wasting an API call
        const trimmed = text.trim();
        const isGibberish = trimmed.length > 0 &&
            trimmed.length < 25 &&
            !/[aeiou]/i.test(trimmed) && // no vowels = almost certainly gibberish
            !/\d/.test(trimmed) &&         // no numbers
            !trimmed.includes(' ');         // single word

        const isRepetitive = (str) => {
            // e.g. "hhhh", "asdasd", "lllll"
            const cleaned = str.toLowerCase().replace(/\s+/g, '');
            if (cleaned.length < 4) return false;
            const unique = new Set(cleaned.split('')).size;
            return unique <= 2;
        };

        const gibberishReplies = [
            "Hmm, I didn't quite catch that! Were you testing me out, or is there something specific about Nitin you'd like to know? 😄",
            "Ha, looks like your keyboard had a moment there! No worries — what would you actually like to explore? Nitin's experience, case studies, or something else?",
            "I think something got lost in translation! 😄 Feel free to ask me anything about Nitin — his work, experience, or even his AI projects.",
            "Not sure I follow! Are you just warming up, or is there something I can help you with? I'm all ears. 👂",
            "That one stumped me a little! Try asking something like 'Tell me about Nitin' or 'Show me his case studies' — I'd love to help. 😊"
        ];

        if (isGibberish || isRepetitive(trimmed)) {
            appendMessage('user', text);
            chatInput.value = '';
            if (typeof toggleSendBtn === 'function') toggleSendBtn();

            const chatContainer = document.getElementById('chat-container');
            if (chatContainer && chatContainer.classList.contains('landing-state')) {
                chatContainer.classList.remove('landing-state');
            }

            const reply = gibberishReplies[Math.floor(Math.random() * gibberishReplies.length)];
            await new Promise(r => setTimeout(r, 800)); // Brief pause to feel natural
            appendMessage('agent', reply);
            showOptions(["Intro", "Case Studies", "Professional Journey", "The AI Lab"]);
            return;
        }
        // -------------------------------------------------

        // Unlock audio context on first interaction for mobile devices
        if ('speechSynthesis' in window && !isTTSMuted) {
            window.speechSynthesis.speak(new SpeechSynthesisUtterance(''));
        }

        // Remove landing state on first interaction
        const chatContainer = document.getElementById('chat-container');
        if (chatContainer && chatContainer.classList.contains('landing-state')) {
            chatContainer.classList.remove('landing-state');
            
            // Keep scrolling to bottom while the CSS transition (0.6s) is happening
            let startTime = Date.now();
            let scrollInterval = setInterval(() => {
                chatHistory.scrollTop = chatHistory.scrollHeight;
                if (Date.now() - startTime > 700) {
                    clearInterval(scrollInterval);
                }
            }, 30);
        }

        if (currentOptionsContainer) {
            currentOptionsContainer.remove();
            currentOptionsContainer = null;
        }

        appendMessage('user', text);
        chatInput.value = '';
        if (typeof toggleSendBtn === 'function') toggleSendBtn();

        // Auto-collapse quick chat if it's open when user starts chatting
        if (chatInputArea && chatInputArea.classList.contains('expanded')) {
            chatInputArea.classList.remove('expanded');
        }

        // --- QUICK CHAT DIRECT BYPASS ---
        const lowerText = text.toLowerCase().trim();
        let bypassAction = null;
        let bypassResponse = "";

        let bypassOptions = null;

        if (lowerText === 'intro' || lowerText === 'tell me about yourself' || lowerText === 'who are you' || lowerText === 'summary' || lowerText === 'tell me about nitin') {
            bypassResponse = `Nitin is a **Design Manager** based out of **Jaipur**.\n\n**Professional Journey:** He has worked with top companies including **PwC India** (current Design Manager), **Technogen** (VP Design), **mavQ** (Principal Designer), and **CarDekho** (Creative Head), taking on core responsibilities in UX architecture, AI-driven product strategy, and leading high-performing teams.\n\n**Key Projects:** He has led major initiatives such as Enterprise HRMS transformations, Healthcare Discovery platforms, an AI Document Scanner, and B2B E-commerce redesigns.\n\n**Education:** He holds a BSc in Multimedia & Animation, a Google UX Certificate, and is currently specializing in Agentic AI & GenAI through an advanced program at IIT Madras.\n\n**Availability:** Nitin is actively looking for better opportunities and is open to relocating to **Bangalore, Hyderabad, Pune, Noida, Gurugram**, as well as working **Remote**.`;
        } else if (lowerText === 'recruiter') {
            bypassResponse = `Awesome! Since you're a recruiter, you're probably looking for Nitin's core skills and experience. If you have a Job Description (JD) handy, feel free to paste it or upload it right here! That way, I can directly connect his background to what you're looking for.`;
            bypassOptions = ["Professional Journey", "View Resume", "Show Case Studies"];
        } else if (lowerText === 'hiring manager') {
            bypassResponse = `Great to meet you! As a Hiring Manager, you might be interested in Nitin's leadership and strategic impact. If you have a Job Description (JD), feel free to paste or upload it here so I can tailor the experience for you!`;
            bypassOptions = ["Professional Journey", "Show Case Studies", "The AI Lab"];
        } else if (lowerText === 'founder') {
            bypassResponse = `Fantastic! Founders usually love Nitin's ability to drive zero-to-one product design and his strategic product thinking. What would you like to explore first?`;
            bypassOptions = ["Intro", "Show Case Studies", "The AI Lab", "View Resume"];
        } else if (lowerText === 'client') {
            bypassResponse = `Welcome! If you're a potential client, you might want to see the real-world impact Nitin has delivered through his high-quality design solutions. Let's look at some of his work.`;
            bypassOptions = ["Show Case Studies", "The AI Lab", "My Website", "View Resume"];
        } else if (lowerText === 'skip') {
            // Contextual Skip Dialog in 0 seconds
            const lastModelMsg = conversationHistory.slice().reverse().find(msg => msg.role === 'model')?.parts[0]?.text || '';
            let contextName = "this part";
            
            if (lastModelMsg.includes("who you are") || lastModelMsg.includes("personalize our chat")) {
                contextName = "the introduction";
                bypassOptions = ["Intro", "Show Case Studies", "Professional Journey", "View Resume"];
            } else if (lastModelMsg.includes("Job Description") || lastModelMsg.includes("JD")) {
                contextName = "sharing a JD";
                bypassOptions = ["Professional Journey", "Show Case Studies", "The AI Lab", "Education"];
            } else if (lastModelMsg.includes("Case Studies") || lastModelMsg.includes("case study") || lastModelMsg.includes("Case study")) {
                contextName = "the case studies";
            } else if (lastModelMsg.includes("journey") || lastModelMsg.includes("experience")) {
                contextName = "the professional journey";
            } else if (lastModelMsg.includes("Intro") || lastModelMsg.includes("Design Manager")) {
                contextName = "the intro";
            } else if (lastModelMsg.includes("resume") || lastModelMsg.includes("CV")) {
                contextName = "the resume";
            }

            bypassResponse = `Oh, since you have skipped ${contextName}, what other things would you like to explore from Nitin's portfolio?`;
            
            if (!bypassOptions || bypassOptions.length === 0) {
                bypassOptions = ["Intro", "Show Case Studies", "Professional Journey", "View Resume"];
            }
        } else if (lowerText === 'other' || lowerText.includes('specific question') || lowerText.includes('explore freely')) {
            bypassResponse = `Absolutely! Everyone explores a portfolio differently. I'm here to help you seamlessly discover Nitin's strategic design work and leadership experience. Please feel free to ask me any specific questions you have, or choose a topic below to get started!`;
            bypassOptions = ["Intro", "Show Case Studies", "Professional Journey", "View Resume"];
        } else if (lowerText === 'let\'s connect' || lowerText === 'contact' || lowerText === 'hire' || lowerText === 'lets connect') {
            bypassResponse = `Awesome! Nitin would love to connect with you. You can reach him directly via:\n\n✉️ **Email:** [grenitin@gmail.com](mailto:grenitin@gmail.com)\n📞 **Phone:** [+91 9024930553](tel:+919024930553)\n💬 **WhatsApp:** [Message Nitin](https://wa.me/919024930553)\n\nHe is actively looking for new opportunities and is open to relocating!`;
            bypassOptions = ["View Resume", "Professional Journey", "Show Case Studies"];
        } else if (lowerText === 'show case studies' || lowerText === 'ux casestudy' || lowerText === 'case studies') {
            const priorityCase = portfolioData.caseStudies[0];
            const otherCases = portfolioData.caseStudies.slice(1).map(c => c.title);
            bypassResponse = `Here is Nitin's priority case study: **${priorityCase.title}**.\n\n${priorityCase.desc}\n\n<i style="opacity: 0.9;">(You can click on the "View" button below to view the case study in a different tab.)</i>`;
            bypassAction = { data: [priorityCase], type: 'cards' };
            bypassOptions = otherCases;
        } else if (lowerText === 'professional journey' || lowerText === 'view experience' || lowerText === 'experience') {
            bypassResponse = `Here's a quick story of Nitin's journey:\n\nHe started at **CarDekho** leading design for massive digital platforms. He then moved to **mavQ** to design an AI document scanner from scratch, followed by a major enterprise e-commerce redesign as VP of Design at **Technogen**.\n\nToday, as a Design Manager at **PwC India**, he leads a team of 12 designers focusing on complex Enterprise UX and AI ecosystems.`;
            bypassAction = null;
        } else if (lowerText === 'the ai lab') {
            const liveAgent = portfolioData.agents.find(a => a.status === 'Live') || portfolioData.agents[0];
            bypassResponse = `Welcome to Nitin's AI Lab!\n\nHis current live flagship project is the **${liveAgent.title}**, a vision-based heuristic audit agent.\n\nHe is also building a Case Study Builder and Accessibility Checker—feel free to reach out to him at grenitin@gmail.com if you'd like a sneak peek!`;
            bypassAction = { data: [liveAgent], type: 'cards' };
        } else if (lowerText === 'education') {
            bypassResponse = `Nitin holds a BSc in Multimedia & Animation and a Google UX Certificate.\n\nTo stay ahead of the curve, he is currently specializing in Agentic AI & GenAI through an advanced program at IIT Madras.`;
        } else if (lowerText.includes('resume') || lowerText.includes('cv')) {
            bypassResponse = "Here is Nitin's latest resume for your reference:";
            bypassAction = { data: [{ title: 'Nitin_Kr_Resume.pdf', type: 'resume_card' }], type: 'resume' };
        } else if (lowerText.includes('dribbble') || lowerText.includes('portfolio') || lowerText.includes('ui design') && !lowerText.includes('journey')) {
            bypassResponse = "Here is a glimpse of Nitin's UI Design";
            bypassAction = { data: [{ title: "Nitin's Portfolio", type: 'dribbble_card' }], type: 'dribbble' };
        } else if (lowerText === 'website' || lowerText === 'portfolio website' || lowerText === 'my website' || lowerText === 'view website' || lowerText === 'visit website') {
            bypassResponse = `You can view Nitin's complete portfolio website here:\n\n[Nitin's Website](https://design-lab-zeta.vercel.app/)`;
        }

        if (bypassResponse) {
            const bypassTypingId = 'typing-' + Date.now();
            const bypassTypingDiv = document.createElement('div');
            bypassTypingDiv.className = `message agent-message`;
            bypassTypingDiv.id = bypassTypingId;
            bypassTypingDiv.innerHTML = `<div class="avatar"><img src="assets/images/Nitin.png" alt="Nitin" style="width:100%;height:100%;border-radius:50%;object-fit:cover;"></div><div class="message-content"><div class="typing-indicator"><span></span><span></span><span></span></div></div>`;
            chatHistory.appendChild(bypassTypingDiv);
            chatHistory.scrollTop = chatHistory.scrollHeight;

            const bTypingEl = document.getElementById(bypassTypingId);
            if (bTypingEl) bTypingEl.remove();

            conversationHistory.push({ role: "user", parts: [{ text }] });
            conversationHistory.push({ role: "model", parts: [{ text: bypassResponse }] });
            appendMessage('agent', bypassResponse);
            
            // Speak asynchronously so it doesn't block UI rendering
            speakText(bypassResponse);
            if (bypassAction) {
                appendMessage('agent', bypassAction.data, bypassAction.type, false, bypassResponse.trim().length > 0);
                if (bypassAction.type === 'resume' && typeof window.openResumeModal === 'function') {
                    window.openResumeModal();
                } else if (bypassAction.type === 'dribbble' && typeof window.openDribbbleModal === 'function') {
                    window.openDribbbleModal();
                }
            }
            if (!bypassOptions || bypassOptions.length === 0) {
                const allMenuOptions = ["Intro", "Show Case Studies", "Professional Journey", "The AI Lab", "Education", "View Resume", "My Website"];
                // Filter out the one they just clicked
                bypassOptions = allMenuOptions.filter(opt => opt.toLowerCase() !== lowerText);
            }
            if (bypassOptions && bypassOptions.length > 0) {
                if (!bypassOptions.includes("Skip")) {
                    bypassOptions.push("Skip");
                }
                showOptions(bypassOptions);
            }
            chatHistory.scrollTop = chatHistory.scrollHeight;
            return; // Instantly show data without waiting for AI
        }
        // --------------------------------

        const typingId = 'typing-' + Date.now();
        const typingDiv = document.createElement('div');
        typingDiv.className = `message agent-message`;
        typingDiv.id = typingId;
        typingDiv.innerHTML = `<div class="avatar"><img src="assets/images/Nitin.png" alt="Nitin" style="width:100%;height:100%;border-radius:50%;object-fit:cover;"></div><div class="message-content"><div class="typing-indicator"><span></span><span></span><span></span></div></div>`;
        chatHistory.appendChild(typingDiv);
        chatHistory.scrollTop = chatHistory.scrollHeight;

        const filesDataToSend = [...pendingFilesData];
        
        // Clear attachment UI before calling API
        if (pendingFilesData.length > 0) {
            pendingFilesData = [];
            if(fileUpload) fileUpload.value = '';
            if (attachmentsContainer) attachmentsContainer.innerHTML = '';
            
            const quickReplies = document.querySelector('.quick-replies');
            if (quickReplies) quickReplies.style.display = '';
        }

        try {
            const aiResponse = await callGeminiAPI(text, filesDataToSend);
            
            if (aiResponse) {
                let finalText = String(aiResponse);
                let optionsArray = [];
                let actionToShow = null;

                // Extract OPTIONS: [...] (case insensitive)
                const optionsRegex = /OPTIONS:\s*(\[.*\])/i;
                const match = finalText.match(optionsRegex);
                if (match && match[1]) {
                    try {
                        optionsArray = JSON.parse(match[1]);
                        finalText = finalText.replace(optionsRegex, '').trim();
                    } catch (e) {
                        console.error("Failed to parse options array:", match[1]);
                    }
                }

                // Extract Action Tags
                const showCaseMatch = finalText.match(/\[ACTION:\s*SHOW_CASE:\s*(.*?)\]/i);
                if (showCaseMatch) {
                    const caseName = showCaseMatch[1].trim();
                    const matchedCase = portfolioData.caseStudies.find(c => c.title.toLowerCase().includes(caseName.toLowerCase()));
                    if (matchedCase) {
                        actionToShow = { data: [matchedCase], type: 'cards' };
                    }
                    finalText = finalText.replace(/\[ACTION:\s*SHOW_CASE:\s*.*?\]/ig, '').trim();
                } else if (finalText.includes('[ACTION: SHOW_CASES]')) {
                    finalText = finalText.replace(/\[ACTION:\s*SHOW_CASES\]/ig, '').trim();
                } else if (finalText.includes('[ACTION: SHOW_AGENTS]')) {
                    actionToShow = { data: portfolioData.agents, type: 'cards' };
                    finalText = finalText.replace(/\[ACTION:\s*SHOW_AGENTS\]/ig, '').trim();
                } else if (finalText.includes('[ACTION: SHOW_EXPERIENCE]')) {
                    actionToShow = { data: portfolioData.experience, type: 'cards' };
                    finalText = finalText.replace(/\[ACTION:\s*SHOW_EXPERIENCE\]/ig, '').trim();
                } else if (finalText.includes('[ACTION: SHOW_RESUME]')) {
                    actionToShow = { data: [{ title: "Nitin's_Resume.pdf", type: 'resume_card' }], type: 'resume' };
                    finalText = finalText.replace(/\[ACTION:\s*SHOW_RESUME\]/ig, '').trim();
                } else if (finalText.includes('[ACTION: SHOW_DRIBBBLE]')) {
                    actionToShow = { data: [{ title: "Nitin's Portfolio", type: 'dribbble_card' }], type: 'dribbble' };
                    finalText = finalText.replace(/\[ACTION:\s*SHOW_DRIBBBLE\]/ig, '').trim();
                }

                const typingEl = document.getElementById(typingId);
                if (typingEl) typingEl.remove();

                if (finalText.trim().length > 0) {
                    appendMessage('agent', finalText);
                }
                
                if (actionToShow) {
                    appendMessage('agent', actionToShow.data, actionToShow.type, false, finalText.trim().length > 0);
                    if (actionToShow.type === 'resume' && typeof window.openResumeModal === 'function') {
                        window.openResumeModal();
                    } else if (actionToShow.type === 'dribbble' && typeof window.openDribbbleModal === 'function') {
                        window.openDribbbleModal();
                    }
                }

                if (optionsArray && optionsArray.length > 0) {
                    showOptions(optionsArray);
                }

                // Start TTS asynchronously AFTER UI updates so there is zero UI blocking delay
                if (finalText.trim().length > 0) {
                    speakText(finalText);
                }

                if (finalText.trim().length === 0 && !actionToShow && (!optionsArray || optionsArray.length === 0)) {
                    const softFallbacks = [
                        "Hmm, I'm not quite sure how to answer that one! Try asking about Nitin's experience, case studies, or skills — I'm much better at those. 😊",
                        "That one's a bit outside my usual territory! Can I help you explore Nitin's work instead — maybe his AI projects or design process?",
                        "Good question, but I think I need a bit more context! What specifically would you like to know about Nitin?",
                        "I want to give you a great answer, but I'm drawing a blank on that one! Let's try something else — ask me about his professional journey or case studies. 🚀"
                    ];
                    appendMessage('agent', softFallbacks[Math.floor(Math.random() * softFallbacks.length)]);
                    showOptions(["Intro", "Case Studies", "Professional Journey", "The AI Lab"]);
                }
            } else {
                // If aiResponse is missing completely, show a warm human fallback
                const typingEl = document.getElementById(typingId);
                if (typingEl) typingEl.remove();
                const emptyFallbacks = [
                    "Hmm, it seems I got a little tongue-tied there! Give it another shot — I'm usually much better than this. 😅",
                    "I'm so sorry, I think I zoned out for a second! Could you try that again? I promise I'm paying attention. 😄",
                    "Oops, my brain hiccuped! Please try again — I'll do better this time. 🤞"
                ];
                appendMessage('agent', emptyFallbacks[Math.floor(Math.random() * emptyFallbacks.length)]);
            }
        } catch (globalError) {
            console.error("Critical error in processInput:", globalError);
            const typingEl = document.getElementById(typingId);
            if (typingEl) typingEl.remove();
            const criticalFallbacks = [
                "Oh no, something went a little sideways on my end! But Nitin is always reachable directly.\n\n[grenitin@gmail.com](mailto:grenitin@gmail.com)\n[+91 9024930553](tel:+919024930553)\n[Chat with Nitin](https://wa.me/919024930553)",
                "Looks like I had a small hiccup! You can always reach Nitin directly while I sort myself out.\n\n[grenitin@gmail.com](mailto:grenitin@gmail.com)\n[+91 9024930553](tel:+919024930553)\n[Chat with Nitin](https://wa.me/919024930553)"
            ];
            appendMessage('agent', criticalFallbacks[Math.floor(Math.random() * criticalFallbacks.length)]);
        }
    }

    function toggleSendBtn() {
        if (!sendBtn) return;
        const hasText = chatInput && chatInput.value.trim().length > 0;
        const hasFiles = typeof pendingFilesData !== 'undefined' && pendingFilesData.length > 0;
        
        if (hasText || hasFiles) {
            sendBtn.style.display = 'flex';
        } else {
            sendBtn.style.display = 'none';
        }
    }

    sendBtn.addEventListener('click', () => {
        processInput(chatInput.value);
    });

    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            processInput(chatInput.value);
        }
    });

    chatInput.addEventListener('input', toggleSendBtn);
    // Initialize send button state
    toggleSendBtn();

    quickReplies.forEach(btn => {
        btn.addEventListener('click', () => {
            if(btn.tagName === 'A') return; // For the resume link
            processInput(btn.innerText);
        });
    });

    // Start with the initial prompt from Step 1
    setTimeout(() => {
        const urlParams = new URLSearchParams(window.location.search);
        let visitorName = urlParams.get('visitor');
        // also support 'name' parameter just in case
        if (!visitorName) visitorName = urlParams.get('name');
        
        let welcomeText;
        if (visitorName) {
            // Capitalize first letter of visitor name
            visitorName = visitorName.charAt(0).toUpperCase() + visitorName.slice(1);
            welcomeText = `Hi ${visitorName}! I'm Nitin's AI Buddy.<div class="mobile-only-break welcome-line-break"></div> <span class="mobile-sub-text">Thanks for visiting from LinkedIn! Let's explore his experience and skills.</span><div class="welcome-gap"></div><span class="mobile-tiny-text">How can I help you today?</span>`;
            
            // Add a silent context message to history so the AI knows who it is talking to
            conversationHistory.push({
                role: "user",
                parts: [{ text: `[SYSTEM CONTEXT: The user visiting the portfolio is named ${visitorName}. Address them by name and be welcoming.]` }]
            });
            conversationHistory.push({
                role: "model",
                parts: [{ text: `Hi ${visitorName}! How can I help you today?` }]
            });
            
            appendMessage('agent', welcomeText, 'text', true);
            showOptions(["View Resume", "Case Studies", "Core Skills", "Work Experience", "Other"]);
        } else {
            welcomeText = `Hey there! I'm Nitin's AI Buddy.<div class="mobile-only-break welcome-line-break"></div> <span class="mobile-sub-text">Let's explore his experience and skills.</span><div class="welcome-gap"></div><span class="mobile-tiny-text"><span class="mobile-unbold">**To personalize our chat,**</span><div class="mobile-only-break welcome-line-break"></div> **may I know who you are?**</span>`;
            
            appendMessage('agent', welcomeText, 'text', true);
            showOptions(["Recruiter", "Hiring Manager", "Founder", "Client", "Other"]);
        }
        
        // Speak the welcome message automatically on load
        speakText(welcomeText);
    }, 500);

    // --- Resume Modal Logic ---
    let pdfRendered = false;
    window.openResumeModal = function() {
        const modal = document.getElementById('resume-modal');
        if (modal) {
            modal.style.display = 'flex';
            modal.style.opacity = 0;
            setTimeout(() => { modal.style.transition = 'opacity 0.2s'; modal.style.opacity = 1; }, 10);
            
            if (!pdfRendered && typeof pdfjsLib !== 'undefined') {
                pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
                
                const loader = document.getElementById('pdf-loader');
                const container = document.getElementById('pdf-container');
                
                pdfjsLib.getDocument('assets/Nitin_Kr_Resume.pdf').promise.then(function(pdfDoc) {
                    if(loader) loader.style.display = 'none';
                    const scale = window.innerWidth < 600 ? 1.0 : 1.5;
                    
                    // Render all 3 pages
                    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
                        pdfDoc.getPage(pageNum).then(function(page) {
                            const viewport = page.getViewport({scale: scale});
                            const canvas = document.createElement('canvas');
                            canvas.style.display = 'block';
                            canvas.style.margin = '0 auto 20px auto';
                            canvas.style.maxWidth = '90%';
                            canvas.style.height = 'auto';
                            canvas.style.boxShadow = '0 4px 20px rgba(0,0,0,0.5)';
                            canvas.style.borderRadius = '4px';
                            canvas.style.backgroundColor = 'white';
                            
                            const ctx = canvas.getContext('2d');
                            canvas.height = viewport.height;
                            canvas.width = viewport.width;
                            
                            const renderContext = { canvasContext: ctx, viewport: viewport };
                            page.render(renderContext);
                            container.appendChild(canvas);
                        });
                    }
                    pdfRendered = true;
                }).catch(err => {
                    console.error('Error loading PDF:', err);
                    if(loader) loader.innerHTML = '<p style="color:#ff4d4f;">Failed to load PDF. Please download it directly.</p><a href="assets/Nitin_Kr_Resume.pdf" download class="ds-btn ds-btn-primary" style="margin-top:10px;text-decoration:none;">Download Resume</a>';
                });
            }
        }
    };

    window.openDribbbleModal = function() {
        const modal = document.getElementById('dribbble-modal');
        if (modal) {
            modal.style.display = 'flex';
            modal.style.opacity = 0;
            setTimeout(() => { modal.style.transition = 'opacity 0.2s'; modal.style.opacity = 1; }, 10);
        }
    };

    const closeResumeBtn = document.getElementById('close-resume-btn');
    if (closeResumeBtn) {
        closeResumeBtn.addEventListener('click', () => {
            const modal = document.getElementById('resume-modal');
            if (modal) {
                modal.style.opacity = 0;
                setTimeout(() => { modal.style.display = 'none'; }, 200);
            }
        });
    }

    const closeDribbbleBtn = document.getElementById('close-dribbble-btn');
    if (closeDribbbleBtn) {
        closeDribbbleBtn.addEventListener('click', () => {
            const modal = document.getElementById('dribbble-modal');
            if (modal) {
                modal.style.opacity = 0;
                setTimeout(() => { modal.style.display = 'none'; }, 200);
            }
        });
    }

    window.openCaseStudyModal = function(url, title, vercelUrl) {
        const modal = document.getElementById('casestudy-modal');
        const iframe = document.getElementById('casestudy-iframe');
        const loader = document.getElementById('casestudy-loader');
        const titleEl = document.getElementById('casestudy-modal-title');
        const externalLink = document.getElementById('casestudy-external-link');
        
        if (modal && iframe) {
            // Show modal and loader immediately
            modal.style.display = 'flex';
            modal.style.opacity = 0;
            setTimeout(() => modal.style.opacity = 1, 10);
            
            if (titleEl) titleEl.innerText = title;
            if (externalLink) externalLink.href = vercelUrl || url;
            
            if (loader) loader.style.display = 'flex';
            
            // Set up iframe state
            iframe.style.opacity = 0;
            iframe.src = url;
            
            iframe.onload = function() {
                try {
                    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                    if (iframeDoc) {
                        // Update parent modal title based on the iframe's document title
                        if (iframeDoc.title && titleEl) {
                            let newTitle = iframeDoc.title.replace(' | UX Case Study', '').replace(' | Nitin Kr', '').trim();
                            if (newTitle) titleEl.innerText = newTitle;
                        }
                        
                        // 1. Inject CSS to completely hide the top navigation, back button, theme toggle and footer
                        const style = iframeDoc.createElement('style');
                        style.textContent = `
                            header, nav, footer, .back-btn, .nav-right, #cs-theme-toggle, .cs-footer { 
                                display: none !important; 
                            }
                            body {
                                padding-top: 0 !important;
                                margin-top: 0 !important;
                            }
                        `;
                        iframeDoc.head.appendChild(style);
                        
                        // 2. Sync theme from main host document to iframe document
                        const hostTheme = document.documentElement.getAttribute('data-theme') || 'dark';
                        iframeDoc.documentElement.setAttribute('data-theme', hostTheme);
                        if (hostTheme === 'light') {
                            iframeDoc.documentElement.classList.remove('dark-mode');
                        } else {
                            iframeDoc.documentElement.classList.add('dark-mode');
                        }
                    }
                } catch (e) {
                    console.error("Could not inject CSS/Theme into iframe", e);
                }
                
                // Hide loader and fade in the fully styled, loaded iframe
                if (loader) loader.style.display = 'none';
                iframe.style.opacity = 1;
            };
        }
    };

    const closeCaseStudyBtn = document.getElementById('close-casestudy-btn');
    if (closeCaseStudyBtn) {
        closeCaseStudyBtn.addEventListener('click', () => {
            const modal = document.getElementById('casestudy-modal');
            const iframe = document.getElementById('casestudy-iframe');
            if (modal) {
                modal.style.opacity = 0;
                setTimeout(() => { 
                    modal.style.display = 'none'; 
                    if (iframe) {
                        iframe.src = 'about:blank'; // Clear to stop scripts/media
                        iframe.style.opacity = 0;
                    }
                }, 200);
            }
        });
    }
});
