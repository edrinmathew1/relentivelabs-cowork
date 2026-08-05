'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { GitHubCommit, GitHubRepo, Project } from '@/types';
import { GitBranch, GitCommit, ExternalLink, RefreshCw, Layers, Users, Calendar, Plus, Link as LinkIcon } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';

export default function CodebasePage() {
  const [commits, setCommits] = useState<GitHubCommit[]>([]);
  const [connectedRepos, setConnectedRepos] = useState<GitHubRepo[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingRepoId, setSyncingRepoId] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    fetchCodebaseData();
  }, []);

  const fetchCodebaseData = async () => {
    setLoading(true);
    try {
      let { data: repoData } = await supabase
        .from('github_repos')
        .select('*, project:projects(*)');

      if (repoData) setConnectedRepos(repoData as any);

      let { data: commitData, error } = await supabase
        .from('github_commits')
        .select('*, linked_task:tasks(*)')
        .order('committed_at', { ascending: false });

      if (error) console.warn('Fetch commits warning:', error.message);
      if (commitData) setCommits(commitData as any);
    } catch (err) {
      console.error('Fetch codebase error:', err);
    }
    setLoading(false);
  };

  const handleSyncAllCommits = async (repoId?: string) => {
    setSyncingRepoId(repoId || 'all');
    try {
      await fetch('/api/github/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(repoId ? { repo_id: repoId } : {}),
      });
      await fetchCodebaseData();
    } catch (err) {
      console.error('Sync commits error:', err);
    }
    setSyncingRepoId(null);
  };

  // Compute stats
  const uniqueAuthors = new Set(commits.map((c) => c.author_name || c.author_email)).size;

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <GitBranch className="w-6 h-6 text-[#E10600]" />
            Codebase & GitHub Activity Hub
          </h1>
          <p className="text-xs text-[#A3A3A3] mt-1">
            Track code commits, repository pull requests & automated task linking across agency codebases.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start">
          <button
            onClick={() => handleSyncAllCommits()}
            disabled={syncingRepoId === 'all'}
            className="bg-[#141414] hover:bg-[#262626] border border-[#262626] text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#E10600] ${syncingRepoId === 'all' ? 'animate-spin' : ''}`} />
            {syncingRepoId === 'all' ? 'Syncing...' : 'Sync All Commits'}
          </button>

          <Link
            href="/settings"
            className="bg-[#E10600] hover:bg-[#FF3B3B] text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 shadow-lg shadow-[#E10600]/20 transition"
          >
            <Plus className="w-4 h-4" /> Connect Repository
          </Link>
        </div>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-[#141414] border border-[#262626] rounded-xl shadow-lg space-y-1">
          <div className="flex items-center justify-between text-xs text-[#A3A3A3]">
            <span>Connected Repositories</span>
            <GitBranch className="w-4 h-4 text-[#E10600]" />
          </div>
          <div className="text-2xl font-extrabold text-white">{connectedRepos.length}</div>
          <span className="text-[10px] text-emerald-400">Active GitHub repos</span>
        </div>

        <div className="p-4 bg-[#141414] border border-[#262626] rounded-xl shadow-lg space-y-1">
          <div className="flex items-center justify-between text-xs text-[#A3A3A3]">
            <span>Total Synced Commits</span>
            <GitCommit className="w-4 h-4 text-[#E10600]" />
          </div>
          <div className="text-2xl font-extrabold text-[#FF3B3B]">{commits.length}</div>
          <span className="text-[10px] text-[#A3A3A3]">Realtime tracked</span>
        </div>

        <div className="p-4 bg-[#141414] border border-[#262626] rounded-xl shadow-lg space-y-1">
          <div className="flex items-center justify-between text-xs text-[#A3A3A3]">
            <span>Active Contributors</span>
            <Users className="w-4 h-4 text-[#E10600]" />
          </div>
          <div className="text-2xl font-extrabold text-white">{uniqueAuthors}</div>
          <span className="text-[10px] text-[#A3A3A3]">GitHub authors logged</span>
        </div>

        <div className="p-4 bg-[#141414] border border-[#262626] rounded-xl shadow-lg space-y-1">
          <div className="flex items-center justify-between text-xs text-[#A3A3A3]">
            <span>Linked Tasks</span>
            <Layers className="w-4 h-4 text-[#E10600]" />
          </div>
          <div className="text-2xl font-extrabold text-[#FF3B3B]">
            {commits.filter((c) => c.linked_task_id).length}
          </div>
          <span className="text-[10px] text-[#A3A3A3]">Auto-linked task commits</span>
        </div>
      </div>

      {/* Connected Repositories Banner */}
      {connectedRepos.length > 0 && (
        <div className="p-4 bg-[#141414] border border-[#262626] rounded-xl space-y-2">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Connected Repositories</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {connectedRepos.map((repo) => (
              <div key={repo.id} className="p-3 bg-[#0A0A0A] border border-[#262626] rounded-lg flex items-center justify-between text-xs">
                <div>
                  <span className="font-mono font-bold text-[#E10600] flex items-center gap-1.5">
                    <GitBranch className="w-3.5 h-3.5 text-white" /> {repo.repo_name}
                  </span>
                  <p className="text-[10px] text-[#A3A3A3] mt-0.5">
                    Project: {repo.project?.name || 'General'}
                  </p>
                </div>
                <button
                  onClick={() => handleSyncAllCommits(repo.id)}
                  disabled={syncingRepoId === repo.id}
                  className="p-1.5 text-[#A3A3A3] hover:text-[#E10600] hover:bg-[#141414] rounded transition"
                  title="Sync repo commits"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncingRepoId === repo.id ? 'animate-spin' : ''}`} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chronological Live GitHub Code Feed */}
      <div className="bg-[#141414] border border-[#262626] rounded-xl p-5 shadow-2xl space-y-4">
        <div className="border-b border-[#262626] pb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <GitCommit className="w-4 h-4 text-[#E10600]" />
            All Repository Commits Feed
          </h3>
          <p className="text-xs text-[#A3A3A3] mt-0.5">
            Chronological stream of incoming code commits pushed across all registered repositories.
          </p>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-[#737373] animate-pulse">Loading commits stream...</div>
        ) : commits.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#737373] bg-[#0A0A0A] border border-[#262626] rounded-xl space-y-2">
            <GitBranch className="w-8 h-8 text-[#737373] mx-auto" />
            <p className="font-bold text-white">No GitHub Commits Synced Yet</p>
            <p>Connect your repository in Settings to start tracking code commits automatically.</p>
            <Link href="/settings" className="inline-block mt-2 px-4 py-2 bg-[#E10600] text-white font-bold text-xs rounded-lg">
              Connect Repository in Settings
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {commits.map((c) => (
              <div key={c.id} className="p-4 bg-[#0A0A0A] border border-[#262626] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#141414] border border-[#E10600] flex items-center justify-center shrink-0 overflow-hidden shadow">
                    {c.author_avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.author_avatar_url} alt={c.author_name || 'Author'} className="w-full h-full object-cover" />
                    ) : (
                      <GitCommit className="w-4 h-4 text-[#E10600]" />
                    )}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[#E10600] font-bold bg-[#E10600]/10 border border-[#E10600]/30 px-2 py-0.5 rounded">
                        {c.commit_sha.substring(0, 7)}
                      </span>
                      <span className="font-bold text-white">{c.message}</span>

                      {c.linked_task && (
                        <span className="text-[10px] bg-emerald-950/50 text-emerald-400 border border-emerald-500/50 px-2 py-0.5 rounded font-mono">
                          Linked: {c.linked_task.title}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-[#A3A3A3] mt-1">
                      Pushed by <strong>{c.author_name || 'Developer'}</strong> ({c.author_email || 'No email'}) • {formatDate(c.committed_at)}
                    </p>
                  </div>
                </div>

                {c.commit_url && (
                  <a
                    href={c.commit_url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-[#141414] hover:bg-[#262626] border border-[#262626] text-white text-xs font-semibold rounded-lg transition flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
                  >
                    View Diff <ExternalLink className="w-3.5 h-3.5 text-[#E10600]" />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
