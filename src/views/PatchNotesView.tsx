import React from 'react';
import { Info, ShieldCheck, CheckCircle2, Server, Database, Code2 } from 'lucide-react';

export const PatchNotesView: React.FC = () => {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#29b4c4] uppercase tracking-wider mb-1">
            <Info className="w-4 h-4" />
            <span>System Telemetry & Changelog</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">AZ System - Intel & Build Notes</h1>
          <p className="text-xs text-slate-500 mt-1">
            Build telemetry logs, release notes, ASP.NET Core Kestrel backend environment info, and patch documentation.
          </p>
        </div>
        <span className="px-3 py-1.5 bg-[#29b4c4]/10 text-[#1a7f8b] font-mono text-xs font-bold rounded-xl border border-[#29b4c4]/30">
          Build v2.4.108
        </span>
      </div>

      {/* System Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 font-bold text-slate-800 mb-1">
            <Server className="w-4 h-4 text-emerald-600" />
            <span>Application Server</span>
          </div>
          <p className="text-slate-500 font-mono">Server: Kestrel (X-Powered-By ASP.NET)</p>
          <span className="inline-block mt-2 px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px]">
            ONLINE & HEALTHY
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 font-bold text-slate-800 mb-1">
            <ShieldCheck className="w-4 h-4 text-[#29b4c4]" />
            <span>Authentication Provider</span>
          </div>
          <p className="text-slate-500 font-mono">Cookie Auth: .AspNetCore.Identity</p>
          <span className="inline-block mt-2 px-2 py-0.5 bg-cyan-100 text-cyan-800 rounded font-bold text-[10px]">
            ACTIVE SESSION (m.barmada)
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 font-bold text-slate-800 mb-1">
            <Database className="w-4 h-4 text-indigo-600" />
            <span>Compounds Data Engine</span>
          </div>
          <p className="text-slate-500 font-mono">Database ID: Compound 4 & Compound 2</p>
          <span className="inline-block mt-2 px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded font-bold text-[10px]">
            SYNCHRONIZED
          </span>
        </div>
      </div>

      {/* Changelog Timeline */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
          Recent Release & Patch History
        </h2>

        <div className="space-y-6 text-xs text-slate-700">
          <div className="relative pl-6 border-l-2 border-[#29b4c4] space-y-1">
            <div className="absolute -left-1.5 top-0 w-3 h-3 rounded-full bg-[#29b4c4] ring-4 ring-white" />
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 text-sm">Release v2.4.1 - Full Compound Management Engine</span>
              <span className="font-mono text-slate-400">August 2026</span>
            </div>
            <p className="text-slate-600">
              Enhanced Dashboard of Dues, added WhatsApp direct reminder shortcuts, integrated maintenance pipeline approval states (Supervisor -&gt; Manager -&gt; In Progress -&gt; Done), and added water & SEC electricity meter tracking.
            </p>
          </div>

          <div className="relative pl-6 border-l-2 border-slate-300 space-y-1">
            <div className="absolute -left-1.5 top-0 w-3 h-3 rounded-full bg-slate-300 ring-4 ring-white" />
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800">Release v2.3.0 - Lease Contracts & Tenants Directory</span>
              <span className="font-mono text-slate-400">June 2026</span>
            </div>
            <p className="text-slate-600">
              Introduced contract archiving, payment schedule breakdown, and tenant mobile directory.
            </p>
          </div>

          <div className="relative pl-6 border-l-2 border-slate-300 space-y-1">
            <div className="absolute -left-1.5 top-0 w-3 h-3 rounded-full bg-slate-300 ring-4 ring-white" />
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800">Release v2.0.0 - AZ System Initial Deployment</span>
              <span className="font-mono text-slate-400">January 2026</span>
            </div>
            <p className="text-slate-600">
              Initial launch of AZ Limited Property & Compound Management System for Daar Residence (Desert Rose) and Meadow Park Garden.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
