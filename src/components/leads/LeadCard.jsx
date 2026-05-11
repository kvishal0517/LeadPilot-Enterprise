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
    <div className="bg-white border border-slate-200/60 rounded-[2rem] overflow-hidden shadow-sm hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500 group relative">
      <div className="p-8">
        <div className="flex justify-between items-start mb-8">
          <div className="flex gap-5">
            <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 border border-slate-100 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500 group-hover:rotate-6 group-hover:scale-110 shadow-inner">
              <Building2 className="w-7 h-7" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 leading-tight text-lg group-hover:text-blue-600 transition-colors">{lead.company_name}</h3>
              <div className="flex items-center gap-3 mt-2">
                <Badge variant="outline" className={cn("text-[10px] font-black uppercase tracking-[0.15em] px-2.5 py-0.5 rounded-lg border-none shadow-sm", statusColors[lead.status] || "bg-slate-100 text-slate-500")}>
                  {lead.status}
                </Badge>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                   <MapPin className="w-3 h-3" />
                   <span className="truncate max-w-[120px]">{lead.industry}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-3">
             <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-600 rounded-xl font-black text-xs shadow-sm border border-amber-100/50 group-hover:scale-110 transition-transform">
                <Zap className="w-3 h-3 fill-current" />
                <span>{lead.icp_score}%</span>
             </div>
             <button 
               onClick={onDelete}
               className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
             >
                <Trash2 className="w-4 h-4" />
             </button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center gap-4 p-4 bg-slate-50/50 rounded-2xl border border-slate-100/50 group-hover:bg-white group-hover:border-slate-200 transition-all">
             <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center border border-slate-100">
                <User className="w-4 h-4 text-slate-500" />
             </div>
             <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Key Persona</p>
                <span className="font-bold text-slate-800">{lead.contact_name}</span>
             </div>
          </div>
          
          <div className="flex gap-3">
             <SocialBtn href={`https://${lead.domain}`} icon={Globe} label="Website" />
             <SocialBtn href={`mailto:${lead.contact_email}`} icon={Mail} label="Email" />
             <SocialBtn href={lead.linkedin_url} icon={Linkedin} label="LinkedIn" />
          </div>
        </div>
      </div>

      <AnimatePresence>
        {lead.email_body && (
          <div className="border-t border-slate-100/60 bg-slate-50/30">
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full px-8 py-4 flex items-center justify-between text-[11px] font-black text-slate-500 hover:text-blue-600 transition-colors uppercase tracking-[0.2em]"
            >
              <span>{isExpanded ? "Minimize Draft" : "Semantic Personalization"}</span>
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            
            {isExpanded && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="px-8 pb-8 overflow-hidden"
              >
                 <div className="bg-white border border-slate-200/60 rounded-[1.5rem] p-6 space-y-4 shadow-sm relative overflow-hidden group/draft">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/[0.03] blur-2xl -z-0" />
                    <div className="relative z-10">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Subject Header</p>
                      <p className="text-sm font-black text-slate-800 group-hover/draft:text-blue-600 transition-colors">{lead.email_subject}</p>
                    </div>
                    <div className="h-px bg-slate-100 relative z-10" />
                    <div className="relative z-10">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Message Body</p>
                      <p className="text-sm text-slate-600 font-medium whitespace-pre-wrap leading-relaxed">{lead.email_body}</p>
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
