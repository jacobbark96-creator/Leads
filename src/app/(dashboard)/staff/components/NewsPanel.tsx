import React, { useEffect, useState } from 'react';
import { GlassCard } from './GlassCard';
import { Newspaper, Plus, X } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { useAuthStore } from '../../../../store/authStore';
import { formatDistanceToNow } from 'date-fns';

export const NewsPanel = () => {
  const { profile } = useAuthStore();
  const [news, setNews] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState('Company News');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchNews = async () => {
    const { data, error } = await supabase
      .from('company_news')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
      
    if (!error && data) {
      setNews(data.map(item => ({
        id: item.id,
        badge: item.category,
        badgeColor: item.category === 'Company News' ? 'bg-purple-500' : item.category === 'Product Update' ? 'bg-blue-500' : 'bg-indigo-500',
        title: item.title,
        desc: item.content,
        time: formatDistanceToNow(new Date(item.created_at), { addSuffix: true }),
        img: item.image_url || 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=200&h=150&fit=crop'
      })));
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  const handleCreateNews = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;
    setIsSubmitting(true);
    
    const { error } = await supabase.from('company_news').insert([{
      title: newTitle,
      content: newContent,
      category: newCategory,
      created_by: profile?.id
    }]);

    if (!error) {
      setIsModalOpen(false);
      setNewTitle('');
      setNewContent('');
      fetchNews();
    }
    setIsSubmitting(false);
  };

  return (
    <>
    <GlassCard delay={0.3} className="p-4 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Newspaper className="w-4 h-4 text-purple-400" />
          <h2 className="text-sm font-semibold text-white">Company News</h2>
        </div>
        <div className="flex items-center gap-3">
          {profile?.role === 'super_admin' && (
            <button 
              onClick={() => setIsModalOpen(true)}
              className="text-[11px] font-medium text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> Create
            </button>
          )}
          <span className="text-[11px] font-medium text-blue-400 cursor-pointer hover:text-blue-300 transition-colors">View all</span>
        </div>
      </div>
      
      {news.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mb-3">
            <Newspaper className="w-5 h-5 text-gray-500" />
          </div>
          <p className="text-xs text-gray-400 font-medium">No company news</p>
          {profile?.role === 'super_admin' && (
            <button 
              onClick={() => setIsModalOpen(true)}
              className="text-[10px] text-blue-400 mt-1 hover:underline"
            >
              Create the first update
            </button>
          )}
        </div>
      ) : (
        <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
          {news.map((item, i) => (
            <div key={i} className="flex gap-3 group cursor-pointer">
              <div className="w-16 h-12 rounded-lg overflow-hidden shrink-0">
                <img src={item.img} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
              </div>
              <div className="flex-1 min-w-0">
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white ${item.badgeColor} mb-1 inline-block uppercase tracking-wider`}>
                  {item.badge}
                </span>
                <h3 className="text-xs font-bold text-white mb-0.5 group-hover:text-blue-400 transition-colors truncate">{item.title}</h3>
                <span className="text-[9px] text-gray-500 font-medium">{item.time}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </GlassCard>

    {isModalOpen && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <div className="bg-[#0a0a14] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
          <div className="flex justify-between items-center p-4 border-b border-white/10">
            <h3 className="text-lg font-bold text-white">Create Company News</h3>
            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleCreateNews} className="p-4 space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Title</label>
              <input
                type="text"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none"
                placeholder="News title..."
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Category</label>
              <select
                value={newCategory}
                onChange={e => setNewCategory(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none"
              >
                <option value="Company News" className="bg-gray-900">Company News</option>
                <option value="Product Update" className="bg-gray-900">Product Update</option>
                <option value="Event" className="bg-gray-900">Event</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Content (Brief)</label>
              <textarea
                value={newContent}
                onChange={e => setNewContent(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none h-24 resize-none"
                placeholder="Short description..."
                required
              />
            </div>
            <div className="pt-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-lg disabled:opacity-50"
              >
                {isSubmitting ? 'Publishing...' : 'Publish'}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
    </>
  );
};