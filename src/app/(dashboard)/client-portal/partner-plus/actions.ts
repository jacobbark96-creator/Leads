'use server';

import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function getPartnerPlusLeads(clientId: string) {
  if (!clientId) return [];
  
  const { data, error } = await supabaseAdmin
    .from('leads')
    .select('*')
    .eq('assigned_to', clientId)
    .in('partner_plus_status', ['needs_designs', 'sold', 'waiting_on_survey', 'waiting_on_install', 'installed']);

  if (error) {
    console.error('Error fetching partner plus leads:', error);
    throw new Error(error.message);
  }
  
  return data;
}

export async function updatePartnerPlusLeadStatus(leadId: string, status: string, clientId: string) {
  if (!clientId || !leadId) return { success: false, error: 'Missing parameters' };

  // First verify this lead actually belongs to this client to prevent unauthorized updates
  const { data: lead, error: fetchError } = await supabaseAdmin
    .from('leads')
    .select('assigned_to')
    .eq('id', leadId)
    .single();

  if (fetchError || !lead) {
    return { success: false, error: 'Lead not found' };
  }

  if (lead.assigned_to !== clientId) {
    return { success: false, error: 'Unauthorized to update this lead' };
  }

  const { error } = await supabaseAdmin
    .from('leads')
    .update({ partner_plus_status: status })
    .eq('id', leadId);

  if (error) {
    console.error('Error updating partner plus lead:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}
