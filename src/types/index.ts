export type UserRole = 'client' | 'sales' | 'admin' | 'super_admin' | 'rep' | 'growth_manager' | 'Residential Rep' | 'Residential Sales' | 'Commercial Sales';

export interface UserProfile {
  id: string;
  email: string;
  secondary_email?: string | null;
  role: UserRole;
  name: string;
  phone?: string | null;
  twilio_number?: string | null;
  avatar_url?: string | null;
  job_title?: string | null;
  about?: string | null;
  working_hours?: string | null;
  is_approved?: boolean;
  permissions?: string[] | null;
  google_refresh_token?: string | null;
  email_signature?: string | null;
  division_id?: string | null;
  divisions?: Division | null;
  trade_account_enabled?: boolean;
  approved_trade_amount?: number;
  current_trade_usage?: number;
  trade_limit_setting?: number;
  flex_terms_accepted_at?: string | null;
  created_at: string;
}

export interface Division {
  id: string;
  name: string;
  logo_url: string | null;
  created_at: string;
}

export interface Client {
  id: string;
  user_id: string;
  company_name: string;
  contact_name: string;
  phone: string;
  other_contacts?: string | null;
  other_contact_numbers?: string | null;
  address?: string | null;
  areas_covered?: string | null;
  services_offered?: string | null;
  property_type_preference?: 'residential' | 'commercial' | 'both' | null;
  internal_notes?: string | null;
  is_profile_complete?: boolean;
  latitude?: number | null;
  longitude?: number | null;
  assigned_to?: string | null;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  parent_id: string | null;
  is_active: boolean;
  created_at: string;
}

export interface IntranetResource {
  id: string;
  title: string;
  description: string | null;
  resource_type: 'pdf' | 'excel' | 'link';
  url: string;
  created_at: string;
  created_by?: string;
}

export interface Lead {
  id: string;
  client_id: string | null;
  category_id: string | null;
  subcategory_id: string | null;
  name: string;
  phone: string;
  email: string | null;
  company: string | null;
  status: string;
  purchase_date: string | null;
  booking_date: string | null;
  csv_data: any | null;
  assigned_to: string | null;
  created_at: string;
  qualified_at?: string | null;
  marked_as_sold?: boolean;
  sent_to_sales?: boolean;
  monthly_spend?: number;
  primary_need?: string;
  location?: string;
  timeframe?: string;
  property_type?: string;
  roof_condition?: string;
  roof_material?: string;
  cover_skylights?: boolean;
  ground_mount?: boolean;
  unit_rate?: number;
  night_unit_rate?: number;
  sole_decision_maker?: boolean;
  est_ann_consumption?: number;
  qualification_notes?: string;
  est_system_size?: string;
  est_ann_generation?: string;
  est_savings?: number;
  est_payback?: string;
  building_type?: string;
  epc_rating?: string;
  industry?: string;
  company_type?: string;
  company_number?: string;
  revenue?: string;
  employees?: string;
  photos?: string[];
  linkedin_url?: string;
  secondary_phone?: string;
  is_marketed?: boolean;
  price?: number;
  exclusive_price?: number;
  share_price?: number;
  purchase_count?: number;
  is_exclusive_sold?: boolean;
  max_shares?: number;
  latitude?: number | null;
  longitude?: number | null;
  property_ownership?: string;
  lease_duration?: string;
  likely_to_renew?: string;
  landlord_permission?: string;
  payment_options?: string;
  roof_size?: string;
  electrical_supply?: string;
  solar_location?: string;
  availability?: string;
  job_title?: string;
  upload_name?: string | null;
  bills_url?: string;
  being_dialed_by?: string | null;
  last_dialed_at?: string | null;
  other_contacts?: string | null;
  other_contact_numbers?: string | null;
  clients?: { company_name: string; contact_name: string } | null;
  purchase_id?: string;
  purchase_status?: string;
  lead_notes?: any[];
  roof_suitability?: string;
  solar_exposure?: string;
  shading?: string;
  marketplace_notes?: string;
  orientation?: string;
  lead_type?: 'residential' | 'commercial';
  division_id?: string | null;
  sales_pipeline_status?: 'Upcoming' | 'Pitched' | 'No Show' | 'Sold' | 'Lost';
  buildings?: Building[];
}

export interface Building {
  id: string;
  lead_id: string | null;
  company_id: string | null;
  address: string | null;
  building_type: string | null;
  property_type?: string | null;
  roof_type: string | null;
  roof_condition: string | null;
  total_roof_area: number | null;
  usable_roof_area: number | null;
  annual_consumption: number | null;
  peak_demand: number | null;
  grid_connection: string | null;
  shading_score: number | null;
  orientation: string | null;
  suitability_score: number | null;
  estimated_kwp: number | null;
  estimated_generation: number | null;
  estimated_savings: number | null;
  estimated_payback: number | null;
  battery_potential: boolean | null;
  ev_potential: boolean | null;
  planning_required: boolean | null;
  dno_required: boolean | null;
  status_chips: string[] | null;
  created_at: string;
  updated_at: string;
  roof_area_estimate: number | null;
  solar_potential_score: number | null;
  epc_rating: string | null;
  estimated_energy_usage: number | null;
  installation_complexity: string | null;
  max_array_panels_count: number | null;
  max_sunshine_hours_per_year: number | null;
  satellite_image_url: string | null;
  latitude: number | null;
  longitude: number | null;
  marketplace_notes?: string | null;
  use_primary_notes?: boolean;
}

export interface LeadNote {
  id: string;
  lead_id: string;
  user_id: string;
  author_name: string;
  content: string;
  is_pinned: boolean;
  created_at: string;
}

export interface LeadReminder {
  id: string;
  lead_id: string;
  user_id: string;
  reminder_at: string;
  content: string;
  is_completed: boolean;
  created_at: string;
}

export interface Contractor {
  id: string;
  client_id?: string | null;
  category_id: string | null;
  subcategory_id: string | null;
  name?: string | null;
  company_name?: string | null;
  contact_name?: string | null;
  phone?: string | null;
  email: string | null;
  company: string | null;
  status: string;
  csv_data: any | null;
  assigned_to: string | null;
  created_at: string;
  latitude?: number | null;
  longitude?: number | null;
  service_areas?: any[] | null;
  member_since?: string;
  coverage_area?: string;
  installers_count?: string;
  certifications?: string;
  insurance?: string;
  payment_terms?: string;
  project_type?: string;
  system_size?: string;
  lead_types?: string;
  max_distance?: string;
  upload_name?: string | null;
  linkedin_url?: string | null;
  secondary_phone?: string | null;
  location?: string | null;
  clients?: {
    address?: string | null;
    other_contacts?: string | null;
    other_contact_numbers?: string | null;
    services_offered?: string | null;
  } | null;
}

export interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface DiscountCode {
  id: string;
  code: string;
  description: string | null;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  max_uses: number | null;
  current_uses: number;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
  allowed_client_ids: string[];
  created_at: string;
  created_by: string | null;
}
