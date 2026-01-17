import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '@/lib/api/community-support-api';

// Forum hooks
export function useForumPosts(filters?: {
  category?: api.ForumCategory;
  search?: string;
  status?: api.PostStatus;
}) {
  return useQuery({
    queryKey: ['forum-posts', filters],
    queryFn: () => api.getForumPosts(filters),
  });
}

export function useForumPost(id: string) {
  return useQuery({
    queryKey: ['forum-post', id],
    queryFn: () => api.getForumPost(id),
    enabled: !!id,
  });
}

export function useCreateForumPost() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: {
      title: string;
      content: string;
      category: api.ForumCategory;
      tags: string[];
    }) => api.createForumPost(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forum-posts'] });
    },
  });
}

export function useForumReplies(postId: string) {
  return useQuery({
    queryKey: ['forum-replies', postId],
    queryFn: () => api.getForumReplies(postId),
    enabled: !!postId,
  });
}

export function useCreateForumReply() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ postId, content }: { postId: string; content: string }) =>
      api.createForumReply(postId, content),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['forum-replies', variables.postId] });
      queryClient.invalidateQueries({ queryKey: ['forum-post', variables.postId] });
      queryClient.invalidateQueries({ queryKey: ['forum-posts'] });
    },
  });
}

export function useToggleForumLike() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, type }: { id: string; type: 'post' | 'reply' }) =>
      api.toggleForumLike(id, type),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forum-posts'] });
      queryClient.invalidateQueries({ queryKey: ['forum-post'] });
      queryClient.invalidateQueries({ queryKey: ['forum-replies'] });
    },
  });
}

// Q&A hooks
export function useQuestions(filters?: {
  category?: api.QuestionCategory;
  search?: string;
  status?: api.QuestionStatus;
}) {
  return useQuery({
    queryKey: ['questions', filters],
    queryFn: () => api.getQuestions(filters),
  });
}

export function useQuestion(id: string) {
  return useQuery({
    queryKey: ['question', id],
    queryFn: () => api.getQuestion(id),
    enabled: !!id,
  });
}

export function useCreateQuestion() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: {
      title: string;
      content: string;
      category: api.QuestionCategory;
      tags: string[];
    }) => api.createQuestion(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
    },
  });
}

export function useAnswers(questionId: string) {
  return useQuery({
    queryKey: ['answers', questionId],
    queryFn: () => api.getAnswers(questionId),
    enabled: !!questionId,
  });
}

export function useCreateAnswer() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ questionId, content }: { questionId: string; content: string }) =>
      api.createAnswer(questionId, content),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['answers', variables.questionId] });
      queryClient.invalidateQueries({ queryKey: ['question', variables.questionId] });
      queryClient.invalidateQueries({ queryKey: ['questions'] });
    },
  });
}

export function useMarkBestAnswer() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ questionId, answerId }: { questionId: string; answerId: string }) =>
      api.markBestAnswer(questionId, answerId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['answers', variables.questionId] });
      queryClient.invalidateQueries({ queryKey: ['question', variables.questionId] });
      queryClient.invalidateQueries({ queryKey: ['questions'] });
    },
  });
}

export function useToggleQuestionLike() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, type }: { id: string; type: 'question' | 'answer' }) =>
      api.toggleQuestionLike(id, type),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      queryClient.invalidateQueries({ queryKey: ['question'] });
      queryClient.invalidateQueries({ queryKey: ['answers'] });
    },
  });
}

// Support Groups hooks
export function useSupportGroups(filters?: {
  category?: api.GroupCategory;
  search?: string;
  type?: api.GroupType;
}) {
  return useQuery({
    queryKey: ['support-groups', filters],
    queryFn: () => api.getSupportGroups(filters),
  });
}

export function useSupportGroup(id: string) {
  return useQuery({
    queryKey: ['support-group', id],
    queryFn: () => api.getSupportGroup(id),
    enabled: !!id,
  });
}

export function useJoinGroup() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (groupId: string) => api.joinGroup(groupId),
    onSuccess: (_, groupId) => {
      queryClient.invalidateQueries({ queryKey: ['support-group', groupId] });
      queryClient.invalidateQueries({ queryKey: ['support-groups'] });
    },
  });
}

export function useLeaveGroup() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (groupId: string) => api.leaveGroup(groupId),
    onSuccess: (_, groupId) => {
      queryClient.invalidateQueries({ queryKey: ['support-group', groupId] });
      queryClient.invalidateQueries({ queryKey: ['support-groups'] });
    },
  });
}

export function useGroupPosts(groupId: string) {
  return useQuery({
    queryKey: ['group-posts', groupId],
    queryFn: () => api.getGroupPosts(groupId),
    enabled: !!groupId,
  });
}

export function useCreateGroupPost() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ groupId, content }: { groupId: string; content: string }) =>
      api.createGroupPost(groupId, content),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['group-posts', variables.groupId] });
      queryClient.invalidateQueries({ queryKey: ['support-group', variables.groupId] });
    },
  });
}

export function useGroupComments(postId: string) {
  return useQuery({
    queryKey: ['group-comments', postId],
    queryFn: () => api.getGroupComments(postId),
    enabled: !!postId,
  });
}

export function useCreateGroupComment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ postId, content }: { postId: string; content: string }) =>
      api.createGroupComment(postId, content),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['group-comments', variables.postId] });
      queryClient.invalidateQueries({ queryKey: ['group-posts'] });
    },
  });
}

export function useToggleGroupLike() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, type }: { id: string; type: 'post' | 'comment' }) =>
      api.toggleGroupLike(id, type),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-posts'] });
      queryClient.invalidateQueries({ queryKey: ['group-comments'] });
    },
  });
}
