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
  created_at: string;
}