"use client";

import React from 'react';
import Link from 'next/link';
import { PhoneCall, CheckCircle, Megaphone, Trophy, Briefcase, FileText, UserCheck } from 'lucide-react';

interface PipelineBoardProps {
  leads: any[];
  role?: string;
  isOpenEnergyResidential?: boolean;
}

const COLUMNS = [
  { id: 'call back', label: 'Callback', color: 'blue', icon: PhoneCall },
  { id: 'qualified', label: 'Qualified', color: 'green', icon: CheckCircle },
  { id: 'marketed', label: 'Marketed', color: 'purple', icon: Megaphone },
  { id: 'awaiting_sales', label: 'Sent to Sales', color: 'orange', icon: Briefcase },
  { id: 'sold', label: 'Sold', color: 'yellow', icon: Trophy },
];

const GM_COLUMNS = [
  { id: 'Callbacks', label: 'Callbacks', color: 'blue', icon: PhoneCall },
  { id: 'To Sign', label: 'To Sign', color: 'orange', icon: FileText },
  { id: 'Signed Up', label: 'Signed Up', color: 'green', icon: UserCheck },
];

const SALES_COLUMNS = [
  { id: 'Upcoming', label: 'Upcoming', color: 'blue', icon: PhoneCall },
  { id: 'Pitched', label: 'Pitched', color: 'purple', icon: Megaphone },
  { id: 'No Show', label: 'No Show', color: 'red', icon: PhoneCall },
  { id: 'Sold', label: 'Sold', color: 'green', icon: Trophy },
  { id: 'Lost', label: 'Lost', color: 'gray', icon: FileText },
];

export default function PipelineBoard({ leads, role, isOpenEnergyResidential }: PipelineBoardProps) {
  const isGM = role === 'growth_manager';
  const isSales = role === 'Residential Sales' || role === 'Commercial Sales';
  let columns = isGM ? GM_COLUMNS : isSales ? SALES_COLUMNS : COLUMNS;

  if (isOpenEnergyResidential) {
    columns = columns.filter(c => c.id !== 'marketed');
  }

  const getLeadsByStatus = (status: string) => {
    if (isGM) {
      return leads.filter(l => l.gm_pipeline_status === status);
    }

    if (isSales) {
      return leads.filter(l => l.sales_pipeline_status === status);
    }

    if (status === 'marketed') {
      return leads.filter(l => 
        (l.status === 'marketplace' || (l.status === 'qualified' && !!l.is_marketed)) && 
        l.purchase_count === 0
      );
    }
    if (status === 'qualified') {
      return leads.filter(l => l.status === 'qualified' && !l.is_marketed && l.purchase_count === 0);
    }
    if (status === 'sold') {
      return leads.filter(l => 
        (l.valid_purchase_count > 0) || 
        ((l.status === 'sold' || l.marked_as_sold) && !l.has_test_purchase)
      );
    }
    if (status === 'awaiting_sales') {
      return leads.filter(l => 
        l.status === 'awaiting_sales' || 
        (l.purchase_count > 0 && l.valid_purchase_count === 0)
      );
    }
    return leads.filter(l => l.status === status && l.purchase_count === 0);
  };

  const getColumnColorClass = (color: string) => {
    switch (color) {
      case 'blue': return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'green': return 'bg-green-50 border-green-200 text-green-800';
      case 'purple': return 'bg-purple-50 border-purple-200 text-purple-800';
      case 'orange': return 'bg-orange-50 border-orange-200 text-orange-800';
      case 'yellow': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'red': return 'bg-red-50 border-red-200 text-red-800';
      case 'gray': return 'bg-gray-50 border-gray-200 text-gray-800';
      default: return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getHeaderColorClass = (color: string) => {
    switch (color) {
      case 'blue': return 'bg-blue-100 text-blue-900 border-blue-200';
      case 'green': return 'bg-green-100 text-green-900 border-green-200';
      case 'purple': return 'bg-purple-100 text-purple-900 border-purple-200';
      case 'orange': return 'bg-orange-100 text-orange-900 border-orange-200';
      case 'yellow': return 'bg-yellow-100 text-yellow-900 border-yellow-200';
      case 'red': return 'bg-red-100 text-red-900 border-red-200';
      case 'gray': return 'bg-gray-100 text-gray-900 border-gray-200';
      default: return 'bg-gray-100 text-gray-900 border-gray-200';
    }
  };

  return (
    <div className="flex gap-3 overflow-x-auto pb-4 custom-scrollbar items-start snap-x snap-mandatory">
      {columns.map(col => {
        const columnLeads = getLeadsByStatus(col.id);
        const columnValue = columnLeads.reduce((acc, l) => acc + (l.commission_value || 0), 0);
        const Icon = col.icon;

        return (
          <div key={col.id} className={`flex-1 min-w-[280px] sm:min-w-[240px] md:min-w-[200px] rounded-xl border flex flex-col ${getColumnColorClass(col.color)} bg-opacity-40 max-h-[calc(100vh-250px)] snap-center`}>
            {/* Column Header */}
            <div className={`p-2.5 border-b flex items-center justify-between rounded-t-xl ${getHeaderColorClass(col.color)}`}>
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4 opacity-70" />
                <h3 className="font-bold text-xs uppercase tracking-wider">{col.label}</h3>
              </div>
              <span className="bg-white bg-opacity-50 px-2 py-0.5 rounded-full text-[10px] font-bold">
                {columnLeads.length}
              </span>
            </div>
            
            {/* Column Value Summary */}
            <div className="px-3 py-2 bg-white bg-opacity-30 border-b border-white/20">
              <p className="text-[9px] uppercase tracking-wider opacity-70 font-semibold mb-0.5">Commission Value</p>
              <p className="text-base font-bold">£{columnValue.toLocaleString()}</p>
            </div>

            {/* Column Body / Cards */}
            <div className="flex-1 p-2 flex flex-col gap-2 overflow-y-auto custom-scrollbar">
              {columnLeads.map(lead => (
                <PipelineCard key={lead.id} lead={lead} color={col.color} />
              ))}
              {columnLeads.length === 0 && (
                <div className="flex-1 flex items-center justify-center text-[10px] opacity-50 italic text-center px-4 py-8">
                  No leads in {col.label}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PipelineCard({ lead, color }: { lead: any, color: string }) {
  const getBorderColor = () => {
    switch (color) {
      case 'blue': return 'border-blue-200 hover:border-blue-300';
      case 'green': return 'border-green-200 hover:border-green-300';
      case 'purple': return 'border-purple-200 hover:border-purple-300';
      case 'orange': return 'border-orange-200 hover:border-orange-300';
      case 'yellow': return 'border-yellow-200 hover:border-yellow-300';
      case 'red': return 'border-red-200 hover:border-red-300';
      case 'gray': return 'border-gray-200 hover:border-gray-300';
      default: return 'border-gray-200 hover:border-gray-300';
    }
  };

  return (
    <div className={`bg-white rounded-lg p-2 border shadow-sm transition-all ${getBorderColor()}`}>
      <div className="flex justify-between items-start mb-1.5">
        <div className="flex flex-col gap-0.5 overflow-hidden">
          <a href={`/sales-crm/lead-v2?id=${lead.id}&tab=pipeline`} className="font-bold text-blue-600 hover:text-blue-800 text-xs line-clamp-1 flex-1 pr-2 transition-colors" title={lead.company || lead.name}>
            {lead.company || lead.name}
          </a>
          {lead.is_leadshare && (
             <span className="text-[9px] font-bold text-amber-600 uppercase tracking-tighter flex items-center gap-1">
               <span className="w-1 h-1 rounded-full bg-amber-500 animate-pulse"></span>
               Leadshare ({lead.valid_purchase_count ?? lead.purchase_count}/{lead.max_shares || 3})
             </span>
           )}
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-gray-500">Commission:</span>
          <span className="font-bold text-gray-900">£{lead.commission_value || 0}</span>
        </div>

        <div className="pt-1.5 mt-1.5 border-t border-gray-100 flex flex-col gap-1 text-[9px]">
          <div className="flex justify-between items-center text-gray-500">
            <span>Assigned:</span>
            <span className="font-medium text-gray-700 truncate max-w-[100px]">{lead.users?.name || 'Unassigned'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}