'use client';

import { FormEvent, useState } from 'react';
import { api, setSession } from '@/lib/api';

export default function LoginPage() {
  const [email, setEmail] = useState('admin@temerachi.com');
  const [password, setPassword] = useState('Admin123!');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api<{ accessToken: string; user: unknown }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setSession(res.accessToken, res.user);
      window.location.href = '/dashboard';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-roast-900 text-cream">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_#c4a57433,_transparent_45%),radial-gradient(circle_at_bottom_left,_#3f6b4a44,_transparent_40%)]" />
      <div className="relative mx-auto flex min-h-screen max-w-6xl items-center px-6">
        <div className="hidden flex-1 pr-12 lg:block">
          <p className="text-sm uppercase tracking-[0.3em] text-gold-400">Temerachi Coffee</p>
          <h1 className="mt-4 font-display text-5xl leading-tight">Export management from farm to FOB</h1>
          <p className="mt-6 max-w-lg text-cream/75">
            Trace Ethiopian lots, control quality, prepare export documents, and follow buyers, warehouses, and finance in one portal.
          </p>
        </div>
        <form onSubmit={onSubmit} className="card w-full max-w-md p-8 text-roast-900">
          <h2 className="font-display text-2xl">Sign in</h2>
          <p className="mt-1 text-sm text-roast-600">Use the seeded administrator account to explore the system.</p>
          <div className="mt-6 space-y-4">
            <label className="block">
              <span className="label">Email</span>
              <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label className="block">
              <span className="label">Password</span>
              <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </label>
            {error ? <p className="text-sm text-rose-700">{error}</p> : null}
            <button className="btn-primary w-full" disabled={loading}>
              {loading ? 'Signing in…' : 'Enter portal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
