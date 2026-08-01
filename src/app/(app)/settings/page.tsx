'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Profile } from '@/types';
import { Settings as SettingsIcon, User, Globe, Shield, Save, Upload, Check } from 'lucide-react';

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState('');
  const [title, setTitle] = useState('');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
    if (data) {
      setProfile(data as any);
      setFullName(data.full_name || '');
      setTitle(data.title || '');
      setTimezone(data.timezone || 'Asia/Kolkata');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setSuccess(false);

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName,
        title,
        timezone,
      })
      .eq('id', profile.id);

    if (!error) {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }
    setSaving(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    const filePath = `avatars/${profile.id}/${file.name}`;
    const { error: uploadErr } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });

    if (!uploadErr) {
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', profile.id);
      fetchProfile();
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-[#E10600]" />
          Account & Preferences
        </h1>
        <p className="text-xs text-[#A3A3A3] mt-1">
          Manage your personal profile, timezone, and workspace branding preferences.
        </p>
      </div>

      <div className="bg-[#141414] border border-[#262626] rounded-xl p-6 shadow-2xl space-y-6">
        {success && (
          <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-600 text-emerald-300 text-xs flex items-center gap-2">
            <Check className="w-4 h-4" /> Profile updated successfully!
          </div>
        )}

        {/* Profile Avatar Section */}
        <div className="flex items-center gap-4 pb-6 border-b border-[#262626]">
          <div className="w-16 h-16 rounded-full bg-[#0A0A0A] border-2 border-[#E10600] flex items-center justify-center text-white text-xl font-black">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="w-full h-full rounded-full object-cover" />
            ) : (
              profile?.full_name?.substring(0, 2).toUpperCase() || 'U'
            )}
          </div>

          <div>
            <h3 className="text-sm font-bold text-white">{profile?.full_name}</h3>
            <p className="text-xs text-[#A3A3A3]">{profile?.email} • {profile?.role.toUpperCase()}</p>
            <label className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-[#1F1F1F] hover:bg-[#262626] text-white text-xs font-semibold rounded-lg border border-[#333333] cursor-pointer transition">
              <Upload className="w-3.5 h-3.5 text-[#E10600]" /> Upload Avatar
              <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
            </label>
          </div>
        </div>

        {/* Edit Form */}
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#A3A3A3] uppercase mb-1">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-[#737373]" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-[#262626] focus:border-[#E10600] rounded-lg pl-9 pr-3 py-2 text-xs text-white outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#A3A3A3] uppercase mb-1">Title / Role</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Senior Full Stack Engineer"
                className="w-full bg-[#0A0A0A] border border-[#262626] focus:border-[#E10600] rounded-lg p-2 text-xs text-white outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#A3A3A3] uppercase mb-1">Timezone</label>
            <div className="relative">
              <Globe className="absolute left-3 top-2.5 h-4 w-4 text-[#737373]" />
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full bg-[#0A0A0A] border border-[#262626] focus:border-[#E10600] text-white rounded-lg pl-9 pr-3 py-2 text-xs outline-none"
              >
                <option value="Asia/Kolkata">Asia/Kolkata (IST +5:30)</option>
                <option value="UTC">UTC (GMT +0:00)</option>
                <option value="America/New_York">America/New_York (EST -5:00)</option>
                <option value="Europe/London">Europe/London (GMT +0:00)</option>
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-[#262626] flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="bg-[#E10600] hover:bg-[#FF3B3B] text-white px-5 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 shadow-lg shadow-[#E10600]/20 transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
