import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  Search, 
  Download, 
  Building2,
  Filter,
  ArrowUpDown,
  LayoutGrid,
  List as ListIcon
} from "lucide-react";
import { entities } from "@/api/db";
import LeadCard from "@/components/leads/LeadCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";

export default function Leads() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("score");
  const queryClient = useQueryClient();

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["leads"],
    queryFn: async () => {
      const settingsList = await entities.Settings.list();
      const sheetsUrl = settingsList.find(s => s.key === 'sheets_url')?.value;
      if (!sheetsUrl) return [];
      
      const response = await fetch(`/api/proxy/leads?url=${encodeURIComponent(sheetsUrl)}`);
      if (!response.ok) throw new Error("Failed to fetch leads from Sheets");
      const data = await response.json();
      
      // Map sheet headers to app properties
      return data.map(l => ({
        id: l.email || Math.random().toString(),
        company_name: l.company,
        industry: l.industry,
        contact_name: l.contact,
        contact_email: l.email,
        icp_score: l.score,
        email_subject: l.subject,
        email_body: l.body,
        status: 'drafted', // Default for sheet leads
        created_at: l.date
      }));
    },
  });

  const handleDelete = async (id) => {
    toast.error("Deletion is only available in your Google Sheet for synchronized data.");
  };

  const filteredLeads = leads
    .filter(lead => {
      const matchesSearch = (
        (lead.company_name?.toLowerCase() || "").includes(search.toLowerCase()) || 
        (lead.industry?.toLowerCase() || "").includes(search.toLowerCase())
      );
      return matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === "score") return (b.icp_score || 0) - (a.icp_score || 0);
      return new Date(b.created_at) - new Date(a.created_at);
    });

  const handleExport = async () => {
    const settingsList = await entities.Settings.list();
    const sheetsUrl = settingsList.find(s => s.key === 'sheets_url')?.value;
    if (!sheetsUrl) {
       toast.error("Google Sheets URL not configured.");
       return;
    }

    const downloadUrl = `/api/proxy/export-csv?url=${encodeURIComponent(sheetsUrl)}`;
    window.open(downloadUrl, '_blank');
    toast.success("Downloading database from Google Sheets...");
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
        <Button variant="outline" onClick={handleExport} className="rounded-xl h-14 px-8 border-slate-200 hover:bg-slate-50 hover:border-slate-300 font-bold gap-3 shadow-sm transition-all active:scale-95 bg-white">
          <Download className="w-4 h-4 text-slate-600" />
          <span>Export Database</span>
        </Button>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1,2,3,4,5,6].map(i => (
             <div key={i} className="h-72 bg-slate-100/50 rounded-3xl animate-pulse border border-slate-100" />
          ))}
        </div>
      ) : filteredLeads.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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
