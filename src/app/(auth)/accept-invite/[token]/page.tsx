'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { UserCheck, Lock, User, ArrowRight, AlertCircle } from 'lucide-react';

export default function AcceptInvitePage() {
  const params = useParams();
  const token = params?.token as string;
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/invite/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password, fullName }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to accept invitation');
      }

      router.push('/login?invited=true');
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#E10600]/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#141414] border border-[#262626] text-xs text-[#A3A3A3] mb-4">
            <UserCheck className="w-3.5 h-3.5 text-[#E10600]" />
            <span>Team Invitation</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            JOIN <span className="text-[#E10600]">RELENTIVELABS</span>
          </h1>
          <p className="text-sm text-[#A3A3A3] mt-2">
            Complete your profile to activate your agency member account.
          </p>
        </div>

        <div className="bg-[#141414] border border-[#262626] rounded-xl p-6 shadow-2xl backdrop-blur-md">
          {error && (
            <div className="mb-4 p-3 rounded-md bg-[#7A0000]/30 border border-[#E10600]/50 text-red-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[#E10600] shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#A3A3A3] uppercase tracking-wider mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-[#737373]" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Alex Rivera"
                  className="w-full bg-[#0A0A0A] border border-[#262626] focus:border-[#E10600] focus:ring-1 focus:ring-[#E10600] rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-[#525252] outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#A3A3A3] uppercase tracking-wider mb-1.5">
                Set Password
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

            <div>
              <label className="block text-xs font-semibold text-[#A3A3A3] uppercase tracking-wider mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-[#737373]" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
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
              {loading ? 'Activating Account...' : 'Activate Account & Access OS'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
