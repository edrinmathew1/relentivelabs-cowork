import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: Request) {
  try {
    const supabase = createAdminClient();

    // Strict 7-Day Calendar Week Window
    const now = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);

    const startDateStr = sevenDaysAgo.toISOString().split('T')[0];
    const endDateStr = now.toISOString().split('T')[0];

    // Fetch Tasks completed during this strict 7-day week
    const { data: tasks } = await supabase
      .from('tasks')
      .select('*, project:projects(*), assignee:profiles!assignee_id(*)');

    const recentDoneTasks = (tasks || []).filter((t) => {
      if (t.status !== 'done' || !t.updated_at) return false;
      const updatedDate = new Date(t.updated_at);
      return updatedDate >= sevenDaysAgo && updatedDate <= now;
    });

    // Fetch GitHub Commits pushed during this 7-day week
    let { data: commits } = await supabase
      .from('github_commits')
      .select('*')
      .order('committed_at', { ascending: false });

    const recentCommits = (commits || []).filter((c) => {
      const commitDate = new Date(c.committed_at);
      return commitDate >= sevenDaysAgo && commitDate <= now;
    });

    // Fetch Goals & Projects
    const { data: goals } = await supabase.from('goals').select('*');
    const { data: projects } = await supabase.from('projects').select('*');

    // Build Weekly Markdown Report Content
    const reportTitle = `Weekly Agency Executive Report (${startDateStr} to ${endDateStr})`;

    let markdown = `# ${reportTitle}\n\n`;
    markdown += `**Report Period**: Strict 7-Day Cycle (${startDateStr} — ${endDateStr})\n`;
    markdown += `**Generated At**: ${now.toUTCString()}\n\n`;

    markdown += `--- \n\n`;
    markdown += `## 🚀 7-Day Executive Metric Highlights\n\n`;
    markdown += `- **Tasks Shipped This 7-Day Week**: **${recentDoneTasks.length}** completed tasks\n`;
    markdown += `- **GitHub Code Commits**: **${recentCommits.length}** code commits pushed\n`;
    markdown += `- **Active Client Projects**: **${(projects || []).length}** product tracks\n`;
    markdown += `- **OKR Goals Tracked**: **${(goals || []).length}** objectives\n\n`;

    markdown += `--- \n\n`;
    markdown += `## 🛠️ Tasks Completed in Past 7 Days\n\n`;
    if (recentDoneTasks.length === 0) {
      markdown += `*No tasks marked done during this 7-day week.*\n\n`;
    } else {
      recentDoneTasks.forEach((t) => {
        markdown += `- **${t.title}** (${t.project?.name || 'General'}) — Completed by **${t.assignee?.full_name || 'Team Member'}**\n`;
      });
      markdown += `\n`;
    }

    markdown += `--- \n\n`;
    markdown += `## 🐙 Code Activity (Past 7 Days)\n\n`;
    if (recentCommits.length === 0) {
      markdown += `*No code commits logged during this 7-day week.*\n\n`;
    } else {
      recentCommits.slice(0, 20).forEach((c) => {
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
        markdown += `- **${g.title}**: Progress: **${g.progress}%** (${g.current_value}/${g.target_value}) — Status: \`${g.status}\`\n`;
      });
      markdown += `\n`;
    }

    // Save Generated Weekly Report Document to Docs Table
    const { data: newDoc } = await supabase
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
      message: `Weekly 7-Day Executive Report (${startDateStr} - ${endDateStr}) generated & saved into Docs!`,
    });
  } catch (err: any) {
    console.error('Weekly report error:', err);
    return NextResponse.json({ error: err.message || 'Report generation failed' }, { status: 500 });
  }
}
