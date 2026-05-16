import { entities } from "@/api/db";

/**
 * Fetches leads from both local storage and Google Sheets, 
 * merges them, deduplicates by email, and sorts by date DESC.
 */
export async function fetchCombinedLeads() {
  // 1. Fetch Local Leads and Deleted IDs
  const localLeads = await entities.Lead.list("-created_date", 1000);
  const deletedIds = await entities.DeletedLead.list();
  
  // 2. Fetch Google Sheets Leads (if configured)
  const settingsList = await entities.Settings.list();
  const sheetsUrl = settingsList.find(s => s.key === 'sheets_url')?.value;
  
  let sheetLeads = [];
  if (sheetsUrl) {
    try {
      const response = await fetch(`/api/proxy/leads?url=${encodeURIComponent(sheetsUrl)}`);
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          sheetLeads = data.map(l => ({
            id: l.email || `sheet-${Math.random().toString(36).substr(2, 9)}`,
            company_name: l.company || l.company_name,
            industry: l.industry,
            contact_name: l.contact || l.contact_name,
            contact_email: l.email || l.contact_email,
            icp_score: l.score || l.icp_score,
            email_subject: l.subject || l.email_subject,
            email_body: l.body || l.email_body,
            status: 'drafted',
            created_at: l.date || new Date().toISOString(),
            isSynced: true
          }));
        }
      }
    } catch (error) {
      console.error("Failed to fetch leads from Google Sheets:", error);
    }
  }

  // 3. Merge and Deduplicate
  // Local leads take precedence. Deduplicate by Domain (Primary), Email, or Company Name
  const combined = [];
  const seenKeys = new Set();

  const getUniquenessKeys = (lead) => {
    const keys = [];
    
    // Normalize domain
    if (lead.domain) {
      const normalizedDomain = lead.domain
        .toLowerCase()
        .replace(/^https?:\/\//, '')
        .replace(/^www\./, '')
        .split('/')[0];
      if (normalizedDomain) keys.push(`domain:${normalizedDomain}`);
    }

    // Normalize email
    if (lead.contact_email) {
      const normalizedEmail = lead.contact_email.toLowerCase().trim();
      if (normalizedEmail) keys.push(`email:${normalizedEmail}`);
    }

    // Normalize company name (less reliable, but good as fallback)
    if (lead.company_name) {
      const normalizedName = lead.company_name
        .toLowerCase()
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "") // remove punctuation
        .replace(/\b(inc|corp|llc|ltd|limited|corporation|incorporated|company|co|gmbh)\b/g, "")
        .trim()
        .replace(/\s+/g, " ");
      if (normalizedName) keys.push(`name:${normalizedName}`);
    }
    
    return keys;
  };

  // Process local leads first
  localLeads.forEach(l => {
    const keys = getUniquenessKeys(l);
    const alreadySeen = keys.some(k => seenKeys.has(k));
    
    if (!alreadySeen) {
      combined.push({ ...l, isSynced: false });
      keys.forEach(k => seenKeys.add(k));
    }
  });

  // Process sheet leads
  sheetLeads.forEach(sl => {
    const keys = getUniquenessKeys(sl);
    const alreadySeen = keys.some(k => seenKeys.has(k));

    if (!alreadySeen) {
      combined.push(sl);
      keys.forEach(k => seenKeys.add(k));
    }
  });

  // 4. Filter out deleted leads and sort by date DESC
  return combined
    .filter(l => !deletedIds.includes(l.id))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}
