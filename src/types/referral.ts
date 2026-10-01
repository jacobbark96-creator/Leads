// ==========================================
// Referral Partner System Types
// ==========================================

export interface ReferralPartner {
  id: string;
  user_id: string;
  partner_id: string;
  parent_partner_id: string | null;
  tc_version: string;
  tc_accepted_at: string;
  created_at: string;
}

export interface ReferralQuestion {
  id: string;
  question_text: string;
  question_type: 'multiple_choice' | 'yes_no' | 'short_text' | 'number';
  options: string[];
  is_required: boolean;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface ReferralCommission {
  id: string;
  lead_id: string;
  partner_id: string;
  parent_partner_id: string | null;
  commission_type: 'direct' | 'tier2';
  amount: number;
  status: 'Pending' | 'Earned' | 'Due' | 'Paid' | 'Cancelled';
  earned_at?: string | null;
  due_at?: string | null;
  paid_at?: string | null;
  payment_batch?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ReferralTracking {
  id: string;
  lead_id: string;
  partner_id: string;
  kanban_status: 'NEW' | 'DEALT_WITH';
  dealt_with_at?: string | null;
  dealt_with_by?: string | null;
  questionnaire_responses: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}
