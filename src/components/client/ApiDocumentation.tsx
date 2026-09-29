import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  Copy,
  Check,
  Eye,
  EyeOff,
  RefreshCw,
  Terminal,
  Code2,
  Play,
  CheckCircle2,
  AlertCircle,
  FileCode,
  ShieldCheck
} from 'lucide-react';
import { api } from '../../api';

export const ApiDocumentation: React.FC = () => {
  const [apiData, setApiData] = useState<any>(null);
  const [showToken, setShowToken] = useState<boolean>(false);
  const [copiedToken, setCopiedToken] = useState<boolean>(false);
  const [isRegenerating, setIsRegenerating] = useState<boolean>(false);
  const [activeLang, setActiveLang] = useState<'curl' | 'js' | 'python' | 'php' | 'csharp'>('curl');

  // Interactive Live Tester state
  const [testerPhone, setTesterPhone] = useState('+919876543210');
  const [testerTemplate, setTesterTemplate] = useState('appointment_confirmation');
  const [testerVars, setTesterVars] = useState('Rahul, 10:30 AM, Downtown Spa');
  const [testerRunning, setTesterRunning] = useState(false);
  const [testerResult, setTesterResult] = useState<any>(null);

  const fetchToken = async () => {
    try {
      const res = await api.getApiToken();
      if (res.success) setApiData(res);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchToken();
  }, []);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const handleRegenerate = async () => {
    if (!confirm('Warning: Regenerating your API token will immediately invalidate your previous token. Any live integrations will stop working until updated. Proceed?')) {
      return;
    }
    setIsRegenerating(true);
    try {
      const res = await api.regenerateApiToken();
      if (res.success) {
        setApiData((prev: any) => ({ ...prev, api_token: res.api_token }));
        alert('API Token successfully regenerated.');
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsRegenerating(false);
    }
  };

  const runLiveTest = async () => {
    if (!apiData?.api_token) return;
    setTesterRunning(true);
    setTesterResult(null);
    try {
      const varsArray = testerVars.split(',').map((v) => v.trim());
      const res = await api.callClientApi('/api/v1/messages/send', 'POST', apiData.api_token, {
        phone: testerPhone,
        template: testerTemplate,
        language: 'en',
        variables: varsArray
      });
      setTesterResult(res);
    } catch (err: any) {
      setTesterResult({ status: 500, data: { error: err.message } });
    } finally {
      setTesterRunning(false);
    }
  };

  const token = apiData?.api_token || 'waba_live_YOUR_API_TOKEN_HERE';
  const baseUrl = window.location.origin;

  const codeSnippets = {
    curl: `curl -X POST "${baseUrl}/api/v1/messages/send" \\
  -H "Authorization: Bearer ${token}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "phone": "${testerPhone}",
    "template": "${testerTemplate}",
    "language": "en",
    "variables": ["Rahul", "10:30 AM", "Downtown Branch"]
  }'`,

    js: `const response = await fetch("${baseUrl}/api/v1/messages/send", {
  method: "POST",
  headers: {
    "Authorization": "Bearer ${token}",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    phone: "${testerPhone}",
    template: "${testerTemplate}",
    language: "en",
    variables: ["Rahul", "10:30 AM", "Downtown Branch"]
  })
});
const data = await response.json();
console.log(data);`,

    python: `import requests

url = "${baseUrl}/api/v1/messages/send"
headers = {
    "Authorization": "Bearer ${token}",
    "Content-Type": "application/json"
}
payload = {
    "phone": "${testerPhone}",
    "template": "${testerTemplate}",
    "language": "en",
    "variables": ["Rahul", "10:30 AM", "Downtown Branch"]
}

response = requests.post(url, json=payload, headers=headers)
print(response.json())`,

    php: `<?php
$ch = curl_init("${baseUrl}/api/v1/messages/send");
$payload = json_encode([
    "phone" => "${testerPhone}",
    "template" => "${testerTemplate}",
    "language" => "en",
    "variables" => ["Rahul", "10:30 AM", "Downtown Branch"]
]);

curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Authorization: Bearer ${token}",
    "Content-Type: application/json"
]);

$response = curl_exec($ch);
curl_close($ch);
echo $response;`,

    csharp: `using System.Net.Http;
using System.Text;
using System.Text.Json;

var client = new HttpClient();
client.DefaultRequestHeaders.Add("Authorization", "Bearer ${token}");

var payload = new {
    phone = "${testerPhone}",
    template = "${testerTemplate}",
    language = "en",
    variables = new[] { "Rahul", "10:30 AM", "Downtown Branch" }
};

var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
var response = await client.PostAsync("${baseUrl}/api/v1/messages/send", content);
var result = await response.Content.ReadAsStringAsync();
Console.WriteLine(result);`
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
          <Terminal className="w-5 h-5 text-emerald-400" />
          <span>Developer REST API & Token Hub</span>
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Programmatic access for third-party CRMs, backend services, and automated WhatsApp campaign triggers.
        </p>
      </div>

      {/* API Token Credentials Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <KeyRound className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-white text-sm">Tenant API Authentication</h3>
          </div>
          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-mono flex items-center space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Active & Scoped to {apiData?.client_id}</span>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
            <span className="text-[11px] text-slate-500">Tenant Client ID</span>
            <p className="font-mono text-white font-bold mt-0.5">{apiData?.client_id || 'CLT-00001'}</p>
          </div>
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
            <span className="text-[11px] text-slate-500">Authorization Scheme</span>
            <p className="font-mono text-emerald-400 font-bold mt-0.5">Bearer Token</p>
          </div>
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
            <span className="text-[11px] text-slate-500">Base API Endpoint</span>
            <p className="font-mono text-slate-300 text-[11px] mt-0.5 truncate">{baseUrl}/api/v1</p>
          </div>
        </div>

        {/* Token Input Bar */}
        <div>
          <label className="block text-slate-400 text-xs mb-1 font-medium">Secret Platform API Token</label>
          <div className="flex items-center space-x-2">
            <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 flex items-center justify-between">
              <span>{showToken ? apiData?.api_token : '•'.repeat(40)}</span>
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
                title={showToken ? 'Hide token' : 'Show token'}
              >
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <button
              onClick={() => handleCopy(apiData?.api_token || '')}
              className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 px-3.5 py-2 rounded-xl text-xs font-medium cursor-pointer"
            >
              {copiedToken ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copiedToken ? 'Copied!' : 'Copy'}</span>
            </button>

            <button
              onClick={handleRegenerate}
              disabled={isRegenerating}
              className="flex items-center space-x-1.5 bg-rose-950/40 hover:bg-rose-900/50 border border-rose-800/50 text-rose-300 px-3.5 py-2 rounded-xl text-xs font-medium cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isRegenerating ? 'animate-spin' : ''}`} />
              <span>Regenerate</span>
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-[11px] text-slate-400 bg-slate-950 p-2.5 rounded-lg border border-slate-850">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Never expose your API token in client-side mobile apps or public repositories. Store securely in backend env vars.</span>
        </div>
      </div>

      {/* Interactive REST API Console */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <Play className="w-4 h-4 text-emerald-400" />
              <span>Interactive REST API Test Console</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Execute live WhatsApp Cloud API test requests immediately using your authenticated token.
            </p>
          </div>
          <span className="text-[10px] font-mono bg-slate-800 text-emerald-400 px-2 py-0.5 rounded">
            POST /api/v1/messages/send
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="block text-slate-400 mb-1">Target Phone Number</label>
            <input
              type="text"
              value={testerPhone}
              onChange={(e) => setTesterPhone(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Approved Template</label>
            <select
              value={testerTemplate}
              onChange={(e) => setTesterTemplate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
            >
              <option value="appointment_confirmation">appointment_confirmation (UTILITY)</option>
              <option value="festival_offer">festival_offer (MARKETING)</option>
              <option value="order_status_update">order_status_update (UTILITY)</option>
              <option value="vip_loyalty_invitation">vip_loyalty_invitation (MARKETING)</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Variables (comma separated)</label>
            <input
              type="text"
              value={testerVars}
              onChange={(e) => setTesterVars(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={runLiveTest}
            disabled={testerRunning}
            className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-5 py-2 rounded-xl text-xs font-semibold shadow-lg shadow-emerald-600/20 cursor-pointer"
          >
            {testerRunning ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Executing API Request...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>Execute Live Test Request</span>
              </>
            )}
          </button>
        </div>

        {testerResult && (
          <div className="mt-3 p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-850">
              <span className="text-slate-400">Response Status:</span>
              <span
                className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                  testerResult.status === 200
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-rose-500/20 text-rose-300'
                }`}
              >
                {testerResult.status} {testerResult.status === 200 ? 'OK' : 'ERROR'}
              </span>
            </div>
            <pre className="text-slate-300 overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(testerResult.data, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Ready-to-Copy Multi-Language Code Snippets */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <Code2 className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-white text-sm">Implementation Code Snippets</h3>
          </div>

          {/* Lang Selector Tabs */}
          <div className="flex items-center space-x-1 bg-slate-950 border border-slate-800 p-1 rounded-xl text-xs">
            {(['curl', 'js', 'python', 'php', 'csharp'] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => setActiveLang(lang)}
                className={`px-3 py-1 rounded-lg font-medium transition-colors uppercase cursor-pointer ${
                  activeLang === lang
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {lang}
              </button>
            ))}
          </div>
        </div>

        {/* Snippet Block */}
        <div className="relative">
          <pre className="bg-slate-950 p-4 rounded-xl border border-slate-850 text-xs font-mono text-emerald-300 overflow-x-auto">
            {codeSnippets[activeLang]}
          </pre>
          <button
            onClick={() => handleCopy(codeSnippets[activeLang])}
            className="absolute top-3 right-3 bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded-lg text-[11px] flex items-center space-x-1 cursor-pointer border border-slate-700"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Copy Snippet</span>
          </button>
        </div>
      </div>

      {/* API Error Codes Reference Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
        <h3 className="font-bold text-white text-sm">Standard API Error Codes Reference</h3>
        <div className="border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-4">Error Code</th>
                <th className="py-2.5 px-4">HTTP Status</th>
                <th className="py-2.5 px-4">Description / Recovery Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              <tr>
                <td className="py-2.5 px-4 font-mono text-rose-400 font-semibold">INVALID_TOKEN</td>
                <td className="py-2.5 px-4 font-mono text-slate-400">401 Unauthorized</td>
                <td className="py-2.5 px-4">Bearer token missing, malformed, or revoked. Check your Authorization header.</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-mono text-rose-400 font-semibold">INSUFFICIENT_MARKETING_CREDITS</td>
                <td className="py-2.5 px-4 font-mono text-slate-400">402 Payment Required</td>
                <td className="py-2.5 px-4">Marketing balance is insufficient for campaign size. Contact admin to allocate credits.</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-mono text-rose-400 font-semibold">INSUFFICIENT_UTILITY_CREDITS</td>
                <td className="py-2.5 px-4 font-mono text-slate-400">402 Payment Required</td>
                <td className="py-2.5 px-4">Utility balance exhausted. Allocate utility credits to resume transactional alerts.</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-mono text-rose-400 font-semibold">CAMPAIGN_LIMIT_EXCEEDED</td>
                <td className="py-2.5 px-4 font-mono text-slate-400">429 Limit Exceeded</td>
                <td className="py-2.5 px-4">Plan monthly message limit quota has been reached. Upgrade to a higher tier plan.</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-mono text-rose-400 font-semibold">INVALID_TEMPLATE</td>
                <td className="py-2.5 px-4 font-mono text-slate-400">404 Not Found</td>
                <td className="py-2.5 px-4">Template name not found or has not been approved in Meta WhatsApp Business Manager.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
