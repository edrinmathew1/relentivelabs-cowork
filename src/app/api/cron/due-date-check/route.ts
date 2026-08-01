import { NextResponse } from 'next/server';
import { verifyCronSecret } from '@/lib/cron-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendBrandedEmail } from '@/lib/resend';

export async function GET(req: Request) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized. Invalid CRON_SECRET.' }, { status: 401 });
  }

  const supabase = createAdminClient();

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  const todayStr = new Date().toISOString().split('T')[0];

  // Fetch tasks due tomorrow or overdue and not completed
  const { data: pendingTasks } = await supabase
    .from('tasks')
    .select('*, assignee:profiles(*)')
    .neq('status', 'done')
    .lte('due_date', tomorrowStr);

  if (!pendingTasks) return NextResponse.json({ processed: 0 });

  let count = 0;
  for (const task of pendingTasks) {
    if (task.assignee?.email) {
      const isOverdue = task.due_date && task.due_date < todayStr;
      const titlePrefix = isOverdue ? 'OVERDUE TASK' : 'Task Due Tomorrow';

      await sendBrandedEmail({
        to: task.assignee.email,
        subject: `${titlePrefix}: ${task.title}`,
        headline: `${titlePrefix} Alert`,
        bodyHtml: `<p>Hi ${task.assignee.full_name}, your assigned task <strong>"${task.title}"</strong> is ${isOverdue ? 'overdue' : 'due tomorrow'}.</p>
                   <p>Due Date: <strong>${task.due_date}</strong> | Priority: <strong>${task.priority.toUpperCase()}</strong></p>`,
        buttonText: 'View Task Board',
        buttonUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/tasks`,
      });
      count++;
    }
  }

  return NextResponse.json({ success: true, emailsSent: count });
}
