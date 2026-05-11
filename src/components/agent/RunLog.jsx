import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Terminal, Cpu } from "lucide-react";

export default function RunLog({ log }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      const scrollElement = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [log]);

  const lines = log.split("\n").filter(Boolean);

  return (
    <div className="bg-[#020617] rounded-3xl overflow-hidden shadow-2xl flex flex-col h-full border border-white/5 relative group">
      <div className="absolute inset-0 bg-blue-500/[0.02] pointer-events-none group-hover:bg-blue-500/[0.04] transition-colors" />
      
      <div className="px-8 py-5 border-b border-white/5 flex items-center justify-between bg-white/[0.02] relative z-10">
        <div className="flex items-center gap-3">
           <Terminal className="w-4 h-4 text-blue-500" />
           <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">Telemetry Terminal</h3>
        </div>
        <div className="flex items-center gap-4">
           <div className="flex items-center gap-2">
              <Cpu className="w-3.5 h-3.5 text-slate-700 animate-pulse" />
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Core v3.1</span>
           </div>
           <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-800" />
              <div className="w-2.5 h-2.5 rounded-full bg-slate-800" />
              <div className="w-2.5 h-2.5 rounded-full bg-slate-800" />
           </div>
        </div>
      </div>
      
      <ScrollArea ref={scrollRef} className="flex-1 p-8 font-mono text-[13px] leading-relaxed relative z-10 scrollbar-hide">
        <div className="space-y-2">
          {lines.length > 0 ? lines.map((line, idx) => {
            const isError = line.toLowerCase().includes("failure") || line.toLowerCase().includes("error");
            const isSuccess = line.includes("✅") || line.toLowerCase().includes("accomplished");
            const isInfo = line.includes("ℹ️") || line.includes("📡") || line.includes("🚀");

            return (
              <div
                key={idx}
                className={cn(
                  "flex gap-4 group/line",
                  isError ? "text-rose-400" : 
                  isSuccess ? "text-emerald-400" : 
                  isInfo ? "text-blue-400" :
                  "text-slate-500"
                )}
              >
                <span className="text-slate-800 select-none shrink-0 font-bold opacity-50">{(idx + 1).toString().padStart(3, '0')}</span>
                <span className="transition-colors group-hover/line:text-slate-300">{line}</span>
              </div>
            );
          }) : (
            <div className="flex flex-col items-center justify-center h-full space-y-4 opacity-20 mt-20">
               <Terminal className="w-12 h-12" />
               <p className="text-sm font-bold uppercase tracking-widest italic">Waiting for connection...</p>
            </div>
          )}
        </div>
      </ScrollArea>
      
      <div className="px-8 py-4 bg-white/[0.01] border-t border-white/5 flex items-center justify-between text-[10px] font-bold text-slate-600 uppercase tracking-widest relative z-10">
         <span>Status: Connected</span>
         <span>Latency: 42ms</span>
      </div>
    </div>
  );
}
