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
  MapPin,
  ShieldAlert,
  ShieldCheck,
  Search,
  MessageSquareCode
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
    invalid: "bg-red-50 text-red-600 border-red-100",
  };

  const isInvalid = lead.status === 'invalid';

  return (
    <div className={cn(
      "bg-white border rounded-[1.5rem] overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 group relative flex flex-col h-full font-jakarta",
      isInvalid ? "border-red-200 bg-red-50/10" : "border-slate-200/60 hover:shadow-blue-500/10"
    )}>
      {isInvalid && (
        <div className="absolute top-0 left-0 w-full h-1 bg-red-500 z-20" />
      )}
      
      <div className="p-5 flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-6 gap-3">
          <div className="flex gap-3 min-w-0">
            <div className={cn(
              "w-11 h-11 rounded-xl flex items-center justify-center border transition-all duration-500 group-hover:rotate-3 group-hover:scale-110 shadow-inner shrink-0",
              isInvalid ? "bg-red-100 text-red-500 border-red-200" : "bg-slate-50 text-slate-400 border-slate-100 group-hover:bg-blue-600 group-hover:text-white"
            )}>
              {isInvalid ? <ShieldAlert className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className={cn(
                "font-bold leading-tight text-sm transition-colors break-words font-outfit",
                isInvalid ? "text-red-900" : "text-slate-900 group-hover:text-blue-600"
              )}>{lead.company_name}</h3>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <Badge variant="outline" className={cn("text-[10px] font-black uppercase tracking-[0.1em] px-1.5 py-0 rounded border-none shadow-sm shrink-0", statusColors[lead.status] || "bg-slate-100 text-slate-500")}>
                  {lead.status}
                </Badge>
                <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold uppercase tracking-wider min-w-0">
                   <MapPin className="w-2.5 h-2.5 shrink-0" />
                   <span className="truncate">{lead.industry}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
             <div className={cn(
               "flex items-center gap-1 px-2 py-1 rounded-lg font-black text-[10px] shadow-sm border group-hover:scale-105 transition-transform",
               isInvalid ? "bg-red-50 text-red-600 border-red-100" : "bg-amber-50 text-amber-600 border-amber-100/50"
             )}>
                <Zap className="w-3 h-3 fill-current" />
                <span>{lead.icp_score}%</span>
             </div>
             <button 
               onClick={onDelete}
               className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
             >
                <Trash2 className="w-3.5 h-3.5" />
             </button>
          </div>
        </div>

        {lead.validation && (
          <div className="mb-4 space-y-2">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400">
               <span>Validation Audit</span>
               {lead.validation.isGenuine ? 
                <span className="text-emerald-600 flex items-center gap-1"><ShieldCheck className="w-3 h-3"/> Genuine</span> : 
                <span className="text-red-600 flex items-center gap-1"><ShieldAlert className="w-3 h-3"/> Fraud Risk</span>
               }
            </div>
            
            {/* Display Deep Audit Flags if available */}
            {lead.validation.deepAudit?.flags?.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {lead.validation.deepAudit.flags.map((flag, i) => (
                  <span key={i} className="text-[8px] bg-red-50 text-red-500 px-1.5 py-0.5 rounded border border-red-100 font-bold uppercase">
                    {flag}
                  </span>
                ))}
              </div>
            )}

            <div className="grid grid-cols-3 gap-1">
               <ValidationDot 
                 active={lead.validation.isGenuine || lead.validation.identity?.identityMatch || (lead.validation.deepAudit && lead.validation.deepAudit.risk_score < 40)} 
                 label="Identity" 
                 icon={Search} 
               />
               <ValidationDot 
                 active={(lead.validation.mx_records?.length > 0) || lead.validation.technical?.technicalValid || (lead.validation.deepAudit && !lead.validation.deepAudit.flags.includes("Missing Domain"))} 
                 label="DNS/MX" 
                 icon={Globe} 
               />
               <ValidationDot 
                 active={lead.validation.identity_score > 80 || lead.validation.outreach?.outreachEffective || (lead.validation.deepAudit && lead.validation.deepAudit.risk_score < 20)} 
                 label="Trust" 
                 icon={MessageSquareCode} 
               />
            </div>
          </div>
        )}

        <div className="space-y-4 mt-auto">
          <div className="flex items-center gap-3 p-3 bg-slate-50/50 rounded-xl border border-slate-100/50 group-hover:bg-white group-hover:border-slate-200 transition-all">
             <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center border border-slate-100 shrink-0">
                <User className="w-3.5 h-3.5 text-slate-500" />
             </div>
             <div className="min-w-0">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Key Persona</p>
                <p className="font-bold text-slate-800 text-xs truncate">{lead.contact_name}</p>
             </div>
          </div>
          
          <div className="flex gap-2">
             {lead.domain && (
               <SocialBtn href={lead.domain.startsWith('http') ? lead.domain : `https://${lead.domain}`} icon={Globe} label="Website" />
             )}
             {lead.contact_email && (
               <SocialBtn href={`mailto:${lead.contact_email}`} icon={Mail} label="Email" />
             )}
             {lead.linkedin_url && (
               <SocialBtn href={lead.linkedin_url} icon={Linkedin} label="LinkedIn" />
             )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {(lead.email_body || lead.validation?.outreach?.feedback) && (
          <div className="border-t border-slate-100/60 bg-slate-50/20">
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full px-5 py-3 flex items-center justify-between text-[10px] font-black text-slate-500 hover:text-blue-600 transition-colors uppercase tracking-[0.15em]"
            >
              <span>{isExpanded ? "Hide Intelligence" : (isInvalid ? "Review Failure" : "Semantic Personalization")}</span>
              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            
            {isExpanded && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="px-5 pb-5 overflow-hidden"
              >
                 <div className="bg-white border border-slate-200/60 rounded-xl p-4 space-y-3 shadow-sm relative overflow-hidden group/draft">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/[0.03] blur-2xl -z-0" />
                    
                    {lead.validation?.outreach?.feedback && (
                      <div className="relative z-10 p-2 bg-amber-50 rounded-lg border border-amber-100">
                        <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-1">Validation Feedback</p>
                        <p className="text-[11px] font-medium text-amber-900 leading-relaxed">{lead.validation.outreach.feedback}</p>
                      </div>
                    )}

                    {lead.email_body && (
                      <>
                        <div className="relative z-10">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Subject Header</p>
                          <p className="text-[11px] font-bold text-slate-800 group-hover/draft:text-blue-600 transition-colors leading-normal break-words">{lead.email_subject}</p>
                        </div>
                        <div className="h-px bg-slate-100 relative z-10" />
                        <div className="relative z-10">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Message Body</p>
                          <div className="max-h-[150px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent pr-2">
                            <p className="text-[11px] text-slate-600 font-medium whitespace-pre-wrap leading-relaxed break-words">{lead.email_body}</p>
                          </div>
                        </div>
                      </>
                    )}
                 </div>
              </motion.div>
            )}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ValidationDot({ active, label, icon: Icon }) {
  return (
    <div className={cn(
      "flex flex-col items-center gap-1 p-2 rounded-xl border transition-all",
      active ? "bg-emerald-50 border-emerald-100 text-emerald-600" : "bg-red-50 border-red-100 text-red-600"
    )}>
      <Icon className="w-3 h-3" />
      <span className="text-[8px] font-black uppercase tracking-tighter">{label}</span>
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
      className="flex-1 flex items-center justify-center p-2 rounded-lg bg-white border border-slate-200/60 text-slate-400 hover:text-blue-600 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300"
    >
      <Icon className="w-3.5 h-3.5" />
    </a>
  );
}
