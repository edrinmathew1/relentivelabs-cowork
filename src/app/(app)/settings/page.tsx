'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Profile, Project, GitHubRepo } from '@/types';
import { useTheme } from '@/components/providers/theme-provider';
import { ROLE_TEMPLATES, RoleCategory } from '@/lib/role-templates';
import {
  Settings as SettingsIcon,
  User,
  Image,
  Save,
  CheckCircle2,
  Upload,
  AlertCircle,
  Sun,
  Moon,
  GitBranch,
  RefreshCw,
  Trash2,
  Link as LinkIcon,
  Bell,
  Palette,
  CheckSquare,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'account' | 'template' | 'theme' | 'github' | 'notifications'>('account');

  const [profile, setProfile] = useState<Profile | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [connectedRepos, setConnectedRepos] = useState<GitHubRepo[]>([]);

  const [fullName, setFullName] = useState('');
  const [title, setTitle] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [timezone, setTimezone] = useState('Asia/Kolkata');

  // Work Role Template Choice
  const [selectedRoleTemplate, setSelectedRoleTemplate] = useState<RoleCategory>('hybrid');

  // GitHub Integration Form State
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [repoName, setRepoName] = useState('');
  const [githubToken, setGithubToken] = useState('');
  const [connectingRepo, setConnectingRepo] = useState(false);
  const [syncingRepoId, setSyncingRepoId] = useState<string | null>(null);

  // Notification Preferences State
  const [dailyReminders, setDailyReminders] = useState(true);
  const [mentionAlerts, setMentionAlerts] = useState(true);
  const [eodSummaries, setEodSummaries] = useState(true);

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const { theme, setTheme } = useTheme();
  const supabase = createClient();

  useEffect(() => {
    fetchProfileAndIntegrations();
    const savedTemplate = (localStorage.getItem('relentive_checklist_role') as RoleCategory) || 'hybrid';
    setSelectedRoleTemplate(savedTemplate);
  }, []);

  const fetchProfileAndIntegrations = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      if (prof) {
        setProfile(prof as Profile);
        setFullName(prof.full_name || '');
        setTitle(prof.title || '');
        setAvatarUrl(prof.avatar_url || '');
        setTimezone(prof.timezone || 'Asia/Kolkata');
      }

      const { data: projData } = await supabase.from('projects').select('*');
      if (projData) setProjects(projData as Project[]);

      let { data: repoData, error: repoErr } = await supabase
        .from('github_repos')
        .select('*, project:projects(*)');

      if (repoErr) {
        console.warn('GitHub repos query warning:', repoErr.message);
      }
      if (repoData) setConnectedRepos(repoData as any);
    } catch (err) {
      console.error('Fetch profile/integrations error:', err);
    }
  };

  const handleRoleTemplateChange = (roleKey: RoleCategory) => {
    setSelectedRoleTemplate(roleKey);
    localStorage.setItem('relentive_checklist_role', roleKey);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleConnectGitHubRepo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId || !repoName || !githubToken) {
      setErrorMsg('Please select a project, enter repo name and access token.');
      return;
    }

    setConnectingRepo(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const { data: newRepo, error } = await supabase
        .from('github_repos')
        .insert({
          project_id: selectedProjectId,
          repo_name: repoName.trim(),
          github_token: githubToken.trim(),
        })
        .select('*')
        .single();

      if (error) throw new Error(error.message);

      if (newRepo) {
        await fetch('/api/github/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ repo_id: newRepo.id }),
        });

        setSuccessMsg(`Successfully connected ${repoName} & backfilled commits!`);
        setRepoName('');
        setGithubToken('');
        fetchProfileAndIntegrations();
      }
    } catch (err: any) {
      console.error('Connect repo error:', err);
      setErrorMsg(err.message || 'Failed to connect repository.');
    }
    setConnectingRepo(false);
  };

  const handleSyncNow = async (repoId: string) => {
    setSyncingRepoId(repoId);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/github/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo_id: repoId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sync failed');

      setSuccessMsg(data.message || 'Commits synced cleanly!');
      fetchProfileAndIntegrations();
    } catch (err: any) {
      console.error('Sync error:', err);
      setErrorMsg(err.message || 'Sync failed');
    }
    setSyncingRepoId(null);
  };

  const handleDeleteRepo = async (repoId: string) => {
    if (!confirm('Are you sure you want to disconnect this repository?')) return;
    setConnectedRepos((prev) => prev.filter((r) => r.id !== repoId));
    await supabase.from('github_repos').delete().eq('id', repoId);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-[#E10600]" />
          Workspace Settings Panel
        </h1>
        <p className="text-xs text-[#A3A3A3] mt-1">
          Organized settings control panel for account identity, work role templates, GitHub & preferences.
        </p>
      </div>

      {saved && (
        <div className="p-3 bg-emerald-950/40 border border-emerald-500 text-emerald-300 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Settings saved successfully!</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-emerald-950/40 border border-emerald-500 text-emerald-300 rounded-xl text-xs flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-[#7A0000]/30 border border-[#E10600] text-red-200 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-[#E10600] shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Structured Settings Layout */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
        {/* Settings Navigation Sidebar */}
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-2 shadow-xl space-y-1">
          <button
            onClick={() => setActiveTab('account')}
            className={`w-full p-2.5 rounded-lg text-xs font-bold flex items-center gap-2.5 transition ${
              activeTab === 'account'
                ? 'bg-[#E10600] text-white shadow-md'
                : 'text-[#A3A3A3] hover:text-white hover:bg-[#0A0A0A]'
            }`}
          >
            <User className="w-4 h-4" /> Account & Profile
          </button>

          <button
            onClick={() => setActiveTab('template')}
            className={`w-full p-2.5 rounded-lg text-xs font-bold flex items-center gap-2.5 transition ${
              activeTab === 'template'
                ? 'bg-[#E10600] text-white shadow-md'
                : 'text-[#A3A3A3] hover:text-white hover:bg-[#0A0A0A]'
            }`}
          >
            <CheckSquare className="w-4 h-4" /> Role & Daily Checklist
          </button>

          <button
            onClick={() => setActiveTab('theme')}
            className={`w-full p-2.5 rounded-lg text-xs font-bold flex items-center gap-2.5 transition ${
              activeTab === 'theme'
                ? 'bg-[#E10600] text-white shadow-md'
                : 'text-[#A3A3A3] hover:text-white hover:bg-[#0A0A0A]'
            }`}
          >
            <Palette className="w-4 h-4" /> Theme & Appearance
          </button>

          <button
            onClick={() => setActiveTab('github')}
            className={`w-full p-2.5 rounded-lg text-xs font-bold flex items-center gap-2.5 transition ${
              activeTab === 'github'
                ? 'bg-[#E10600] text-white shadow-md'
                : 'text-[#A3A3A3] hover:text-white hover:bg-[#0A0A0A]'
            }`}
          >
            <GitBranch className="w-4 h-4" /> GitHub & Integrations
          </button>

          <button
            onClick={() => setActiveTab('notifications')}
            className={`w-full p-2.5 rounded-lg text-xs font-bold flex items-center gap-2.5 transition ${
              activeTab === 'notifications'
                ? 'bg-[#E10600] text-white shadow-md'
                : 'text-[#A3A3A3] hover:text-white hover:bg-[#0A0A0A]'
            }`}
          >
            <Bell className="w-4 h-4" /> Notifications
          </button>
        </div>

        {/* Tab 1: Account Profile Settings */}
        {activeTab === 'account' && (
          <form onSubmit={handleSaveSettings} className="md:col-span-3 bg-[#141414] border border-[#262626] rounded-xl p-6 shadow-2xl space-y-6">
            <div className="border-b border-[#262626] pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <User className="w-4 h-4 text-[#E10600]" /> Account Profile & Identity
              </h3>
              <p className="text-xs text-[#A3A3A3]">Manage your name, job title, timezone, and profile picture avatar.</p>
            </div>

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
        )}

        {/* Tab 2: Work Role & Daily Checklist Template */}
        {activeTab === 'template' && (
          <div className="md:col-span-3 bg-[#141414] border border-[#262626] rounded-xl p-6 shadow-2xl space-y-5">
            <div className="border-b border-[#262626] pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-[#E10600]" /> Work Role & Daily Checklist Template
              </h3>
              <p className="text-xs text-[#A3A3A3]">
                Select your primary agency role. Your choice is remembered and populates your daily checklist automatically every day.
              </p>
            </div>

            <div className="space-y-3">
              {(Object.keys(ROLE_TEMPLATES) as RoleCategory[]).map((roleKey) => {
                const tmpl = ROLE_TEMPLATES[roleKey];
                const Icon = tmpl.icon;
                const isSelected = selectedRoleTemplate === roleKey;

                return (
                  <button
                    key={roleKey}
                    type="button"
                    onClick={() => handleRoleTemplateChange(roleKey)}
                    className={`w-full p-4 rounded-xl border text-left flex items-start gap-4 transition ${
                      isSelected
                        ? 'bg-[#0A0A0A] border-[#E10600] shadow-xl shadow-[#E10600]/10 ring-1 ring-[#E10600]'
                        : 'bg-[#0A0A0A] border-[#262626] hover:border-[#737373]'
                    }`}
                  >
                    <div className={`p-2.5 rounded-lg border shrink-0 ${isSelected ? 'bg-[#E10600]/20 border-[#E10600] text-[#E10600]' : 'bg-[#141414] border-[#262626] text-[#737373]'}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="space-y-0.5 flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-white">{tmpl.name}</h4>
                        {isSelected && (
                          <span className="text-[10px] font-bold text-white bg-[#E10600] px-2 py-0.5 rounded shadow">
                            Active Template
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#A3A3A3]">{tmpl.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 3: Theme & Appearance */}
        {activeTab === 'theme' && (
          <div className="md:col-span-3 bg-[#141414] border border-[#262626] rounded-xl p-6 shadow-2xl space-y-5">
            <div className="border-b border-[#262626] pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Palette className="w-4 h-4 text-[#E10600]" /> Workspace Color Theme
              </h3>
              <p className="text-xs text-[#A3A3A3]">Switch between sleek Dark Mode and White & Red Light Mode.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`p-5 rounded-xl border text-left space-y-2 transition ${
                  theme === 'dark'
                    ? 'bg-[#0A0A0A] border-[#E10600] shadow-xl shadow-[#E10600]/10'
                    : 'bg-[#0A0A0A] border-[#262626] hover:border-[#737373]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <Moon className="w-5 h-5 text-[#E10600]" />
                  {theme === 'dark' && <span className="text-[10px] font-bold text-[#E10600] bg-[#E10600]/10 px-2 py-0.5 rounded">Active</span>}
                </div>
                <h4 className="text-xs font-bold text-white">Dark Mode (Default)</h4>
                <p className="text-[11px] text-[#A3A3A3]">Deep #0A0A0A background with crisp dark cards and red accents.</p>
              </button>

              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`p-5 rounded-xl border text-left space-y-2 transition ${
                  theme === 'light'
                    ? 'bg-white border-[#E10600] shadow-xl shadow-[#E10600]/10 text-slate-900'
                    : 'bg-[#0A0A0A] border-[#262626] hover:border-[#737373]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <Sun className="w-5 h-5 text-[#E10600]" />
                  {theme === 'light' && <span className="text-[10px] font-bold text-[#E10600] bg-[#E10600]/10 px-2 py-0.5 rounded">Active</span>}
                </div>
                <h4 className="text-xs font-bold text-white">Light Mode (White & Red)</h4>
                <p className="text-[11px] text-[#A3A3A3]">Clean white & light grey theme with signature red accents.</p>
              </button>
            </div>
          </div>
        )}

        {/* Tab 4: GitHub & Integrations */}
        {activeTab === 'github' && (
          <div className="md:col-span-3 bg-[#141414] border border-[#262626] rounded-xl p-6 shadow-2xl space-y-5">
            <div className="border-b border-[#262626] pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-[#E10600]" /> GitHub Repository Integrations
              </h3>
              <p className="text-xs text-[#A3A3A3]">Connect GitHub repos, auto-sync commit SHAs, and manage webhooks.</p>
            </div>

            {/* Connected Repositories List */}
            {connectedRepos.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Connected Repositories</h4>
                <div className="divide-y divide-[#262626] border border-[#262626] rounded-xl overflow-hidden bg-[#0A0A0A]">
                  {connectedRepos.map((repo) => (
                    <div key={repo.id} className="p-3.5 flex items-center justify-between gap-3 text-xs">
                      <div className="space-y-0.5">
                        <span className="font-mono font-bold text-[#E10600] flex items-center gap-1.5">
                          <GitBranch className="w-3.5 h-3.5 text-white" /> {repo.repo_name}
                        </span>
                        <p className="text-[10px] text-[#A3A3A3]">
                          Project: <strong>{repo.project?.name || 'General'}</strong> | Last Synced: {repo.last_synced_at ? formatDate(repo.last_synced_at) : 'Never'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleSyncNow(repo.id)}
                          disabled={syncingRepoId === repo.id}
                          className="px-3 py-1 bg-[#141414] hover:bg-[#262626] border border-[#262626] text-white text-xs font-semibold rounded-lg transition flex items-center gap-1"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 text-[#E10600] ${syncingRepoId === repo.id ? 'animate-spin' : ''}`} />
                          {syncingRepoId === repo.id ? 'Syncing...' : 'Sync Commits Now'}
                        </button>
                        <button
                          onClick={() => handleDeleteRepo(repo.id)}
                          title="Disconnect Repo"
                          className="p-1 text-[#737373] hover:text-[#FF3B3B] hover:bg-[#262626] rounded transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Connect New Repository Form */}
            <form onSubmit={handleConnectGitHubRepo} className="p-4 bg-[#0A0A0A] border border-[#262626] rounded-xl space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5 text-[#E10600]" /> Connect New GitHub Repository
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#A3A3A3] mb-1">Target Project</label>
                  <select
                    required
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full bg-[#141414] border border-[#262626] text-white rounded-lg p-2 text-xs outline-none"
                  >
                    <option value="">Select Project...</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#A3A3A3] mb-1">Repository Name (org/repo)</label>
                  <input
                    type="text"
                    required
                    value={repoName}
                    onChange={(e) => setRepoName(e.target.value)}
                    placeholder="edrinmathew1/relentivelabs-cowork"
                    className="w-full bg-[#141414] border border-[#262626] focus:border-[#E10600] rounded-lg p-2 text-xs text-white outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#A3A3A3] mb-1">GitHub Personal Access Token (repo read scope)</label>
                <input
                  type="password"
                  required
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  className="w-full bg-[#141414] border border-[#262626] focus:border-[#E10600] rounded-lg p-2 text-xs text-white outline-none font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={connectingRepo}
                className="px-4 py-2 bg-[#E10600] hover:bg-[#FF3B3B] text-white text-xs font-bold rounded-lg shadow-md shadow-[#E10600]/20 flex items-center gap-1.5 transition"
              >
                <GitBranch className="w-4 h-4" /> {connectingRepo ? 'Connecting & Syncing...' : 'Connect GitHub Repo & Backfill'}
              </button>
            </form>
          </div>
        )}

        {/* Tab 5: Notifications & Preferences */}
        {activeTab === 'notifications' && (
          <div className="md:col-span-3 bg-[#141414] border border-[#262626] rounded-xl p-6 shadow-2xl space-y-5">
            <div className="border-b border-[#262626] pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#E10600]" /> Notifications & Email Preferences
              </h3>
              <p className="text-xs text-[#A3A3A3]">Customize your daily reminders, @mention alerts, and EOD digests.</p>
            </div>

            <div className="space-y-3">
              <label className="flex items-center justify-between p-3.5 bg-[#0A0A0A] border border-[#262626] rounded-xl cursor-pointer">
                <div>
                  <h4 className="text-xs font-bold text-white">Daily Standup Reminders</h4>
                  <p className="text-[11px] text-[#A3A3A3]">Receive automated morning standup reminders at 9:00 AM.</p>
                </div>
                <input
                  type="checkbox"
                  checked={dailyReminders}
                  onChange={() => setDailyReminders(!dailyReminders)}
                  className="w-4 h-4 accent-[#E10600] rounded"
                />
              </label>

              <label className="flex items-center justify-between p-3.5 bg-[#0A0A0A] border border-[#262626] rounded-xl cursor-pointer">
                <div>
                  <h4 className="text-xs font-bold text-white">@Mention & Comment Alerts</h4>
                  <p className="text-[11px] text-[#A3A3A3]">Get instant alerts when teammates mention you in task comments.</p>
                </div>
                <input
                  type="checkbox"
                  checked={mentionAlerts}
                  onChange={() => setMentionAlerts(!mentionAlerts)}
                  className="w-4 h-4 accent-[#E10600] rounded"
                />
              </label>

              <label className="flex items-center justify-between p-3.5 bg-[#0A0A0A] border border-[#262626] rounded-xl cursor-pointer">
                <div>
                  <h4 className="text-xs font-bold text-white">End of Day Work Log Summaries</h4>
                  <p className="text-[11px] text-[#A3A3A3]">Receive automated EOD reminder to submit your work log.</p>
                </div>
                <input
                  type="checkbox"
                  checked={eodSummaries}
                  onChange={() => setEodSummaries(!eodSummaries)}
                  className="w-4 h-4 accent-[#E10600] rounded"
                />
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
