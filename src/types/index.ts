export type UserRole = 'client' | 'sales' | 'admin' | 'super_admin' | 'rep';

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  phone?: string | null;
  avatar_url?: string | null;
  job_title?: string | null;
  about?: string | null;
  working_hours?: string | null;
  is_approved?: boolean;
  permissions?: string[] | null;
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
  internal_notes?: string | null;
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
  monthly_spend?: number;
  location?: string;
  timeframe?: string;
  roof_condition?: string;
  roof_material?: string;
  cover_skylights?: boolean;
  ground_mount?: boolean;
  unit_rate?: number;
  est_ann_consumption?: number;
  qualification_notes?: string;
  est_system_size?: string;
  photos?: string[];
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
  bills_url?: string;
  clients?: { company_name: string; contact_name: string } | null;
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
