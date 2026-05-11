🧠 LeadPilot — Master Rebuild Prompt
Build a full-stack B2B lead generation web application called "LeadPilot" using React, Tailwind CSS, and the Supabase covers DB/Auth. The app is an autonomous agent that discovers, enriches, validates, scores, and drafts personalized cold emails for B2B leads daily.

---

## TECH STACK
- React 18 + Vite
- Tailwind CSS with custom design tokens
- shadcn/ui components
- Lucide React icons
- Recharts for charts
- @tanstack/react-query for data fetching
- react-router-dom v6 for routing
- framer-motion for animations
- Supabase (DB/Auth) + Hugging Face (LLM) + GitHub Actions (scheduler) + Google Apps Script (Gmail drafts)
- date-fns for date formatting

---

## DESIGN SYSTEM (index.css)

Import fonts:
  Inter (300,400,500,600,700) and Space Grotesk (400,500,600,700) from Google Fonts.

CSS variables (:root):
  --background: 220 78% 96%
  --foreground: 224 30% 10%
  --card: 0 0% 100%
  --card-foreground: 224 30% 10%
  --popover: 0 0% 100%
  --popover-foreground: 224 30% 10%
  --primary: 243 75% 59%
  --primary-foreground: 0 0% 100%
  --secondary: 220 15% 94%
  --secondary-foreground: 224 30% 20%
  --muted: 220 15% 94%
  --muted-foreground: 220 12% 50%
  --accent: 173 80% 40%
  --accent-foreground: 0 0% 100%
  --destructive: 0 84% 60%
  --destructive-foreground: 0 0% 98%
  --border: 220 15% 90%
  --input: 220 15% 90%
  --ring: 243 75% 59%
  --radius: 0.75rem
  --success: 142 72% 42%
  --warning: 38 92% 50%
  --info: 199 89% 48%

Dark mode (.dark) mirrors the above with slightly adjusted values.

Custom utility classes:
  .font-grotesk { font-family: 'Space Grotesk', sans-serif; }
  .font-inter { font-family: 'Inter', sans-serif; }
  .gradient-primary { background: linear-gradient(135deg, hsl(243,75%,59%) 0%, hsl(173,80%,40%) 100%); }
  .gradient-card { background: linear-gradient(145deg, hsl(var(--card)) 0%, hsl(220 15% 98%) 100%); }
  .glow-primary { box-shadow: 0 0 30px hsla(243,75%,59%,0.25); }
  .animate-pulse-slow { animation: pulse 3s cubic-bezier(0.4,0,0.6,1) infinite; }
  .shimmer { background: linear-gradient(90deg, transparent 25%, hsla(243,75%,59%,0.1) 50%, transparent 75%); background-size: 200% 100%; animation: shimmer 2s infinite; }
  .lead-card-hover { transition: all 0.3s cubic-bezier(0.4,0,0.2,1); }
  .lead-card-hover:hover { transform: translateY(-2px); box-shadow: 0 12px 40px hsla(243,75%,59%,0.15); }

tailwind.config.js must map all CSS variables to Tailwind color tokens and include fontFamily for inter and grotesk.

---

## DATABASE ENTITIES

### Lead
Properties:
  company_name (string, required)
  domain (string)
  industry (string)
  company_size (string)
  contact_name (string)
  contact_title (string)
  contact_email (string)
  linkedin_url (string)
  website_score (number, 0-100)
  icp_score (number, 0-100)
  enrichment_source (string)
  status (enum: discovered | enriched | validated | scored | drafted | sent | replied | rejected, default: discovered)
  email_subject (string)
  email_body (string)
  gmail_draft_id (string)
  pain_points (string)
  run_date (string, YYYY-MM-DD)
  notes (string)
  sheets_row (number)

### AgentRun
Properties:
  run_date (string, required)
  status (enum: running | completed | failed | partial, default: running)
  stage (enum: idle | discovering | enriching | validating | scoring | drafting | syncing | done, default: idle)
  leads_discovered (number, default 0)
  leads_enriched (number, default 0)
  leads_validated (number, default 0)
  leads_scored (number, default 0)
  drafts_created (number, default 0)
  sheets_synced (number, default 0)
  errors (string, JSON array)
  log (string)
  llm_provider (string)
  sources_used (string)
  duration_seconds (number)

### Settings
Properties:
  key (string, required)
  value (string, required)
  category (enum: llm | sources | icp | gmail | sheets | schedule, default: llm)
  label (string)

---

## FILE STRUCTURE

src/
  App.jsx
  main.jsx
  index.css
  tailwind.config.js
  api/dbintegrity.js
  lib/
    agentPipeline.js
    AuthContext.jsx
    utils.js
    query-client.js
    PageNotFound.jsx
  pages/
    Dashboard.jsx
    RunAgent.jsx
    Leads.jsx
    Analytics.jsx
    SettingsPage.jsx
  components/
    layout/
      AppLayout.jsx
      Sidebar.jsx
    dashboard/
      StatsCard.jsx
    agent/
      PipelineStatus.jsx
      RunLog.jsx
    leads/
      LeadCard.jsx

---

## ROUTING (App.jsx)

Routes:
  / → Dashboard
  /run → RunAgent
  /leads → Leads
  /analytics → Analytics
  /settings → SettingsPage

All wrapped in <AppLayout> (sidebar layout using React Router <Outlet>).
App.jsx must wrap everything in: AuthProvider, QueryClientProvider, BrowserRouter, Toaster (shadcn), Sonner (position="top-right" richColors).
Include auth loading state with animated LeadPilot logo and "Starting LeadPilot..." text.
Handle UserNotRegisteredError and auth_required redirects.

---

## LAYOUT (components/layout/)

### AppLayout.jsx
  Full-height flex layout: fixed sidebar (w-64) on left, main content (flex-1, ml-64, overflow-auto) on right.
  Uses <Outlet /> for page content.

### Sidebar.jsx
  Fixed left sidebar with:
  - Logo: gradient-primary icon (lightning bolt SVG) + "LeadPilot" in font-grotesk
  - Nav links: Dashboard (/), Run Agent (/run), Leads (/leads), Analytics (/analytics), Settings (/settings)
  - Icons: LayoutDashboard, Play, Users, BarChart2, Settings from lucide-react
  - Active link highlighted with primary color bg tint
  - Footer section showing "Scheduled: Daily 08:00 IST" with Clock icon

---

## PAGES

### Dashboard.jsx
Fetch: AgentRun.list('-created_date', 30) and Lead.list('-created_date', 100) via React Query.

Computed stats:
  totalLeads, draftedLeads (status in drafted/sent/replied), repliedLeads, avgIcpScore

Header: title "Dashboard", subtitle, "Run Agent Now" button linking to /run (gradient-primary style).

Grid (2 cols mobile, 4 cols desktop): 4 StatsCard components — Total Leads (Users icon, primary), Drafts Created (Mail icon, accent), Replies (TrendingUp icon, success), Avg ICP Score (Zap icon, warning, subtitle "out of 100").

Chart section (lg:grid-cols-3):
  Left (col-span-2): AreaChart (Recharts, height 180) showing leads discovered + drafted over time.
    Two gradients: colorLeads (primary) and colorDrafted (accent).
    XAxis/YAxis: fontSize 11, no axis/tick lines.
    Tooltip: card background, border-border, borderRadius 8.
  Right: "Last Run" card showing status icon, date, discovered, enriched, drafted, duration.
    Status icons: running=Zap(warning,animate-pulse), completed=CheckCircle2(success), failed=AlertCircle(destructive).
    Empty state: Clock icon + "No runs yet" + "Run now" button.

Recent Leads section: Last 5 leads in a divide-y list. Each row: initial avatar (primary/10 bg), company name + industry·email, ICP score on right. Empty state: "Run the agent to generate leads".

### RunAgent.jsx
State: isRunning, stage, log, metrics, runStatus (idle/success/error).

Hero card (shimmer effect when running, border-primary/30):
  Large icon box (gradient-primary + glow when running, bg-secondary when idle).
  Icons: Zap(animate-pulse-slow) when running, CheckCircle2(success) when done, AlertCircle(destructive) on error, Play when idle.
  Dynamic heading and subtitle text based on state.
  Start Pipeline button (gradient-primary, lg size). Shows "Running..." with Square icon when active, disabled.

Metrics row (grid-cols-5, only shown when metrics exist):
  Shows count cards for: Discovered, Enriched, Validated, Scored, Drafted.

Bottom grid (lg:grid-cols-2):
  Left: <PipelineStatus currentStage={stage} runStatus={runStatus} />
  Right: <RunLog log={log} /> + success banner when done (CheckCircle2 + "Pipeline complete!" message).

On run: calls runAgentPipeline({ onStageChange, onLogUpdate, onMetricsUpdate }).
On success: invalidates React Query keys: agent-runs, leads-summary, leads.

### Leads.jsx
Fetch: Lead.list('-created_date', 200).
State: search, statusFilter, sortBy (score|date).

Filter bar: search input (Search icon), status filter select (all statuses), sort select (ICP Score / Date).
Export button (Download icon): generates CSV of filtered leads and triggers browser download.

Filtered/sorted leads → grid of <LeadCard> components (grid-cols-1 md:grid-cols-2 xl:grid-cols-3).
Loading skeleton, empty states for no data and no results.
Header shows count of filtered vs total.

### Analytics.jsx
Fetch: leads (all) and runs (all) via React Query.

Computed data:
  industryData: count leads per industry for bar chart.
  statusData: count leads per status for pie chart.
  runData: last 10 runs mapped to { date, discovered, drafted, score } for line chart.
  avgScore: average icp_score across all leads.

KPI row: 4 StatsCard — Total Leads, Avg ICP Score, Total Runs, Drafts Created.

Charts section (lg:grid-cols-2):
  Left: BarChart — Industry Distribution (leads per industry). Bar fill: primary.
  Right: PieChart — Lead Status Distribution. 8 color palette.

Full-width: BarChart — Agent Run Performance (discovered vs drafted per run date).

### SettingsPage.jsx
Setting groups:
  LLM: llm_provider (select: groq|openai), llm_api_key (password input)
  ICP: icp_keywords (textarea), icp_description (textarea), target_location (input)
  Sender Profile: sender_name, sender_email, sender_company, sender_role (all inputs)
  Google Sheets: sheets_url (input), sheets_tab (input)

Load settings from Settings entity on mount. On save: upsert each setting by key (update if exists, create if not).
Toast on success.

GitHub Actions section: display a code block with a sample YAML workflow showing how to trigger the agent at 08:00 IST daily using a scheduled GitHub Action calling this app's API.

---

## COMPONENTS

### components/dashboard/StatsCard.jsx
Props: label, value, icon (Icon), trend, color (primary|accent|success|warning|info), subtitle.
colorMap maps color → bg-{color}/10 text-{color} classes.
Layout: icon box top-left, trend badge top-right (green if >=0, red if <0), large value in font-grotesk, label, optional subtitle.
Wrapper: bg-card border rounded-2xl p-5 lead-card-hover.

### components/agent/PipelineStatus.jsx
Stages array (in order):
  discovering → "Discover" / "Searching lead sources"
  enriching → "Enrich" / "Fetching company data"
  validating → "Validate" / "Verifying emails & domains"
  scoring → "Score" / "ICP match analysis"
  drafting → "Draft" / "Writing personalized emails"
  syncing → "Sync" / "Saving to Google Sheets"

stageOrder = ['idle','discovering','enriching','validating','scoring','drafting','syncing','done']
For each stage: isDone (currentIdx > stageIdx || stage=done), isActive (current===key), isFailed (runStatus=failed && isActive).
Icons: CheckCircle2(success) if done, Loader2(primary,animate-spin) if active, AlertCircle(destructive) if failed, Circle(muted) if pending.
Icon container: bg-success/15 if done, bg-primary/15 if active, bg-secondary if pending.
Text color: text-success if done, text-primary if active, text-muted-foreground if pending.

### components/agent/RunLog.jsx
Props: log (string).
Split log by newlines. Color each line:
  Error/fail → text-destructive
  Success/✓/done → text-success
  Starts with [ or contains → → text-primary
  Default → text-muted-foreground
Wrap in ScrollArea (h-48), font-mono text-xs. Auto-scroll to bottom on log change using useRef + scrollIntoView.

### components/leads/LeadCard.jsx
Props: lead.

Status badge color map:
  discovered: bg-muted text-muted-foreground
  enriched: bg-info/10 text-info
  validated: bg-warning/10 text-warning
  scored: bg-primary/10 text-primary
  drafted: bg-success/10 text-success
  sent: bg-accent/10 text-accent
  replied: bg-success/20 text-success
  rejected: bg-destructive/10 text-destructive

Layout:
  Top row: Building2 icon in primary/10 box, company name + status badge, industry · size. Star icon + icp_score on right.
  Contact row: User icon + contact_name · contact_title (if present).
  Score bars: ScoreBar component for ICP Score and Website Score. Bar: bg-success if >=70, bg-warning if >=40, bg-destructive otherwise.
  Action buttons row: Globe (link to domain), Mail (contact_email), LinkedIn (link), "Email draft" toggle button.
  Expanded state: bg-secondary box showing email subject + pre-formatted body.

---

## PIPELINE (lib/agentPipeline.js)

Export: async function runAgentPipeline({ onStageChange, onLogUpdate, onMetricsUpdate })

Helper: log(runLog, msg) → appends "[HH:MM:SS IST] msg\n" timestamp using Asia/Kolkata timezone.
Helper: getSettings() → fetches all Settings records, returns key→value object.

Stage 1 — discoverLeads(settings, onLog):
  Uses icp_keywords (default: restaurant,salon,clinic,real estate,retail store,hotel,gym,spa) and target_location (default: India).
  Calls InvokeLLM with prompt asking for 10 realistic B2B leads in those industries.
  JSON schema response: { leads: array of { company_name, domain, industry, company_size, contact_name, contact_title, contact_email, linkedin_url, pain_points } }
  Returns leads array.

Stage 2 — enrichLeads(leads, onLog):
  For each lead: calls InvokeLLM with add_context_from_internet: true.
  Prompt asks for website_score (0-100, higher = weaker digital presence) and additional_pain_points.
  Fallback: website_score = random 40-80.
  Returns enriched leads with status: 'enriched', enrichment_source: 'LLM + Web Research'.

Stage 3 — validateLeads(leads, onLog):
  Filter: keep only leads where contact_email contains @ and . AND domain contains .
  Set status: 'validated' for passing leads.

Stage 4 — scoreLeads(leads, settings, onLog):
  Calls InvokeLLM in parallel (Promise.all) for each lead.
  Prompt: score 0-100 ICP match for a digital agency, using icp_description setting.
  JSON response: { icp_score: number }
  Sort descending by icp_score, take top 10.

Stage 5 — draftEmails(leads, settings, onLog):
  Calls InvokeLLM in parallel for each lead.
  Prompt: write cold email from sender (sender_name, sender_role, sender_company settings).
  Requirements: subject under 60 chars, 3 short paragraphs, specific pain points, low-friction CTA, NOT salesy.
  JSON response: { subject: string, body: string }
  Returns leads with status: 'drafted', email_subject, email_body.

Stage 6 — syncToSheets(leads, runId, onLog):
  Currently a stub: logs that leads are ready for export and to connect Sheets in Settings.

Main pipeline flow:
  1. getSettings()
  2. Create AgentRun record (status: running, stage: discovering)
  3. discoverLeads → update AgentRun.leads_discovered
  4. enrichLeads → update AgentRun.leads_enriched
  5. validateLeads → update AgentRun.leads_validated
  6. scoreLeads → update AgentRun.leads_scored
  7. draftEmails → update AgentRun.drafts_created
  8. syncToSheets
  9. Save all drafted leads to Lead entity with Lead.create()
  10. Update AgentRun: status=completed, stage=done, duration_seconds
  On error: update AgentRun status=failed, errors=JSON.stringify([error.message]), rethrow.
  Throughout: call onStageChange(stageName), onLogUpdate(currentLog), onMetricsUpdate({key: count}).

---

## IMPORTANT NOTES

1. All LLM calls use: import fetch from 'node-fetch';

const response = await fetch(
  "https://api-inference.huggingface.co/models/<model-name>",
  {
    method: "POST",
    headers: { "Authorization": "Bearer <HF_API_KEY>" },
    body: JSON.stringify({ inputs: prompt })
  }
);

const data = await response.json();
"use best free model and its api key"
2. All DB calls: (Supabase covers DB/Auth) entities.EntityName.list/create/update/filter
3. All data fetching in pages uses @tanstack/react-query useQuery hook with queryKey arrays
4. Use cn() from @/lib/utils for conditional classNames
5. Use sonner toast for notifications (import { toast } from 'sonner')
6. All pages are responsive (mobile-first Tailwind grid breakpoints)
7. No try/catch blocks unless absolutely necessary for fallback data
8. App is fully authenticated — no public routes
9. Do NOT use any npm packages not listed in the tech stack above
10. Keep all files under ~150 lines — split into focused components