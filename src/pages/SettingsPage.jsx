import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
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
                  <option value="gemini">Google Gemini (Gemini 3.1 Flash-Lite)</option>
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
             <div className="space-y-3">
                <Label className="text-slate-600 font-bold uppercase text-[10px] tracking-widest">Ideal Customer Profile</Label>
                <textarea 
                  className="w-full min-h-[120px] rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Describe your target customer in detail..."
                  value={settings.icp_description || ""}
                  onChange={(e) => handleChange('icp_description', e.target.value)}
                />
             </div>
             <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <Label className="text-slate-600 font-bold uppercase text-[10px] tracking-widest">Keywords</Label>
                  <Input 
                    className="h-11 rounded-lg border-slate-200"
                    placeholder="SaaS, Real Estate..."
                    value={settings.icp_keywords || ""}
                    onChange={(e) => handleChange('icp_keywords', e.target.value)}
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-slate-600 font-bold uppercase text-[10px] tracking-widest">Target Territory</Label>
                  <Input 
                    className="h-11 rounded-lg border-slate-200"
                    placeholder="United States, Europe..."
                    value={settings.target_location || ""}
                    onChange={(e) => handleChange('target_location', e.target.value)}
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
