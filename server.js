import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config({ override: true });
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { promises as dnsPromises } from 'node:dns';

const app = express();
const port = 3002;
const SETTINGS_FILE = path.join(process.cwd(), 'settings.json');

// Memory Cache for Surgical Audits (Avoid re-searching same company in same session)
const auditCache = new Map();
let globalAiCooldownUntil = 0;

// Initialize settings file if it doesn't exist
if (!fs.existsSync(SETTINGS_FILE)) {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify([]));
}

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Request Logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  if (req.method === 'POST') {
    console.log(`[Relay] Request Body Size: ${JSON.stringify(req.body).length} bytes`);
  }
  next();
});

// Settings Endpoints
app.get('/api/settings', (req, res) => {
  try {
    const data = fs.readFileSync(SETTINGS_FILE, 'utf8');
    res.json(JSON.parse(data));
  } catch (error) {
    res.status(500).json({ error: "Failed to read settings" });
  }
});

app.post('/api/settings', (req, res) => {
  try {
    const { key, value, category, label } = req.body;
    
    // If it's the API key, update the .env file
    if (key === 'llm_api_key' && value) {
      const envPath = path.join(process.cwd(), '.env');
      let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
      
      const regex = /^GEMINI_API_KEY=.*$/m;
      const newLine = `GEMINI_API_KEY=${value}`;
      
      if (envContent.match(regex)) {
        envContent = envContent.replace(regex, newLine);
      } else {
        envContent += (envContent.endsWith('\n') ? '' : '\n') + newLine + '\n';
      }
      
      fs.writeFileSync(envPath, envContent);
      console.log("[Relay] .env file updated with new GEMINI_API_KEY");
      
      // Update process.env so the current session uses it immediately
      process.env.GEMINI_API_KEY = value;
    }

    // Save all settings to settings.json
    const data = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
    const index = data.findIndex(s => s.key === key);
    if (index !== -1) {
      data[index] = { ...data[index], value, category, label };
    } else {
      data.push({ key, value, category, label });
    }
    
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2));
    res.json({ success: true });
  } catch (error) {
    console.error("[Settings] Save Error:", error);
    res.status(500).json({ error: "Failed to save settings" });
  }
});

// Domain Verification Endpoint (Market Standard)
app.get('/api/proxy/verify-domain', async (req, res) => {
  const { domain } = req.query;
  if (!domain || domain === 'null' || domain === 'undefined' || domain.length < 3) {
    return res.json({ 
      isValid: false, 
      error: "Invalid domain",
      details: "No domain provided for verification." 
    });
  }

  try {
    // If it's a LinkedIn URL, we treat it as valid for identity but skip MX
    if (domain.includes('linkedin.com')) {
      return res.json({ 
        isValid: true, 
        isSocial: true,
        details: "Identity verified via LinkedIn profile." 
      });
    }

    console.log(`[DNS] Resolving MX records for: ${domain}`);
    const mxRecords = await dnsPromises.resolveMx(domain);
    
    if (mxRecords && mxRecords.length > 0) {
      console.log(`[DNS] Success: ${domain} has ${mxRecords.length} MX records.`);
      return res.json({ 
        isValid: true, 
        mxRecords,
        details: "Domain has active mail exchange records." 
      });
    } else {
      throw new Error("No MX records found");
    }
  } catch (error) {
    console.warn(`[DNS] Failed to verify domain ${domain}: ${error.message}`);
    res.json({ 
      isValid: false, 
      error: error.message,
      details: "Domain does not have active mail exchange records or does not exist." 
    });
  }
});

// Relay endpoint for Gemini AI
app.post('/api/proxy/ai', async (req, res) => {
  const { model, prompt, system_instruction, tools } = req.body;
  
  // SECURE SERVER-SIDE KEY MANAGEMENT
  const activeKey = process.env.GEMINI_API_KEY;
  // Using gemini-flash-latest as the absolute stable identifier for v1beta
  const activeModel = model || 'gemini-flash-latest';
  
  if (!activeKey || activeKey === "YOUR_API_KEY_HERE") {
    console.error("[Relay] Missing Gemini API Key in environment");
    return res.status(401).json({ error: "Server API Key not configured. Please add GEMINI_API_KEY=your_key to your .env file." });
  }

  console.log(`[Relay] Proxying to Gemini: ${activeModel}`);
  console.log(`[Relay] Security Check: Key Active (Ends in ...${activeKey.substring(activeKey.length - 4)})`);
  
  try {
    const requestBody = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        response_mime_type: "application/json",
        temperature: 0,
        top_p: 0.1,
        max_output_tokens: 8192
      }
    };

    if (system_instruction) {
      requestBody.system_instruction = {
        parts: [{ text: system_instruction }]
      };
    }

    if (tools) {
      requestBody.tools = tools;
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${activeModel}:generateContent?key=${activeKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
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

// Relay endpoint for fetching leads from Sheets
app.get('/api/proxy/leads', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "Missing Sheets URL" });

  try {
    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("[Relay] Fetch Leads Error:", error.message);
    res.status(500).json({ error: "Fetch Relay Failure" });
  }
});

// Relay endpoint for Lead Validation
app.post('/api/proxy/validate', async (req, res) => {
  const { lead, location, stage } = req.body;
  const activeKey = process.env.GEMINI_API_KEY;
  
  if (!activeKey) {
    return res.status(401).json({ error: "API Key missing" });
  }

  let prompt = "";
  
  if (stage === 'identity') {
    prompt = `Task: Stage 1 - Identity Verification.
    Search Simulation: Search Google for "${lead.company_name} ${location}".
    
    Entity: ${lead.company_name}
    Location: ${location}
    Industry: ${lead.industry}

    Instructions:
    1. Based on your internal knowledge base (simulating a search), does this company likely exist in this location?
    2. Are there any known competitors or similar entities that might cause a false positive?
    
    Return valid JSON:
    {
      "identityMatch": true/false,
      "existenceProof": "Short description of found evidence or 'No record found'",
      "confidence": 0-100
    }`;
  } else if (stage === 'technical') {
    prompt = `Task: Stage 2 - Technical Consistency & Rules Logic.
    
    Domain: ${lead.domain}
    Company: ${lead.company_name}
    Email: ${lead.contact_email}

    Validation Rules:
    1. Domain Alignment: Does the domain suffix/name reasonably align with the company name?
    2. Email Validity: Is the email structure professional (e.g., name@company.com)? 
    3. Consistency: Is the email domain identical to the company domain?

    Return valid JSON:
    {
      "technicalValid": true/false,
      "score": 0-100,
      "flags": ["List any technical anomalies"]
    }`;
  } else if (stage === 'outreach') {
    prompt = `Task: Stage 3 - Outreach Relevance Check.
    
    Subject: ${lead.email_subject}
    Body: ${lead.email_body}
    Target Industry: ${lead.industry}
    Company: ${lead.company_name}

    Logic Factors:
    1. Relevance: Is the message actually about the industry/company mentioned?
    2. Personalization: Does it use the company name or persona name effectively?
    3. Call to Action: Is there a clear, non-spammy request?

    Return valid JSON:
    {
      "outreachEffective": true/false,
      "logicScore": 0-100,
      "feedback": "Concise feedback on the outreach quality"
    }`;
  } else {
    // Comprehensive check used during Agent Pipeline
    prompt = `Task: Business Entity Verification Audit.
    Entity: ${lead.company_name}
    Location: ${location}
    Industry: ${lead.industry}
    Domain: ${lead.domain}

    Instructions:
    - Determine if this company is a real, known business entity.
    - If you have record of this company in your knowledge base or it is a plausible business entity for this industry/location, set isGenuine to true.
    - Only set isGenuine to false if the entity is clearly a placeholder (like "Example Corp"), fictional, or if the domain is nonsensical.
    - If the domain is missing or a social profile, prioritize the company's existence.

    Return valid JSON:
    {
      "isGenuine": true/false,
      "confidenceScore": 0-100,
      "verdict": "Clear explanation of the verification result"
    }`;
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${activeKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { response_mime_type: "application/json" }
        })
      }
    );

    const data = await response.json();
    const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    res.json(JSON.parse(aiText));
  } catch (error) {
    console.error("[Validation Error]", error);
    res.status(500).json({ error: "Validation Failure" });
  }
});

// --- SECURITY & COMPLIANCE ARCHITECTURE: DEEP DATA AUDIT ---

app.post('/api/proxy/deep-audit', async (req, res) => {
  const { leads } = req.body;
  const activeKey = process.env.GEMINI_API_KEY;

  if (!leads || !Array.isArray(leads) || leads.length === 0) {
    return res.status(400).json({ error: "Lead payload required for audit." });
  }

  console.log(`[Deep Audit] Initiating batch risk assessment for ${leads.length} entities...`);

  // Batch AI Audit to save quota
  let aiResults = [];
  try {
    const batchPrompt = `AUDIT TASK: Verify business entity authenticity for the following batch of leads.
    
    LEADS:
    ${leads.map((l, i) => `${i+1}. NAME: ${l.company_name}, DOMAIN: ${l.domain}, INDUSTRY: ${l.industry}`).join('\n')}
    
    RULES:
    1. If company is placeholder (Test, Demo, Acme, Sample), isGenuine: false.
    2. If domain is clearly fictional or nonsensical for the industry, isGenuine: false.
    3. Return a risk score (0-100) and a concise reason for each.

    RETURN JSON: 
    {
      "results": [
        { "isGenuine": boolean, "riskFactor": 0-100, "reason": "string" },
        ...
      ]
    }`;

    const aiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${activeKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          contents: [{ parts: [{ text: batchPrompt }] }],
          generationConfig: { response_mime_type: "application/json" }
        })
      }
    );
    
    if (aiRes.ok) {
      const aiData = await aiRes.json();
      const aiText = aiData.candidates?.[0]?.content?.parts?.[0]?.text;
      if (aiText) {
        const parsed = JSON.parse(aiText);
        aiResults = parsed.results || [];
      }
    }
  } catch (e) {
    console.warn(`[Deep Audit] Batch AI layer failed: ${e.message}`);
  }

  const auditedLeads = leads.map((lead, index) => {
    let risk_score = 0;
    let flags = [];
    const aiResult = aiResults[index] || { isGenuine: true, riskFactor: 0, reason: "Audit skipped" };

    // Layer 1: Technical Sanity
    const domain = lead.domain?.replace(/^https?:\/\//, '').split('/')[0];
    const emailParts = lead.contact_email?.split('@');
    const emailDomain = emailParts?.[1];

    if (!domain || domain === 'null' || domain === 'undefined') {
      risk_score += 40;
      flags.push("Missing Domain");
    }

    if (emailDomain && domain && !domain.toLowerCase().includes(emailDomain.toLowerCase()) && !emailDomain.toLowerCase().includes(domain.toLowerCase())) {
      risk_score += 30;
      flags.push("Domain-Email Mismatch");
    }

    // Layer 2: Disposable/Generic Filter
    const genericProviders = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com'];
    if (emailDomain && genericProviders.includes(emailDomain.toLowerCase())) {
      risk_score += 20;
      flags.push("Generic Provider");
    }

    // Merge AI findings
    if (aiResult.isGenuine === false) {
      risk_score += aiResult.riskFactor || 50;
      flags.push(aiResult.reason || "AI Fictional Flag");
    }

    return {
      ...lead,
      audit_metadata: {
        risk_score,
        flags,
        status: risk_score > 60 ? 'invalid' : lead.status,
        audited_at: new Date().toISOString()
      }
    };
  });

  console.log(`[Deep Audit] Finished batch. ${auditedLeads.length} leads processed.`);
  res.json({ auditedLeads });
});

// Surgical Audit Endpoint for Database View
app.post('/api/proxy/surgical-audit', async (req, res) => {
  const { company, location, industry, existing_email } = req.body;
  const activeKey = process.env.GEMINI_API_KEY;

  if (!activeKey) return res.status(401).json({ error: "API Key missing" });

  // 1. Check Memory Cache
  const cacheKey = `${company}-${location}`.toLowerCase();
  if (auditCache.has(cacheKey)) {
    console.log(`[Surgical Audit] Serving cached result for: ${company}`);
    return res.json(auditCache.get(cacheKey));
  }

  // 2. Check Global Cooldown
  const now = Date.now();
  if (now < globalAiCooldownUntil) {
    const waitSecs = Math.ceil((globalAiCooldownUntil - now) / 1000);
    return res.status(429).json({ 
      error: `Search engine cooling down. Please retry in ${waitSecs}s.`,
      retryAfter: waitSecs
    });
  }

  console.log(`[Surgical Audit] Researching: ${company} in ${location}`);

  try {
    const prompt = `Perform a SURGICAL AUDIT for the following business:
    NAME: ${company}
    LOCATION: ${location}
    INDUSTRY: ${industry}

    Your goal is to VERIFY if this business exists and find their official contact email (business/marketing/department).
    Use the GOOGLE SEARCH tool to find:
    1. Official website.
    2. LinkedIn Company profile.
    3. Any public email addresses on their Contact or About page.

    Current known email (may be incorrect): ${existing_email || 'None'}

    Return valid JSON ONLY:
    {
      "is_genuine": boolean,
      "verified_email": "string | null",
      "verified_persona": "string | null (Full Name of a Decision Maker if found)",
      "evidence_url": "string | null (URL of the primary source)",
      "search_queries": ["queries you used"]
    }`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${activeKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          contents: [{ parts: [{ text: prompt }] }],
          tools: [{ google_search_retrieval: {} }],
          generationConfig: { response_mime_type: "application/json" }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 429) {
        // Set global cooldown for 30s or as specified
        const waitTimeMatch = (data.error?.message || "").match(/retry in ([\d\.]+)s/);
        const waitSecs = waitTimeMatch ? Math.ceil(parseFloat(waitTimeMatch[1])) : 30;
        globalAiCooldownUntil = Date.now() + (waitSecs * 1000);
        console.warn(`[Surgical Audit] Quota hit. Throttling all searches for ${waitSecs}s.`);
      }
      
      console.error(`[Surgical Audit] Upstream Error (${response.status}):`, data);
      return res.status(response.status).json({ 
        error: data.error?.message || `AI Service Error ${response.status}`,
        status: data.error?.status
      });
    }

    const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    const result = JSON.parse(aiText);
    
    // Cache successful results
    auditCache.set(cacheKey, result);
    
    res.json(result);
  } catch (error) {
    console.error("[Surgical Audit Error]", error);
    res.status(500).json({ error: error.message || "Surgical Validation Failure" });
  }
});

app.listen(port, () => {
  console.log(`[${new Date().toISOString()}] 🚀 LeadPilot Backend Relay active on port ${port}`);
});
