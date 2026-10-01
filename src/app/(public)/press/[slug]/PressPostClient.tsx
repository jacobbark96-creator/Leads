"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, ArrowLeft, User as UserIcon, Share2, Clock, ChevronRight, MessageSquare, Twitter, Linkedin, Link as LinkIcon } from 'lucide-react';
import { motion, useScroll, useSpring } from 'framer-motion';
import toast from 'react-hot-toast';
import Link from 'next/link';

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
    avatar_url?: string;
  };
}

interface RelatedPost {
  id: string;
  title: string;
  slug: string;
  image_url: string;
  created_at: string;
}

export function PressPostClient({ post, relatedPosts = [] }: { post: PressPost, relatedPosts?: RelatedPost[] }) {
  const router = useRouter();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  const [readingTime, setReadingTime] = useState(0);

  useEffect(() => {
    const wordsPerMinute = 200;
    const words = post.content.split(/\s+/).length;
    setReadingTime(Math.ceil(words / wordsPerMinute));
  }, [post.content]);

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

  // Simple Markdown-like renderer with image and blockquote support
  const renderContent = (content: string) => {
    return content.split('\n\n').map((block, i) => {
      // Inline Images: ![alt](url)
      const imgMatch = block.match(/!\[(.*?)\]\((.*?)\)/);
      if (imgMatch) {
        return (
          <figure key={i} className="my-12">
            <div className="rounded-3xl overflow-hidden shadow-xl border border-slate-100">
              <img src={imgMatch[2]} alt={imgMatch[1]} className="w-full h-auto" />
            </div>
            {imgMatch[1] && (
              <figcaption className="text-center text-sm text-slate-500 mt-4 italic">
                {imgMatch[1]}
              </figcaption>
            )}
          </figure>
        );
      }

      // Blockquotes: > quote
      if (block.startsWith('> ')) {
        return (
          <blockquote key={i} className="border-l-4 border-openlead-blue pl-6 py-2 my-8 italic text-2xl text-slate-700 font-medium">
            {block.replace('> ', '')}
          </blockquote>
        );
      }

      if (block.startsWith('# ')) {
        return <h1 key={i} className="text-4xl md:text-5xl font-black text-slate-900 mb-8 mt-12 tracking-tight">{block.replace('# ', '')}</h1>;
      }
      if (block.startsWith('## ')) {
        return <h2 key={i} className="text-3xl font-black text-slate-900 mb-6 mt-12 tracking-tight">{block.replace('## ', '')}</h2>;
      }
      if (block.startsWith('### ')) {
        return <h3 key={i} className="text-2xl font-bold text-slate-900 mb-4 mt-10 tracking-tight">{block.replace('### ', '')}</h3>;
      }
      if (block.startsWith('- ') || block.startsWith('* ')) {
        const items = block.split('\n').map(line => line.replace(/^[-*]\s+/, ''));
        return (
          <ul key={i} className="list-disc list-outside ml-6 mb-8 space-y-3 text-slate-700 text-lg">
            {items.map((item, j) => <li key={j} className="pl-2">{item}</li>)}
          </ul>
        );
      }
      return (
        <p key={i} className="text-xl text-slate-700 leading-relaxed mb-8 whitespace-pre-wrap">
          {block}
        </p>
      );
    });
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Reading Progress Bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1.5 bg-openlead-blue z-[60] origin-left"
        style={{ scaleX }}
      />

      <div className="pt-32 pb-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-12">
            <Link href="/" className="hover:text-openlead-blue transition-colors">Home</Link>
            <ChevronRight className="w-3 h-3" />
            <Link href="/press" className="hover:text-openlead-blue transition-colors">Press Centre</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-slate-900 truncate max-w-[200px]">{post.title}</span>
          </nav>

          <article>
            {/* Header */}
            <header className="mb-16">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <div className="flex flex-wrap items-center gap-6 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8">
                  <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
                    <Calendar className="w-3.5 h-3.5 text-openlead-blue" />
                    {new Date(post.created_at).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </div>
                  <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
                    <Clock className="w-3.5 h-3.5 text-openlead-blue" />
                    {readingTime} min read
                  </div>
                </div>

                <h1 className="text-4xl md:text-5xl lg:text-7xl font-black text-slate-900 tracking-tight leading-[1.05] mb-12">
                  {post.title}
                </h1>

                {/* Author Info (Top) */}
                <div className="flex items-center justify-between py-8 border-y border-slate-100 mb-12">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-200">
                      {post.author?.name?.charAt(0) || 'O'}
                    </div>
                    <div>
                      <div className="text-sm font-black text-slate-900 uppercase tracking-tight">{post.author?.name || 'Openlead Team'}</div>
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Openlead Contributor</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <button onClick={handleShare} className="p-2.5 rounded-full bg-slate-50 border border-slate-100 text-slate-400 hover:text-openlead-blue hover:bg-blue-50 hover:border-blue-100 transition-all">
                      <Twitter className="w-4 h-4" />
                    </button>
                    <button onClick={handleShare} className="p-2.5 rounded-full bg-slate-50 border border-slate-100 text-slate-400 hover:text-openlead-blue hover:bg-blue-50 hover:border-blue-100 transition-all">
                      <Linkedin className="w-4 h-4" />
                    </button>
                    <button onClick={handleShare} className="p-2.5 rounded-full bg-slate-50 border border-slate-100 text-slate-400 hover:text-openlead-blue hover:bg-blue-50 hover:border-blue-100 transition-all">
                      <LinkIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>

              {post.image_url && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  className="aspect-[16/9] md:aspect-[21/9] rounded-[2rem] overflow-hidden shadow-2xl shadow-slate-200/50 border-4 border-white"
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
              className="max-w-3xl mx-auto"
            >
              {renderContent(post.content)}
            </motion.div>

            {/* Footer Author Section */}
            <footer className="mt-24 pt-16 border-t border-slate-100 max-w-3xl mx-auto">
              <div className="bg-slate-50 rounded-[2rem] p-8 md:p-12 border border-slate-100 flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white text-3xl font-black shadow-2xl shadow-blue-200 shrink-0">
                  {post.author?.name?.charAt(0) || 'O'}
                </div>
                <div>
                  <h4 className="text-xl font-black text-slate-900 tracking-tight mb-2">Written by {post.author?.name || 'Openlead Team'}</h4>
                  <p className="text-slate-600 leading-relaxed mb-6">
                    Our team of experts and contributors share insights on the latest industry trends, product updates, and growth strategies to help you scale your business.
                  </p>
                  <div className="flex flex-wrap justify-center md:justify-start gap-4">
                    <button className="text-xs font-black text-openlead-blue uppercase tracking-widest hover:translate-x-1 transition-transform inline-flex items-center gap-2">
                      View Profile <ChevronRight className="w-3 h-3" />
                    </button>
                    <button onClick={handleShare} className="text-xs font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors inline-flex items-center gap-2">
                      Follow Author <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Related Stories */}
              {relatedPosts.length > 0 && (
                <div className="mt-32">
                  <div className="flex items-center justify-between mb-12">
                    <h3 className="text-3xl font-black text-slate-900 tracking-tight">Related <span className="text-openlead-blue">Stories</span></h3>
                    <Link href="/press" className="text-sm font-black text-slate-400 uppercase tracking-widest hover:text-openlead-blue transition-colors flex items-center gap-2">
                      View All <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {relatedPosts.slice(0, 2).map((rel) => (
                      <Link key={rel.id} href={`/press/${rel.slug}`} className="group block">
                        <div className="aspect-[16/9] rounded-2xl overflow-hidden mb-6 bg-slate-100 shadow-lg group-hover:shadow-xl transition-all duration-300">
                          {rel.image_url ? (
                            <img src={rel.image_url} alt={rel.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <MessageSquare className="w-8 h-8 text-slate-200" />
                            </div>
                          )}
                        </div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                          {new Date(rel.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </div>
                        <h4 className="text-xl font-bold text-slate-900 group-hover:text-openlead-blue transition-colors leading-snug">
                          {rel.title}
                        </h4>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </footer>
          </article>
        </div>
      </div>
    </div>
  );
}
