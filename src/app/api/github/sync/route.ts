import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: Request) {
  try {
    const { repo_id, project_id } = await req.json();

    const supabase = createAdminClient();

    let query = supabase.from('github_repos').select('*');
    if (repo_id) {
      query = query.eq('id', repo_id);
    } else if (project_id) {
      query = query.eq('project_id', project_id);
    }

    const { data: repos, error: repoErr } = await query;
    if (repoErr || !repos || repos.length === 0) {
      return NextResponse.json({ error: 'No GitHub repository found connected for this project.' }, { status: 404 });
    }

    const repo = repos[0];
    const repoName = repo.repo_name.trim(); // e.g. "edrinmathew1/relentive-edtech"
    const token = repo.github_token.trim();

    if (!repoName.includes('/')) {
      return NextResponse.json(
        { error: `Invalid repo format "${repoName}". Must be "owner/repository" (e.g. edrinmathew1/${repoName})` },
        { status: 400 }
      );
    }

    // Fetch commits from GitHub REST API
    const response = await fetch(`https://api.github.com/repos/${repoName}/commits?per_page=50`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'RelentiveLabs-CoWork',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GitHub API error:', response.status, errorText);

      if (response.status === 409) {
        // HTTP 409 Conflict means the repository is empty (has 0 commits pushed yet)
        await supabase.from('github_repos').update({ last_synced_at: new Date().toISOString() }).eq('id', repo.id);
        return NextResponse.json({
          success: true,
          syncedCount: 0,
          message: `Connected ${repoName}! Repository is empty (0 commits pushed yet). Push your first commit to see code activity!`,
        });
      }

      if (response.status === 404) {
        return NextResponse.json(
          {
            error: `GitHub returned 404 Not Found for "${repoName}". Make sure the repository name is in "owner/repo" format (e.g. edrinmathew1/relentive-edtech) AND your token has access to this repo!`,
          },
          { status: 404 }
        );
      }
      return NextResponse.json({ error: `GitHub API error (${response.status}): ${response.statusText}` }, { status: response.status });
    }

    const commitsData = await response.json();

    // Fetch existing tasks for automatic task linking
    const { data: allTasks } = await supabase.from('tasks').select('id, title, project_id');

    let syncedCount = 0;

    for (const item of commitsData) {
      const sha = item.sha;
      const message = item.commit?.message || '';
      const authorName = item.commit?.author?.name || item.author?.login || 'Developer';
      const authorEmail = item.commit?.author?.email || '';
      const authorAvatar = item.author?.avatar_url || '';
      const commitUrl = item.html_url || `https://github.com/${repoName}/commit/${sha}`;
      const committedAt = item.commit?.author?.date || new Date().toISOString();

      let matchedTaskId: string | null = null;

      if (allTasks) {
        for (const task of allTasks) {
          const shortId = task.id.split('-')[0];
          if (
            message.toLowerCase().includes(task.id.toLowerCase()) ||
            message.toLowerCase().includes(shortId.toLowerCase()) ||
            message.toLowerCase().includes(`task-${shortId.toLowerCase()}`)
          ) {
            matchedTaskId = task.id;
            break;
          }
        }
      }

      const { error: insertErr } = await supabase.from('github_commits').upsert(
        {
          repo_id: repo.id,
          commit_sha: sha,
          message,
          author_name: authorName,
          author_email: authorEmail,
          author_avatar_url: authorAvatar,
          commit_url: commitUrl,
          linked_task_id: matchedTaskId,
          committed_at: committedAt,
        },
        { onConflict: 'commit_sha' }
      );

      if (!insertErr) {
        syncedCount++;
        if (matchedTaskId) {
          await supabase.from('task_activity_log').insert({
            task_id: matchedTaskId,
            action: `GitHub Commit Linked: ${sha.substring(0, 7)}`,
            meta: { sha, message, commitUrl, authorName },
          });
        }
      }
    }

    await supabase.from('github_repos').update({ last_synced_at: new Date().toISOString() }).eq('id', repo.id);

    return NextResponse.json({
      success: true,
      syncedCount,
      message: `Successfully synced ${syncedCount} commits from ${repoName}!`,
    });
  } catch (err: any) {
    console.error('GitHub Sync API error:', err);
    return NextResponse.json({ error: err.message || 'Sync failed' }, { status: 500 });
  }
}
