import React, { useState, useEffect } from 'react';
import { fetchHealth, API_BASE_URL } from '../services/api';
import {
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  Server,
  Database,
  Clock,
  ShieldAlert,
  Cpu,
} from 'lucide-react';

export default function ConnectivityCard() {
  const [state, setState] = useState({
    status: 'idle', // 'idle' | 'loading' | 'success' | 'error'
    data: null,
    error: null,
    latencyMs: null,
    testedAt: null,
  });

  const runHealthCheck = async () => {
    setState((prev) => ({ ...prev, status: 'loading', error: null }));
    const startTime = performance.now();

    try {
      const data = await fetchHealth();
      const latencyMs = Math.round(performance.now() - startTime);
      setState({
        status: 'success',
        data,
        error: null,
        latencyMs,
        testedAt: new Date().toLocaleTimeString(),
      });
    } catch (err) {
      const latencyMs = Math.round(performance.now() - startTime);
      setState({
        status: 'error',
        data: null,
        error: err.message || 'Failed to connect to backend service',
        latencyMs,
        testedAt: new Date().toLocaleTimeString(),
      });
    }
  };

  useEffect(() => {
    runHealthCheck();
  }, []);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl relative overflow-hidden">
      {/* Background glow accent */}
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-brand-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-800 gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Server className="w-5 h-5 text-brand-400" />
            <h2 className="text-lg font-semibold text-white tracking-tight">
              Backend Diagnostic & Connectivity Test
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Target Endpoint: {API_BASE_URL ? `${API_BASE_URL}/api/health` : '/api/health (proxied)'}
          </p>
        </div>

        <button
          onClick={runHealthCheck}
          disabled={state.status === 'loading'}
          className="inline-flex items-center justify-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition disabled:opacity-50 self-start sm:self-auto"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${state.status === 'loading' ? 'animate-spin text-brand-400' : ''}`}
          />
          <span>{state.status === 'loading' ? 'Probing Server...' : 'Retest Connection'}</span>
        </button>
      </div>

      <div className="mt-5">
        {state.status === 'loading' && (
          <div className="py-10 flex flex-col items-center justify-center text-center space-y-3">
            <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
            <p className="text-sm text-slate-300 font-medium">Querying backend health endpoint...</p>
            <p className="text-xs text-slate-500">Checking HTTP status, MongoDB connection, and system state</p>
          </div>
        )}

        {state.status === 'error' && (
          <div className="bg-rose-950/30 border border-rose-900/50 rounded-lg p-5">
            <div className="flex items-start space-x-3">
              <XCircle className="w-6 h-6 text-rose-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-rose-200">
                  Connection Failed
                </h3>
                <p className="text-xs font-mono text-rose-300/80 bg-rose-950/60 p-2.5 rounded border border-rose-900/40">
                  {state.error}
                </p>
                <div className="text-xs text-slate-400 space-y-1 pt-1">
                  <p>Troubleshooting steps:</p>
                  <ul className="list-disc list-inside space-y-0.5 text-slate-400">
                    <li>Verify the Express server is running on port 5000 (`npm run dev:server`).</li>
                    <li>Verify your CORS settings in <code className="text-slate-300">server/src/app.js</code> allow your client origin.</li>
                    <li>Verify <code className="text-slate-300">client/.env</code> has <code className="text-slate-300">VITE_API_URL=http://localhost:5000</code>.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {state.status === 'success' && state.data && (
          <div className="space-y-4">
            {/* Status overview banner */}
            <div className="flex flex-wrap items-center justify-between bg-slate-950/60 border border-slate-800/80 p-4 rounded-lg gap-3">
              <div className="flex items-center space-x-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-semibold text-slate-100">
                      System Operational
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-medium">
                      200 OK
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">{state.data.message}</p>
                </div>
              </div>

              <div className="flex items-center space-x-4 text-xs font-mono text-slate-400">
                <span className="flex items-center space-x-1">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>Latency: <strong className="text-slate-200">{state.latencyMs}ms</strong></span>
                </span>
                <span>Tested: {state.testedAt}</span>
              </div>
            </div>

            {/* Diagnostics grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* Server State */}
              <div className="bg-slate-950/40 border border-slate-800/60 rounded-lg p-3.5 space-y-1">
                <div className="flex items-center space-x-2 text-slate-400 text-xs">
                  <Cpu className="w-3.5 h-3.5 text-brand-400" />
                  <span>Express Environment</span>
                </div>
                <div className="text-sm font-mono font-semibold text-slate-200 uppercase">
                  {state.data.environment}
                </div>
                <div className="text-xs text-slate-500">
                  Uptime: {state.data.uptimeSeconds} seconds
                </div>
              </div>

              {/* Database State */}
              <div className="bg-slate-950/40 border border-slate-800/60 rounded-lg p-3.5 space-y-1">
                <div className="flex items-center space-x-2 text-slate-400 text-xs">
                  <Database className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Database Engine</span>
                </div>
                <div className="text-sm font-mono font-semibold text-slate-200">
                  {state.data.database?.type || 'MongoDB'}
                </div>
                <div className="text-xs text-slate-500 truncate">
                  Host: {state.data.database?.host || 'localhost'}
                </div>
              </div>

              {/* Persistence Mode */}
              <div className="bg-slate-950/40 border border-slate-800/60 rounded-lg p-3.5 space-y-1 sm:col-span-2 lg:col-span-1">
                <div className="flex items-center space-x-2 text-slate-400 text-xs">
                  <Server className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Storage Persistence</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span
                    className={`inline-block w-2 h-2 rounded-full ${
                      state.data.database?.isPersistent ? 'bg-emerald-400' : 'bg-amber-400'
                    }`}
                  />
                  <span className="text-sm font-semibold text-slate-200">
                    {state.data.database?.isPersistent ? 'Persistent Storage' : 'Development In-Memory'}
                  </span>
                </div>
                <div className="text-xs text-slate-500">
                  {state.data.database?.isPersistent ? 'Atlas / Remote cluster' : 'Ephemeral local memory'}
                </div>
              </div>
            </div>

            {/* Non-persistent development warning banner if memory server is detected */}
            {state.data.database && !state.data.database.isPersistent && (
              <div className="bg-amber-950/30 border border-amber-900/50 rounded-lg p-3.5 flex items-start space-x-3 text-xs text-amber-300">
                <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold text-amber-200">Development Mode Notice: </strong>
                  An ephemeral in-memory MongoDB instance is actively serving requests. For persistent production data, specify <code className="bg-amber-950/80 px-1 py-0.5 rounded text-amber-100">MONGODB_URI</code> in <code className="bg-amber-950/80 px-1 py-0.5 rounded text-amber-100">server/.env</code>.
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
