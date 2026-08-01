'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Lock, Mail, ArrowRight, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Red accent glow background effects */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#E10600]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-[#E10600]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md z-10">
        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#141414] border border-[#262626] text-xs text-[#A3A3A3] mb-4">
            <ShieldCheck className="w-3.5 h-3.5 text-[#E10600]" />
            <span>Internal Agency Platform</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            RELENTIVE<span className="text-[#E10600]">LABS</span> COWORK
          </h1>
          <p className="text-sm text-[#A3A3A3] mt-2">
            Sign in with your team credentials to access your workspace.
          </p>
        </div>

        {/* Login Form card */}
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-6 shadow-2xl backdrop-blur-md">
          {error && (
            <div className="mb-4 p-3 rounded-md bg-[#7A0000]/30 border border-[#E10600]/50 text-red-200 text-xs flex items-center gap-2">
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#A3A3A3] uppercase tracking-wider mb-1.5">
                Work Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-[#737373]" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@relentivelabs.com"
                  className="w-full bg-[#0A0A0A] border border-[#262626] focus:border-[#E10600] focus:ring-1 focus:ring-[#E10600] rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-[#525252] outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#A3A3A3] uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-[#737373]" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-[#0A0A0A] border border-[#262626] focus:border-[#E10600] focus:ring-1 focus:ring-[#E10600] rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-[#525252] outline-none transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-[#E10600] hover:bg-[#FF3B3B] text-white font-medium py-2.5 rounded-lg text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-[#E10600]/20 disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Sign In to Workspace'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-[#262626] text-center text-xs text-[#737373]">
            Access is by invitation only. Contact your agency admin for access.
          </div>
        </div>
      </div>
    </div>
  );
}
