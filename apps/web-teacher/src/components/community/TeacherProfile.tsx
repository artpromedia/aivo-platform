/**
 * Teacher Profile Component
 *
 * Display teacher profile with content portfolio, stats,
 * and follow functionality.
 */

'use client';

import {
  User,
  MapPin,
  Building2,
  Users,
  FileText,
  Star,
  Download,
  Eye,
  UserPlus,
  UserMinus,
  Settings,
  Share2,
} from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

interface TeacherProfileData {
  userId: string;
  displayName?: string;
  bio?: string;
  school?: string;
  district?: string;
  subjects: string[];
  gradeBands: string[];
  avatarUrl?: string;
  stats: {
    sharedContentCount: number;
    followerCount: number;
    followingCount: number;
    collectionCount: number;
    totalDownloads: number;
    totalViews: number;
    averageRating?: number;
  };
  isFollowing?: boolean;
}

interface SharedContent {
  id: string;
  learningObject: {
    id: string;
    title: string;
    subject: string;
    gradeBand: string;
    tags: string[];
  };
  visibility: string;
  description?: string;
  downloadCount: number;
  viewCount: number;
  forkCount: number;
  averageRating?: number;
  reviewCount: number;
  createdAt: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

interface TeacherProfileProps {
  userId: string;
  isOwnProfile?: boolean;
  onEditProfile?: () => void;
  className?: string;
}

export function TeacherProfile({
  userId,
  isOwnProfile = false,
  onEditProfile,
  className,
}: TeacherProfileProps) {
  const [profile, setProfile] = React.useState<TeacherProfileData | null>(null);
  const [content, setContent] = React.useState<SharedContent[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isFollowing, setIsFollowing] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<'content' | 'followers' | 'following'>(
    'content'
  );

  // Fetch profile data
  React.useEffect(() => {
    const fetchProfile = async () => {
      try {
        const endpoint = isOwnProfile
          ? '/api/content-authoring/teachers/me/profile'
          : `/api/content-authoring/teachers/${userId}/profile`;

        const response = await fetch(endpoint);
        if (!response.ok) throw new Error('Failed to fetch profile');

        const data = await response.json();
        setProfile(data);
        setIsFollowing(data.isFollowing || false);
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId, isOwnProfile]);

  // Fetch teacher's content
  React.useEffect(() => {
    const fetchContent = async () => {
      try {
        const response = await fetch(`/api/content-authoring/teachers/${userId}/content`);
        if (!response.ok) throw new Error('Failed to fetch content');

        const data = await response.json();
        setContent(data.items || []);
      } catch (error) {
        console.error('Error fetching content:', error);
      }
    };

    if (activeTab === 'content') {
      fetchContent();
    }
  }, [userId, activeTab]);

  const handleFollowToggle = async () => {
    try {
      const method = isFollowing ? 'DELETE' : 'POST';
      const response = await fetch(`/api/content-authoring/teachers/${userId}/follow`, {
        method,
      });

      if (!response.ok) throw new Error('Failed to update follow status');

      setIsFollowing(!isFollowing);

      // Update follower count in profile
      if (profile) {
        setProfile({
          ...profile,
          stats: {
            ...profile.stats,
            followerCount: profile.stats.followerCount + (isFollowing ? -1 : 1),
          },
        });
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <User className="h-12 w-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600">Profile not found</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Profile Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-start gap-6">
          {/* Avatar */}
          <div className="flex-shrink-0">
            {profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt={profile.displayName || 'Teacher'}
                className="h-24 w-24 rounded-full object-cover border-2 border-gray-200"
              />
            ) : (
              <div className="h-24 w-24 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
                <User className="h-12 w-12 text-white" />
              </div>
            )}
          </div>

          {/* Profile Info */}
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {profile.displayName || 'Teacher'}
                </h1>
                {profile.bio && <p className="text-gray-600 mt-2">{profile.bio}</p>}

                {/* Location & Subjects */}
                <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-600">
                  {profile.school && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      <span>{profile.school}</span>
                    </div>
                  )}
                  {profile.district && (
                    <div className="flex items-center gap-1">
                      <Building2 className="h-4 w-4" />
                      <span>{profile.district}</span>
                    </div>
                  )}
                </div>

                {/* Subjects & Grade Bands */}
                {(profile.subjects.length > 0 || profile.gradeBands.length > 0) && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {profile.subjects.map((subject) => (
                      <span
                        key={subject}
                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium"
                      >
                        {subject}
                      </span>
                    ))}
                    {profile.gradeBands.map((grade) => (
                      <span
                        key={grade}
                        className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium"
                      >
                        {grade.replace('_', '-')}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                {isOwnProfile ? (
                  <button
                    onClick={onEditProfile}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                  >
                    <Settings className="h-4 w-4" />
                    Edit Profile
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleFollowToggle}
                      className={cn(
                        'px-4 py-2 rounded-lg transition-colors flex items-center gap-2 font-medium',
                        isFollowing
                          ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          : 'bg-primary-600 text-white hover:bg-primary-700'
                      )}
                    >
                      {isFollowing ? (
                        <>
                          <UserMinus className="h-4 w-4" />
                          Unfollow
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-4 w-4" />
                          Follow
                        </>
                      )}
                    </button>
                    <button
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                      aria-label="Share profile"
                    >
                      <Share2 className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mt-6 pt-6 border-t border-gray-200">
          <StatCard
            label="Content"
            value={profile.stats.sharedContentCount}
            icon={FileText}
          />
          <StatCard label="Followers" value={profile.stats.followerCount} icon={Users} />
          <StatCard label="Following" value={profile.stats.followingCount} icon={Users} />
          <StatCard label="Downloads" value={profile.stats.totalDownloads} icon={Download} />
          <StatCard label="Views" value={profile.stats.totalViews} icon={Eye} />
          {profile.stats.averageRating && (
            <StatCard
              label="Avg Rating"
              value={profile.stats.averageRating.toFixed(1)}
              icon={Star}
              iconClassName="fill-yellow-400 text-yellow-400"
            />
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex gap-8 px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('content')}
              className={cn(
                'py-4 px-1 border-b-2 font-medium text-sm transition-colors',
                activeTab === 'content'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              Shared Content ({profile.stats.sharedContentCount})
            </button>
            <button
              onClick={() => setActiveTab('followers')}
              className={cn(
                'py-4 px-1 border-b-2 font-medium text-sm transition-colors',
                activeTab === 'followers'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              Followers ({profile.stats.followerCount})
            </button>
            <button
              onClick={() => setActiveTab('following')}
              className={cn(
                'py-4 px-1 border-b-2 font-medium text-sm transition-colors',
                activeTab === 'following'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              Following ({profile.stats.followingCount})
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'content' && (
            <div className="space-y-4">
              {content.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No content shared yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {content.map((item) => (
                    <ContentCard key={item.id} content={item} />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'followers' && (
            <div className="text-center py-12 text-gray-600">
              Followers list coming soon...
            </div>
          )}

          {activeTab === 'following' && (
            <div className="text-center py-12 text-gray-600">
              Following list coming soon...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// STAT CARD
// ══════════════════════════════════════════════════════════════════════════════

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  iconClassName?: string;
}

function StatCard({ label, value, icon: Icon, iconClassName }: StatCardProps) {
  return (
    <div className="text-center">
      <div className="flex items-center justify-center mb-1">
        <Icon className={cn('h-5 w-5 text-gray-400', iconClassName)} />
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-xs text-gray-600">{label}</div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// CONTENT CARD
// ══════════════════════════════════════════════════════════════════════════════

interface ContentCardProps {
  content: SharedContent;
}

function ContentCard({ content }: ContentCardProps) {
  const subjectColors: Record<string, string> = {
    ELA: 'bg-blue-100 text-blue-700',
    MATH: 'bg-purple-100 text-purple-700',
    SCIENCE: 'bg-green-100 text-green-700',
    SEL: 'bg-pink-100 text-pink-700',
    SPEECH: 'bg-orange-100 text-orange-700',
    OTHER: 'bg-gray-100 text-gray-700',
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-medium text-gray-900 line-clamp-2 flex-1">
          {content.learningObject.title}
        </h4>
        <span
          className={cn(
            'text-xs px-2 py-0.5 rounded-full font-medium ml-2 flex-shrink-0',
            subjectColors[content.learningObject.subject] || subjectColors.OTHER
          )}
        >
          {content.learningObject.subject}
        </span>
      </div>

      {content.description && (
        <p className="text-sm text-gray-600 line-clamp-2 mb-3">{content.description}</p>
      )}

      <div className="flex items-center gap-4 text-xs text-gray-500">
        {content.averageRating && (
          <div className="flex items-center gap-1">
            <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
            <span>{content.averageRating.toFixed(1)}</span>
          </div>
        )}
        <div className="flex items-center gap-1">
          <Download className="h-3.5 w-3.5" />
          <span>{content.downloadCount}</span>
        </div>
        <div className="flex items-center gap-1">
          <Eye className="h-3.5 w-3.5" />
          <span>{content.viewCount}</span>
        </div>
      </div>
    </div>
  );
}
