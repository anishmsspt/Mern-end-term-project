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
    <div className="lc-card lc-card-pine p-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <div className="text-[9.5px] uppercase tracking-[0.26em] text-pine-300 font-semibold">
            Telemetry &amp; Diagnostics
          </div>
          <h2 className="font-serif text-xl text-cream-50 font-normal mt-0.5">API Health status</h2>
          <p className="text-[11px] text-pine-300/80 font-mono mt-0.5">
            {API_BASE_URL ? `${API_BASE_URL}/api/health` : '/api/health'}
          </p>
        </div>
        <button
          onClick={runHealthCheck}
          disabled={state.status === 'loading'}
          className="lc-btn-ghost text-pine-200 hover:text-cream-50 text-xs py-1 px-2 border border-pine-500/30 rounded-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${state.status === 'loading' ? 'animate-spin text-peach-300' : ''}`} />
          <span>Retest</span>
        </button>
      </div>

      {state.status === 'loading' && (
        <div className="py-6 flex items-center justify-center gap-2.5 text-xs text-pine-300">
          <Loader2 className="w-4 h-4 text-peach-300 animate-spin" />
          Probing backend edge...
        </div>
      )}

      {state.status === 'error' && (
        <div className="p-3 rounded-sm border border-hard/40 bg-hard/10 flex items-start gap-2.5 text-xs text-hard">
          <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Backend Unreachable</p>
            <p className="font-mono mt-1 text-hard/90 text-[11px]">{state.error}</p>
          </div>
        </div>
      )}

      {state.status === 'success' && state.data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs pt-2 border-t border-pine-500/20">
          <div>
            <div className="text-[10px] tracking-[0.2em] uppercase text-pine-400">Endpoint</div>
            <div className="flex items-center gap-1.5 mt-1 text-easy font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              200 OK
            </div>
          </div>
          <div>
            <div className="text-[10px] tracking-[0.2em] uppercase text-pine-400">Latency</div>
            <div className="mt-1 font-mono text-cream-100 font-semibold">{state.latencyMs}ms</div>
          </div>
          <div>
            <div className="text-[10px] tracking-[0.2em] uppercase text-pine-400">Database</div>
            <div className="mt-1 text-cream-100">
              {state.data.database?.isPersistent ? 'Persistent' : 'In-memory'}
            </div>
          </div>
          <div>
            <div className="text-[10px] tracking-[0.2em] uppercase text-pine-400">Environment</div>
            <div className="mt-1 font-mono text-cream-100 uppercase">{state.data.environment}</div>
          </div>
        </div>
      )}
    </div>
  );
}
