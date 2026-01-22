'use client';

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@aivo/ui-web';
import { useState } from 'react';
import { 
  Search, 
  MessageSquare,
  ThumbsUp,
  Eye,
  Pin,
  Plus,
  Send,
} from 'lucide-react';
import {
  useForumPosts,
  useForumPost,
  useForumReplies,
  useCreateForumPost,
  useCreateForumReply,
  useToggleForumLike,
} from '@/hooks/use-community-support';
import type { ForumCategory } from '@/lib/api/community-support-api';

export function ParentForum() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ForumCategory | undefined>();
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [showNewPost, setShowNewPost] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostCategory, setNewPostCategory] = useState<ForumCategory>('general');
  const [replyContent, setReplyContent] = useState('');

  const { data: posts, isLoading } = useForumPosts({ search, category: categoryFilter });
  const { data: selectedPost } = useForumPost(selectedPostId || '');
  const { data: replies } = useForumReplies(selectedPostId || '');
  
  const createPost = useCreateForumPost();
  const createReply = useCreateForumReply();
  const toggleLike = useToggleForumLike();

  const handleCreatePost = () => {
    if (!newPostTitle || !newPostContent) return;
    
    createPost.mutate({
      title: newPostTitle,
      content: newPostContent,
      category: newPostCategory,
      tags: [],
    }, {
      onSuccess: () => {
        setShowNewPost(false);
        setNewPostTitle('');
        setNewPostContent('');
      },
    });
  };

  const handleCreateReply = () => {
    if (!replyContent || !selectedPostId) return;
    
    createReply.mutate({ postId: selectedPostId, content: replyContent }, {
      onSuccess: () => {
        setReplyContent('');
      },
    });
  };

  const handleLikePost = (postId: string) => {
    toggleLike.mutate({ id: postId, type: 'post' });
  };

  const handleLikeReply = (replyId: string) => {
    toggleLike.mutate({ id: replyId, type: 'reply' });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Community Forum</CardTitle>
            <Dialog open={showNewPost} onOpenChange={setShowNewPost}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Discussion
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Start a New Discussion</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    placeholder="Discussion title..."
                    value={newPostTitle}
                    onChange={(e) => setNewPostTitle(e.target.value)}
                  />
                  <Select
                    value={newPostCategory}
                    onValueChange={(value) => setNewPostCategory(value as ForumCategory)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="learning-support">Learning Support</SelectItem>
                      <SelectItem value="behavior">Behavior</SelectItem>
                      <SelectItem value="iep">IEP & 504</SelectItem>
                      <SelectItem value="social-emotional">Social-Emotional</SelectItem>
                      <SelectItem value="transition">Transition Planning</SelectItem>
                    </SelectContent>
                  </Select>
                  <Textarea
                    placeholder="Share your thoughts..."
                    value={newPostContent}
                    onChange={(e) => setNewPostContent(e.target.value)}
                    rows={6}
                  />
                  <Button onClick={handleCreatePost} disabled={createPost.isPending}>
                    {createPost.isPending ? 'Posting...' : 'Post Discussion'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search discussions..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              value={categoryFilter}
              onValueChange={(value) => setCategoryFilter(value as ForumCategory || undefined)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="learning-support">Learning Support</SelectItem>
                <SelectItem value="behavior">Behavior</SelectItem>
                <SelectItem value="iep">IEP & 504</SelectItem>
                <SelectItem value="social-emotional">Social-Emotional</SelectItem>
                <SelectItem value="transition">Transition Planning</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="text-center py-8">Loading discussions...</div>
      ) : (
        <div className="space-y-3">
          {posts?.map((post) => (
            <Card
              key={post.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelectedPostId(post.id)}
            >
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <Avatar>
                    <AvatarImage src={post.authorAvatar} />
                    <AvatarFallback>{post.authorName[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {post.isPinned && <Pin className="h-4 w-4 text-primary" />}
                          <h3 className="font-semibold line-clamp-1">{post.title}</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          by {post.authorName} • {new Date(post.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant="outline">{post.category}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {post.content}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <MessageSquare className="h-4 w-4" />
                        <span>{post.replyCount} replies</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <ThumbsUp className={`h-4 w-4 ${post.isLiked ? 'fill-primary text-primary' : ''}`} />
                        <span>{post.likeCount}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Eye className="h-4 w-4" />
                        <span>{post.viewCount} views</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selectedPostId} onOpenChange={() => setSelectedPostId(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          {selectedPost && (
            <div className="space-y-6">
              <DialogHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <DialogTitle className="text-2xl mb-2">{selectedPost.title}</DialogTitle>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={selectedPost.authorAvatar} />
                        <AvatarFallback>{selectedPost.authorName[0]}</AvatarFallback>
                      </Avatar>
                      <div className="text-sm">
                        <p className="font-medium">{selectedPost.authorName}</p>
                        <p className="text-muted-foreground">
                          {new Date(selectedPost.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                  <Badge>{selectedPost.category}</Badge>
                </div>
              </DialogHeader>

              <div className="prose prose-sm max-w-none">
                <p className="whitespace-pre-wrap">{selectedPost.content}</p>
              </div>

              <div className="flex items-center gap-4 pt-4 border-t">
                <Button
                  variant={selectedPost.isLiked ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => handleLikePost(selectedPost.id)}>
                  <ThumbsUp className="h-4 w-4 mr-2" />
                  {selectedPost.likeCount} Likes
                </Button>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Eye className="h-4 w-4" />
                  <span>{selectedPost.viewCount} views</span>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold">
                  {selectedPost.replyCount} {selectedPost.replyCount === 1 ? 'Reply' : 'Replies'}
                </h3>
                {replies?.map((reply) => (
                  <div key={reply.id} className="flex gap-3 p-4 rounded-lg border">
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarImage src={reply.authorAvatar} />
                      <AvatarFallback>{reply.authorName[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <p className="font-medium text-sm">{reply.authorName}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(reply.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        {(reply.isExpertAnswer || reply.isBestAnswer) && (
                          <Badge variant="secondary">
                            {reply.isBestAnswer ? 'Best Answer' : 'Expert'}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm whitespace-pre-wrap mb-2">{reply.content}</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleLikeReply(reply.id)}
                      >
                        <ThumbsUp className={`h-3 w-3 mr-1 ${reply.isLiked ? 'fill-primary text-primary' : ''}`} />
                        {reply.likeCount}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2 pt-4 border-t">
                <h3 className="font-semibold">Add a Reply</h3>
                <Textarea
                  placeholder="Share your thoughts..."
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  rows={4}
                />
                <Button onClick={handleCreateReply} disabled={createReply.isPending}>
                  <Send className="h-4 w-4 mr-2" />
                  {createReply.isPending ? 'Posting...' : 'Post Reply'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
