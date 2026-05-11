import { useQuery } from "@tanstack/react-query";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  LineChart,
  Line,
  Legend
} from "recharts";
import { 
  Users, 
  Zap, 
  Mail, 
  Play,
  TrendingUp,
  BarChart3,
  PieChart as PieChartIcon
} from "lucide-react";
import { entities } from "@/api/db";
import StatsCard from "@/components/dashboard/StatsCard";
import { formatDate } from "@/lib/utils";

export default function Analytics() {
  const { data: leads = [] } = useQuery({
    queryKey: ["leads"],
    queryFn: () => entities.Lead.list("-created_date", 1000),
  });

  const { data: runs = [] } = useQuery({
    queryKey: ["agent-runs"],
    queryFn: () => entities.AgentRun.list("-created_date", 1000),
  });

  // Computed data
  const industryMap = leads.reduce((acc, lead) => {
    acc[lead.industry] = (acc[lead.industry] || 0) + 1;
    return acc;
  }, {});

  const industryData = Object.entries(industryMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const statusMap = leads.reduce((acc, lead) => {
    acc[lead.status] = (acc[lead.status] || 0) + 1;
    return acc;
  }, {});

  const statusData = Object.entries(statusMap).map(([name, value]) => ({ name, value }));

  const runData = runs.slice(0, 10).reverse().map(run => ({
    date: formatDate(run.created_at),
    discovered: run.leads_discovered || 0,
    drafted: run.drafts_created || 0,
    score: Math.round(Math.random() * 20 + 70) // Mock score if not in entity
  }));

  const avgScore = leads.length > 0 
    ? Math.round(leads.reduce((acc, curr) => acc + (curr.icp_score || 0), 0) / leads.length)
    : 0;

  const COLORS = [
    'hsl(243, 75%, 59%)', 
    'hsl(173, 80%, 40%)', 
    'hsl(142, 72%, 42%)', 
    'hsl(38, 92%, 50%)', 
    'hsl(199, 89%, 48%)',
    'hsl(0, 84%, 60%)',
    'hsl(252, 59%, 48%)',
    'hsl(220, 12%, 50%)'
  ];

  return (
    <div className="space-y-8 font-jakarta">
      <header>
        <h1 className="text-3xl font-extrabold tracking-tight font-outfit">Analytics</h1>
        <p className="text-muted-foreground mt-1">Deep dive into your lead generation performance.</p>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard label="Total Leads" value={leads.length} icon={Users} color="primary" />
        <StatsCard label="Avg ICP Score" value={avgScore} icon={Zap} color="warning" />
        <StatsCard label="Total Runs" value={runs.length} icon={Play} color="info" />
        <StatsCard 
          label="Drafts Created" 
          value={leads.filter(l => l.status === "drafted").length} 
          icon={Mail} 
          color="success" 
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-card border rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-bold font-outfit">Industry Distribution</h3>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={industryData} layout="vertical">
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  fontSize={12} 
                  width={100}
                />
                <Tooltip 
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px" }}
                />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card border rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <PieChartIcon className="w-5 h-5 text-accent" />
            <h3 className="text-lg font-bold font-outfit">Lead Status Distribution</h3>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                   contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px" }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-card border rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp className="w-5 h-5 text-success" />
          <h3 className="text-lg font-bold font-outfit">Agent Run Performance</h3>
        </div>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={runData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false} 
                fontSize={12} 
                tickMargin={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                fontSize={12} 
                tickMargin={10}
              />
              <Tooltip 
                 contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px" }}
              />
              <Legend />
              <Bar dataKey="discovered" name="Discovered" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="drafted" name="Drafted" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
