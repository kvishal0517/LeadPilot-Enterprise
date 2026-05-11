import { CheckCircle2, Loader2, AlertCircle, Circle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const stages = [
  { id: 'discovering', label: 'Discovery', description: 'Deep-scanning B2B networks' },
  { id: 'enriching', label: 'Enrichment', description: 'Retrieving digital footprints' },
  { id: 'scoring', label: 'Intelligence', description: 'ICP relevance analysis' },
  { id: 'drafting', label: 'Personalization', description: 'Crafting semantic drafts' },
  { id: 'syncing', label: 'Synchronization', description: 'Exporting to cloud storage' },
];

const stageOrder = ['idle', 'discovering', 'enriching', 'scoring', 'drafting', 'syncing', 'done'];

export default function PipelineStatus({ currentStage, runStatus }) {
  const currentIdx = stageOrder.indexOf(currentStage);

  return (
    <div className="bg-white border border-slate-200/60 rounded-3xl p-10 shadow-sm relative overflow-hidden">
      <div className="flex items-center justify-between mb-10">
        <h3 className="text-xl font-black text-slate-900 tracking-tight">System Trajectory</h3>
        {currentIdx > 0 && currentStage !== 'done' && (
          <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping" />
            Live Operation
          </div>
        )}
      </div>

      <div className="space-y-8 relative">
        {/* Connection Line */}
        <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-slate-100 -z-0" />
        
        {stages.map((stage, idx) => {
          const stageIdx = idx + 1;
          const isDone = currentIdx > stageIdx || currentStage === 'done';
          const isActive = currentStage === stage.id;
          const isPending = currentIdx < stageIdx;

          return (
            <motion.div 
              key={stage.id} 
              initial={false}
              animate={{ opacity: isPending ? 0.4 : 1 }}
              className="flex items-center gap-6 relative z-10"
            >
              <div className={cn(
                "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border-2 transition-all duration-500 shadow-sm",
                isDone ? "bg-emerald-500 border-emerald-500 text-white shadow-emerald-200" : 
                isActive ? "bg-white border-blue-500 text-blue-600 shadow-blue-100 scale-110" : 
                "bg-white border-slate-200 text-slate-300"
              )}>
                {isDone ? <CheckCircle2 className="w-5 h-5" /> : 
                 isActive ? <Loader2 className="w-5 h-5 animate-spin" /> : 
                 <Circle className="w-2.5 h-2.5 fill-current" />}
              </div>
              <div className="flex-1">
                <p className={cn(
                  "text-sm font-black transition-colors duration-300",
                  isDone ? "text-emerald-600" : isActive ? "text-blue-600" : "text-slate-400"
                )}>
                  {stage.label}
                </p>
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{stage.description}</p>
              </div>
              
              {isActive && (
                <motion.div 
                  initial={{ x: -10, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  className="hidden md:flex items-center gap-2 text-blue-600"
                >
                   <span className="text-[10px] font-black uppercase tracking-widest">Active</span>
                   <ArrowRight className="w-3.5 h-3.5 animate-bounce-x" />
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
