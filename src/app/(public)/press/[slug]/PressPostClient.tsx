"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, ArrowLeft, User as UserIcon, Share2 } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

interface PressPost {
  id: string;
  title: string;
  content: string;
  image_url: string;
  created_at: string;
  seo_title: string;
  seo_description: string;
  author?: {
    name: string;
  };
}

export function PressPostClient({ post }: { post: PressPost }) {
  const router = useRouter();

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: post.title,
        url: window.location.href
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
    }
  };

  // Simple Markdown-like renderer
  const renderContent = (content: string) => {
    return content.split('\n\n').map((block, i) => {
      if (block.startsWith('# ')) {
        return <h1 key={i} className="text-3xl font-black text-slate-900 mb-6">{block.replace('# ', '')}</h1>;
      }
      if (block.startsWith('## ')) {
        return <h2 key={i} className="text-2xl font-bold text-slate-900 mb-4 mt-8">{block.replace('## ', '')}</h2>;
      }
      if (block.startsWith('### ')) {
        return <h3 key={i} className="text-xl font-bold text-slate-900 mb-3 mt-6">{block.replace('### ', '')}</h3>;
      }
      if (block.startsWith('- ') || block.startsWith('* ')) {
        const items = block.split('\n').map(line => line.replace(/^[-*]\s+/, ''));
        return (
          <ul key={i} className="list-disc list-inside mb-6 space-y-2 text-slate-700">
            {items.map((item, j) => <li key={j}>{item}</li>)}
          </ul>
        );
      }
      return (
        <p key={i} className="text-lg text-slate-700 leading-relaxed mb-6 whitespace-pre-wrap">
          {block}
        </p>
      );
    });
  };

  return (
    <div className="min-h-screen bg-white pt-24 pb-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <button
          onClick={() => router.push('/press')}
          className="group flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-openlead-blue transition-colors mb-12"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Press Centre
        </button>

        <article>
          {/* Header */}
          <header className="mb-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="flex flex-wrap items-center gap-6 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(post.created_at).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </div>
                <div className="flex items-center gap-2">
                  <UserIcon className="w-3.5 h-3.5" />
                  By {post.author?.name || 'Openlead Team'}
                </div>
                <button 
                  onClick={handleShare}
                  className="flex items-center gap-2 hover:text-openlead-blue transition-colors ml-auto"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  Share Story
                </button>
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.1] mb-8">
                {post.title}
              </h1>
            </motion.div>

            {post.image_url && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="aspect-[21/9] rounded-3xl overflow-hidden shadow-2xl shadow-slate-200/50"
              >
                <img
                  src={post.image_url}
                  alt={post.title}
                  className="w-full h-full object-cover"
                />
              </motion.div>
            )}
          </header>

          {/* Content */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="max-w-none"
          >
            {renderContent(post.content)}
          </motion.div>
        </article>
      </div>
    </div>
  );
}
