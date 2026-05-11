import express from 'express';
import cors from 'cors';
import 'dotenv/config';

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

// Request Logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Relay endpoint for Gemini AI
app.post('/api/proxy/ai', async (req, res) => {
  const { model, prompt, apiKey } = req.body;
  
  // Use provided key or the secure server-side default from .env
  const activeKey = (apiKey && apiKey.trim() !== "") ? apiKey : process.env.GEMINI_API_KEY;
  const activeModel = model || 'gemini-flash-lite-latest';
  
  if (!activeKey) {
    console.error("[Relay] Missing Gemini API Key");
    return res.status(401).json({ error: "Missing Gemini API Key. Please set it in .env or Settings." });
  }

  console.log(`[Relay] Proxying to Gemini: ${activeModel}`);
  console.log(`[Relay] Using Key starting with: ${activeKey.substring(0, 5)}...`);
  
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${activeModel}:generateContent?key=${activeKey}`,
      {
        method: "POST",
        headers: { 
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ 
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            response_mime_type: "application/json"
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error(`[Relay] Gemini Upstream Error (${response.status}):`, data);
      return res.status(response.status).json({ 
        error: data.error?.message || `Gemini Service ${response.status}`,
        details: data 
      });
    }

    res.json(data);
  } catch (error) {
    console.error("[Relay] Critical Fetch Error:", error.message);
    res.status(500).json({ error: "Backend Relay Failure", details: error.message });
  }
});

// Relay endpoint for Google Sheets
app.post('/api/proxy/sheets', async (req, res) => {
  const { url, data } = req.body;
  console.log(`[Relay] Syncing to Google Sheets...`);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    res.json({ success: true, message: "Sync Relay Complete" });
  } catch (error) {
    console.error("[Relay] Sheets Sync Error:", error.message);
    res.status(500).json({ error: "Sync Relay Failure", details: error.message });
  }
});

app.listen(port, () => {
  console.log(`[${new Date().toISOString()}] 🚀 LeadPilot Backend Relay active on port ${port}`);
});
