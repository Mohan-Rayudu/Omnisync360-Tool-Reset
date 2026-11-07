import React, { useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  Copy, 
  Terminal, 
  Check, 
  Database, 
  RefreshCw,
  ExternalLink,
  Code2
} from 'lucide-react';
import { 
  getStoredConfig, 
  saveStoredConfig, 
  invokeEdgeFunction 
} from '../lib/supabaseClient';

interface EdgeFunctionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigSaved: () => void;
}

export const EdgeFunctionsModal: React.FC<EdgeFunctionsModalProps> = ({
  isOpen,
  onClose,
  onConfigSaved
}) => {
  const current = getStoredConfig();
  const [url, setUrl] = useState(current.url);
  const [key, setKey] = useState(current.key);
  const [mode, setMode] = useState<'live' | 'mock'>(current.mode);
  const [copied, setCopied] = useState(false);
  const [testingFunc, setTestingFunc] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  if (!isOpen) return null;

  const edgeFunctionCode = `// supabase/functions/reset-machine-id/index.ts
// Secure Server-Side Edge Function (Zero Service Role Key Exposure in Frontend)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { userId } = await req.json();
    if (!userId) {
      return new Response(JSON.stringify({ error: "userId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Delete machine binding from user_devices table
    const { error: devError } = await supabaseClient
      .from("user_devices")
      .delete()
      .eq("user_id", userId);

    if (devError) throw devError;

    // 2. Log in security_audit_log
    await supabaseClient.from("security_audit_log").insert({
      user_id: userId,
      action: "ADMIN_RESET_MACHINE_ID",
      table_name: "public.user_devices",
      details: { executed_by: "OmniSync360_Admin" },
    });

    return new Response(
      JSON.stringify({ success: true, message: "Machine ID reset successfully" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTestInvoke = async () => {
    setTestingFunc(true);
    setTestResult(null);
    try {
      const res = await invokeEdgeFunction('reset-machine-id', { userId: 'test-user-id' });
      if (res.viaEdgeFunction) {
        setTestResult('Successfully invoked live Supabase Edge Function! (200 OK)');
      } else {
        setTestResult('Secure client simulation active. Zero service_role keys leaked.');
      }
    } catch (e: any) {
      setTestResult(`Error: ${e.message}`);
    } finally {
      setTestingFunc(false);
    }
  };

  const handleSave = () => {
    saveStoredConfig(url, key, mode);
    onConfigSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn select-none">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-white">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#0b2545]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-950 border border-blue-500/50 flex items-center justify-center text-blue-300">
              <ShieldCheck className="w-4 h-4 text-[#00a86b]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Supabase Edge Functions & Security Hub</h3>
              <p className="text-[11px] text-slate-300">Zero service role keys in frontend client</p>
            </div>
          </div>

          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          {/* Security Guarantee Banner */}
          <div className="p-3.5 rounded-2xl bg-[#00a86b]/15 border border-[#00a86b]/40 text-xs text-emerald-200 flex items-start gap-2.5">
            <ShieldCheck className="w-5 h-5 text-[#00a86b] shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-white">Service Role Key Protected</div>
              <div className="text-[11px] text-emerald-300/90 mt-0.5 leading-relaxed">
                All elevated administrative actions (e.g. <strong>Reset Machine ID</strong>, user deletion, M365 automation) are executed strictly through Supabase Edge Functions on the server side. No service role secret is bundled in this client app.
              </div>
            </div>
          </div>

          {/* Connection Mode */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              onClick={() => setMode('live')}
              className={`p-3 rounded-2xl border text-left transition-all ${
                mode === 'live' 
                  ? 'bg-[#002f6c] border-[#f58220] text-white shadow-md' 
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              <div className="font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Live Supabase Cloud</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1">Queries kymifrlbbduoloviaybg.supabase.co</div>
            </button>

            <button
              onClick={() => setMode('mock')}
              className={`p-3 rounded-2xl border text-left transition-all ${
                mode === 'mock' 
                  ? 'bg-[#002f6c] border-[#f58220] text-white shadow-md' 
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              <div className="font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#f58220]" />
                <span>Sandbox Demo Mode</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1">Full state matching all 8 Python tabs</div>
            </button>
          </div>

          {/* Endpoint details */}
          <div className="space-y-2 text-xs">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Supabase Project URL</label>
              <input
                type="text"
                value={url}
                onChange={e => setUrl(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 font-mono text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Public Anon Key (Client-Safe)</label>
              <input
                type="password"
                value={key}
                onChange={e => setKey(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 font-mono text-xs text-white"
              />
            </div>
          </div>

          {/* Edge Function Deployment Code */}
          <div className="space-y-1.5 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Code2 className="w-4 h-4 text-[#f58220]" />
                <span>Edge Function Code (reset-machine-id)</span>
              </span>
              <button
                onClick={() => copyToClipboard(edgeFunctionCode)}
                className="flex items-center gap-1 text-[11px] font-semibold text-slate-300 hover:text-white"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy Code'}</span>
              </button>
            </div>

            <pre className="p-3 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-[10px] text-slate-300 overflow-x-auto max-h-[160px] leading-relaxed">
              {edgeFunctionCode}
            </pre>
            <div className="text-[10px] text-slate-400 font-mono">
              Deploy command: <code className="text-[#f58220]">supabase functions deploy reset-machine-id</code>
            </div>
          </div>

          {/* Test Invoke */}
          <button
            onClick={handleTestInvoke}
            disabled={testingFunc}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center justify-center gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testingFunc ? 'animate-spin text-[#f58220]' : ''}`} />
            <span>{testingFunc ? 'Testing Edge Function...' : 'Test Invoke reset-machine-id'}</span>
          </button>

          {testResult && (
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-emerald-300 font-mono">
              {testResult}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-800 bg-slate-950/60">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700"
          >
            Close
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 text-xs font-bold rounded-xl bg-[#f58220] hover:bg-orange-500 text-white shadow-md"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};
