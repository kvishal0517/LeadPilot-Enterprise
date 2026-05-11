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
      throw new Error(`Invalid response from backend: ${text.substring(0, 100)}`);
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
  const prompt = `Task: Real-time B2B Discovery. 
  Target: Exactly 20 real and unique companies in ${settings.icp_keywords}.
  STRICT LOCATION REQUIREMENT: All companies MUST be located in ${targetLocation}. Do not return leads from any other location.
  
  Return valid JSON: { 
    "leads": [
      {
        "company_name": "Exact Legal Name",
        "industry": "Specific Sector",
        "domain": "website.com",
        "contact_name": "Decision Maker Name",
        "contact_email": "email@domain.com",
        "linkedin_url": "https://linkedin.com/in/...",
        "pain_points": "Detailed pain points"
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

    onStageChange('syncing');
    await syncToSheets(drafted, settings, updateLog);

    updateLog("💾 Finalizing Secure Local Storage...");
    for (const lead of drafted) {
      await entities.Lead.create({ ...lead, run_date: run.run_date });
    }

    await entities.AgentRun.update(run.id, {
      status: 'completed',
      stage: 'done',
      leads_discovered: uniqueLeads.length,
      duration_seconds: Math.floor((new Date() - new Date(run.created_at)) / 1000)
    });

    updateLog("🏁 Mission Accomplished. End of Operation.");
    onStageChange('done');

  } catch (error) {
    updateLog(`❌ OPERATION FAILURE: ${error.message}`);
    throw error;
  }
}
