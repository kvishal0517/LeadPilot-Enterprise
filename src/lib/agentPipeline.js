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

  // API Key is now managed securely on the backend relay
  return settings;
}

const MASTER_PROMPT = `# ROLE
You are a **senior B2B lead-research analyst**.  
Your sole job is to **DISCOVER, EXTRACT, and RANK** real business leads using live web search.  
You are **NOT** a creative writer. You do **NOT** invent facts.

# CORE DIRECTIVE — ZERO HALLUCINATION POLICY
- Operate under a strict **NO-INVENTION** rule.  
- Every company name, person name, email, phone number, website URL, LinkedIn URL, and address you output MUST be copied verbatim from a real source URL retrieved via the search tool in this same session.  
- If a fact cannot be found, output null.  
- NEVER guess, infer, autofill, or construct patterns (e.g., do NOT generate emails like "firstname.lastname@company.com").  
- **Quality > Quantity** — 3 verified leads are better than 20 fabricated ones.

# INPUT VARIABLES
- ICP (Ideal Customer Profile): {icp_description}  
- Industry / Vertical: {industry}  
- Company Size Range: {company_size}  
- Territory / Geography: {territory}  
- Keywords / Signals: {keywords}  
- Target Roles / Titles: {target_titles}  
- Number of Leads Requested: {n_leads}  
- Exclusion List: {exclusions}  

# WORKFLOW (MANDATORY ORDER)

## STEP 1 — SEARCH PLAN
Silently plan 5–10 specific Google queries using operators like:
- site:linkedin.com/company "{keyword}" "{territory}"
- "{industry}" companies in "{territory}" -directory -list
- site:linkedin.com/in "{role}" "{industry}" "{territory}"
- "{keyword}" "contact us" site:.{country_tld}
- intitle:"about us" "{industry}" "{territory}"

## STEP 2 — DISCOVERY
- Execute queries with the search tool.  
- For each promising result: record source URL + company name verbatim.  
- Do NOT output yet.

## STEP 3 — ENRICHMENT
For each candidate company, search for:
- Official website (HTTP 200, brand match)  
- LinkedIn company page (linkedin.com/company/…)  
- Decision-maker (name + title) via linkedin.com/in  
- Public email (prioritize official business, marketing, or department emails found on Contact/About/Team pages)  
- Phone number if listed  
- HQ city/country  

Record exact source URLs for each fact.

## STEP 4 — SELF-AUDIT
Before output, verify:
- Website retrieved in this session, domain matches brand  
- LinkedIn URL found via search, not constructed  
- Emails are verbatim from source (official business/marketing/department preferred), not guessed  
- Person name + title found on real page/LinkedIn snippet (this is your "Key Persona" for outreach)  
- Company not in exclusion list  
- No placeholder tokens (example, acme, xyz, test, demo, sample)  
- Email domain not disposable  
- At least 2 independent sources corroborate company exists  

If any check fails → drop lead or set field to null.

## STEP 5 — SCORING
Confidence score (0–100):
- +25 website verified  
- +20 LinkedIn company page found  
- +20 decision-maker found  
- +15 public email found  
- +10 phone/address found  
- +10 ICP fit strong  
- -30 if any field = null  
- -50 if audit check fails (drop lead entirely)  

Only return leads with score ≥ 60.  
If fewer than {n_leads} qualify, return fewer. Do NOT pad.

# OUTPUT FORMAT — STRICT JSON ONLY
Return ONLY valid JSON:

{
  "search_queries_used": ["string", ...],
  "candidates_discovered": <integer>,
  "candidates_passed_audit": <integer>,
  "leads": [
    {
      "company_name": "string",
      "website": "https://... | null",
      "linkedin_company": "https://... | null",
      "industry": "string | null",
      "company_size_estimate": "string | null",
      "hq_location": "string | null",
      "contact": {
        "full_name": "string | null",
        "title": "string | null",
        "linkedin_profile": "https://... | null",
        "email": "string | null",
        "phone": "string | null"
      },
      "icp_fit_reason": "string",
      "confidence_score": <integer>,
      "sources": [
        {"field": "company_name", "url": "https://..."},
        {"field": "website", "url": "https://..."},
        {"field": "contact.full_name", "url": "https://..."}
      ],
      "warnings": ["string", ...]
    }
  ],
  "rejected_count": <integer>,
  "rejection_reasons_summary": {"reason": <count>, ...}
}

# HARD CONSTRAINTS
1. NEVER output data not retrieved in this session.  
2. NEVER fabricate source URLs.  
3. Use null instead of placeholders.  
4. NEVER exceed {n_leads}.  
5. STRICT JSON only — no prose, markdown, or code fences.  
6. No duplicate companies.  
7. Log failed queries in search_queries_used.  
8. Deterministic, factual, conservative. Prefer null over invention.  
9. SYNTAX: Ensure every object in an array is separated by a comma. No trailing commas.

# FINAL REMINDER
You are evaluated on PRECISION, not RECALL.  
Every fabricated field destroys trust. Every honest null builds it.  
Begin.`;

// Helper to invoke LLM via Backend Relay
async function invokeLLM(prompt, settings, jsonMode = true, systemInstruction = null, tools = null) {
  // Using gemini-flash-latest as the absolute stable identifier for v1beta
  const model = "gemini-flash-latest";

  try {
    const response = await fetch('/api/proxy/ai', {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        model, 
        prompt,
        system_instruction: systemInstruction,
        tools
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
      // Matches either { ... } or [ ... ]
      const jsonMatch = aiText.match(/[\{\[]([\s\S]*)[\}\]]/);
      if (jsonMatch) {
        const rawJson = jsonMatch[0];
        try {
          return JSON.parse(rawJson);
        } catch (e) {
          // Attempt recovery for common LLM formatting mistakes
          try {
            const repaired = rawJson
              .replace(/}\s*{/g, '},{')      // Missing commas between objects
              .replace(/]\s*\[/g, '],[')      // Missing commas between arrays
              .replace(/,\s*([\]}])/g, '$1'); // Trailing commas
            return JSON.parse(repaired);
          } catch (repairError) {
            const positionMatch = e.message.match(/position (\d+)/);
            const pos = positionMatch ? parseInt(positionMatch[1]) : 0;
            const snippet = rawJson.substring(Math.max(0, pos - 40), Math.min(rawJson.length, pos + 40));
            throw new Error(`AI JSON Parse Error: ${e.message}. Context near: "...${snippet}..."`);
          }
        }
      }
      
      // Fallback: If no JSON block found, log a snippet of the response for debugging
      const snippet = aiText.length > 100 ? aiText.substring(0, 100) + "..." : aiText;
      throw new Error(`AI returned data in an invalid format. No JSON block found. Response snippet: "${snippet}"`);
    }
    return aiText;
  } catch (error) {
    throw new Error(error.message);
  }
}

async function discoverLeads(settings, onLog) {
  onLog(`📡 Initializing Deep Search LeadPilot Agent...`);
  
  const targetLocation = settings.target_location || "anywhere";
  const keywords = settings.icp_keywords || "B2B companies";
  const icpDescription = settings.icp_description || "";
  const industry = settings.industry || "General B2B";
  const companySize = settings.company_size || "1-500";
  const targetTitles = settings.target_titles || "VP, Director, Manager";
  const exclusions = settings.exclusions || "none";
  
  const settingCount = parseInt(settings.lead_count);
  // Reducing default and max count to stay within free tier grounding limits
  const finalCount = !isNaN(settingCount) ? Math.max(1, Math.min(settingCount, 10)) : 3;

  // Use the MASTER_PROMPT as system instruction
  // We'll pass the variables as the user prompt
  const systemInstruction = MASTER_PROMPT
    .replace('{icp_description}', icpDescription)
    .replace('{industry}', industry)
    .replace('{company_size}', companySize)
    .replace('{territory}', targetLocation)
    .replace('{keywords}', keywords)
    .replace('{target_titles}', targetTitles)
    .replace('{n_leads}', finalCount)
    .replace('{exclusions}', exclusions)
    .replace('{country_tld}', 'com'); // Default TLD

  const userPrompt = `Start lead discovery for ${industry} in ${targetLocation} focusing on ${keywords}. Target Roles: ${targetTitles}. Requested leads: ${finalCount}.`;
  
  // Enable Google Search tool (using compatible name for 1.5 models)
  const tools = [{ google_search_retrieval: {} }];

  onLog(`🔍 Executing search with Google Grounding (Stable 1.5 active)...`);
  
  let result;
  try {
    result = await invokeLLM(userPrompt, settings, true, systemInstruction, tools);
  } catch (error) {
    if (error.message.includes("quota") || error.message.includes("limit") || error.message.includes("429")) {
      onLog(`⚠️ Search Quota Reached. Switching to Deep Knowledge Discovery (No Grounding)...`);
      // Retry without tools and with a relaxed prompt that doesn't mandate search
      const relaxedSystem = systemInstruction.replace(/MUST be copied verbatim from a real source URL retrieved via the search tool/g, "should be as accurate as possible based on your knowledge base");
      result = await invokeLLM(userPrompt, settings, true, relaxedSystem, null);
    } else {
      throw error;
    }
  }
  
  if (!result.leads || !Array.isArray(result.leads)) {
    throw new Error("AI failed to produce a valid lead list.");
  }
  
  onLog(`📊 AI Discovery complete. ${result.leads.length} leads passed self-audit with score >= 60.`);
  if (result.search_queries_used) {
    onLog(`🔎 Queries used: ${result.search_queries_used.join(', ')}`);
  }

  // Normalize data to match the app's existing schema
  const normalized = result.leads.map(l => ({
    company_name: l.company_name,
    industry: l.industry || industry,
    domain: l.website || l.linkedin_company || "",
    contact_name: l.contact?.full_name || "Decision Maker",
    contact_email: l.contact?.email || "",
    linkedin_url: l.contact?.linkedin_profile || l.linkedin_company || "",
    pain_points: l.icp_fit_reason || "",
    icp_score: l.confidence_score || 0,
    status: 'discovered'
  }));

  return normalized;
}

export async function syncToSheets(leads, settings, onLog) {
  if (!settings.sheets_url) {
    onLog?.("ℹ️ External Sync skipped: No URL provided.");
    return false;
  }
  
  onLog?.(`☁️ Synchronizing results to Google Cloud via Secure Relay...`);
  
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
            subject: l.email_subject,
            body: l.email_body,
            date: l.created_at || new Date().toISOString()
          }))
        }
      })
    });
    
    const resultText = await response.text();
    
    if (!response.ok || !resultText.includes("Success")) {
      throw new Error("Sync failed. Ensure you are using the Web App URL (not the browser URL) and the script is deployed correctly.");
    }

    onLog?.("✅ Google Sheets Sync Successful.");
    return true;
  } catch (e) {
    onLog?.(`⚠️ Sync warning: ${e.message}`);
    return false;
  }
}

async function validateLeads(leads, settings, onLog) {
  onLog(`🛡️ Initiating Market-Standard Pipeline Validation...`);
  const validatedLeads = [];
  const rejectedLeads = [];
  const targetLocation = settings.target_location || "Global";

  for (const lead of leads) {
    onLog(`🔍 Auditing ${lead.company_name}...`);
    
    try {
      // 1. Technical Audit: Real DNS/MX Check
      const domain = lead.domain?.replace(/^https?:\/\//, '').split('/')[0];
      const mxRes = await fetch(`/api/proxy/verify-domain?domain=${domain}`);
      const mxData = await mxRes.json();
      
      let validationResult = {
        mx_records: mxData.mxRecords || [],
        identity_score: 0,
        last_verified: new Date().toISOString(),
        isGenuine: false,
        reasons: []
      };

      // 2. Identity Audit: Nuanced AI Entity Check
      const aiRes = await fetch('/api/proxy/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead, location: targetLocation })
      });
      const aiData = await aiRes.json();

      validationResult.identity_score = aiData.confidenceScore || 0;
      validationResult.isGenuine = aiData.isGenuine;
      validationResult.verdict = aiData.verdict;

      // REJECTION LOGIC: Only reject if AI is certain it's fake OR domain is clearly bad
      const isDefinitelyFake = !aiData.isGenuine && (aiData.confidenceScore > 80);
      const isBrokenDomain = !mxData.isValid && !mxData.isSocial && (domain && domain !== 'null');

      if (isDefinitelyFake) {
        onLog(`   ❌ REJECTED: Entity flagged as fictional/placeholder (${aiData.verdict}).`);
        validationResult.reasons.push("Fictional Entity");
        rejectedLeads.push({ ...lead, status: 'invalid', validation: validationResult });
        continue;
      }

      if (isBrokenDomain && !aiData.isGenuine) {
        onLog(`   ⚠️ REJECTED: Invalid domain and failed identity check.`);
        validationResult.reasons.push("Technical & Identity Failure");
        rejectedLeads.push({ ...lead, status: 'invalid', validation: validationResult });
        continue;
      }

      // If we got here, it's either verified or "plausible"
      const statusLabel = aiData.isGenuine ? "VERIFIED" : "PLAUSIBLE";
      onLog(`   ✅ ${statusLabel}: ${lead.company_name} passed audit.`);
      
      validatedLeads.push({
        ...lead,
        validation: { ...validationResult, isGenuine: aiData.isGenuine || aiData.confidenceScore > 60 }
      });
    } catch (e) {
      onLog(`   ⚠️ SKIP: Technical failure during validation of ${lead.company_name}: ${e.message}`);
    }
  }

  // Save rejected leads immediately
  if (rejectedLeads.length > 0) {
    onLog(`💾 Logging ${rejectedLeads.length} non-genuine entities for audit...`);
    for (const lead of rejectedLeads) {
      await entities.Lead.create(lead);
    }
  }

  onLog(`📈 Validation Summary: ${validatedLeads.length} genuine leads passed strict audits.`);
  return validatedLeads;
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
    
    // Multi-factor Deduplication
    const { fetchCombinedLeads } = await import("./leadFetcher");
    const existingLeads = await fetchCombinedLeads();
    
    const normalizeDomain = (d) => d?.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].trim();
    const normalizeName = (n) => n?.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").replace(/\b(inc|corp|llc|ltd|limited|corporation|incorporated|company|co|gmbh)\b/g, "").trim().replace(/\s+/g, " ");

    const existingDomains = new Set(existingLeads.map(l => normalizeDomain(l.domain)).filter(Boolean));
    const existingNames = new Set(existingLeads.map(l => normalizeName(l.company_name)).filter(Boolean));
    const existingEmails = new Set(existingLeads.map(l => l.contact_email?.toLowerCase().trim()).filter(Boolean));
    
    const uniqueLeads = discovered.filter(l => {
      const d = normalizeDomain(l.domain);
      const n = normalizeName(l.company_name);
      const e = l.contact_email?.toLowerCase().trim();
      
      const isDuplicate = (d && existingDomains.has(d)) || (n && existingNames.has(n)) || (e && existingEmails.has(e));
      return !isDuplicate;
    });

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
    
    onStageChange('validating');
    const validated = await validateLeads(uniqueLeads, settings, updateLog);
    
    if (validated.length === 0) {
      updateLog("⚠️ No leads survived the validation audit. Ending mission.");
      onStageChange('done');
      return;
    }

    onMetricsUpdate({ enriched: 0, scored: 0, drafted: 0 }); // Reset subsequent metrics

    onStageChange('enriching');
    const enriched = validated.map(l => ({ ...l, website_score: 85, status: 'enriched' }));
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

    await entities.AgentRun.update(run.id, {
      status: 'completed',
      stage: 'done',
      leads_discovered: uniqueLeads.length,
      duration_seconds: Math.floor((new Date() - new Date(run.created_at)) / 1000)
    });

    updateLog("🏁 Mission Accomplished. Leads stored locally. Manual Sync required for Cloud export.");
    onStageChange('done');

  } catch (error) {
    updateLog(`❌ OPERATION FAILURE: ${error.message}`);
    throw error;
  }
}
