const fs = require('fs');

const layoutPath = './src/app/(dashboard)/admin-crm/layout.tsx';

const newLayout = `"use client";
import React, { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Users, Tags, Ticket, TrendingUp, Activity, Menu, X, LayoutDashboard, Database, HelpCircle, LogOut, Settings, BarChart2, Bell, MessageSquare, ChevronDown, Store, Briefcase } from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuthStore } from '@/store/authStore';
import { AdminNotifications } from '@/components/AdminNotifications';
import { SmsNotifications } from '@/components/SmsNotifications';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, signOut } const fs = require('fs');

const layoutPath = 'n]
const layoutPath = './src/aDro
const newLayout = `"usenOpen] = useState(false);
  const [userDropdownOpeimport React, { useState } fromatimport { usePathname, useRouter } from 'nex import Link from "'next/link'"