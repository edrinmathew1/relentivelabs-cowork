import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: Request) {
  try {
    const supabase = createAdminClient();

    // Past 7 Days
    const now = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);

    const startDateStr = sevenDaysAgo.toISOString().split('T')[0];
    const endDateStr = now.toISOString().split('T')[0];

    // Fetch Completed Tasks
    const { data: tasks } = await supabase.from('tasks').select('*, project:projects(*), assignee:profiles!assignee_id(*)');
    const completedTasks = (tasks || []).filter((t) => t.status === 'done');
    const recentDoneTasks = (tasks || []).filter((t) => {
      if (t.status !== 'done' || !t.updated_at) return false;
      return new Date(t.updated_at) >= sevenDaysAgo;
    });

    // Fetch GitHub Commits
    let { data: commits } = await supabase.from('github_commits').select('*').order('committed_at', { ascending: false });
    const recentCommits = (commits || []).filter((c) => new Date(c.committed_at) >= sevenDaysAgo);

    // Fetch Goals & Projects
    const { data: goals } = await supabase.from('goals').select('*');
    const { data: projects } = await supabase.from('projects').select('*');

    // Build Weekly Markdown Report Content
    const reportTitle = `Weekly Agency Executive Report (${startDateStr} to ${endDateStr})`;

    let markdown = `# ${reportTitle}\n\n`;
    markdown += `**Generated**: ${new Date().toUTCString()}\n`;
    markdown += `**Agency Target Period**: ${startDateStr} — ${endDateStr}\n\n`;

    markdown += `--- \n\n`;
    markdown += `## 🚀 Executive Highlights & Key Metric Summary\n\n`;
    markdown += `- **Tasks Completed This Week**: **${recentDoneTasks.length}** tasks shipped\n`;
    markdown += `- **GitHub Code Commits**: **${recentCommits.length}** commits pushed across repositories\n`;
    markdown += `- **Active Client Projects**: **${(projects || []).length}** active product tracks\n`;
    markdown += `- **OKR Goals Tracked**: **${(goals || []).length}** company objectives\n\n`;

    markdown += `--- \n\n`;
    markdown += `## 🛠️ Tasks Shipped This Week\n\n`;
    if (recentDoneTasks.length === 0) {
      markdown += `*No tasks marked done in the past 7 days.*\n\n`;
    } else {
      recentDoneTasks.forEach((t) => {
        markdown += `- **${t.title}** (${t.project?.name || 'General'}) — Assigned to **${t.assignee?.full_name || 'Unassigned'}**\n`;
      });
      markdown += `\n`;
    }

    markdown += `--- \n\n`;
    markdown += `## 🐙 GitHub Code Activity Feed (Past 7 Days)\n\n`;
    if (recentCommits.length === 0) {
      markdown += `*No code commits logged during this 7-day period.*\n\n`;
    } else {
      recentCommits.slice(0, 15).forEach((c) => {
        markdown += `- \`${c.commit_sha.substring(0, 7)}\`: **${c.message}** — by *${c.author_name || 'Developer'}*\n`;
      });
      markdown += `\n`;
    }

    markdown += `--- \n\n`;
    markdown += `## 🎯 OKR Goals & Progress Toward Targets\n\n`;
    if (!goals || goals.length === 0) {
      markdown += `*No company OKR goals created yet.*\n\n`;
    } else {
      goals.forEach((g) => {
        markdown += `- **${g.title}**: Current Progress: **${g.progress}%** (${g.current_value}/${g.target_value}) — Status: \`${g.status}\`\n`;
      });
      markdown += `\n`;
    }

    // Insert Report Into Docs Table
    const { data: newDoc, error } = await supabase
      .from('docs')
      .insert({
        title: reportTitle,
        content: `<div style="font-family: monospace; white-space: pre-wrap; background: #0A0A0A; padding: 16px; border-radius: 12px; border: 1px solid #262626; line-height: 1.6;">${markdown}</div>`,
        category: 'general',
      })
      .select('*')
      .single();

    return NextResponse.json({
      success: true,
      reportTitle,
      markdown,
      docId: newDoc?.id,
      message: 'Weekly Executive Report generated and saved into Docs!',
    });
  } catch (err: any) {
    console.error('Weekly report error:', err);
    return NextResponse.json({ error: err.message || 'Report generation failed' }, { status: 500 });
  }
}
