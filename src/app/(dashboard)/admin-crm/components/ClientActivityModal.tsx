import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { X, Activity, Eye, MousePointer, MapPin, Search } from 'lucide-react';
import { format } from 'date-fns';

interface ClientActivityModalProps {
  userId: string;
  companyName: string;
  onClose: () => void;
}

interface ActivityLog {
  id: string;
  activity_type: string;
  details: any;
  created_at: string;
}

export const ClientActivityModal: React.FC<ClientActivityModalProps> = ({ userId, companyName, onClose }) => {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const { data, error } = await supabase
          .from('client_activities')
          .select('*')
          .eq('user_id', userId)
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        setActivities(data || []);
      } catch (err) {
        console.error('Error fetching activities:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchActivities();
  }, [userId]);

  const renderActivityDetails = (act: ActivityLog) => {
    switch (act.activity_type) {
      case 'view_lead':
        return (
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-blue-500" />
            <span className="text-sm">Viewed lead: <span className="font-semibold">{act.details.lead_name || 'Unknown'}</span></span>
          </div>
        );
      case 'openlead_max_area_select':
        return (
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-green-500" />
            <span className="text-sm">Selected OpenLead Max Area: <span className="font-semibold">{act.details.area}</span> (£{act.details.price})</span>
          </div>
        );
      case 'openlead_max_area_deselect':
        return (
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-red-500" />
            <span className="text-sm">Deselected OpenLead Max Area: <span className="font-semibold">{act.details.area}</span></span>
          </div>
        );
      case 'button_click':
        return (
          <div className="flex items-center gap-2">
            <MousePointer className="w-4 h-4 text-purple-500" />
            <span className="text-sm">Clicked Button: <span className="font-semibold">{act.details.button}</span></span>
          </div>
        );
      case 'page_view':
        return (
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-gray-500" />
            <span className="text-sm">Viewed Page: <span className="font-semibold">{act.details.page}</span></span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-500">{act.activity_type}</span>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">24h Activity Log</h2>
            <p className="text-sm text-gray-500">{companyName}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              No activity recorded in the last 24 hours.
            </div>
          ) : (
            <div className="space-y-4">
              {activities.map((act) => (
                <div key={act.id} className="flex items-start gap-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="min-w-[80px] text-xs text-gray-400 font-medium pt-0.5">
                    {format(new Date(act.created_at), 'HH:mm:ss')}
                  </div>
                  <div className="flex-1">
                    {renderActivityDetails(act)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};