'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Profile, Invite, Task, DailyChecklist } from '@/types';
import { Users, Mail, Plus, Shield, Award, Flame, CheckCircle2, UserCheck, AlertCircle } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function TeamPage() {
  const [members, setMembers] = useState<Profile[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [checklists, setChecklists] = useState<DailyChecklist[]>([]);
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [sending, setSending] = useState(false);
  const [inviteSuccessMsg, setInviteSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    fetchTeamAndInvites();
  }, []);

  const fetchTeamAndInvites = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: me } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        if (me) setCurrentProfile(me as Profile);
      }

      const { data: profilesData } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (profilesData) setMembers(profilesData as Profile[]);

      const { data: invitesData } = await supabase.from('invites').select('*').order('created_at', { ascending: false });
      if (invitesData) setInvites(invitesData as Invite[]);

      const { data: tasksData } = await supabase.from('tasks').select('*');
      if (tasksData) setTasks(tasksData as Task[]);

      const { data: checklistsData } = await supabase.from('daily_checklists').select('*');
      if (checklistsData) setChecklists(checklistsData as DailyChecklist[]);
    } catch (err) {
      console.error('Fetch team error:', err);
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setErrorMsg(null);
    setInviteSuccessMsg(null);

    try {
      const res = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send invitation');

      setInviteSuccessMsg(`Invite sent to ${inviteEmail}! Check Resend email.`);
      setInviteEmail('');
      setIsInviteModalOpen(false);
      fetchTeamAndInvites();
    } catch (err: any) {
      setErrorMsg(err.message || 'Invitation error');
    }
    setSending(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-[#E10600]" />
            Team Workspace & Achievements
          </h1>
          <p className="text-xs text-[#A3A3A3] mt-1">
            Agency team members, Resend email onboarding, and gamified achievement badges.
          </p>
        </div>

        {currentProfile?.role === 'admin' && (
          <button
            onClick={() => setIsInviteModalOpen(true)}
            className="bg-[#E10600] hover:bg-[#FF3B3B] text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 shadow-lg shadow-[#E10600]/20 transition"
          >
            <Plus className="w-4 h-4" /> Invite Team Member
          </button>
        )}
      </div>

      {inviteSuccessMsg && (
        <div className="p-3 bg-emerald-950/40 border border-emerald-500 text-emerald-300 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{inviteSuccessMsg}</span>
        </div>
      )}

      {/* Team Member Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {members.map((member) => {
          // Calculate Gamified Achievement Badges
          const memberDoneTasks = tasks.filter((t) => t.assignee_id === member.id && t.status === 'done').length;
          const memberStreak = checklists.filter((c) => c.user_id === member.id && c.is_complete).length;

          const badges = [];
          if (member.role === 'admin') badges.push({ label: '👑 Agency Founder / Admin', color: '#E10600' });
          if (memberStreak >= 3) badges.push({ label: `🔥 Streak Legend (${memberStreak}d)`, color: '#FF3B3B' });
          if (memberDoneTasks >= 1) badges.push({ label: `🛠️ Task Crusher (${memberDoneTasks} Done)`, color: '#3FBF6C' });
          if (member.status === 'active') badges.push({ label: '🌟 Active Onboarded', color: '#3B82F6' });

          return (
            <div
              key={member.id}
              className="bg-[#141414] border border-[#262626] rounded-xl p-5 shadow-xl flex flex-col justify-between space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#0A0A0A] border-2 border-[#E10600] flex items-center justify-center text-white text-base font-bold shrink-0 overflow-hidden">
                  {member.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={member.avatar_url} alt={member.full_name} className="w-full h-full object-cover" />
                  ) : (
                    member.full_name.substring(0, 2).toUpperCase()
                  )}
                </div>
                <div className="truncate">
                  <h3 className="text-sm font-bold text-white truncate">{member.full_name}</h3>
                  <p className="text-xs text-[#A3A3A3] truncate">{member.email}</p>
                  <span className="text-[10px] text-[#737373] capitalize">{member.title || member.role}</span>
                </div>
              </div>

              {/* Achievement Badges Area */}
              <div className="space-y-1.5 pt-3 border-t border-[#262626]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#A3A3A3] flex items-center gap-1">
                  <Award className="w-3 h-3 text-[#E10600]" /> Kudos & Badges:
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {badges.map((b, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded text-[10px] font-bold border"
                      style={{
                        backgroundColor: `${b.color}20`,
                        borderColor: b.color,
                        color: '#FFFFFF',
                      }}
                    >
                      {b.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Invite Member Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-[#262626] rounded-xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#262626] pb-3">
              <h3 className="text-base font-bold text-white">Invite Team Member</h3>
              <button onClick={() => setIsInviteModalOpen(false)} className="text-[#737373] hover:text-white">✕</button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-lg bg-[#7A0000]/30 border border-[#E10600] text-red-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[#E10600] shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSendInvite} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#A3A3A3] uppercase mb-1">Work Email</label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@relentivelabs.com"
                  className="w-full bg-[#0A0A0A] border border-[#262626] focus:border-[#E10600] rounded-lg p-2.5 text-xs text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#A3A3A3] uppercase mb-1">Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'admin' | 'member')}
                  className="w-full bg-[#0A0A0A] border border-[#262626] text-white rounded-lg p-2.5 text-xs outline-none capitalize"
                >
                  <option value="member">Team Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#262626] text-[#A3A3A3] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#E10600] hover:bg-[#FF3B3B] text-white shadow-md shadow-[#E10600]/20"
                >
                  {sending ? 'Sending...' : 'Send Resend Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
