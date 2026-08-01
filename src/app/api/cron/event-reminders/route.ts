import { NextResponse } from 'next/server';
import { verifyCronSecret } from '@/lib/cron-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendBrandedEmail } from '@/lib/resend';

export async function GET(req: Request) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized. Invalid CRON_SECRET.' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date();

  // Fetch pending events where reminder hasn't been sent yet
  const { data: events, error } = await supabase
    .from('events')
    .select('*, creator:profiles(*), project:projects(*)')
    .eq('reminder_sent', false);

  if (error || !events || events.length === 0) {
    return NextResponse.json({ processed: 0 });
  }

  let count = 0;

  for (const event of events) {
    const startTime = new Date(event.start_at).getTime();
    const offsetMs = (event.reminder_offset_minutes || 1440) * 60 * 1000;
    const triggerTime = startTime - offsetMs;

    // Check if it's time to send reminder
    if (now.getTime() >= triggerTime && now.getTime() < startTime + 3600000) {
      let recipientEmails: string[] = [];

      if (event.scope === 'company') {
        const { data: users } = await supabase
          .from('profiles')
          .select('email')
          .eq('status', 'active');
        recipientEmails = (users || []).map((u) => u.email);
      } else if (event.scope === 'project' && event.project_id) {
        const { data: members } = await supabase
          .from('project_members')
          .select('user_id, profile:profiles(email)')
          .eq('project_id', event.project_id);
        recipientEmails = (members || [])
          .map((m: any) => m.profile?.email)
          .filter(Boolean);
      } else if (event.creator?.email) {
        recipientEmails = [event.creator.email];
      }

      for (const email of recipientEmails) {
        await sendBrandedEmail({
          to: email,
          subject: `Upcoming Event Reminder: ${event.title}`,
          headline: `Upcoming Event: ${event.title}`,
          bodyHtml: `<p>You have an upcoming event scheduled for <strong>${new Date(event.start_at).toLocaleString()}</strong>.</p>
                     <p>Type: <strong>${event.event_type.toUpperCase()}</strong> | Scope: <strong>${event.scope.toUpperCase()}</strong></p>
                     <p>${event.description || ''}</p>`,
          buttonText: 'View Agency Calendar',
          buttonUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/calendar`,
        });
      }

      // Mark reminder sent
      await supabase
        .from('events')
        .update({ reminder_sent: true })
        .eq('id', event.id);

      count++;
    }
  }

  return NextResponse.json({ success: true, remindersSent: count });
}
