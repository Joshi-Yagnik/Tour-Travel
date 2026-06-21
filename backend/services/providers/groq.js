/* ============================================================
   WANDERLUST — Groq AI Provider
   Primary AI provider using Groq API with Llama 3.3 / Mixtral
   ============================================================ */

'use strict';

const Groq = require('groq-sdk');

/* ── Model Configuration ─────────────────────────────────── */
const MODELS = {
    // Main: fast, high-quality — used for chat & destination intel
    primary:   'llama-3.3-70b-versatile',
    // Fast: used for quick operations like search-assist
    fast:      'llama-3.1-8b-instant',
    // Long context: used for owner advisor with lots of property data
    longCtx:   'mixtral-8x7b-32768',
};

/* ── Retry Config ────────────────────────────────────────── */
const MAX_RETRIES   = 3;
const BASE_DELAY_MS = 600;

class GroqProvider {
    constructor() {
        this.client = null;
        this.available = false;
        this._init();
    }

    _init() {
        const key = process.env.GROQ_API_KEY;
        if (!key) {
            console.log('⚠️  GROQ_API_KEY not set. Groq provider disabled.');
            return;
        }
        try {
            this.client = new Groq({ apiKey: key });
            this.available = true;
            console.log('✅ Groq AI provider initialized (Llama 3.3 70B).');
        } catch (err) {
            console.error('❌ Groq init error:', err.message);
        }
    }

    /* ── Core: send messages to Groq ────────────────────────── */
    async chat(messages, options = {}) {
        if (!this.available) throw new Error('Groq provider not available');

        const model       = options.model || MODELS.primary;
        const maxTokens   = options.maxTokens || 2048;
        const temperature = options.temperature ?? 0.7;

        let lastError;
        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                const completion = await this.client.chat.completions.create({
                    model,
                    messages,
                    max_tokens:  maxTokens,
                    temperature,
                });

                const text = completion.choices[0]?.message?.content;
                if (!text) throw new Error('Empty response from Groq');
                return text;

            } catch (err) {
                lastError = err;

                // Rate limit — wait longer
                if (err.status === 429) {
                    const delay = BASE_DELAY_MS * Math.pow(2, attempt);
                    console.warn(`⚠️  Groq rate limited. Waiting ${delay}ms (attempt ${attempt}/${MAX_RETRIES})`);
                    await sleep(delay);
                    continue;
                }

                // Auth error — don't retry
                if (err.status === 401) {
                    console.error('❌ Groq auth error: Invalid API key');
                    throw err;
                }

                // Other error — short retry
                if (attempt < MAX_RETRIES) {
                    await sleep(BASE_DELAY_MS * attempt);
                    continue;
                }
            }
        }
        throw lastError;
    }

    /* ── Convenience: system + user message ─────────────────── */
    async complete(systemPrompt, userPrompt, options = {}) {
        return this.chat([
            { role: 'system', content: systemPrompt },
            { role: 'user',   content: userPrompt },
        ], options);
    }

    /* ── Convenience: multi-turn chat ───────────────────────── */
    async conversationalChat(systemPrompt, history = [], userMessage, options = {}) {
        const messages = [
            { role: 'system', content: systemPrompt },
            ...history.slice(-10).map(h => ({
                role:    h.role === 'user' ? 'user' : 'assistant',
                content: h.content,
            })),
            { role: 'user', content: userMessage },
        ];
        return this.chat(messages, options);
    }

    /* ── Parse JSON from AI response ─────────────────────────── */
    parseJSON(text) {
        // Strip markdown code fences if present
        const cleaned = text
            .replace(/^```json\s*/i, '')
            .replace(/^```\s*/i, '')
            .replace(/```\s*$/,   '')
            .trim();

        // Find first { or [ to handle leading text
        const start = Math.min(
            cleaned.indexOf('{') === -1 ? Infinity : cleaned.indexOf('{'),
            cleaned.indexOf('[') === -1 ? Infinity : cleaned.indexOf('['),
        );
        const end = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'));
        if (start === Infinity || end === -1) throw new Error('No JSON found in response');
        return JSON.parse(cleaned.slice(start, end + 1));
    }

    /* ── Model getters ───────────────────────────────────────── */
    get primaryModel() { return MODELS.primary; }
    get fastModel()    { return MODELS.fast;    }
    get longCtxModel() { return MODELS.longCtx; }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = new GroqProvider();
