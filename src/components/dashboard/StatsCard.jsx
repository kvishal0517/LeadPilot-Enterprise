import { cn } from "@/lib/utils";

export default function StatsCard({ label, value, icon: Icon, trend, color = "primary", subtitle }) {
  const colorMap = {
    primary: "bg-blue-50 text-blue-600 border-blue-100",
    accent: "bg-purple-50 text-purple-600 border-purple-100",
    success: "bg-green-50 text-green-600 border-green-100",
    warning: "bg-amber-50 text-amber-600 border-amber-100",
    info: "bg-cyan-50 text-cyan-600 border-cyan-100",
  };

  return (
    <div className="bg-white border border-slate-200/60 rounded-3xl p-8 shadow-sm transition-all hover:shadow-md hover:-translate-y-1 font-jakarta">
      <div className="flex justify-between items-start mb-6">
        <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center border shadow-sm", colorMap[color])}>
          <Icon className="w-6 h-6" />
        </div>
        {trend !== undefined && (
          <div className={cn(
            "text-xs font-bold px-2.5 py-1 rounded-full border",
            trend >= 0 ? "bg-green-50 text-green-600 border-green-100" : "bg-red-50 text-red-600 border-red-100"
          )}>
            {trend >= 0 ? "↑" : "↓"} {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div>
        <h3 className="text-4xl font-extrabold tracking-tight text-slate-800 mb-1 font-outfit">{value}</h3>
        <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">{label}</p>
        {subtitle && <p className="text-xs text-slate-400 mt-2 font-medium">{subtitle}</p>}
      </div>
    </div>
  );
}
