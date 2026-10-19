import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return NextResponse.json({ error: 'Missing Authorization header' }, { status: 401 });

    const token = authHeader.split(' ')[1];
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['super_admin', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { purchaseId, isMarketplace, newStatus } = await req.json();

    if (!purchaseId || !newStatus) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    if (isMarketplace) {
      const { error } = await supabaseAdmin
        .from('lead_purchases')
        .update({ status: newStatus })
        .eq('id', purchaseId);

      if (error) throw error;
    } else {
      // Manual sale
      // Map 'new' (Purchased column) back to 'sold' for the leads table
      const dbStatus = newStatus === 'new' ? 'sold' : newStatus;
      const { error } = await supabaseAdmin
        .from('leads')
        .update({ status: dbStatus })
        .eq('id', purchaseId);

      if (error) throw error;
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
