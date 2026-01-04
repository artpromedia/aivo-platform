/**
 * Community Page
 *
 * Teacher community hub for sharing resources, discussing strategies,
 * and collaborating with other educators.
 */

'use client';

import * as React from 'react';

import { PageHeader } from '@/components/layout/breadcrumb';

interface Post {
  id: string;
  author: {
    name: string;
    role: string;
    school: string;
  };
  title: string;
  content: string;
  category: 'discussion' | 'resource' | 'question' | 'success-story';
  likes: number;
  comments: number;
  createdAt: string;
  isLiked?: boolean;
}

interface Resource {
  id: string;
  title: string;
  type: 'lesson' | 'activity' | 'worksheet' | 'game';
  subject: string;
  gradeLevel: string;
  downloads: number;
  rating: number;
  author: string;
}

// Mock data
const mockPosts: Post[] = [
  {
    id: '1',
    author: { name: 'Sarah Thompson', role: 'Math Teacher', school: 'Lincoln Elementary' },
    title: 'Great strategies for teaching fractions to 4th graders',
    content:
      "I've found that using visual fraction tiles combined with the adaptive games really helps struggling learners. My students' scores improved 20% this month!",
    category: 'success-story',
    likes: 24,
    comments: 8,
    createdAt: '2 hours ago',
    isLiked: true,
  },
  {
    id: '2',
    author: { name: 'Michael Rodriguez', role: 'Special Ed Teacher', school: 'Oak Park Academy' },
    title: 'How do you handle focus breaks for kids with ADHD?',
    content:
      "I'm looking for advice on timing and types of focus breaks. The built-in breathing exercises are great, but I'm wondering what intervals work best for others.",
    category: 'question',
    likes: 15,
    comments: 12,
    createdAt: '5 hours ago',
  },
  {
    id: '3',
    author: { name: 'Emily Chen', role: 'Reading Specialist', school: 'Riverside School' },
    title: 'New phonics activity pack for K-2',
    content:
      'Just uploaded a collection of 15 phonics activities that integrate with the adaptive reading games. Great for differentiated instruction!',
    category: 'resource',
    likes: 42,
    comments: 6,
    createdAt: '1 day ago',
  },
  {
    id: '4',
    author: { name: 'David Park', role: '3rd Grade Teacher', school: 'Sunshine Elementary' },
    title: 'Team competitions - what works for you?',
    content:
      "I'm starting team competitions next week. Any tips on setting up fair teams and keeping motivation high throughout the week?",
    category: 'discussion',
    likes: 8,
    comments: 14,
    createdAt: '2 days ago',
  },
];

const mockResources: Resource[] = [
  {
    id: '1',
    title: 'Fraction Fundamentals Pack',
    type: 'lesson',
    subject: 'Math',
    gradeLevel: '3-5',
    downloads: 234,
    rating: 4.8,
    author: 'Sarah Thompson',
  },
  {
    id: '2',
    title: 'Reading Comprehension Strategies',
    type: 'activity',
    subject: 'Reading',
    gradeLevel: 'K-2',
    downloads: 189,
    rating: 4.6,
    author: 'Emily Chen',
  },
  {
    id: '3',
    title: 'Multiplication Practice Worksheets',
    type: 'worksheet',
    subject: 'Math',
    gradeLevel: '2-4',
    downloads: 156,
    rating: 4.5,
    author: 'Community',
  },
  {
    id: '4',
    title: 'Word Family Matching Game',
    type: 'game',
    subject: 'Reading',
    gradeLevel: 'K-1',
    downloads: 312,
    rating: 4.9,
    author: 'Community',
  },
];

const categoryConfig = {
  discussion: { label: 'Discussion', color: 'bg-blue-100 text-blue-700', icon: '💬' },
  resource: { label: 'Resource', color: 'bg-green-100 text-green-700', icon: '📦' },
  question: { label: 'Question', color: 'bg-amber-100 text-amber-700', icon: '❓' },
  'success-story': { label: 'Success Story', color: 'bg-purple-100 text-purple-700', icon: '🌟' },
};

const resourceTypeIcons = {
  lesson: '📚',
  activity: '🎯',
  worksheet: '📝',
  game: '🎮',
};

export default function CommunityPage() {
  const [activeTab, setActiveTab] = React.useState<'feed' | 'resources'>('feed');
  const [selectedCategory, setSelectedCategory] = React.useState<string | null>(null);

  const filteredPosts = selectedCategory
    ? mockPosts.filter((p) => p.category === selectedCategory)
    : mockPosts;

  return (
    <div>
      <PageHeader
        title="Teacher Community"
        description="Connect, share, and learn with fellow educators"
        actions={
          <button className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">
            + New Post
          </button>
        }
      />

      {/* Tabs */}
      <div className="mt-6 flex gap-4 border-b">
        <button
          onClick={() => {
            setActiveTab('feed');
          }}
          className={`pb-3 text-sm font-medium ${
            activeTab === 'feed'
              ? 'border-b-2 border-primary-600 text-primary-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Community Feed
        </button>
        <button
          onClick={() => {
            setActiveTab('resources');
          }}
          className={`pb-3 text-sm font-medium ${
            activeTab === 'resources'
              ? 'border-b-2 border-primary-600 text-primary-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Shared Resources
        </button>
      </div>

      {activeTab === 'feed' ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          {/* Main Feed */}
          <div className="lg:col-span-2 space-y-4">
            {/* Category Filters */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  setSelectedCategory(null);
                }}
                className={`rounded-full px-3 py-1 text-sm ${
                  !selectedCategory
                    ? 'bg-primary-100 text-primary-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              {Object.entries(categoryConfig).map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => {
                    setSelectedCategory(key);
                  }}
                  className={`rounded-full px-3 py-1 text-sm ${
                    selectedCategory === key
                      ? config.color
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {config.icon} {config.label}
                </button>
              ))}
            </div>

            {/* Posts */}
            {filteredPosts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Quick Stats */}
            <div className="rounded-xl border bg-white p-4">
              <h3 className="font-semibold text-gray-900">Your Community</h3>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-gray-50 p-3 text-center">
                  <p className="text-2xl font-bold text-primary-600">12</p>
                  <p className="text-xs text-gray-500">Posts</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3 text-center">
                  <p className="text-2xl font-bold text-primary-600">48</p>
                  <p className="text-xs text-gray-500">Comments</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3 text-center">
                  <p className="text-2xl font-bold text-primary-600">5</p>
                  <p className="text-xs text-gray-500">Resources Shared</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3 text-center">
                  <p className="text-2xl font-bold text-primary-600">127</p>
                  <p className="text-xs text-gray-500">Likes Received</p>
                </div>
              </div>
            </div>

            {/* Trending Topics */}
            <div className="rounded-xl border bg-white p-4">
              <h3 className="font-semibold text-gray-900">Trending Topics</h3>
              <div className="mt-3 space-y-2">
                {['#differentiation', '#focusbreaks', '#mathgames', '#readingstrategies'].map(
                  (tag) => (
                    <button
                      key={tag}
                      className="block w-full rounded-lg px-3 py-2 text-left text-sm text-primary-600 hover:bg-primary-50"
                    >
                      {tag}
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Resources Tab */
        <div className="mt-6">
          {/* Resource Filters */}
          <div className="flex flex-wrap items-center gap-4">
            <select className="rounded-lg border px-3 py-2 text-sm">
              <option>All Subjects</option>
              <option>Math</option>
              <option>Reading</option>
              <option>Science</option>
            </select>
            <select className="rounded-lg border px-3 py-2 text-sm">
              <option>All Grade Levels</option>
              <option>K-2</option>
              <option>3-5</option>
              <option>6-8</option>
            </select>
            <select className="rounded-lg border px-3 py-2 text-sm">
              <option>All Types</option>
              <option>Lessons</option>
              <option>Activities</option>
              <option>Worksheets</option>
              <option>Games</option>
            </select>
            <div className="flex-1" />
            <button className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50">
              📤 Upload Resource
            </button>
          </div>

          {/* Resources Grid */}
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {mockResources.map((resource) => (
              <ResourceCard key={resource.id} resource={resource} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PostCard({ post }: { post: Post }) {
  const config = categoryConfig[post.category];

  return (
    <div className="rounded-xl border bg-white p-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-sm font-medium text-primary-700">
            {post.author.name.charAt(0)}
          </div>
          <div>
            <p className="font-medium text-gray-900">{post.author.name}</p>
            <p className="text-xs text-gray-500">
              {post.author.role} · {post.author.school}
            </p>
          </div>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-xs ${config.color}`}>
          {config.icon} {config.label}
        </span>
      </div>

      {/* Content */}
      <div className="mt-3">
        <h3 className="font-semibold text-gray-900">{post.title}</h3>
        <p className="mt-1 text-sm text-gray-600">{post.content}</p>
      </div>

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between border-t pt-3">
        <div className="flex gap-4">
          <button
            className={`flex items-center gap-1 text-sm ${
              post.isLiked ? 'text-red-500' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {post.isLiked ? '❤️' : '🤍'} {post.likes}
          </button>
          <button className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
            💬 {post.comments}
          </button>
        </div>
        <span className="text-xs text-gray-400">{post.createdAt}</span>
      </div>
    </div>
  );
}

function ResourceCard({ resource }: { resource: Resource }) {
  return (
    <div className="rounded-xl border bg-white p-4 transition-shadow hover:shadow-md">
      <div className="text-3xl">{resourceTypeIcons[resource.type]}</div>

      <h3 className="mt-2 font-semibold text-gray-900">{resource.title}</h3>
      <p className="mt-1 text-sm text-gray-500">
        {resource.subject} · Grades {resource.gradeLevel}
      </p>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <span className="text-amber-500">★</span>
          <span className="text-sm font-medium">{resource.rating}</span>
        </div>
        <span className="text-xs text-gray-400">{resource.downloads} downloads</span>
      </div>

      <div className="mt-3 flex gap-2">
        <button className="flex-1 rounded-lg bg-primary-50 py-1.5 text-sm font-medium text-primary-700 hover:bg-primary-100">
          Preview
        </button>
        <button className="flex-1 rounded-lg border py-1.5 text-sm font-medium hover:bg-gray-50">
          Download
        </button>
      </div>
    </div>
  );
}
