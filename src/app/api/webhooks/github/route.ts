import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: Request) {
  try {
    const payload = await req.json();

    // Check if event is push
    if (!payload.commits || !Array.isArray(payload.commits)) {
      return NextResponse.json({ message: 'No push commits in payload' }, { status: 200 });
    }

    const repoFullName = payload.repository?.full_name; // e.g. "edrinmathew1/relentivelabs-cowork"
    if (!repoFullName) {
      return NextResponse.json({ error: 'Repository name missing' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Find connected repo row
    const { data: repos } = await supabase
      .from('github_repos')
      .select('*')
      .ilike('repo_name', repoFullName);

    if (!repos || repos.length === 0) {
      return NextResponse.json({ message: 'Repo not registered in CoWork' }, { status: 200 });
    }

    const repo = repos[0];
    const { data: allTasks } = await supabase.from('tasks').select('id, title');

    let insertedCount = 0;

    for (const item of payload.commits) {
      const sha = item.id;
      const message = item.message || '';
      const authorName = item.author?.name || item.committer?.name || 'Developer';
      const authorEmail = item.author?.email || '';
      const commitUrl = item.url || `https://github.com/${repoFullName}/commit/${sha}`;
      const committedAt = item.timestamp || new Date().toISOString();

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

      const { error } = await supabase.from('github_commits').upsert(
        {
          repo_id: repo.id,
          commit_sha: sha,
          message,
          author_name: authorName,
          author_email: authorEmail,
          commit_url: commitUrl,
          linked_task_id: matchedTaskId,
          committed_at: committedAt,
        },
        { onConflict: 'commit_sha' }
      );

      if (!error) {
        insertedCount++;
        if (matchedTaskId) {
          await supabase.from('task_activity_log').insert({
            task_id: matchedTaskId,
            action: `GitHub Push Commit: ${sha.substring(0, 7)}`,
            meta: { sha, message, commitUrl, authorName },
          });
        }
      }
    }

    await supabase.from('github_repos').update({ last_synced_at: new Date().toISOString() }).eq('id', repo.id);

    return NextResponse.json({ success: true, insertedCount });
  } catch (err: any) {
    console.error('GitHub Webhook error:', err);
    return NextResponse.json({ error: err.message || 'Webhook error' }, { status: 500 });
  }
}
