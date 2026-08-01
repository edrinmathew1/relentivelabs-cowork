import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { sendBrandedEmail } from '@/lib/resend';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify sender is Admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can invite team members' }, { status: 403 });
    }

    const { email, role = 'member' } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(); // 72 hours

    const adminSupabase = createAdminClient();

    // Insert invite record
    const { error: inviteError } = await adminSupabase.from('invites').insert({
      email: email.toLowerCase().trim(),
      token,
      invited_by: session.user.id,
      role,
      expires_at: expiresAt,
      accepted: false,
    });

    if (inviteError) {
      console.error('Invite DB error:', inviteError);
      return NextResponse.json({ error: inviteError.message }, { status: 400 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const inviteUrl = `${baseUrl}/accept-invite/${token}`;

    // Send email via Resend
    await sendBrandedEmail({
      to: email,
      subject: "You've been invited to RelentiveLabs CoWork",
      headline: "Welcome to RelentiveLabs CoWork",
      bodyHtml: `<p>You have been invited to join the internal Relentive agency platform as a <strong>${role}</strong>.</p>
                 <p>Click the link below to set your password and access your workspace.</p>`,
      buttonText: "Accept Invite & Join Workspace",
      buttonUrl: inviteUrl,
    });

    return NextResponse.json({ success: true, message: `Invite sent to ${email}` });
  } catch (err: any) {
    console.error('Invite API error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
