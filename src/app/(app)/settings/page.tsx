'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Profile } from '@/types';
import { Settings as SettingsIcon, User, Image, Save, CheckCircle2, Upload, AlertCircle } from 'lucide-react';

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState('');
  const [title, setTitle] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
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
    } catch (err) {
      console.error('Fetch profile error:', err);
    }
  };

  // Direct Local PC File Upload Handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate image file type & size (max 5MB)
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file (PNG, JPG, WebP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Image file size must be less than 5MB.');
      return;
    }

    setUploading(true);
    setErrorMsg(null);

    try {
      // 1. Try uploading to Supabase Storage bucket 'avatars'
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile?.id || 'avatar'}_${Date.now()}.${fileExt}`;
      const filePath = `public/${fileName}`;

      const { error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (!uploadErr) {
        const { data: publicUrlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);

        if (publicUrlData?.publicUrl) {
          setAvatarUrl(publicUrlData.publicUrl);
          setUploading(false);
          return;
        }
      }

      // 2. Fallback to Data URL if Storage bucket is not configured yet
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setAvatarUrl(event.target.result as string);
        }
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      console.error('Upload error:', err);
      setErrorMsg('Could not upload image. Used local image fallback.');
      setUploading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setLoading(true);
    setSaved(false);
    setErrorMsg(null);

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
      } else {
        setErrorMsg(error.message);
      }
    } catch (err: any) {
      console.error('Save profile error:', err);
      setErrorMsg(err.message || 'Failed to update profile.');
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
          Manage your personal agency identity, title, profile picture avatar & preferences.
        </p>
      </div>

      {saved && (
        <div className="p-3 bg-emerald-950/40 border border-emerald-500 text-emerald-300 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Profile updated successfully! Refresh to see avatar changes everywhere.</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-[#7A0000]/30 border border-[#E10600] text-red-200 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-[#E10600] shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSaveSettings} className="bg-[#141414] border border-[#262626] rounded-xl p-6 shadow-2xl space-y-6">
        {/* Avatar Preview & Direct PC Upload */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-5 p-4 bg-[#0A0A0A] border border-[#262626] rounded-xl">
          <div className="w-20 h-20 rounded-full bg-[#1A1A1A] border-2 border-[#E10600] flex items-center justify-center text-white text-xl font-bold shrink-0 overflow-hidden shadow-lg">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt={fullName || 'Profile Avatar'} className="w-full h-full object-cover" />
            ) : (
              <User className="w-10 h-10 text-[#737373]" />
            )}
          </div>

          <div className="space-y-2 flex-1">
            <div>
              <h3 className="text-sm font-bold text-white">{fullName || 'Your Name'}</h3>
              <p className="text-xs text-[#A3A3A3]">{profile?.email}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Direct PC File Input */}
              <label className="px-3 py-1.5 bg-[#E10600] hover:bg-[#FF3B3B] text-white text-xs font-bold rounded-lg cursor-pointer transition flex items-center gap-1.5 shadow-md shadow-[#E10600]/20">
                <Upload className="w-3.5 h-3.5" />
                {uploading ? 'Uploading...' : 'Upload Image from PC'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {avatarUrl && (
                <button
                  type="button"
                  onClick={() => setAvatarUrl('')}
                  className="px-3 py-1.5 bg-[#262626] hover:bg-[#333333] text-[#A3A3A3] hover:text-white text-xs font-semibold rounded-lg transition"
                >
                  Remove Picture
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Form Inputs */}
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
              <Image className="w-3 h-3 text-[#E10600]" /> Or Paste Image Web URL
            </label>
            <input
              type="url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://images.unsplash.com/... or your image link"
              className="w-full bg-[#0A0A0A] border border-[#262626] focus:border-[#E10600] rounded-lg p-2.5 text-xs text-white outline-none font-mono"
            />
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
          disabled={loading || uploading}
          className="px-5 py-2.5 bg-[#E10600] hover:bg-[#FF3B3B] text-white text-xs font-bold rounded-lg shadow-lg shadow-[#E10600]/20 flex items-center gap-2 transition"
        >
          <Save className="w-4 h-4" /> {loading ? 'Saving Changes...' : 'Save Profile Settings'}
        </button>
      </form>
    </div>
  );
}
