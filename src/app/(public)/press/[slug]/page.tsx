import React from 'react';
import { Metadata } from 'next';
import { PressPostClient } from './PressPostClient';
import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export const runtime = 'edge';

interface Props {
  params: Promise<{ slug: string }>;
}

async function getPost(slug: string) {
  const { data, error } = await supabase
    .from('press_posts')
    .select('*, author:users(name)')
    .eq('slug', slug)
    .eq('is_published', true)
    .single();

  if (error || !data) return null;
  return data;
}

async function getRelatedPosts(currentId: string) {
  const { data } = await supabase
    .from('press_posts')
    .select('id, title, slug, image_url, created_at')
    .eq('is_published', true)
    .neq('id', currentId)
    .order('created_at', { ascending: false })
    .limit(3);

  return data || [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) {
    return {
      title: 'Post Not Found | Openlead',
    };
  }

  return {
    title: post.seo_title || `${post.title} | Openlead Press`,
    description: post.seo_description || `Read the latest story: ${post.title}`,
    openGraph: {
      title: post.seo_title || post.title,
      description: post.seo_description,
      images: post.image_url ? [post.image_url] : [],
    },
  };
}

export default async function PressPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) {
    notFound();
  }

  const relatedPosts = await getRelatedPosts(post.id);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.seo_title || post.title,
    description: post.seo_description || `Read the latest story: ${post.title}`,
    image: post.image_url ? [post.image_url] : [],
    datePublished: post.created_at,
    dateModified: post.updated_at || post.created_at,
    author: {
      '@type': 'Person',
      name: post.author?.name || 'Openlead Team'
    },
    publisher: {
      '@type': 'Organization',
      name: 'Openlead',
      logo: {
        '@type': 'ImageObject',
        url: 'https://openlead.co.uk/openlead-logo.png'
      }
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://openlead.co.uk/press/${slug}`
    }
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PressPostClient post={post} relatedPosts={relatedPosts} />
    </>
  );
}
