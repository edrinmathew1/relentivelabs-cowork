import { NextResponse } from 'next/server';
import { verifyCronSecret } from '@/lib/cron-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendBrandedEmail } from '@/lib/resend';

export async function GET(req: Request) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized. Invalid CRON_SECRET.' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const todayStr = new Date().toISOString().split('T')[0];

  // Fetch active team members
  const { data: members } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .eq('status', 'active');

  if (!members) return NextResponse.json({ processed: 0 });

  // Fetch checklists already started today
  const { data: startedChecklists } = await supabase
    .from('daily_checklists')
    .select('user_id')
    .eq('date', todayStr);

  const startedUserIds = new Set((startedChecklists || []).map((c) => c.user_id));

  let count = 0;
  for (const member of members) {
    if (!startedUserIds.has(member.id)) {
      await sendBrandedEmail({
        to: member.email,
        subject: 'Morning Reminder: Start Today’s Agency Checklist',
        headline: `Good Morning, ${member.full_name.split(' ')[0]}!`,
        bodyHtml: `<p>You haven't checked off your daily standard checklist for <strong>${todayStr}</strong> yet.</p>
                   <p>Log in now to maintain your contribution streak.</p>`,
        buttonText: 'Open Daily Checklist',
        buttonUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/checklist`,
      });
      count++;
    }
  }

  return NextResponse.json({ success: true, emailsSent: count });
}
