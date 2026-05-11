import { useState, useEffect } from "react";
import { 
  Zap, 
  CheckCircle2, 
  AlertCircle, 
  Mail,
  Activity,
  Search,
  Users,
  Check,
  Star
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import PipelineStatus from "@/components/agent/PipelineStatus";
import RunLog from "@/components/agent/RunLog";
import { runAgentPipeline } from "@/lib/agentPipeline";
import { queryClient } from "@/lib/query-client";
import { toast } from "sonner";
import { entities } from "@/api/db";
import { Link } from "react-router-dom";

export default function RunAgent() {
  const [isRunning, setIsRunning] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(true);
  const [stage, setStage] = useState("idle");
  const [log, setLog] = useState("");
  const [metrics, setMetrics] = useState({
    discovered: 0,
    enriched: 0,
    validated: 0,
    scored: 0,
    drafted: 0
  });
  const [runStatus, setRunStatus] = useState("idle");

  useEffect(() => {
    const checkConfig = async () => {
      const settings = await entities.Settings.list();
      const apiKey = settings.find(s => s.key === 'llm_api_key')?.value;
      setHasApiKey(!!apiKey);
    };
    checkConfig();
  }, []);

  const handleStartPipeline = async () => {
    if (isRunning) return;
    
    const settings = await entities.Settings.list();
    const apiKey = settings.find(s => s.key === 'llm_api_key')?.value;
    if (!apiKey) {
      setHasApiKey(false);
      toast.error("Configuration Required: Missing API Key");
      return;
    }
    
    setIsRunning(true);
    setRunStatus("idle");
    setLog("");
    setMetrics({ discovered: 0, enriched: 0, validated: 0, scored: 0, drafted: 0 });

    try {
      await runAgentPipeline({
        onStageChange: setStage,
        onLogUpdate: setLog,
        onMetricsUpdate: (newMetrics) => setMetrics(prev => ({ ...prev, ...newMetrics }))
      });
      setRunStatus("success");
      setStage("done");
      queryClient.invalidateQueries(["agent-runs", "leads-summary", "leads"]);
      toast.success("Pipeline executed successfully.");
    } catch (error) {
      setRunStatus("error");
      toast.error("Pipeline interrupted.");
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-10 font-jakarta">
      <header>
        <h1 className="text-3xl font-extrabold text-slate-900 font-outfit">Agent Deployment</h1>
        <p className="text-slate-500 mt-1">Initialize the autonomous pipeline to discover and enrich leads.</p>
      </header>

      {!hasApiKey && !isRunning && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 flex items-start gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
          <AlertCircle className="w-6 h-6 text-amber-600 shrink-0" />
          <div className="flex-1">
            <h4 className="font-bold text-amber-900">AI Configuration Missing</h4>
            <p className="text-sm text-amber-700 mt-1 leading-relaxed">
              Strict Mode is active. To perform real-time lead discovery, you must provide a <strong>Gemini API Key</strong>. 
              Missions will fail until the system is authenticated.
            </p>
            <Button asChild variant="outline" className="mt-4 border-amber-200 hover:bg-amber-100 text-amber-800 rounded-lg h-9 px-4 text-xs font-bold shadow-sm">
              <Link to="/settings">Update Settings</Link>
            </Button>
          </div>
        </div>
      )}

      <div className={cn(
        "bg-white border rounded-2xl p-16 text-center relative overflow-hidden transition-all duration-500 shadow-xl shadow-slate-200/50",
        isRunning && "border-blue-200 ring-8 ring-blue-50/50"
      )}>
        {/* Animated Background Pulse */}
        {isRunning && (
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50/20 to-transparent animate-pulse" />
        )}
        
        <div className="relative z-10 flex flex-col items-center space-y-8">
          <div className={cn(
            "w-20 h-20 rounded-[2rem] flex items-center justify-center transition-all duration-500 shadow-2xl",
            isRunning ? "bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-blue-300 scale-110 rotate-6" : 
            runStatus === 'success' ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-emerald-200" :
            runStatus === 'error' ? "bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-red-200" : 
            "bg-slate-50 text-slate-400 border border-slate-100"
          )}>
            {isRunning ? <Activity className="w-10 h-10 animate-spin-slow" /> : 
             runStatus === 'success' ? <CheckCircle2 className="w-10 h-10" /> :
             runStatus === 'error' ? <AlertCircle className="w-10 h-10" /> : <Zap className="w-10 h-10 fill-current" />}
          </div>

          <div className="space-y-3">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight font-outfit">
              {isRunning ? `${stage.charAt(0).toUpperCase() + stage.slice(1)}...` : 
               runStatus === 'success' ? "Operation Accomplished" :
               runStatus === 'error' ? "Deployment Aborted" : "Ready for Deployment"}
            </h2>
            <p className="text-slate-500 max-w-md mx-auto leading-relaxed">
              {isRunning ? "The agent is currently scanning global networks for strictly location-matched opportunities." : 
               runStatus === 'success' ? "20 target-matched leads have been successfully synchronized to your control center." :
               "Initialize the frontier-class autonomous workflow to discover high-intent B2B leads."}
            </p>
          </div>

          <Button 
            onClick={handleStartPipeline} 
            disabled={isRunning}
            className={cn(
              "h-16 px-12 rounded-2xl text-xl font-bold transition-all shadow-2xl active:scale-[0.98] border-none group",
              isRunning ? "bg-slate-100 text-slate-400" : "bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white"
            )}
          >
            {isRunning ? (
              <div className="flex items-center gap-3">
                <Activity className="w-6 h-6 animate-pulse" />
                <span>Processing...</span>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Zap className="w-6 h-6 group-hover:animate-bounce fill-current" />
                <span>Launch Agent</span>
              </div>
            )}
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8 h-[600px]">
        <PipelineStatus currentStage={stage} runStatus={runStatus} />
        <RunLog log={log} />
      </div>
    </div>
  );
}
