require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const MODEL_NAME = process.env.GEMINI_MODEL || 'models/gemini-2.5-pro'; // recommended
const GEMINI_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_KEY) {
  console.warn('❌ GEMINI_API_KEY not set. Chat API will not work.');
}

// Build URL for generateContent
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/${MODEL_NAME}:generateContent`;

// Simple health endpoint
app.get('/api/health', (req, res) => res.json({ ok: true, model: MODEL_NAME }));

// Chat proxy endpoint - expects { message: "text" } or { messages: [...] } (we accept single message for simplicity)
app.post('/api/chat', async (req, res) => {
  try {
    if (!GEMINI_KEY) return res.status(500).json({ error: 'API key missing' });

    // Accept either { message: "..." } or { messages: [{role, content}, ...] }
    const { message, messages } = req.body;

    // If frontend sends messages array, combine user messages into a single text prompt
    let userText = message || '';
    if ((!userText || userText.trim().length === 0) && Array.isArray(messages) && messages.length) {
      // join text parts (simple)
      userText = messages.map(m => m.content || m.text || '').join('\n');
    }

    if (!userText || userText.trim().length === 0) {
      return res.status(400).json({ error: 'No message provided' });
    }

    // Build request body for generateContent
    const body = {
      // Use "text" input as contents.parts. You can extend instructions/system prompt here if needed.
      // Optionally add safetySettings or temperature etc.
      temperature: 0.6,
      maxOutputTokens: 512,
      prompt: {
        // prompt.parts is also accepted in some flavors; using "content" style as robust fallback
        // Use contents to be compatible with many examples:
        // content: [ { type: 'text', text: '...' } ]  OR contents: [{ parts: [{ text: '...' }] }]
      },
      // For widest compatibility, use "content" -> "items" : newer APIs vary; we'll use contents.parts shape:
      contents: [
        {
          parts: [
            { text: userText }
          ]
        }
      ]
    };

    const url = `${GEMINI_API_URL}?key=${GEMINI_KEY}`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await resp.json();

    // Return full Gemini response to frontend for flexible parsing
    return res.json(data);

  } catch (err) {
    console.error('❌ Gemini Chat Proxy Error:', err);
    return res.status(500).json({ error: 'Gemini chat failed', details: String(err) });
  }
});

// Optional: serve static folder
app.use('/static', express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
  console.log(`🚀 FlowPilot API server running at http://localhost:${PORT} (model=${MODEL_NAME})`);
});
