import { useState } from "react";
import { 
  Building2, 
  User, 
  Globe, 
  Mail, 
  Linkedin, 
  ChevronDown, 
  ChevronUp,
  Star,
  ExternalLink,
  Trash2,
  Zap,
  MapPin
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

export default function LeadCard({ lead, onDelete }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const statusColors = {
    discovered: "bg-blue-50 text-blue-600 border-blue-100",
    enriched: "bg-indigo-50 text-indigo-600 border-indigo-100",
    scored: "bg-purple-50 text-purple-600 border-purple-100",
    drafted: "bg-emerald-50 text-emerald-600 border-emerald-100",
  };

  return (
    <div className="bg-white border border-slate-200/60 rounded-[2rem] overflow-hidden shadow-sm hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-500 group relative flex flex-col h-full font-jakarta">
      <div className="p-8 flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-8 gap-4">
          <div className="flex gap-4 min-w-0">
            <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 border border-slate-100 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500 group-hover:rotate-3 group-hover:scale-110 shadow-inner shrink-0">
              <Building2 className="w-7 h-7" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-extrabold text-slate-900 leading-tight text-lg group-hover:text-blue-600 transition-colors break-words font-outfit">{lead.company_name}</h3>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <Badge variant="outline" className={cn("text-[9px] font-black uppercase tracking-[0.1em] px-2 py-0.5 rounded-md border-none shadow-sm shrink-0", statusColors[lead.status] || "bg-slate-100 text-slate-500")}>
                  {lead.status}
                </Badge>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-wider min-w-0">
                   <MapPin className="w-3 h-3 shrink-0" />
                   <span className="break-words">{lead.industry}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-3 shrink-0">
             <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-600 rounded-xl font-black text-xs shadow-sm border border-amber-100/50 group-hover:scale-105 transition-transform">
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>{lead.icp_score}%</span>
             </div>
             <button 
               onClick={onDelete}
               className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
             >
                <Trash2 className="w-4 h-4" />
             </button>
          </div>
        </div>

        <div className="space-y-6 mt-auto">
          <div className="flex items-center gap-4 p-4 bg-slate-50/50 rounded-2xl border border-slate-100/50 group-hover:bg-white group-hover:border-slate-200 transition-all">
             <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center border border-slate-100 shrink-0">
                <User className="w-4 h-4 text-slate-500" />
             </div>
             <div className="min-w-0">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Key Persona</p>
                <p className="font-bold text-slate-800 text-sm truncate">{lead.contact_name}</p>
             </div>
          </div>
          
          <div className="flex gap-3">
             <SocialBtn href={lead.domain?.startsWith('http') ? lead.domain : `https://${lead.domain}`} icon={Globe} label="Website" />
             <SocialBtn href={`mailto:${lead.contact_email}`} icon={Mail} label="Email" />
             <SocialBtn href={lead.linkedin_url} icon={Linkedin} label="LinkedIn" />
          </div>
        </div>
      </div>

      <AnimatePresence>
        {lead.email_body && (
          <div className="border-t border-slate-100/60 bg-slate-50/20">
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full px-8 py-4 flex items-center justify-between text-[10px] font-black text-slate-500 hover:text-blue-600 transition-colors uppercase tracking-[0.15em]"
            >
              <span>{isExpanded ? "Hide Intelligence" : "Semantic Personalization"}</span>
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            
            {isExpanded && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="px-8 pb-8 overflow-hidden"
              >
                 <div className="bg-white border border-slate-200/60 rounded-2xl p-6 space-y-4 shadow-sm relative overflow-hidden group/draft">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/[0.03] blur-3xl -z-0" />
                    <div className="relative z-10">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Subject Header</p>
                      <p className="text-xs font-bold text-slate-800 group-hover/draft:text-blue-600 transition-colors leading-normal break-words">{lead.email_subject}</p>
                    </div>
                    <div className="h-px bg-slate-100 relative z-10" />
                    <div className="relative z-10">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Message Body</p>
                      <div className="max-h-[200px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent pr-2">
                        <p className="text-xs text-slate-600 font-medium whitespace-pre-wrap leading-relaxed break-words">{lead.email_body}</p>
                      </div>
                    </div>
                 </div>
              </motion.div>
            )}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SocialBtn({ href, icon: Icon, label }) {
  return (
    <a 
      href={href} 
      target="_blank" 
      rel="noopener noreferrer"
      title={label}
      className="flex-1 flex items-center justify-center p-3 rounded-xl bg-white border border-slate-200/60 text-slate-400 hover:text-blue-600 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300"
    >
      <Icon className="w-4 h-4" />
    </a>
  );
}
