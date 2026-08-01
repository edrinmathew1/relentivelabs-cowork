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

  // Fetch today's incomplete checklists
  const { data: incompleteChecklists } = await supabase
    .from('daily_checklists')
    .select('*, user:profiles(*)')
    .eq('date', todayStr)
    .eq('is_complete', false);

  if (!incompleteChecklists) return NextResponse.json({ processed: 0 });

  let count = 0;
  for (const check of incompleteChecklists) {
    if (check.user?.email) {
      await sendBrandedEmail({
        to: check.user.email,
        subject: 'EOD Reminder: Finish Incomplete Checklist Items',
        headline: 'End of Day Check-In',
        bodyHtml: `<p>Hi ${check.user.full_name}, you have <strong>${check.total_count - check.completed_count} incomplete items</strong> remaining on today's checklist.</p>
                   <p>Complete them before midnight to protect your active streak!</p>`,
        buttonText: 'Complete Checklist Now',
        buttonUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/checklist`,
      });
      count++;
    }
  }

  return NextResponse.json({ success: true, emailsSent: count });
}
