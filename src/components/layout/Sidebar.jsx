import { NavLink } from "react-router-dom";
import { 
  LayoutDashboard, 
  Play, 
  Users, 
  BarChart2, 
  Settings, 
  Zap,
  Circle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: Play, label: "Run Agent", path: "/run" },
  { icon: Users, label: "Leads", path: "/leads" },
  { icon: BarChart2, label: "Analytics", path: "/analytics" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

export default function Sidebar() {
  return (
    <aside className="w-[300px] h-full bg-[#020617] text-white flex flex-col shrink-0 border-r border-white/5 relative z-20 shadow-2xl">
      <div className="p-8">
        <div className="flex items-center gap-3 mb-12">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative w-11 h-11 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-2xl shadow-blue-500/20">
              <Zap className="w-6 h-6 text-white fill-white" />
            </div>
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">LeadPilot</span>
            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-[0.2em] -mt-1">Enterprise</p>
          </div>
        </div>

        <nav className="space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3.5 px-5 py-3 rounded-xl text-sm font-semibold transition-all duration-300 relative group",
                  isActive
                    ? "bg-white/5 text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]"
                    : "text-slate-400 hover:text-white hover:bg-white/[0.02]"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className={cn("w-[18px] h-[18px] shrink-0 transition-transform group-hover:scale-110", isActive ? "text-blue-400" : "text-slate-500")} />
                  <span>{item.label}</span>
                  {isActive && (
                    <motion.div 
                      layoutId="active-nav"
                      className="absolute left-0 w-1 h-5 bg-blue-500 rounded-r-full"
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="mt-auto p-8 space-y-6">
        <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-5 relative overflow-hidden group hover:border-blue-500/30 transition-colors">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 blur-3xl -z-10" />
          <div className="flex items-center gap-2 mb-3">
            <div className="relative">
              <Circle className="w-2.5 h-2.5 text-emerald-500 fill-emerald-500 shadow-xl shadow-emerald-500/50" />
              <div className="absolute inset-0 animate-ping rounded-full bg-emerald-500/50" />
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active State</span>
          </div>
          <p className="text-sm font-bold text-slate-200">Autonomous Ready</p>
          <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">Mission control operational across all sectors.</p>
        </div>

        <div className="flex items-center gap-3 px-2 pt-2 border-t border-white/5">
           <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-slate-800 to-slate-700 border border-white/10 flex items-center justify-center text-xs font-bold text-slate-300">
              VK
           </div>
           <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-200 truncate">Vishal Kapoor</p>
              <p className="text-[10px] text-slate-500 font-medium truncate">Operator Account</p>
           </div>
        </div>
      </div>
    </aside>
  );
}
