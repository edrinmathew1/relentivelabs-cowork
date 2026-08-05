'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Profile, Invite, Task, DailyChecklist } from '@/types';
import { Users, Mail, Plus, Shield, Award, Flame, CheckCircle2, UserCheck, Trash2, AlertCircle, Copy } from 'lucide-react';
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

  const [generatedInviteUrl, setGeneratedInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
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

      const { data: profilesData } = await supabase.from('profiles').select('*').eq('status', 'active').order('created_at', { ascending: false });
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

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!confirm(`Are you sure you want to remove ${memberName} from the agency workspace?`)) return;

    setMembers((prev) => prev.filter((m) => m.id !== memberId));

    try {
      await supabase.from('profiles').update({ status: 'deactivated' }).eq('id', memberId);
    } catch (err) {
      console.error('Remove member error:', err);
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setErrorMsg(null);
    setGeneratedInviteUrl(null);

    try {
      const res = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send invitation');

      if (data.inviteUrl) {
        setGeneratedInviteUrl(data.inviteUrl);
      }
      setInviteEmail('');
      setIsInviteModalOpen(false);
      fetchTeamAndInvites();
    } catch (err: any) {
      setErrorMsg(err.message || 'Invitation error');
    }
    setSending(false);
  };

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  // Calculate Unified Daily Streak (Checklists + Tasks Completed)
  const calculateMemberStreak = (userId: string) => {
    const userLists = checklists.filter((c) => c.user_id === userId && c.is_complete).map((c) => c.date);
    const userDoneTaskDates = tasks
      .filter((t) => t.assignee_id === userId && t.status === 'done' && t.updated_at)
      .map((t) => t.updated_at.split('T')[0]);

    const activeDates = new Set([...userLists, ...userDoneTaskDates]);

    let streak = 0;
    const todayStr = new Date().toISOString().split('T')[0];
    let checkDate = new Date();

    while (true) {
      const dStr = checkDate.toISOString().split('T')[0];
      if (activeDates.has(dStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        if (dStr === todayStr) {
          checkDate.setDate(checkDate.getDate() - 1);
          continue;
        }
        break;
      }
    }
    return streak;
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
            Agency team members, member removal, Resend email onboarding, and unified streak tracking.
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

      {generatedInviteUrl && (
        <div className="p-4 bg-[#141414] border border-[#E10600] rounded-xl shadow-2xl space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Invitation Created Successfully!
            </h3>
            <button
              onClick={() => copyToClipboard(generatedInviteUrl)}
              className="px-3 py-1 bg-[#E10600] hover:bg-[#FF3B3B] text-white text-xs font-bold rounded-lg transition flex items-center gap-1"
            >
              <Copy className="w-3.5 h-3.5" /> {copied ? 'Copied Link!' : 'Copy Direct Onboarding Link'}
            </button>
          </div>
          <p className="text-xs text-[#A3A3A3]">
            Resend email dispatched. You can also copy and send this direct link to your teammate:
          </p>
          <div className="p-2 bg-[#0A0A0A] border border-[#262626] rounded-lg text-xs text-[#E10600] font-mono break-all">
            {generatedInviteUrl}
          </div>
        </div>
      )}

      {/* Team Member Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {members.map((member) => {
          const memberDoneTasks = tasks.filter((t) => t.assignee_id === member.id && t.status === 'done').length;
          const streak = calculateMemberStreak(member.id);

          const badges = [];
          if (streak >= 1) badges.push({ label: `🔥 ${streak} Day Streak`, color: '#E10600' });
          if (memberDoneTasks >= 1) badges.push({ label: `🛠️ ${memberDoneTasks} Tasks Done`, color: '#3FBF6C' });
          if (member.status === 'active') badges.push({ label: '🌟 Active Member', color: '#3B82F6' });

          const canRemove = currentProfile?.role === 'admin' && member.id !== currentProfile.id;

          return (
            <div
              key={member.id}
              className="bg-[#141414] border border-[#262626] rounded-xl p-5 shadow-xl flex flex-col justify-between space-y-4 relative group"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 truncate">
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

                {/* Admin Only Remove Member Trigger */}
                {canRemove && (
                  <button
                    onClick={() => handleRemoveMember(member.id, member.full_name)}
                    title="Remove Member from Agency"
                    className="p-1.5 text-[#737373] hover:text-[#FF3B3B] hover:bg-[#262626] rounded-lg transition shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Unified Streak & Kudos Badges Area */}
              <div className="space-y-1.5 pt-3 border-t border-[#262626]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#A3A3A3] flex items-center gap-1">
                  <Award className="w-3 h-3 text-[#E10600]" /> Active Streak & Stats:
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
