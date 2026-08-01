import { NextResponse } from 'next/server';
import { verifyCronSecret } from '@/lib/cron-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendBrandedEmail } from '@/lib/resend';

export async function GET(req: Request) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized. Invalid CRON_SECRET.' }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Fetch admin profiles
  const { data: admins } = await supabase
    .from('profiles')
    .select('email, full_name')
    .eq('role', 'admin')
    .eq('status', 'active');

  if (!admins || admins.length === 0) return NextResponse.json({ processed: 0 });

  // Fetch weekly summary stats
  const { count: completedTasks } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'done');

  const { data: atRiskGoals } = await supabase
    .from('goals')
    .select('title')
    .eq('status', 'at_risk');

  let count = 0;
  for (const admin of admins) {
    await sendBrandedEmail({
      to: admin.email,
      subject: 'Relentive OS: Weekly Team Progress & Agency Digest',
      headline: 'Weekly Agency Progress Summary',
      bodyHtml: `<p>Hello ${admin.full_name}, here is your weekly operational summary:</p>
                 <ul>
                   <li>Total Completed Tasks: <strong>${completedTasks || 0}</strong></li>
                   <li>At-Risk OKRs/Goals: <strong>${atRiskGoals?.length || 0}</strong></li>
                 </ul>
                 <p>Log in to view the full Recharts analytics dashboard and velocity trends.</p>`,
      buttonText: 'View Admin Dashboard',
      buttonUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard`,
    });
    count++;
  }

  return NextResponse.json({ success: true, emailsSent: count });
}
