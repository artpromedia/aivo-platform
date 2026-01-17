'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Search, 
  Users,
  MessageSquare,
  ThumbsUp,
  Send,
  UserPlus,
  UserMinus,
} from 'lucide-react';
import {
  useSupportGroups,
  useSupportGroup,
  useGroupPosts,
  useGroupComments,
  useJoinGroup,
  useLeaveGroup,
  useCreateGroupPost,
  useCreateGroupComment,
  useToggleGroupLike,
} from '@/hooks/use-community-support';
import type { GroupCategory, GroupType } from '@/lib/api/community-support-api';

export function SupportGroups() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<GroupCategory | undefined>();
  const [typeFilter, setTypeFilter] = useState<GroupType | undefined>();
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [newPostContent, setNewPostContent] = useState('');
  const [newCommentContent, setNewCommentContent] = useState('');

  const { data: groups, isLoading } = useSupportGroups({ search, category: categoryFilter, type: typeFilter });
  const { data: selectedGroup } = useSupportGroup(selectedGroupId || '');
  const { data: posts } = useGroupPosts(selectedGroupId || '');
  const { data: comments } = useGroupComments(selectedPostId || '');
  
  const joinGroup = useJoinGroup();
  const leaveGroup = useLeaveGroup();
  const createPost = useCreateGroupPost();
  const createComment = useCreateGroupComment();
  const toggleLike = useToggleGroupLike();

  const handleJoinGroup = (groupId: string) => {
    joinGroup.mutate(groupId);
  };

  const handleLeaveGroup = (groupId: string) => {
    leaveGroup.mutate(groupId);
  };

  const handleCreatePost = () => {
    if (!newPostContent || !selectedGroupId) return;
    
    createPost.mutate({ groupId: selectedGroupId, content: newPostContent }, {
      onSuccess: () => {
        setNewPostContent('');
      },
    });
  };

  const handleCreateComment = () => {
    if (!newCommentContent || !selectedPostId) return;
    
    createComment.mutate({ postId: selectedPostId, content: newCommentContent }, {
      onSuccess: () => {
        setNewCommentContent('');
      },
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Support Groups</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search groups..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Select
                value={categoryFilter}
                onValueChange={(value) => setCategoryFilter(value as GroupCategory || undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="diagnosis-specific">Diagnosis Specific</SelectItem>
                  <SelectItem value="age-specific">Age Specific</SelectItem>
                  <SelectItem value="topic-specific">Topic Specific</SelectItem>
                  <SelectItem value="local">Local Groups</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={typeFilter}
                onValueChange={(value) => setTypeFilter(value as GroupType || undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Group Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                  <SelectItem value="moderated">Moderated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="text-center py-8">Loading groups...</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {groups?.map((group) => (
            <Card key={group.id} className="flex flex-col">
              {group.coverImageUrl && (
                <div className="aspect-video bg-muted overflow-hidden">
                  <img
                    src={group.coverImageUrl}
                    alt={group.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <CardHeader>
                <CardTitle className="text-lg line-clamp-2">{group.name}</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                  {group.description}
                </p>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{group.memberCount.toLocaleString()} members</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MessageSquare className="h-4 w-4" />
                    <span>{group.postCount.toLocaleString()} posts</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge variant="outline">{group.type}</Badge>
                  <Badge variant="secondary">{group.category}</Badge>
                </div>
                <div className="flex gap-2 mt-auto">
                  {group.isMember ? (
                    <>
                      <Button
                        onClick={() => setSelectedGroupId(group.id)}
                        className="flex-1"
                      >
                        View Group
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleLeaveGroup(group.id)}
                      >
                        <UserMinus className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <Button
                      onClick={() => handleJoinGroup(group.id)}
                      className="w-full"
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Join Group
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selectedGroupId} onOpenChange={() => setSelectedGroupId(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          {selectedGroup && (
            <div className="space-y-6">
              <DialogHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <DialogTitle className="text-2xl mb-2">{selectedGroup.name}</DialogTitle>
                    <p className="text-sm text-muted-foreground mb-2">{selectedGroup.description}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        <span>{selectedGroup.memberCount.toLocaleString()} members</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageSquare className="h-4 w-4" />
                        <span>{selectedGroup.postCount.toLocaleString()} posts</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Badge>{selectedGroup.type}</Badge>
                    <Badge variant="secondary">{selectedGroup.category}</Badge>
                  </div>
                </div>
              </DialogHeader>

              {selectedGroup.isMember && (
                <div className="space-y-2 p-4 rounded-lg border bg-muted/50">
                  <h3 className="font-semibold text-sm">Share with the group</h3>
                  <Textarea
                    placeholder="What's on your mind?"
                    value={newPostContent}
                    onChange={(e) => setNewPostContent(e.target.value)}
                    rows={3}
                  />
                  <Button onClick={handleCreatePost} disabled={createPost.isPending}>
                    <Send className="h-4 w-4 mr-2" />
                    {createPost.isPending ? 'Posting...' : 'Post'}
                  </Button>
                </div>
              )}

              <div className="space-y-4">
                <h3 className="font-semibold">Recent Posts</h3>
                {posts?.map((post) => (
                  <div key={post.id} className="p-4 rounded-lg border">
                    <div className="flex gap-3">
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarImage src={post.authorAvatar} />
                        <AvatarFallback>{post.authorName[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="mb-2">
                          <p className="font-medium text-sm">{post.authorName}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(post.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <p className="text-sm whitespace-pre-wrap mb-3">{post.content}</p>
                        
                        {post.attachments && post.attachments.length > 0 && (
                          <div className="mb-3 grid gap-2 grid-cols-2">
                            {post.attachments.map((attachment, idx) => (
                              <div key={idx} className="rounded-lg border overflow-hidden">
                                {attachment.type === 'image' ? (
                                  <img
                                    src={attachment.url}
                                    alt={attachment.name}
                                    className="w-full h-32 object-cover"
                                  />
                                ) : (
                                  <div className="p-3 bg-muted">
                                    <p className="text-sm font-medium truncate">{attachment.name}</p>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center gap-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleLike.mutate({ id: post.id, type: 'post' })}
                          >
                            <ThumbsUp className={`h-3 w-3 mr-1 ${post.isLiked ? 'fill-primary text-primary' : ''}`} />
                            {post.likeCount}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedPostId(post.id)}
                          >
                            <MessageSquare className="h-3 w-3 mr-1" />
                            {post.commentCount}
                          </Button>
                        </div>

                        {selectedPostId === post.id && comments && (
                          <div className="mt-4 space-y-3 pl-4 border-l-2">
                            {comments.map((comment) => (
                              <div key={comment.id} className="flex gap-2">
                                <Avatar className="h-6 w-6 flex-shrink-0">
                                  <AvatarImage src={comment.authorAvatar} />
                                  <AvatarFallback>{comment.authorName[0]}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                  <div className="bg-muted rounded-lg p-2">
                                    <p className="font-medium text-xs">{comment.authorName}</p>
                                    <p className="text-sm">{comment.content}</p>
                                  </div>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => toggleLike.mutate({ id: comment.id, type: 'comment' })}
                                    >
                                      <ThumbsUp className={`h-2 w-2 mr-1 ${comment.isLiked ? 'fill-primary text-primary' : ''}`} />
                                      <span className="text-xs">{comment.likeCount}</span>
                                    </Button>
                                    <span className="text-xs text-muted-foreground">
                                      {new Date(comment.createdAt).toLocaleDateString()}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                            <div className="flex gap-2">
                              <Textarea
                                placeholder="Write a comment..."
                                value={newCommentContent}
                                onChange={(e) => setNewCommentContent(e.target.value)}
                                rows={2}
                                className="text-sm"
                              />
                              <Button
                                size="sm"
                                onClick={handleCreateComment}
                                disabled={createComment.isPending}
                              >
                                <Send className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
