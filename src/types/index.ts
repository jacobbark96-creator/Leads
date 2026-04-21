export type UserRole = 'client' | 'sales' | 'admin' | 'super_admin';

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  name: string;
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
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  parent_id: string | null;
  is_active: boolean;
  created_at: string;
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
  latitude?: number | null;
  longitude?: number | null;
}

export interface Contractor {
  id: string;
  category_id: string | null;
  subcategory_id: string | null;
  name: string;
  phone: string;
  email: string | null;
  company: string | null;
  status: string;
  csv_data: any | null;
  assigned_to: string | null;
  created_at: string;
}

export interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}