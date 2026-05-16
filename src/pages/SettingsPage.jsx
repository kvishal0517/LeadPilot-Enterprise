import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  Save, 
  Brain, 
  Target, 
  User, 
  Table, 
  Calendar,
  Key,
  Globe,
  Mail,
  Check
} from "lucide-react";
import { entities } from "@/api/db";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select } from "@/components/ui/select";
import { toast } from "sonner";

export default function SettingsPage() {
  const [settings, setSettings] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const queryClient = useQueryClient();

  const { data: initialSettings = [], isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: () => entities.Settings.list(),
  });

  useEffect(() => {
    if (initialSettings.length > 0) {
      const settingsMap = initialSettings.reduce((acc, s) => {
        acc[s.key] = s.value;
        return acc;
      }, {});
      setSettings(settingsMap);
    }
  }, [initialSettings]);

  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const settingDefinitions = [
        { key: 'llm_provider', category: 'llm', label: 'LLM Provider' },
        { key: 'llm_api_key', category: 'llm', label: 'API Key' },
        { key: 'icp_keywords', category: 'icp', label: 'Keywords' },
        { key: 'icp_description', category: 'icp', label: 'Ideal Profile' },
        { key: 'target_location', category: 'icp', label: 'Location' },
        { key: 'lead_count', category: 'icp', label: 'Lead Count' },
        { key: 'industry', category: 'icp', label: 'Industry' },
        { key: 'company_size', category: 'icp', label: 'Company Size' },
        { key: 'target_titles', category: 'icp', label: 'Target Titles' },
        { key: 'exclusions', category: 'icp', label: 'Exclusions' },
        { key: 'sender_name', category: 'gmail', label: 'Sender Name' },
        { key: 'sender_email', category: 'gmail', label: 'Sender Email' },
        { key: 'sender_company', category: 'gmail', label: 'Company' },
        { key: 'sheets_url', category: 'sheets', label: 'Google Sheets URL' },
        { key: 'sheets_tab', category: 'sheets', label: 'Sheet Name' },
      ];

      for (const def of settingDefinitions) {
        if (settings[def.key] !== undefined) {
          await entities.Settings.upsert(def.key, settings[def.key], def.category, def.label);
        }
      }

      await queryClient.invalidateQueries(["settings"]);
      toast.success("Configuration synchronized.");
    } catch (error) {
      toast.error("Failed to update settings.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="p-8">Syncing settings...</div>;

  return (
    <div className="space-y-10 max-w-4xl">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Control Center</h1>
          <p className="text-slate-500 mt-1">Configure your agent intelligence and external integrations.</p>
        </div>
        <Button onClick={handleSave} disabled={isSaving} className="bg-black hover:bg-zinc-800 text-white rounded-lg h-11 px-8 font-bold gap-2">
          <Save className="w-4 h-4" />
          <span>{isSaving ? "Saving..." : "Save Config"}</span>
        </Button>
      </header>

      <Tabs defaultValue="llm" className="space-y-8">
        <TabsList className="bg-slate-100/50 p-1.5 rounded-xl border border-slate-200">
          <TabsTrigger value="llm" className="rounded-lg px-5 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2">
            <Brain className="w-3.5 h-3.5" />
            <span>LLM</span>
          </TabsTrigger>
          <TabsTrigger value="icp" className="rounded-lg px-5 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2">
            <Target className="w-3.5 h-3.5" />
            <span>Targeting</span>
          </TabsTrigger>
          <TabsTrigger value="sheets" className="rounded-lg px-5 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2">
            <Table className="w-3.5 h-3.5" />
            <span>Google Sheets</span>
          </TabsTrigger>
        </TabsList>

        <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm">
          <TabsContent value="llm" className="mt-0 space-y-6">
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <Label className="text-slate-600 font-bold uppercase text-[10px] tracking-widest">Model Provider</Label>
                <select 
                  value={settings.llm_provider || "gemini"}
                  onChange={(e) => handleChange('llm_provider', e.target.value)}
                  className="w-full h-11 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="gemini">Google Gemini (Gemini 2.0 Flash)</option>
                  <option value="groq">Groq (Llama 3)</option>
                  <option value="huggingface">Hugging Face (Free)</option>
                </select>
              </div>
              <div className="space-y-3">
                <Label className="text-slate-600 font-bold uppercase text-[10px] tracking-widest">API Secret</Label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input 
                    type="password" 
                    placeholder="••••••••••••••••" 
                    className="pl-10 h-11 rounded-lg border-slate-200"
                    value={settings.llm_api_key || ""}
                    onChange={(e) => handleChange('llm_api_key', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="icp" className="mt-0 space-y-8">
             <div className="grid md:grid-cols-2 gap-8">
               <div className="space-y-3">
                  <Label className="text-slate-600 font-bold uppercase text-[10px] tracking-widest">Ideal Customer Profile</Label>
                  <textarea 
                    className="w-full min-h-[120px] rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="Describe your target customer in detail..."
                    value={settings.icp_description || ""}
                    onChange={(e) => handleChange('icp_description', e.target.value)}
                  />
               </div>
               <div className="space-y-3">
                  <Label className="text-slate-600 font-bold uppercase text-[10px] tracking-widest">Exclusion List</Label>
                  <textarea 
                    className="w-full min-h-[120px] rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="Zoho, Darwinbox, Keka..."
                    value={settings.exclusions || ""}
                    onChange={(e) => handleChange('exclusions', e.target.value)}
                  />
               </div>
             </div>
             <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <Label className="text-slate-600 font-bold uppercase text-[10px] tracking-widest">Industry / Vertical</Label>
                  <Input 
                    className="h-11 rounded-lg border-slate-200"
                    placeholder="HR Tech, Fintech..."
                    value={settings.industry || ""}
                    onChange={(e) => handleChange('industry', e.target.value)}
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-slate-600 font-bold uppercase text-[10px] tracking-widest">Keywords / Signals</Label>
                  <Input 
                    className="h-11 rounded-lg border-slate-200"
                    placeholder="payroll, employee engagement..."
                    value={settings.icp_keywords || ""}
                    onChange={(e) => handleChange('icp_keywords', e.target.value)}
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-slate-600 font-bold uppercase text-[10px] tracking-widest">Target Roles / Titles</Label>
                  <Input 
                    className="h-11 rounded-lg border-slate-200"
                    placeholder="VP HR, CHRO, Head of People..."
                    value={settings.target_titles || ""}
                    onChange={(e) => handleChange('target_titles', e.target.value)}
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-slate-600 font-bold uppercase text-[10px] tracking-widest">Company Size Range</Label>
                  <Input 
                    className="h-11 rounded-lg border-slate-200"
                    placeholder="50-500 employees..."
                    value={settings.company_size || ""}
                    onChange={(e) => handleChange('company_size', e.target.value)}
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-slate-600 font-bold uppercase text-[10px] tracking-widest">Target Territory</Label>
                  <Input 
                    className="h-11 rounded-lg border-slate-200"
                    placeholder="Bangalore, Mumbai, Delhi NCR..."
                    value={settings.target_location || ""}
                    onChange={(e) => handleChange('target_location', e.target.value)}
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-slate-600 font-bold uppercase text-[10px] tracking-widest">Target Lead Count</Label>
                  <Input 
                    type="number"
                    min="1"
                    max="20"
                    className="h-11 rounded-lg border-slate-200"
                    placeholder="e.g. 10"
                    value={settings.lead_count || ""}
                    onChange={(e) => handleChange('lead_count', e.target.value)}
                  />
                </div>
             </div>
          </TabsContent>

          <TabsContent value="sheets" className="mt-0 space-y-8">
             <div className="p-5 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-4">
                <Table className="w-5 h-5 text-blue-600 shrink-0" />
                <div>
                   <p className="text-sm font-bold text-blue-800">Export Automation</p>
                   <p className="text-xs text-blue-600 mt-1 leading-relaxed">Connect your Google Sheet via Webhook to push new leads automatically upon discovery.</p>
                </div>
             </div>
             <div className="space-y-3">
                <Label className="text-slate-600 font-bold uppercase text-[10px] tracking-widest">Sheets Webhook URL</Label>
                <Input 
                  className="h-11 rounded-lg border-slate-200"
                  placeholder="https://script.google.com/macros/s/..."
                  value={settings.sheets_url || ""}
                  onChange={(e) => handleChange('sheets_url', e.target.value)}
                />
             </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
