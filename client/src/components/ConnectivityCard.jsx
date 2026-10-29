import React, { useState, useEffect } from 'react';
import { fetchHealth, API_BASE_URL } from '../services/api';
import { CheckCircle2, XCircle, Loader2, RefreshCw } from 'lucide-react';

export default function ConnectivityCard() {
  const [state, setState] = useState({
    status: 'idle',
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
    <div className="lc-card p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <h2 className="text-sm font-semibold text-white">API health</h2>
          <p className="text-[11px] text-slate-500 font-mono">
            {API_BASE_URL ? `${API_BASE_URL}/api/health` : '/api/health'}
          </p>
        </div>
        <button
          onClick={runHealthCheck}
          disabled={state.status === 'loading'}
          className="lc-btn-ghost text-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${state.status === 'loading' ? 'animate-spin text-brand-500' : ''}`} />
          Retest
        </button>
      </div>

      {state.status === 'loading' && (
        <div className="py-6 flex items-center justify-center gap-2 text-sm text-slate-400">
          <Loader2 className="w-4 h-4 text-brand-500 animate-spin" />
          Checking...
        </div>
      )}

      {state.status === 'error' && (
        <div className="flex items-start gap-2 text-xs text-hard">
          <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Connection failed</p>
            <p className="font-mono mt-1 text-hard/80">{state.error}</p>
          </div>
        </div>
      )}

      {state.status === 'success' && state.data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <div className="text-slate-500">Status</div>
            <div className="flex items-center gap-1.5 mt-0.5 text-easy font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              200 OK
            </div>
          </div>
          <div>
            <div className="text-slate-500">Latency</div>
            <div className="mt-0.5 font-mono text-slate-200">{state.latencyMs}ms</div>
          </div>
          <div>
            <div className="text-slate-500">Database</div>
            <div className="mt-0.5 text-slate-200">
              {state.data.database?.isPersistent ? 'Persistent' : 'In-memory'}
            </div>
          </div>
          <div>
            <div className="text-slate-500">Environment</div>
            <div className="mt-0.5 font-mono text-slate-200 uppercase">{state.data.environment}</div>
          </div>
        </div>
      )}
    </div>
  );
}
