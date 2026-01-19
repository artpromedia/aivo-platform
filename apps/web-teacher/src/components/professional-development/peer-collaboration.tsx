'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Users,
  MessageCircle,
  Video,
  Calendar,
  UserPlus,
  Search,
  MapPin,
  Star,
  Clock,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Mentor {
  id: string;
  name: string;
  avatar?: string;
  title: string;
  school: string;
  subjects: string[];
  specialties: string[];
  experience: number;
  rating: number;
  sessionsCompleted: number;
  availability: 'available' | 'busy' | 'away';
  bio: string;
}

interface StudyGroup {
  id: string;
  name: string;
  description: string;
  topic: string;
  members: number;
  maxMembers: number;
  meetingTime: string;
  meetingDay: string;
  isJoined: boolean;
  nextMeeting?: string;
}

interface UpcomingSession {
  id: string;
  title: string;
  type: 'mentoring' | 'study-group' | 'workshop';
  date: string;
  time: string;
  duration: number;
  host: string;
  meetingUrl?: string;
}

interface PeerCollaborationProps {
  className?: string;
}

const mockMentors: Mentor[] = [
  {
    id: '1',
    name: 'Dr. Sarah Chen',
    title: 'Instructional Coach',
    school: 'Lincoln Elementary',
    subjects: ['Math', 'Science'],
    specialties: ['Differentiation', 'STEM Integration'],
    experience: 15,
    rating: 4.9,
    sessionsCompleted: 127,
    availability: 'available',
    bio: 'Passionate about helping teachers integrate inquiry-based learning.',
  },
  {
    id: '2',
    name: 'Michael Torres',
    title: 'Master Teacher',
    school: 'Jefferson Middle School',
    subjects: ['ELA', 'Social Studies'],
    specialties: ['Classroom Management', 'SEL'],
    experience: 12,
    rating: 4.8,
    sessionsCompleted: 89,
    availability: 'busy',
    bio: 'Helping new teachers thrive through practical strategies.',
  },
  {
    id: '3',
    name: 'Emily Watson',
    title: 'Technology Specialist',
    school: 'District Office',
    subjects: ['All Subjects'],
    specialties: ['Ed-Tech', 'Digital Learning'],
    experience: 8,
    rating: 4.7,
    sessionsCompleted: 156,
    availability: 'available',
    bio: 'Making technology accessible and meaningful for all classrooms.',
  },
];

const mockStudyGroups: StudyGroup[] = [
  {
    id: '1',
    name: 'Differentiation in Action',
    description: 'Weekly discussions on implementing differentiation strategies',
    topic: 'Instructional Strategies',
    members: 8,
    maxMembers: 12,
    meetingTime: '4:00 PM',
    meetingDay: 'Tuesday',
    isJoined: true,
    nextMeeting: '2025-01-21',
  },
  {
    id: '2',
    name: 'Math Workshop Group',
    description: 'Collaborative planning for engaging math lessons',
    topic: 'Mathematics',
    members: 6,
    maxMembers: 10,
    meetingTime: '3:30 PM',
    meetingDay: 'Thursday',
    isJoined: false,
  },
  {
    id: '3',
    name: 'New Teacher Support Circle',
    description: 'A safe space for new teachers to share experiences and get advice',
    topic: 'General Teaching',
    members: 15,
    maxMembers: 20,
    meetingTime: '5:00 PM',
    meetingDay: 'Wednesday',
    isJoined: false,
  },
];

const mockUpcomingSessions: UpcomingSession[] = [
  {
    id: '1',
    title: 'Mentoring Session with Dr. Sarah Chen',
    type: 'mentoring',
    date: '2025-01-20',
    time: '3:00 PM',
    duration: 30,
    host: 'Dr. Sarah Chen',
    meetingUrl: '#',
  },
  {
    id: '2',
    title: 'Differentiation in Action - Weekly Meeting',
    type: 'study-group',
    date: '2025-01-21',
    time: '4:00 PM',
    duration: 60,
    host: 'Differentiation in Action',
    meetingUrl: '#',
  },
];

const availabilityColors = {
  available: 'bg-green-100 text-green-700',
  busy: 'bg-yellow-100 text-yellow-700',
  away: 'bg-gray-100 text-gray-500',
};

const sessionTypeIcons = {
  mentoring: MessageCircle,
  'study-group': Users,
  workshop: Video,
};

export function PeerCollaboration({ className }: PeerCollaborationProps) {
  const [activeTab, setActiveTab] = useState<'mentors' | 'groups' | 'upcoming'>('mentors');
  const [mentors, setMentors] = useState<Mentor[]>(mockMentors);
  const [studyGroups, setStudyGroups] = useState<StudyGroup[]>(mockStudyGroups);
  const [upcomingSessions, setUpcomingSessions] = useState<UpcomingSession[]>(mockUpcomingSessions);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredMentors = mentors.filter(
    (mentor) =>
      !searchQuery ||
      mentor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mentor.specialties.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredGroups = studyGroups.filter(
    (group) =>
      !searchQuery ||
      group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      group.topic.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleJoinGroup = (groupId: string) => {
    setStudyGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, isJoined: true, members: g.members + 1 } : g))
    );
  };

  const handleLeaveGroup = (groupId: string) => {
    setStudyGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, isJoined: false, members: g.members - 1 } : g))
    );
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Peer Collaboration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Tab Navigation */}
        <div className="flex gap-2 border-b pb-2">
          <button
            onClick={() => setActiveTab('mentors')}
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded-t transition-colors',
              activeTab === 'mentors'
                ? 'bg-primary-100 text-primary-700 border-b-2 border-primary-500'
                : 'text-gray-600 hover:text-gray-900'
            )}
          >
            Find Mentors
          </button>
          <button
            onClick={() => setActiveTab('groups')}
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded-t transition-colors',
              activeTab === 'groups'
                ? 'bg-primary-100 text-primary-700 border-b-2 border-primary-500'
                : 'text-gray-600 hover:text-gray-900'
            )}
          >
            Study Groups
          </button>
          <button
            onClick={() => setActiveTab('upcoming')}
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded-t transition-colors',
              activeTab === 'upcoming'
                ? 'bg-primary-100 text-primary-700 border-b-2 border-primary-500'
                : 'text-gray-600 hover:text-gray-900'
            )}
          >
            Upcoming ({upcomingSessions.length})
          </button>
        </div>

        {/* Search */}
        {(activeTab === 'mentors' || activeTab === 'groups') && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder={activeTab === 'mentors' ? 'Search mentors...' : 'Search groups...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        )}

        {/* Mentors Tab */}
        {activeTab === 'mentors' && (
          <div className="space-y-3">
            {filteredMentors.map((mentor) => (
              <div
                key={mentor.id}
                className="border rounded-lg p-3 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                    {mentor.avatar ? (
                      <img
                        src={mentor.avatar}
                        alt={mentor.name}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-lg font-medium text-primary-600">
                        {mentor.name.charAt(0)}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-gray-900">{mentor.name}</h4>
                      <Badge className={availabilityColors[mentor.availability]}>
                        {mentor.availability}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">{mentor.title}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {mentor.school}
                      </span>
                      <span className="flex items-center gap-1">
                        <Star className="h-3 w-3 text-yellow-500" />
                        {mentor.rating}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {mentor.specialties.slice(0, 2).map((specialty) => (
                        <Badge key={specialty} variant="outline" className="text-xs">
                          {specialty}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={mentor.availability === 'available' ? 'default' : 'outline'}
                    disabled={mentor.availability === 'away'}
                  >
                    <Calendar className="h-3 w-3 mr-1" />
                    Book
                  </Button>
                </div>
              </div>
            ))}
            {filteredMentors.length === 0 && (
              <div className="text-center py-6 text-gray-500">
                <Users className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">No mentors found</p>
              </div>
            )}
          </div>
        )}

        {/* Study Groups Tab */}
        {activeTab === 'groups' && (
          <div className="space-y-3">
            {filteredGroups.map((group) => (
              <div
                key={group.id}
                className={cn(
                  'border rounded-lg p-3 transition-shadow',
                  group.isJoined && 'border-primary-200 bg-primary-50/30'
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-gray-900">{group.name}</h4>
                      {group.isJoined && (
                        <Badge className="bg-primary-100 text-primary-700">Joined</Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{group.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {group.members}/{group.maxMembers} members
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {group.meetingDay}s at {group.meetingTime}
                      </span>
                    </div>
                    {group.isJoined && group.nextMeeting && (
                      <p className="text-xs text-primary-600 mt-2">
                        Next meeting: {formatDate(group.nextMeeting)}
                      </p>
                    )}
                  </div>
                  {group.isJoined ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleLeaveGroup(group.id)}
                    >
                      Leave
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleJoinGroup(group.id)}
                      disabled={group.members >= group.maxMembers}
                    >
                      <UserPlus className="h-3 w-3 mr-1" />
                      Join
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {filteredGroups.length === 0 && (
              <div className="text-center py-6 text-gray-500">
                <Users className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">No study groups found</p>
              </div>
            )}
          </div>
        )}

        {/* Upcoming Sessions Tab */}
        {activeTab === 'upcoming' && (
          <div className="space-y-3">
            {upcomingSessions.length > 0 ? (
              upcomingSessions.map((session) => {
                const Icon = sessionTypeIcons[session.type];
                return (
                  <div
                    key={session.id}
                    className="border rounded-lg p-3 hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center flex-shrink-0">
                        <Icon className="h-5 w-5 text-primary-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 text-sm">{session.title}</h4>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                          <span>{formatDate(session.date)}</span>
                          <span>{session.time}</span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {session.duration} min
                          </span>
                        </div>
                      </div>
                      {session.meetingUrl && (
                        <Button size="sm" variant="outline" asChild>
                          <a href={session.meetingUrl} target="_blank" rel="noopener noreferrer">
                            <Video className="h-3 w-3 mr-1" />
                            Join
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-6 text-gray-500">
                <Calendar className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">No upcoming sessions</p>
                <Button variant="link" size="sm" className="mt-2">
                  Schedule a mentoring session
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Quick Actions */}
        <div className="pt-3 border-t">
          <Button variant="outline" className="w-full" size="sm">
            Browse All Collaboration Opportunities
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default PeerCollaboration;
