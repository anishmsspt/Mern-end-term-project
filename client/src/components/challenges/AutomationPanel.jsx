import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getAutomationStatus, startAutomationVerification, confirmAutomationVerification, updateAutomationEnrollment, triggerAutomationSync, setChallengeAutomation, getAutomationEnrollments } from '../../services/api';

export default function AutomationPanel({ challenge, isHost = false }) {
  const { token } = useAuth();
  const [status, setStatus] = useState(null);
  const [challengeEnabled, setChallengeEnabled] = useState(Boolean(challenge?.automation?.enabled));
  const [username, setUsername] = useState('');
  const [consent, setConsent] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [enrollments, setEnrollments] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const load = async () => {
    try {
      if (isHost) {
        const result = await getAutomationEnrollments(challenge._id, token);
        setEnrollments(result.enrollments || []);
      } else {
        const result = await getAutomationStatus(challenge._id, token);
        setStatus(result.enrollment || null);
        if (result.enrollment?.leetcodeUsername) setUsername(result.enrollment.leetcodeUsername);
      }
    } catch (e) { setError(e.message); }
  };
  useEffect(() => { setChallengeEnabled(Boolean(challenge?.automation?.enabled)); load(); }, [challenge?._id]);
  const act = async (fn, successMessage) => {
    setBusy(true); setError(''); setMessage('');
    try { const result = await fn(); setMessage(result.message || successMessage); if (isHost && result.challenge?.automation) setChallengeEnabled(Boolean(result.challenge.automation.enabled)); await load(); return result; }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };
  if (!challenge) return null;
  return (
    <section className="lc-card p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="lc-eyebrow mb-1">LeetCode automation</div>
          <h3 className="font-serif text-xl text-cream-50">{isHost ? 'Challenge sync settings' : 'Automatic solve tracking'}</h3>
          <p className="text-xs text-ink-400 mt-1">Accepted solves are checked every 10 minutes and enter the host review queue.</p>
        </div>
        <span className="lc-badge">{(isHost ? challengeEnabled : challenge.automation?.enabled) ? 'Enabled' : 'Disabled'}</span>
      </div>
      {isHost ? (
        <>
          <button disabled={busy} onClick={() => act(() => setChallengeAutomation(challenge._id, !challengeEnabled, token), 'Settings updated.')} className="lc-btn-secondary text-xs">
            {challengeEnabled ? 'Disable automation' : 'Enable automation'}
          </button>
          <div className="text-xs text-ink-400">{enrollments.length} enrolled account(s)</div>
          {enrollments.map((item) => <div key={item._id} className="flex justify-between border-t border-cream-100/10 pt-2 text-xs"><span>{item.user?.name || item.leetcodeUsername} <span className="text-ink-500">@{item.leetcodeUsername}</span></span><span className="text-peach-300">{item.status}</span></div>)}
        </>
      ) : (
        <>
          {!challenge.automation?.enabled && <p className="text-xs text-ink-400">Your host has not enabled automation for this challenge yet.</p>}
          <label className="block text-xs text-ink-300">LeetCode username<input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="your-leetcode-username" className="mt-1 w-full lc-input" /></label>
          <label className="flex items-start gap-2 text-xs text-ink-400"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" /><span>I consent to automatic checks of my public LeetCode accepted submissions every 10 minutes for this challenge.</span></label>
          <div className="flex flex-wrap gap-2">
            <button disabled={busy || !challenge.automation?.enabled || !username.trim() || !consent} className="lc-btn-primary text-xs" onClick={async () => { const r = await act(() => startAutomationVerification(challenge._id, username, token), 'Verification code generated.'); if (r?.verificationCode) setVerificationCode(r.verificationCode); }}>Start verification</button>
            <button disabled={busy || !status || status.status !== 'pending_verification'} className="lc-btn-secondary text-xs" onClick={() => act(() => confirmAutomationVerification(challenge._id, token), 'Account verified.')}>I've added the code — verify</button>
          </div>
          {verificationCode && <div className="rounded border border-peach-300/30 p-3 text-xs">Add this exact text to your public LeetCode About Me, then confirm. You can remove it after verification:<div className="font-mono text-peach-200 text-base mt-1 select-all">{verificationCode}</div></div>}
          {status && <div className="border-t border-cream-100/10 pt-3 space-y-2 text-xs"><div className="flex justify-between"><span className="text-ink-400">Status</span><span className="text-peach-200">{status.status}</span></div><div className="flex justify-between"><span className="text-ink-400">Last sync</span><span>{status.lastSyncAt ? new Date(status.lastSyncAt).toLocaleString() : 'Not synced yet'}</span></div>{status.lastError && <p className="text-amber-300">{status.lastError}</p>}<div className="flex flex-wrap gap-2">{status.status === 'active' && <><button disabled={busy} className="lc-btn-secondary text-xs" onClick={() => act(() => updateAutomationEnrollment(challenge._id, 'pause', token), 'Automation paused.')}>Pause</button><button disabled={busy} className="lc-btn-secondary text-xs" onClick={() => act(() => triggerAutomationSync(challenge._id, token), 'Sync completed.')}>Sync now</button></>}{status.status === 'paused' && <button disabled={busy} className="lc-btn-secondary text-xs" onClick={() => act(() => updateAutomationEnrollment(challenge._id, 'resume', token), 'Automation resumed.')}>Resume</button>}<button disabled={busy} className="lc-btn-secondary text-xs" onClick={() => act(() => updateAutomationEnrollment(challenge._id, 'disconnect', token), 'Account disconnected.')}>Disconnect</button></div></div>}
        </>
      )}
      {message && <p className="text-xs text-easy">{message}</p>}{error && <p className="text-xs text-red-300">{error}</p>}
    </section>
  );
}
