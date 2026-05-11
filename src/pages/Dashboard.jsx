import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { 
  Users, 
  Mail, 
  TrendingUp, 
  Zap, 
  Plus, 
  ArrowRight,
  Clock,
  ArrowUpRight,
  Target,
  ShieldCheck,
  MousePointer2,
  Activity
} from "lucide-react";
import { entities } from "@/api/db";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
export default function Dashboard() {
  const { data: leads = [] } = useQuery({
    queryKey: ["leads-summary"],
    queryFn: () => entities.Lead.list("-created_date", 100),
  });

  const stats = [
    { 
      label: "Total Pipeline", 
      value: leads.length, 
      icon: Users, 
      color: "blue",
      trend: "+12.5%",
      bg: "bg-blue-500/10",
      text: "text-blue-600"
    },
    { 
      label: "Campaign Drafts", 
      value: leads.filter(l => ["drafted", "sent"].includes(l.status)).length, 
      icon: Mail, 
      color: "indigo",
      trend: "+5.2%",
      bg: "bg-indigo-500/10",
      text: "text-indigo-600"
    },
    { 
      label: "Active Outreach", 
      value: leads.filter(l => l.status === "replied").length, 
      icon: TrendingUp, 
      color: "emerald",
      trend: "+2.1%",
      bg: "bg-emerald-500/10",
      text: "text-emerald-600"
    },
    { 
      label: "Lead Precision", 
      value: `${Math.round(leads.reduce((acc, curr) => acc + (curr.icp_score || 0), 0) / (leads.length || 1))}%`, 
      icon: Target, 
      color: "amber",
      trend: "Optimum",
      bg: "bg-amber-500/10",
      text: "text-amber-600"
    },
  ];

  return (
    <div className="space-y-12 font-jakarta">
      <header className="flex justify-between items-end">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-[0.2em]">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Mission Control Active</span>
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight font-outfit">Overview</h1>
        </div>
        <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-14 px-8 font-bold shadow-xl shadow-blue-200 transition-all hover:scale-[1.02] active:scale-95 group">
          <Link to="/run" className="flex items-center gap-3">
            <Zap className="w-5 h-5 fill-white group-hover:animate-pulse" />
            <span>Deploy New Mission</span>
          </Link>
        </Button>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <motion.div 
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="group bg-white border border-slate-200/60 rounded-2xl p-6 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 hover:-translate-y-1"
          >
            <div className="flex justify-between items-start mb-6">
              <div className={`p-3 rounded-xl ${stat.bg} ${stat.text} transition-colors group-hover:bg-slate-900 group-hover:text-white`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <span className={cn("text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider", 
                stat.color === 'emerald' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'
              )}>
                {stat.trend}
              </span>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
              <p className="text-4xl font-extrabold text-slate-900 mt-2 tabular-nums tracking-tight font-outfit">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Content Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 bg-white border border-slate-200/60 rounded-3xl overflow-hidden shadow-sm">
          <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
            <div className="flex items-center gap-3">
               <Activity className="w-4 h-4 text-blue-600" />
               <h3 className="font-bold text-slate-900">Recent Discovered Intelligence</h3>
            </div>
            <Link to="/leads" className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors">
              Exploration Hub <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {leads.slice(0, 6).map((lead, idx) => (
              <motion.div 
                key={lead.id} 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + (idx * 0.05) }}
                className="px-8 py-5 flex items-center justify-between hover:bg-slate-50/50 transition-colors group"
              >
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-500 font-black text-lg transition-all group-hover:bg-blue-600 group-hover:text-white group-hover:rotate-6">
                    {lead.company_name[0]}
                  </div>
                  <div>
                    <p className="text-base font-bold text-slate-900 font-outfit">{lead.company_name}</p>
                    <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                       <span>{lead.industry}</span>
                       <span className="w-1 h-1 bg-slate-300 rounded-full" />
                       <span className="capitalize">{lead.status}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-right">
                  <div className="hidden sm:block">
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Precision</p>
                     <p className="text-sm font-black text-slate-800">{lead.icp_score}%</p>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 text-slate-300 group-hover:text-blue-600 group-hover:bg-blue-50 transition-all">
                     <MousePointer2 className="w-4 h-4" />
                  </div>
                </div>
              </motion.div>
            ))}
            {leads.length === 0 && (
              <div className="py-24 text-center">
                <Users className="w-12 h-12 text-slate-100 mx-auto mb-4" />
                <p className="text-slate-400 font-medium italic">Scanning global networks for leads...</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-[#020617] text-white rounded-3xl p-10 shadow-2xl relative overflow-hidden flex flex-col justify-between">
           <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 blur-[80px] -z-0" />
           
           <div className="relative z-10">
              <div className="flex items-center gap-3 mb-10">
                 <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                    <Clock className="w-4 h-4 text-blue-400" />
                 </div>
                 <h3 className="font-bold text-slate-200">Scheduled Operations</h3>
              </div>
              <p className="text-6xl font-extrabold tracking-tighter text-white font-outfit">08:00<span className="text-blue-500">AM</span></p>
              <p className="text-slate-400 mt-4 text-sm font-medium">Daily Autonomous Sync (IST)</p>
              
              <div className="mt-14 space-y-4">
                 <div className="p-5 bg-white/[0.03] rounded-2xl border border-white/5 group hover:border-white/10 transition-colors">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Operational Integrity</p>
                    <p className="text-lg font-bold text-slate-200">100% Reliability</p>
                 </div>
                 <div className="p-5 bg-white/[0.03] rounded-2xl border border-white/5 group hover:border-white/10 transition-colors">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Daily Throughput</p>
                    <p className="text-lg font-bold text-slate-200">20+ New Targets</p>
                 </div>
              </div>
           </div>
           
           <div className="relative z-10 pt-10">
              <Button asChild variant="outline" className="w-full border-white/10 bg-white/5 hover:bg-white/10 text-white rounded-2xl h-14 font-bold transition-all hover:scale-[1.02]">
                 <Link to="/run" className="flex items-center justify-center gap-2">
                    <span>Manual Command Override</span>
                    <ArrowRight className="w-4 h-4" />
                 </Link>
              </Button>
           </div>
        </div>
      </div>
    </div>
  );
}


