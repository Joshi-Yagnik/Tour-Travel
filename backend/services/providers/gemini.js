/* ============================================================
   WANDERLUST — Gemini AI Provider (Fallback)
   Used when Groq is unavailable or rate limited.
   ============================================================ */

'use strict';

class GeminiProvider {
    constructor() {
        this.model     = null;
        this.available = false;
        this._init();
    }

    _init() {
        const key = process.env.GEMINI_API_KEY;
        if (!key) return;
        try {
            const { GoogleGenerativeAI } = require('@google/generative-ai');
            const genAI   = new GoogleGenerativeAI(key);
            this.model    = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
            this.available = true;
            console.log('✅ Gemini AI provider initialized (fallback).');
        } catch (err) {
            console.log('ℹ️  Gemini provider unavailable:', err.message);
        }
    }

    async complete(systemPrompt, userPrompt) {
        if (!this.available) throw new Error('Gemini provider not available');

        const chat = this.model.startChat({
            history: [
                { role: 'user',  parts: [{ text: systemPrompt }] },
                { role: 'model', parts: [{ text: 'Understood! Ready to help.' }] },
            ],
        });
        const result = await chat.sendMessage(userPrompt);
        return result.response.text();
    }

    async conversationalChat(systemPrompt, history = [], userMessage) {
        if (!this.available) throw new Error('Gemini provider not available');

        const geminiHistory = [
            { role: 'user',  parts: [{ text: systemPrompt }] },
            { role: 'model', parts: [{ text: 'Understood! Ready to help.' }] },
            ...history.slice(-8).map(h => ({
                role:  h.role === 'user' ? 'user' : 'model',
                parts: [{ text: h.content }],
            })),
        ];

        const chat   = this.model.startChat({ history: geminiHistory });
        const result = await chat.sendMessage(userMessage);
        return result.response.text();
    }

    parseJSON(text) {
        const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        return JSON.parse(cleaned);
    }
}

module.exports = new GeminiProvider();
