'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Profile } from '@/types';
import { Settings as SettingsIcon, User, Image, Save, CheckCircle2, Shield } from 'lucide-react';

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState('');
  const [title, setTitle] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
    if (data) {
      setProfile(data as Profile);
      setFullName(data.full_name || '');
      setTitle(data.title || '');
      setAvatarUrl(data.avatar_url || '');
      setTimezone(data.timezone || 'Asia/Kolkata');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setLoading(true);
    setSaved(false);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          title,
          avatar_url: avatarUrl,
          timezone,
        })
        .eq('id', profile.id);

      if (!error) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (err) {
      console.error('Save profile error:', err);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-[#E10600]" />
          Account & Profile Settings
        </h1>
        <p className="text-xs text-[#A3A3A3] mt-1">
          Manage your personal agency identity, title, profile picture & preferences.
        </p>
      </div>

      {saved && (
        <div className="p-3 bg-emerald-950/40 border border-emerald-500 text-emerald-300 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Profile updated successfully! Refresh to see avatar changes everywhere.</span>
        </div>
      )}

      <form onSubmit={handleSaveSettings} className="bg-[#141414] border border-[#262626] rounded-xl p-6 shadow-2xl space-y-6">
        {/* Avatar Preview */}
        <div className="flex items-center gap-4 p-4 bg-[#0A0A0A] border border-[#262626] rounded-xl">
          <div className="w-16 h-16 rounded-full bg-[#1A1A1A] border-2 border-[#E10600] flex items-center justify-center overflow-hidden shrink-0">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="Profile Avatar" className="w-full h-full object-cover" />
            ) : (
              <User className="w-8 h-8 text-[#737373]" />
            )}
          </div>
          <div className="space-y-1 flex-1">
            <h3 className="text-sm font-bold text-white">{fullName || 'Your Name'}</h3>
            <p className="text-xs text-[#A3A3A3]">{profile?.email}</p>
            <span className="inline-block px-2 py-0.5 rounded bg-[#141414] border border-[#262626] text-[10px] font-mono text-[#E10600] capitalize">
              Role: {profile?.role}
            </span>
          </div>
        </div>

        {/* Inputs */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#A3A3A3] uppercase mb-1">Full Name</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-[#0A0A0A] border border-[#262626] focus:border-[#E10600] rounded-lg p-2.5 text-xs text-white outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#A3A3A3] uppercase mb-1">Job Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Fullstack Engineer / Product Manager"
              className="w-full bg-[#0A0A0A] border border-[#262626] focus:border-[#E10600] rounded-lg p-2.5 text-xs text-white outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#A3A3A3] uppercase mb-1 flex items-center gap-1">
              <Image className="w-3 h-3 text-[#E10600]" /> Profile Picture Avatar URL
            </label>
            <input
              type="url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://images.unsplash.com/... or your image link"
              className="w-full bg-[#0A0A0A] border border-[#262626] focus:border-[#E10600] rounded-lg p-2.5 text-xs text-white outline-none font-mono"
            />
            <p className="text-[10px] text-[#737373] mt-1">Paste any direct image URL to set as your profile avatar.</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#A3A3A3] uppercase mb-1">Timezone</label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full bg-[#0A0A0A] border border-[#262626] text-white rounded-lg p-2.5 text-xs outline-none"
            >
              <option value="Asia/Kolkata">Asia/Kolkata (IST +5:30)</option>
              <option value="America/New_York">America/New_York (EST)</option>
              <option value="Europe/London">Europe/London (GMT/BST)</option>
              <option value="UTC">UTC</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2.5 bg-[#E10600] hover:bg-[#FF3B3B] text-white text-xs font-bold rounded-lg shadow-lg shadow-[#E10600]/20 flex items-center gap-2 transition"
        >
          <Save className="w-4 h-4" /> {loading ? 'Saving Changes...' : 'Save Profile Settings'}
        </button>
      </form>
    </div>
  );
}
