'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Profile, Invite, UserRole } from '@/types';
import { Users, UserPlus, Mail, ShieldAlert, CheckCircle2, XCircle, Send } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function TeamPage() {
  const [members, setMembers] = useState<Profile[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('member');
  const [sendingInvite, setSendingInvite] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    fetchTeamAndInvites();
  }, []);

  const fetchTeamAndInvites = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
    if (profile?.role === 'admin') setIsAdmin(true);

    const { data: membersData } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (membersData) setMembers(membersData as any);

    const { data: invitesData } = await supabase.from('invites').select('*').order('created_at', { ascending: false });
    if (invitesData) setInvites(invitesData as any);
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;

    setSendingInvite(true);
    setError(null);
    setInviteSuccess(null);

    try {
      const res = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send invite');

      setInviteSuccess(`Invitation sent to ${inviteEmail}`);
      setInviteEmail('');
      fetchTeamAndInvites();
    } catch (err: any) {
      setError(err.message || 'Failed to send invite');
    }
    setSendingInvite(false);
  };

  const toggleMemberStatus = async (userId: string, currentStatus: string) => {
    if (!isAdmin) return;
    const newStatus = currentStatus === 'active' ? 'deactivated' : 'active';
    await supabase.from('profiles').update({ status: newStatus }).eq('id', userId);
    fetchTeamAndInvites();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-[#E10600]" />
            Team Workspace & Members
          </h1>
          <p className="text-xs text-[#A3A3A3] mt-1">
            Manage agency team members, role assignments, and pending email invitations.
          </p>
        </div>
      </div>

      {/* Admin Invite Form */}
      {isAdmin && (
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-5 shadow-xl space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-[#E10600]" />
            Invite New Agency Member
          </h2>

          {inviteSuccess && (
            <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-600 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> {inviteSuccess}
            </div>
          )}

          {error && (
            <div className="p-3 rounded-lg bg-[#7A0000]/30 border border-[#E10600] text-red-200 text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleSendInvite} className="flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              required
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="developer@relentivelabs.com"
              className="flex-1 bg-[#0A0A0A] border border-[#262626] focus:border-[#E10600] rounded-lg px-3 py-2 text-xs text-white outline-none"
            />

            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as UserRole)}
              className="bg-[#0A0A0A] border border-[#262626] text-white rounded-lg px-3 py-2 text-xs outline-none capitalize"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>

            <button
              type="submit"
              disabled={sendingInvite}
              className="bg-[#E10600] hover:bg-[#FF3B3B] text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-[#E10600]/20 transition disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {sendingInvite ? 'Sending...' : 'Send Email Invite'}
            </button>
          </form>
        </div>
      )}

      {/* Active Team Members List */}
      <div className="bg-[#141414] border border-[#262626] rounded-xl overflow-hidden shadow-xl">
        <div className="p-4 bg-[#0A0A0A] border-b border-[#262626]">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            Active Agency Members ({members.length})
          </h3>
        </div>

        <table className="w-full text-left text-xs text-[#E5E5E5]">
          <thead className="bg-[#0A0A0A] border-b border-[#262626] uppercase text-[10px] text-[#A3A3A3]">
            <tr>
              <th className="p-3 font-semibold">Member</th>
              <th className="p-3 font-semibold">Role</th>
              <th className="p-3 font-semibold">Status</th>
              <th className="p-3 font-semibold">Joined Date</th>
              {isAdmin && <th className="p-3 font-semibold text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#262626]">
            {members.map((m) => (
              <tr key={m.id} className="hover:bg-[#1A1A1A] transition">
                <td className="p-3 font-medium text-white flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-[#262626] border border-[#E10600]/50 text-white font-bold flex items-center justify-center text-xs">
                    {m.full_name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <span className="block font-semibold">{m.full_name}</span>
                    <span className="text-[11px] text-[#737373]">{m.email}</span>
                  </div>
                </td>
                <td className="p-3 capitalize">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${m.role === 'admin' ? 'bg-[#7A0000]/40 border-[#E10600] text-red-200' : 'bg-[#1F1F1F] border-[#333333] text-[#A3A3A3]'}`}>
                    {m.role}
                  </span>
                </td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${m.status === 'active' ? 'bg-emerald-950/50 border-emerald-600 text-emerald-400' : 'bg-red-950/50 border-red-800 text-red-400'}`}>
                    {m.status}
                  </span>
                </td>
                <td className="p-3 text-[#737373]">{formatDate(m.joined_at)}</td>
                {isAdmin && (
                  <td className="p-3 text-right">
                    <button
                      onClick={() => toggleMemberStatus(m.id, m.status)}
                      className="text-[11px] font-semibold text-[#FF3B3B] hover:underline"
                    >
                      {m.status === 'active' ? 'Deactivate' : 'Reactivate'}
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
