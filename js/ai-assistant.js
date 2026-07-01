/* ============================================================
   WANDERLUST — AI Travel Assistant Widget v2.0
   WanderBot: Powered by Gemini AI
   Features: Chat, Voice, Quick Prompts, Itinerary Generator
   ============================================================ */

(function () {
    'use strict';

    const API_AI = '/api/ai';

    // Don't initialize on admin pages
    if (window.location.pathname.includes('/admin')) return;

    let chatHistory = [];
    let isOpen      = false;
    let isTyping    = false;
    let recognition = null;

    /* ── Quick Prompts ──────────────────────────────────────── */
    const QUICK_PROMPTS = [
        '🏛️ Plan Udaipur trip under ₹15,000',
        '🙏 Dharamshala near Somnath Temple',
        '🗺️ Best places in Gujarat',
        '🌄 Weekend getaway from Ahmedabad',
        '🏨 Homestays in Coorg ₹2000/night',
        '🎒 Budget Rajasthan guide',
        '🚂 Char Dham Yatra planning',
        '🌊 Goa budget trip 5 days',
    ];

    /* ── Inject CSS ─────────────────────────────────────────── */
    const css = `
        .ai-widget {
            position: fixed;
            bottom: 90px;
            right: 24px;
            z-index: 9000;
            font-family: var(--font-main, 'Inter', sans-serif);
        }

        .ai-bubble {
            width: 56px;
            height: 56px;
            border-radius: 50%;
            background: linear-gradient(135deg, #FF6B35, #E5521C);
            box-shadow: 0 8px 25px rgba(255,107,53,0.4);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 22px;
            transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            border: none;
            outline: none;
            position: relative;
        }
        .ai-bubble:hover {
            transform: scale(1.12);
            box-shadow: 0 12px 35px rgba(255,107,53,0.5);
        }
        .ai-bubble.open {
            background: linear-gradient(135deg, #1A1A2E, #0F3460);
            transform: scale(0.9);
        }
        .ai-bubble__pulse {
            position: absolute;
            width: 100%;
            height: 100%;
            border-radius: 50%;
            background: rgba(255,107,53,0.3);
            animation: ai-pulse 2s ease-in-out infinite;
        }
        @keyframes ai-pulse {
            0%, 100% { transform: scale(1); opacity: 0.6; }
            50% { transform: scale(1.3); opacity: 0; }
        }
        .ai-bubble.open .ai-bubble__pulse { display: none; }

        .ai-tooltip {
            position: absolute;
            right: 66px;
            bottom: 50%;
            transform: translateY(50%);
            background: var(--secondary, #1A1A2E);
            color: white;
            padding: 8px 14px;
            border-radius: 8px;
            font-size: 13px;
            white-space: nowrap;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.2s;
        }
        .ai-tooltip::after {
            content: '';
            position: absolute;
            right: -6px;
            top: 50%;
            transform: translateY(-50%);
            border: 6px solid transparent;
            border-left-color: var(--secondary, #1A1A2E);
            border-right: 0;
        }
        .ai-bubble:hover .ai-tooltip { opacity: 1; }

        /* Chat Panel */
        .ai-panel {
            position: fixed;
            bottom: 160px;
            right: 24px;
            width: 380px;
            max-width: calc(100vw - 32px);
            height: 560px;
            max-height: calc(100vh - 200px);
            background: var(--white, #fff);
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.2);
            display: flex;
            flex-direction: column;
            overflow: hidden;
            opacity: 0;
            transform: translateY(20px) scale(0.96);
            pointer-events: none;
            transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            z-index: 8999;
        }
        .ai-panel.visible {
            opacity: 1;
            transform: translateY(0) scale(1);
            pointer-events: all;
        }

        /* Panel Header */
        .ai-panel__header {
            background: linear-gradient(135deg, #FF6B35, #E5521C);
            padding: 16px 18px;
            color: white;
            display: flex;
            align-items: center;
            gap: 12px;
            flex-shrink: 0;
        }
        .ai-panel__avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: rgba(255,255,255,0.2);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
        }
        .ai-panel__info h4 {
            margin: 0;
            font-size: 15px;
            font-weight: 700;
        }
        .ai-panel__info p {
            margin: 0;
            font-size: 11px;
            opacity: 0.85;
        }
        .ai-panel__status {
            width: 8px;
            height: 8px;
            background: #4ade80;
            border-radius: 50%;
            margin-left: 4px;
            box-shadow: 0 0 0 2px rgba(74,222,128,0.3);
        }
        .ai-panel__close {
            margin-left: auto;
            background: none;
            border: none;
            color: white;
            cursor: pointer;
            font-size: 18px;
            padding: 4px;
            opacity: 0.8;
            transition: opacity 0.2s;
        }
        .ai-panel__close:hover { opacity: 1; }

        /* Messages */
        .ai-messages {
            flex: 1;
            overflow-y: auto;
            padding: 16px;
            display: flex;
            flex-direction: column;
            gap: 12px;
            scroll-behavior: smooth;
            background: var(--bg-light, #F7FAFC);
        }
        .ai-messages::-webkit-scrollbar { width: 4px; }
        .ai-messages::-webkit-scrollbar-thumb { background: var(--border, #E2E8F0); border-radius: 4px; }

        .ai-msg {
            display: flex;
            gap: 8px;
            animation: msg-in 0.3s ease;
        }
        @keyframes msg-in {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .ai-msg.user { flex-direction: row-reverse; }

        .ai-msg__avatar {
            width: 30px;
            height: 30px;
            border-radius: 50%;
            flex-shrink: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 13px;
        }
        .ai-msg.bot .ai-msg__avatar {
            background: linear-gradient(135deg, #FF6B35, #E5521C);
            color: white;
        }
        .ai-msg.user .ai-msg__avatar {
            background: var(--primary-glow, rgba(255,107,53,0.15));
            color: var(--primary, #FF6B35);
        }

        .ai-msg__bubble {
            max-width: 78%;
            padding: 10px 14px;
            border-radius: 16px;
            font-size: 13.5px;
            line-height: 1.55;
        }
        .ai-msg.bot .ai-msg__bubble {
            background: white;
            border: 1px solid var(--border, #E2E8F0);
            border-bottom-left-radius: 4px;
            color: var(--text-dark, #1A202C);
        }
        .ai-msg.user .ai-msg__bubble {
            background: linear-gradient(135deg, #FF6B35, #E5521C);
            color: white;
            border-bottom-right-radius: 4px;
        }

        /* Typing indicator */
        .ai-typing {
            display: flex;
            gap: 4px;
            align-items: center;
            padding: 12px 14px;
        }
        .ai-typing__dot {
            width: 7px;
            height: 7px;
            background: var(--text-muted, #A0AEC0);
            border-radius: 50%;
            animation: typing 1.4s ease-in-out infinite;
        }
        .ai-typing__dot:nth-child(2) { animation-delay: 0.2s; }
        .ai-typing__dot:nth-child(3) { animation-delay: 0.4s; }
        @keyframes typing {
            0%, 60%, 100% { transform: translateY(0); }
            30% { transform: translateY(-8px); }
        }

        /* Quick prompts */
        .ai-quick {
            padding: 10px 14px;
            border-top: 1px solid var(--border, #E2E8F0);
            background: white;
            flex-shrink: 0;
        }
        .ai-quick__label {
            font-size: 11px;
            color: var(--text-muted, #A0AEC0);
            margin-bottom: 7px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        .ai-quick__chips {
            display: flex;
            gap: 6px;
            flex-wrap: nowrap;
            overflow-x: auto;
            padding-bottom: 2px;
        }
        .ai-quick__chips::-webkit-scrollbar { display: none; }
        .ai-chip {
            white-space: nowrap;
            font-size: 11.5px;
            padding: 5px 10px;
            border-radius: 20px;
            border: 1px solid var(--border, #E2E8F0);
            background: var(--bg-light, #F7FAFC);
            cursor: pointer;
            transition: all 0.2s;
            color: var(--text-body, #4A5568);
        }
        .ai-chip:hover {
            border-color: var(--primary, #FF6B35);
            background: var(--primary-glow, rgba(255,107,53,0.08));
            color: var(--primary, #FF6B35);
        }

        /* Input area */
        .ai-input-area {
            padding: 12px 14px;
            border-top: 1px solid var(--border, #E2E8F0);
            display: flex;
            gap: 8px;
            align-items: flex-end;
            background: white;
            flex-shrink: 0;
        }
        .ai-input {
            flex: 1;
            border: 1.5px solid var(--border, #E2E8F0);
            border-radius: 12px;
            padding: 9px 12px;
            font-size: 13.5px;
            resize: none;
            max-height: 80px;
            min-height: 38px;
            font-family: inherit;
            transition: border-color 0.2s;
            background: var(--bg-light, #F7FAFC);
            color: var(--text-dark, #1A202C);
            outline: none;
        }
        .ai-input:focus {
            border-color: var(--primary, #FF6B35);
            background: white;
        }
        .ai-send-btn, .ai-voice-btn {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            border: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            transition: all 0.2s;
            font-size: 14px;
        }
        .ai-send-btn {
            background: linear-gradient(135deg, #FF6B35, #E5521C);
            color: white;
        }
        .ai-send-btn:hover { transform: scale(1.1); }
        .ai-send-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
        .ai-voice-btn {
            background: var(--bg-light, #F7FAFC);
            color: var(--text-body, #4A5568);
            border: 1.5px solid var(--border, #E2E8F0);
        }
        .ai-voice-btn:hover { background: var(--primary-glow, rgba(255,107,53,0.1)); color: var(--primary, #FF6B35); }
        .ai-voice-btn.listening {
            background: #E53E3E;
            color: white;
            border-color: #E53E3E;
            animation: voice-pulse 1s ease-in-out infinite;
        }
        @keyframes voice-pulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(229,62,62,0.4); }
            50% { box-shadow: 0 0 0 8px rgba(229,62,62,0); }
        }

        /* Dark mode support */
        [data-theme="dark"] .ai-panel,
        [data-theme="dark"] .ai-input-area,
        [data-theme="dark"] .ai-quick {
            background: #1A1A2E;
        }
        [data-theme="dark"] .ai-msg.bot .ai-msg__bubble {
            background: #16213E;
            border-color: #2D3748;
            color: #E2E8F0;
        }
        [data-theme="dark"] .ai-messages { background: #0F3460; }
        [data-theme="dark"] .ai-input {
            background: #16213E;
            border-color: #2D3748;
            color: #E2E8F0;
        }
        [data-theme="dark"] .ai-chip {
            background: #16213E;
            border-color: #2D3748;
            color: #A0AEC0;
        }

        @media (max-width: 768px) {
            .ai-panel {
                right: 10px;
                left: 10px;
                width: auto;
                bottom: 130px;
                max-height: 55vh;
                border-radius: 16px;
            }
            .ai-widget { right: 14px; bottom: 80px; }
        }

        @media (max-width: 480px) {
            .ai-panel {
                right: 8px;
                left: 8px;
                width: auto;
                bottom: 120px;
                max-height: 58vh;
            }
            .ai-widget { right: 12px; bottom: 72px; }
            .ai-bubble { width: 50px; height: 50px; font-size: 20px; }
        }
    `;

    const styleEl = document.createElement('style');
    styleEl.textContent = css;
    document.head.appendChild(styleEl);

    /* ── Build Widget HTML ──────────────────────────────────── */
    const widget = document.createElement('div');
    widget.className = 'ai-widget';
    widget.innerHTML = `
        <div class="ai-panel" id="ai-panel">
            <div class="ai-panel__header">
                <div class="ai-panel__avatar">🧭</div>
                <div class="ai-panel__info">
                    <h4>WanderBot <span class="ai-panel__status"></span></h4>
                    <p>AI Travel Assistant · India Expert</p>
                </div>
                <button class="ai-panel__close" id="ai-close" aria-label="Close AI">
                    <i class="fas fa-times"></i>
                </button>
            </div>

            <div class="ai-messages" id="ai-messages"></div>

            <div class="ai-quick" id="ai-quick">
                <div class="ai-quick__label">Quick Suggestions</div>
                <div class="ai-quick__chips" id="ai-chips"></div>
            </div>

            <div class="ai-input-area">
                <button class="ai-voice-btn" id="ai-voice" title="Voice input">
                    <i class="fas fa-microphone"></i>
                </button>
                <textarea
                    class="ai-input"
                    id="ai-input"
                    placeholder="Ask me about trips, hotels, dharamshalas..."
                    rows="1"
                ></textarea>
                <button class="ai-send-btn" id="ai-send" title="Send">
                    <i class="fas fa-paper-plane"></i>
                </button>
            </div>
        </div>

        <button class="ai-bubble" id="ai-bubble" aria-label="Open AI Travel Assistant">
            <div class="ai-bubble__pulse"></div>
            <i class="fas fa-robot"></i>
            <div class="ai-tooltip">AI Travel Assistant</div>
        </button>
    `;
    document.body.appendChild(widget);

    /* ── Elements ───────────────────────────────────────────── */
    const panel    = document.getElementById('ai-panel');
    const bubble   = document.getElementById('ai-bubble');
    const messagesEl = document.getElementById('ai-messages');
    const inputEl  = document.getElementById('ai-input');
    const sendBtn  = document.getElementById('ai-send');
    const voiceBtn = document.getElementById('ai-voice');
    const chipsEl  = document.getElementById('ai-chips');
    const closeBtn = document.getElementById('ai-close');

    /* ── Initialize ─────────────────────────────────────────── */
    function init() {
        // Load quick prompts
        loadQuickPrompts();

        // Welcome message
        addMessage('bot', `👋 Hello! I'm **WanderBot**, your AI travel assistant.\n\nI can help you with:\n• 🗺️ Trip planning & itineraries\n• 🏨 Hotels, dharamshalas & homestays\n• 💰 Budget planning in ₹\n• 🧭 Nearby place discovery\n• 🙏 Pilgrimage routes\n\nWhat's your travel question? ✈️`);
    }

    /* ── Load Quick Prompts ─────────────────────────────────── */
    async function loadQuickPrompts() {
        let prompts = QUICK_PROMPTS;
        try {
            const res = await fetch(API_AI + '/suggestions');
            if (res.ok) {
                const data = await res.json();
                if (data.quick_prompts) prompts = data.quick_prompts.slice(0, 8);
            }
        } catch (e) {}

        chipsEl.innerHTML = '';
        prompts.forEach(prompt => {
            const chip = document.createElement('button');
            chip.className = 'ai-chip';
            chip.textContent = prompt;
            chip.addEventListener('click', () => sendMessage(prompt));
            chipsEl.appendChild(chip);
        });
    }

    /* ── Add Message to UI ──────────────────────────────────── */
    function addMessage(role, content) {
        const msg = document.createElement('div');
        msg.className = `ai-msg ${role}`;

        const avatarIcon = role === 'bot' ? '🧭' : '👤';
        const formattedContent = formatMarkdown(content);

        msg.innerHTML = `
            <div class="ai-msg__avatar">${avatarIcon}</div>
            <div class="ai-msg__bubble">${formattedContent}</div>
        `;

        messagesEl.appendChild(msg);
        scrollToBottom();

        // Update user avatar if logged in
        if (role === 'user' && window.WL?.Session?.isLoggedIn()) {
            const user = WL.Session.getUser();
            const avatar = msg.querySelector('.ai-msg__avatar');
            if (user && user.name) {
                const initials = user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                avatar.textContent = initials;
                avatar.style.background = '#FF6B35';
                avatar.style.color = 'white';
                avatar.style.fontSize = '11px';
                avatar.style.fontWeight = '700';
            }
        }

        return msg;
    }

    /* ── Simple Markdown Formatter ──────────────────────────── */
    function formatMarkdown(text) {
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code style="background:rgba(0,0,0,0.08);padding:1px 5px;border-radius:3px;font-family:monospace;font-size:0.9em">$1</code>')
            .replace(/\n/g, '<br>')
            .replace(/• /g, '&bull; ');
    }

    /* ── Show Typing Indicator ──────────────────────────────── */
    function showTyping() {
        const typing = document.createElement('div');
        typing.className = 'ai-msg bot';
        typing.id = 'ai-typing';
        typing.innerHTML = `
            <div class="ai-msg__avatar">🧭</div>
            <div class="ai-msg__bubble ai-typing">
                <div class="ai-typing__dot"></div>
                <div class="ai-typing__dot"></div>
                <div class="ai-typing__dot"></div>
            </div>
        `;
        messagesEl.appendChild(typing);
        scrollToBottom();
    }

    function hideTyping() {
        document.getElementById('ai-typing')?.remove();
    }

    /* ── Send Message ───────────────────────────────────────── */
    async function sendMessage(text) {
        const message = (text || inputEl.value).trim();
        if (!message || isTyping) return;

        inputEl.value = '';
        inputEl.style.height = 'auto';
        isTyping = true;
        sendBtn.disabled = true;

        // Add user message
        addMessage('user', message);
        chatHistory.push({ role: 'user', content: message });

        // Hide quick prompts after first message
        document.getElementById('ai-quick').style.display = 'none';

        // Show typing
        showTyping();

        try {
            const res = await fetch(API_AI + '/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message,
                    history: chatHistory.slice(-10),
                }),
            });

            const data = await res.json();
            hideTyping();

            if (data.success) {
                addMessage('bot', data.response);
                chatHistory.push({ role: 'bot', content: data.response });
            } else {
                addMessage('bot', '❌ Sorry, I encountered an error. Please try again.');
            }
        } catch (err) {
            hideTyping();
            addMessage('bot', '🌐 I\'m having trouble connecting. Please check your internet connection and try again.');
        }

        isTyping = false;
        sendBtn.disabled = false;
        inputEl.focus();
    }

    function scrollToBottom() {
        messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    /* ── Toggle Chat Panel ──────────────────────────────────── */
    function togglePanel() {
        isOpen = !isOpen;
        panel.classList.toggle('visible', isOpen);
        bubble.classList.toggle('open', isOpen);
        bubble.querySelector('i').className = isOpen ? 'fas fa-times' : 'fas fa-robot';
        if (isOpen) {
            inputEl.focus();
            scrollToBottom();
        }
    }

    /* ── Voice Input ────────────────────────────────────────── */
    function setupVoice() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            voiceBtn.style.display = 'none';
            return;
        }

        recognition = new SpeechRecognition();
        recognition.lang = 'en-IN';
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => {
            voiceBtn.classList.add('listening');
            voiceBtn.querySelector('i').className = 'fas fa-stop';
            if (window.showToast) showToast('🎤 Listening...', 'info', 3000);
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            inputEl.value = transcript;
        };

        recognition.onend = () => {
            voiceBtn.classList.remove('listening');
            voiceBtn.querySelector('i').className = 'fas fa-microphone';
        };

        recognition.onerror = () => {
            voiceBtn.classList.remove('listening');
            voiceBtn.querySelector('i').className = 'fas fa-microphone';
        };

        voiceBtn.addEventListener('click', () => {
            if (voiceBtn.classList.contains('listening')) {
                recognition.stop();
            } else {
                recognition.start();
            }
        });
    }

    /* ── Event Listeners ────────────────────────────────────── */
    bubble.addEventListener('click', togglePanel);
    closeBtn.addEventListener('click', togglePanel);

    sendBtn.addEventListener('click', () => sendMessage());

    inputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Auto-resize textarea
    inputEl.addEventListener('input', () => {
        inputEl.style.height = 'auto';
        inputEl.style.height = Math.min(inputEl.scrollHeight, 80) + 'px';
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
        if (isOpen && !widget.contains(e.target)) {
            // Don't close on outside click (better UX)
        }
    });

    // Keyboard shortcut: Ctrl+/ to toggle
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === '/') {
            e.preventDefault();
            togglePanel();
        }
    });

    /* ── Initialize ─────────────────────────────────────────── */
    setupVoice();
    init();

})();
