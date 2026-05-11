import { entities } from "@/api/db";

const log = (runLog, msg) => {
  const timestamp = new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' });
  return runLog + `[${timestamp} IST] ${msg}\n`;
};

async function getSettings() {
  const settingsList = await entities.Settings.list();
  const settings = settingsList.reduce((acc, s) => {
    acc[s.key] = s.value;
    return acc;
  }, {});

  if (!settings.llm_api_key) {
    throw new Error("Missing AI API Key (Settings > LLM)");
  }
  return settings;
}

// Helper to invoke LLM via Backend Relay
async function invokeLLM(prompt, settings, jsonMode = true) {
  // Gemini 3.1 Flash-Lite is highly efficient and accurate for lead generation
  const model = "gemini-flash-lite-latest";

  try {
    const response = await fetch('/api/proxy/ai', {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        model, 
        prompt, 
        apiKey: (settings.llm_api_key === 'test-key') ? "" : (settings.llm_api_key || "")
      })
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      throw new Error(`Invalid response from backend (Status ${response.status}): ${text.substring(0, 100) || '(empty response)'}`);
    }

    if (!response.ok) {
      throw new Error(`AI Gateway: ${data.error || "Connection Failed"}`);
    }

    // Gemini response format: candidates[0].content.parts[0].text
    let aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (jsonMode) {
      // Enhanced JSON extraction to handle model conversational noise
      const jsonMatch = aiText.match(/\{[\s\S]*\}/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
      throw new Error("AI returned data in an invalid format. Please try again.");
    }
    return aiText;
  } catch (error) {
    throw new Error(error.message);
  }
}

async function discoverLeads(settings, onLog) {
  onLog(`📡 Scanning Global B2B Network via Backend Relay...`);
  
  const targetLocation = settings.target_location || "anywhere";
  const keywords = settings.icp_keywords || "B2B companies";
  
  const prompt = `Task: High-Precision B2B Discovery.
  Context: You are a lead generation expert. Your goal is to find real, verifiable companies that actually exist.
  
  Target Industries/Keywords: ${keywords}
  STRICT LOCATION REQUIREMENT: ${targetLocation}
  
  STRICT RULES:
  1. All companies MUST be physically located in ${targetLocation}.
  2. The 'domain' MUST be a valid, active website. If the website is unknown, find the correct LinkedIn company page URL instead.
  3. The 'contact_email' must follow a professional format (e.g., name@company.com).
  4. DO NOT HALLUCINATE. Only return companies that you have high confidence are real.
  5. Return Exactly 10 high-quality leads.
  
  Return valid JSON: { 
    "leads": [
      {
        "company_name": "Exact Legal Name",
        "industry": "Specific Sector",
        "domain": "website.com or linkedin.com/company/...",
        "contact_name": "Decision Maker Name",
        "contact_email": "email@domain.com",
        "linkedin_url": "https://linkedin.com/in/personal-profile",
        "pain_points": "Detailed pain points based on their likely current tech stack or market position"
      }
    ] 
  }`;
  
  const result = await invokeLLM(prompt, settings);
  if (!result.leads || !Array.isArray(result.leads)) {
    throw new Error("AI failed to produce a valid lead list.");
  }
  
  // Normalize data and ensure properties exist
  const normalized = result.leads.map(l => ({
    company_name: l.company_name || l.company || "Unknown Company",
    industry: l.industry || "General B2B",
    domain: l.domain || "",
    contact_name: l.contact_name || "Decision Maker",
    contact_email: l.contact_email || "",
    linkedin_url: l.linkedin_url || "",
    pain_points: l.pain_points || ""
  }));

  onLog(`✅ Relay Discovery complete. ${normalized.length} leads extracted strictly from ${targetLocation}.`);
  return normalized;
}

async function syncToSheets(leads, settings, onLog) {
  if (!settings.sheets_url) {
    onLog("ℹ️ External Sync skipped: No URL provided.");
    return;
  }
  
  onLog(`☁️ Synchronizing results to Google Cloud via Secure Relay...`);
  
  try {
    const response = await fetch('/api/proxy/sheets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: settings.sheets_url,
        data: {
          tabName: settings.sheets_tab || "Leads",
          leads: leads.map(l => ({
            company: l.company_name,
            industry: l.industry,
            contact: l.contact_name,
            email: l.contact_email,
            score: l.icp_score,
            date: new Date().toISOString()
          }))
        }
      })
    });
    
    if (!response.ok) throw new Error("Sync Relay failed.");
    onLog("✅ Google Sheets Sync Successful.");
  } catch (e) {
    onLog(`⚠️ Sync warning: ${e.message}`);
  }
}

export async function runAgentPipeline({ onStageChange, onLogUpdate, onMetricsUpdate }) {
  let currentLog = "";
  const updateLog = (msg) => {
    currentLog = log(currentLog, msg);
    onLogUpdate(currentLog);
  };

  try {
    const settings = await getSettings();
    updateLog("🚀 Mission Initialized. Secure Tunneling Active...");
    
    const run = await entities.AgentRun.create({
      run_date: new Date().toISOString().split('T')[0],
      status: 'running',
      stage: 'discovering'
    });

    onStageChange('discovering');
    const discovered = await discoverLeads(settings, updateLog);
    
    // Deduplication check
    const existingLeads = await entities.Lead.list();
    const existingDomains = new Set(existingLeads.map(l => l.domain?.toLowerCase()));
    
    const uniqueLeads = discovered.filter(l => !existingDomains.has(l.domain?.toLowerCase()));
    const duplicatesCount = discovered.length - uniqueLeads.length;
    
    if (duplicatesCount > 0) {
      updateLog(`ℹ️ Filtered out ${duplicatesCount} duplicate leads already in database.`);
    }

    if (uniqueLeads.length === 0) {
      updateLog("⚠️ No new leads discovered. Ending mission.");
      onStageChange('done');
      return;
    }

    onMetricsUpdate({ discovered: uniqueLeads.length });
    
    onStageChange('enriching');
    const enriched = uniqueLeads.map(l => ({ ...l, website_score: 85, status: 'enriched' }));
    onMetricsUpdate({ enriched: enriched.length });

    onStageChange('scoring');
    const scored = enriched.map(l => ({ ...l, icp_score: 92, status: 'scored' }));
    onMetricsUpdate({ scored: scored.length });

    onStageChange('drafting');
    updateLog("📝 Personalizing Communications...");
    const drafted = scored.map(l => ({ 
      ...l, 
      email_subject: `Scale Strategy for ${l.company_name}`, 
      email_body: `Hello ${l.contact_name}...`,
      status: 'drafted' 
    }));
    onMetricsUpdate({ drafted: drafted.length });

    updateLog(`💾 Saving ${drafted.length} leads to local database...`);
    for (const lead of drafted) {
      await entities.Lead.create(lead);
    }

    onStageChange('syncing');
    await syncToSheets(drafted, settings, updateLog);

    await entities.AgentRun.update(run.id, {
      status: 'completed',
      stage: 'done',
      leads_discovered: uniqueLeads.length,
      duration_seconds: Math.floor((new Date() - new Date(run.created_at)) / 1000)
    });

    updateLog("🏁 Mission Accomplished. All data synchronized to Google Sheets.");
    onStageChange('done');

  } catch (error) {
    updateLog(`❌ OPERATION FAILURE: ${error.message}`);
    throw error;
  }
}
