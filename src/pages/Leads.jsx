import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  Search, 
  Download, 
  Building2,
  Filter,
  ArrowUpDown,
  LayoutGrid,
  List as ListIcon,
  CloudUpload,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  Trash2,
  Lock
} from "lucide-react";
import { entities } from "@/api/db";
import LeadCard from "@/components/leads/LeadCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { fetchCombinedLeads } from "@/lib/leadFetcher";
import { syncToSheets } from "@/lib/agentPipeline";
import { cn } from "@/lib/utils";

export default function Leads() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("score");
  const [isSyncing, setIsSyncing] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);
  const [validationStage, setValidationStage] = useState(""); 
  const queryClient = useQueryClient();

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["leads"],
    queryFn: fetchCombinedLeads,
  });

  const unsyncedLeads = leads.filter(l => !l.isSynced);
  const unvalidatedLeads = leads.filter(l => !l.isSynced && !l.validation);
  const localLeads = leads.filter(l => !l.isSynced);
  const invalidLeads = leads.filter(l => l.status === 'invalid');

  const [auditProgress, setAuditProgress] = useState(0);

  const handleDeepAudit = async () => {
    if (localLeads.length === 0) {
      toast.info("No local leads available for deep audit.");
      return;
    }

    setIsAuditing(true);
    setAuditProgress(0);
    const toastId = toast.loading("Security Architect: Performing Deep Risk Audit...");

    try {
      const batchSize = 5;
      const totalLeads = localLeads.length;
      let processedCount = 0;
      let invalidCount = 0;

      for (let i = 0; i < totalLeads; i += batchSize) {
        const batch = localLeads.slice(i, i + batchSize);
        const response = await fetch('/api/proxy/deep-audit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ leads: batch })
        });

        if (!response.ok) {
          throw new Error(`Audit Server Error ${response.status}`);
        }

        const { auditedLeads } = await response.json();

        for (const audited of auditedLeads) {
          if (audited.audit_metadata.status === 'invalid') {
            invalidCount++;
          }
          await entities.Lead.update(audited.id, {
            validation: {
              ...audited.validation,
              deepAudit: audited.audit_metadata,
              isGenuine: audited.audit_metadata.status !== 'invalid',
              lastChecked: new Date().toISOString()
            },
            status: audited.audit_metadata.status
          });
        }

        processedCount += batch.length;
        setAuditProgress(Math.round((processedCount / totalLeads) * 100));
        toast.loading(`Security Architect: Auditing ${processedCount}/${totalLeads}...`, { id: toastId });
      }

      await queryClient.invalidateQueries(["leads"]);
      
      if (invalidCount > 0) {
        toast.error(`Audit complete. ${invalidCount} Fraud Risks quarantined.`, { id: toastId });
      } else {
        toast.success("Security Audit passed. All leads high-integrity.", { id: toastId });
      }

    } catch (error) {
      console.error(error);
      toast.error(`Deep Audit failed: ${error.message}`, { id: toastId });
    } finally {
      setIsAuditing(false);
      setAuditProgress(0);
    }
  };

  const handlePurgeInvalid = async () => {
    if (invalidLeads.length === 0) return;

    const toastId = toast.loading(`Purging ${invalidLeads.length} invalid leads...`);
    try {
      for (const lead of invalidLeads) {
        await entities.Lead.delete(lead.id);
      }
      await queryClient.invalidateQueries(["leads"]);
      toast.success("Database sanitized successfully.", { id: toastId });
    } catch (e) {
      toast.error("Purge failed.");
    }
  };

  const handleValidate = async () => {
    if (unvalidatedLeads.length === 0) {
      toast.info("All local leads have been verified.");
      return;
    }

    setIsValidating(true);
    
    try {
      const settingsList = await entities.Settings.list();
      const location = settingsList.find(s => s.key === 'target_location')?.value || "Global";

      for (const lead of unvalidatedLeads) {
        // Stage 1: Identity (AI Audit)
        setValidationStage(`Identity Audit: ${lead.company_name}`);
        const idRes = await fetch('/api/proxy/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lead, location, stage: 'identity' })
        });
        const identity = await idRes.json();

        // Stage 2: DNS/MX Audit (Market Standard)
        setValidationStage(`DNS/MX Audit...`);
        const domain = lead.domain?.replace(/^https?:\/\//, '').split('/')[0];
        const dnsRes = await fetch(`/api/proxy/verify-domain?domain=${domain}`);
        const dnsData = await dnsRes.json();

        // Stage 3: Outreach Audit
        setValidationStage(`Outreach Logic...`);
        const outRes = await fetch('/api/proxy/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lead, location, stage: 'outreach' })
        });
        const outreach = await outRes.json();
        
        const isGenuine = identity.identityMatch && dnsData.isValid;
        
        // Update local lead with validation data
        await entities.Lead.update(lead.id, { 
          validation: {
            identity,
            technical: { technicalValid: dnsData.isValid, mx_records: dnsData.mxRecords },
            outreach,
            isGenuine,
            lastChecked: new Date().toISOString()
          },
          status: isGenuine ? 'scored' : 'invalid'
        });
      }

      setValidationStage("Finalizing...");
      await queryClient.invalidateQueries(["leads"]);
      toast.success("Intelligence pipeline validated successfully.");
    } catch (error) {
      console.error(error);
      toast.error("Validation interrupted.");
    } finally {
      setIsValidating(false);
      setValidationStage("");
    }
  };

  const getValidationBtnStyles = () => {
    if (!isValidating) return "bg-white border-blue-200 text-blue-600 hover:bg-blue-50";
    if (validationStage.includes("Searching")) return "bg-amber-50 border-amber-200 text-amber-600";
    if (validationStage.includes("Technical")) return "bg-purple-50 border-purple-200 text-purple-600";
    if (validationStage.includes("Outreach")) return "bg-indigo-50 border-indigo-200 text-indigo-600";
    return "bg-emerald-50 border-emerald-200 text-emerald-600";
  };

  const handleSync = async () => {
    if (unsyncedLeads.length === 0) {
      toast.info("All leads are already synchronized.");
      return;
    }

    setIsSyncing(true);
    const toastId = toast.loading("Synchronizing local database to Google Sheets...");

    try {
      const settingsList = await entities.Settings.list();
      const settings = settingsList.reduce((acc, s) => {
        acc[s.key] = s.value;
        return acc;
      }, {});

      const success = await syncToSheets(unsyncedLeads, settings);
      
      if (success) {
        await entities.Lead.clear();
        await queryClient.invalidateQueries(["leads"]);
        toast.success("Intelligence successfully exported to Cloud storage.", { id: toastId });
      } else {
        toast.error("Sync Failed: Ensure you use the 'Web App URL' from Apps Script (it should end in /exec), not the Sheet browser URL.", { 
          id: toastId,
          duration: 6000 
        });
      }
    } catch (error) {
      toast.error("Synchronization Interrupted.", { id: toastId });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDelete = async (id) => {
    const isSynced = leads.find(l => l.id === id)?.isSynced;
    
    try {
      if (isSynced) {
        // For synced leads, we add to a local blacklist
        await entities.DeletedLead.create(id);
      } else {
        // For local leads, we delete from local storage
        await entities.Lead.delete(id);
      }
      
      await queryClient.invalidateQueries(["leads"]);
      toast.success("Lead removed from your workspace.");
    } catch (error) {
      toast.error("Failed to remove lead.");
    }
  };

  const filteredLeads = leads
    .filter(lead => {
      const matchesSearch = (
        (lead.company_name?.toLowerCase() || "").includes(search.toLowerCase()) || 
        (lead.industry?.toLowerCase() || "").includes(search.toLowerCase())
      );
      const matchesStatus = statusFilter === "all" || lead.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === "score") return (b.icp_score || 0) - (a.icp_score || 0);
      return new Date(b.created_at) - new Date(a.created_at);
    });

  const handleExport = () => {
    if (filteredLeads.length === 0) {
      toast.error("No leads to export.");
      return;
    }

    const headers = ["Company", "Industry", "Contact", "Email", "Score", "Status", "Subject", "Body", "Date"];
    const csvRows = filteredLeads.map(l => [
      l.company_name || "",
      l.industry || "",
      l.contact_name || "",
      l.contact_email || "",
      l.icp_score || 0,
      l.status || "",
      l.email_subject || "",
      (l.email_body || "").replace(/\n/g, " "),
      l.created_at || ""
    ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(","));

    const csvContent = [headers.join(","), ...csvRows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `leadpilot_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success(`Exported ${filteredLeads.length} leads successfully.`);
  };

  return (
    <div className="space-y-12 font-jakarta">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-[0.2em]">
            <Building2 className="w-3.5 h-3.5" />
            <span>Market Intelligence</span>
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight font-outfit">Lead Explorer</h1>
          <p className="text-slate-500 font-medium">Verified B2B opportunities across global sectors.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {invalidLeads.length > 0 && (
             <Button 
               variant="destructive"
               onClick={handlePurgeInvalid}
               className="rounded-xl h-14 px-6 font-bold gap-3 shadow-lg transition-all active:scale-95 border-none"
             >
                <Trash2 className="w-4 h-4" />
                <span>Purge {invalidLeads.length} Risks</span>
             </Button>
          )}

          <div className="flex flex-col gap-2">
            <Button 
              onClick={handleDeepAudit} 
              disabled={isAuditing || localLeads.length === 0}
              className="bg-slate-900 hover:bg-black text-white rounded-xl h-14 px-6 font-bold gap-3 shadow-xl transition-all active:scale-95 border-none relative overflow-hidden"
            >
              {isAuditing && (
                <motion.div 
                  className="absolute bottom-0 left-0 h-1 bg-blue-500 z-10"
                  initial={{ width: 0 }}
                  animate={{ width: `${auditProgress}%` }}
                />
              )}
              {isAuditing ? (
                <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
              ) : (
                <Lock className="w-4 h-4 text-blue-400" />
              )}
              <div className="flex flex-col items-start leading-none gap-1">
                 <span className="text-xs uppercase tracking-wider">
                   {isAuditing ? `Auditing ${auditProgress}%` : "Security Audit"}
                 </span>
                 <span className="text-[10px] font-medium opacity-70">Deep Compliance Scan</span>
              </div>
            </Button>
          </div>

          {unsyncedLeads.length > 0 && (
            <Button 
              onClick={handleSync} 
              disabled={isSyncing || isValidating || isAuditing}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-14 px-8 font-bold gap-3 shadow-xl shadow-emerald-100 transition-all active:scale-95 border-none"
            >
              {isSyncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CloudUpload className="w-4 h-4" />}
              <span>Sync {unsyncedLeads.length} Leads</span>
            </Button>
          )}
          
          <Button variant="outline" onClick={handleExport} className="rounded-xl h-14 px-8 border-slate-200 hover:bg-slate-50 hover:border-slate-300 font-bold gap-3 shadow-sm transition-all active:scale-95 bg-white text-slate-600">
            <Download className="w-4 h-4" />
            <span>Export</span>
          </Button>
        </div>
      </header>

      {/* Control Bar */}
      <div className="flex flex-col lg:flex-row gap-6 p-2 bg-slate-100/50 rounded-2xl border border-slate-200/50">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Search company, sector or persona..." 
            className="pl-12 h-14 rounded-xl border-none bg-white shadow-sm placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-blue-500/20 text-base font-medium"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-2 bg-white px-4 rounded-xl shadow-sm border border-slate-100">
            <Filter className="w-4 h-4 text-slate-400" />
            <select 
              className="h-10 border-none bg-transparent text-sm font-bold text-slate-600 focus:outline-none min-w-[140px]"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Lifecycle: All</option>
              <option value="discovered">Discovered</option>
              <option value="enriched">Enriched</option>
              <option value="scored">Scored</option>
              <option value="drafted">Drafted</option>
              <option value="invalid">Fraud Risk</option>
            </select>
          </div>
          <div className="flex items-center gap-2 bg-white px-4 rounded-xl shadow-sm border border-slate-100">
            <ArrowUpDown className="w-4 h-4 text-slate-400" />
            <select 
              className="h-10 border-none bg-transparent text-sm font-bold text-slate-600 focus:outline-none min-w-[140px]"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="score">Rank: Relevance</option>
              <option value="date">Rank: Newest</option>
            </select>
          </div>
        </div>
      </div>

      <div className="h-px bg-slate-200/60" />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3,4,5,6].map(i => (
             <div key={i} className="h-72 bg-slate-100/50 rounded-3xl animate-pulse border border-slate-100" />
          ))}
        </div>
      ) : filteredLeads.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredLeads.map((lead, idx) => (
              <motion.div
                key={lead.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2, delay: idx * 0.05 }}
              >
                <LeadCard 
                  lead={lead} 
                  onDelete={() => handleDelete(lead.id)} 
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="py-40 text-center">
          <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-inner border border-slate-100">
            <LayoutGrid className="w-10 h-10 text-slate-200" />
          </div>
          <p className="text-xl font-bold text-slate-400">Zero intelligence matches found.</p>
          <p className="text-slate-400 mt-2">Adjust your filters or deploy the agent to discover more.</p>
          <Button asChild variant="link" className="mt-4 text-blue-600 font-bold">
             <Link to="/run">Launch New Mission</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
