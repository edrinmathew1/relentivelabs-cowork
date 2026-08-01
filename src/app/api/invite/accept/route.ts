import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: Request) {
  try {
    const { token, password, fullName } = await req.json();

    if (!token || !password || !fullName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const adminSupabase = createAdminClient();

    // Fetch invite
    const { data: invite, error: inviteErr } = await adminSupabase
      .from('invites')
      .select('*')
      .eq('token', token)
      .single();

    if (inviteErr || !invite) {
      return NextResponse.json({ error: 'Invalid or expired invite token' }, { status: 404 });
    }

    if (invite.accepted) {
      return NextResponse.json({ error: 'This invite has already been accepted' }, { status: 400 });
    }

    if (new Date(invite.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Invite token has expired' }, { status: 400 });
    }

    // Create user in Supabase Auth via Admin client
    const { data: authUser, error: authErr } = await adminSupabase.auth.admin.createUser({
      email: invite.email,
      password: password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role: invite.role,
      },
    });

    if (authErr) {
      return NextResponse.json({ error: authErr.message }, { status: 400 });
    }

    // Create/update profile row
    if (authUser.user) {
      await adminSupabase.from('profiles').upsert({
        id: authUser.user.id,
        full_name: fullName,
        email: invite.email,
        role: invite.role,
        status: 'active',
        invited_by: invite.invited_by,
        joined_at: new Date().toISOString(),
      });
    }

    // Mark invite as accepted
    await adminSupabase.from('invites').update({ accepted: true }).eq('id', invite.id);

    return NextResponse.json({ success: true, email: invite.email });
  } catch (err: any) {
    console.error('Accept invite error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
