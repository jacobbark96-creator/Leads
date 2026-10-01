"use client";

import React from 'react';
import { Calendar, ArrowRight, BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';

interface PressPost {
  id: string;
  title: string;
  slug: string;
  seo_description: string;
  image_url: string;
  created_at: string;
}

export function PressListClient({ posts }: { posts: PressPost[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {posts.map((post, index) => (
        <motion.a
          key={post.id}
          href={`/press/${post.slug}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: index * 0.1 }}
          className="group bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300"
        >
          <div className="aspect-[16/9] bg-slate-100 overflow-hidden">
            {post.image_url ? (
              <img
                src={post.image_url}
                alt={post.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-300">
                <BookOpen className="w-12 h-12" />
              </div>
            )}
          </div>
          <div className="p-8">
            <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
              <Calendar className="w-3.5 h-3.5" />
              {new Date(post.created_at).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-4 group-hover:text-openlead-blue transition-colors">
              {post.title}
            </h3>
            <p className="text-slate-600 text-sm line-clamp-3 mb-6 leading-relaxed">
              {post.seo_description}
            </p>
            <div className="flex items-center gap-2 text-sm font-bold text-openlead-blue">
              Read Story <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </motion.a>
      ))}
    </div>
  );
}
