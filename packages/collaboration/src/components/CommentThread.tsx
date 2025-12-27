/**
 * CommentThread Component
 *
 * Real-time threaded comments with:
 * - Nested replies
 * - Reactions
 * - Resolve/unresolve
 * - Real-time updates
 * - Position anchoring
 */

'use client';

import type { CSSProperties } from 'react';
import React, { useCallback, useState, useRef, useEffect } from 'react';

export interface Comment {
  id: string;
  content: string;
  userId: string;
  displayName: string;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: Date;
  reactions: CommentReaction[];
  replies: Comment[];
  position?: CommentPosition;
  targetType: string;
  targetId: string;
}

export interface CommentReaction {
  emoji: string;
  userIds: string[];
}

export interface CommentPosition {
  x?: number;
  y?: number;
  start?: number;
  end?: number;
  elementId?: string;
}

interface CommentThreadProps {
  comments: Comment[];
  currentUserId: string;
  onAddComment: (content: string, parentId?: string) => void;
  onResolve: (commentId: string, resolved: boolean) => void;
  onReaction: (commentId: string, emoji: string) => void;
  onEdit?: (commentId: string, content: string) => void;
  onDelete?: (commentId: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  emptyMessage?: string;
}

interface SingleCommentProps {
  comment: Comment;
  currentUserId: string;
  onReply: (content: string) => void;
  onResolve: (resolved: boolean) => void;
  onReaction: (emoji: string) => void;
  onEdit?: (content: string) => void;
  onDelete?: () => void;
  depth: number;
}

const QUICK_REACTIONS = ['👍', '❤️', '✅', '👀', '🤔', '🎉'];
const MAX_DEPTH = 3;

function formatTime(date: Date): string {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();

  // Less than a minute
  if (diff < 60000) return 'just now';

  // Less than an hour
  if (diff < 3600000) {
    const mins = Math.floor(diff / 60000);
    return `${mins}m ago`;
  }

  // Less than a day
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours}h ago`;
  }

  // Less than a week
  if (diff < 604800000) {
    const days = Math.floor(diff / 86400000);
    return `${days}d ago`;
  }

  return d.toLocaleDateString();
}

function getInitials(name: string): string {
  const parts = name.split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  const firstPart = parts.at(0);
  if (parts.length === 1) return firstPart?.charAt(0).toUpperCase() ?? '?';
  const lastPart = parts.at(-1);
  return ((firstPart?.charAt(0) ?? '') + (lastPart?.charAt(0) ?? '')).toUpperCase();
}

const SingleComment: React.FC<SingleCommentProps> = ({
  comment,
  currentUserId,
  onReply,
  onResolve,
  onReaction,
  onEdit,
  onDelete,
  depth,
}) => {
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [editContent, setEditContent] = useState(comment.content);
  const [showReactions, setShowReactions] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const isOwn = comment.userId === currentUserId;

  useEffect(() => {
    if (isReplying && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isReplying]);

  const handleSubmitReply = () => {
    if (!replyContent.trim()) return;
    onReply(replyContent.trim());
    setReplyContent('');
    setIsReplying(false);
  };

  const handleSubmitEdit = () => {
    if (!editContent.trim()) return;
    onEdit?.(editContent.trim());
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, action: () => void) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      action();
    }
    if (e.key === 'Escape') {
      setIsReplying(false);
      setIsEditing(false);
    }
  };

  const containerStyle: CSSProperties = {
    marginLeft: depth > 0 ? 24 : 0,
    borderLeft: depth > 0 ? '2px solid #E5E7EB' : 'none',
    paddingLeft: depth > 0 ? 12 : 0,
    marginBottom: 16,
  };

  const headerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  };

  const avatarStyle: CSSProperties = {
    width: 28,
    height: 28,
    borderRadius: '50%',
    backgroundColor: '#E5E7EB',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 11,
    fontWeight: 600,
    color: '#6B7280',
    flexShrink: 0,
  };

  const contentStyle: CSSProperties = {
    fontSize: 14,
    lineHeight: 1.5,
    color: '#374151',
    marginBottom: 8,
    opacity: comment.resolved ? 0.6 : 1,
    textDecoration: comment.resolved ? 'line-through' : 'none',
  };

  const actionsStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    fontSize: 12,
    color: '#6B7280',
  };

  const buttonStyle: CSSProperties = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: 12,
    color: '#6B7280',
    padding: 0,
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  };

  const reactionsContainerStyle: CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 8,
  };

  const reactionStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '2px 8px',
    borderRadius: 12,
    fontSize: 12,
    cursor: 'pointer',
    border: '1px solid #E5E7EB',
  };

  const textareaStyle: CSSProperties = {
    width: '100%',
    padding: 8,
    border: '1px solid #D1D5DB',
    borderRadius: 6,
    fontSize: 13,
    resize: 'none',
    minHeight: 60,
    fontFamily: 'inherit',
  };

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        {comment.avatarUrl ? (
          <img
            src={comment.avatarUrl}
            alt={comment.displayName}
            style={{ ...avatarStyle, objectFit: 'cover' }}
          />
        ) : (
          <div style={avatarStyle}>{getInitials(comment.displayName)}</div>
        )}
        <span style={{ fontWeight: 500, fontSize: 13, color: '#111827' }}>
          {comment.displayName}
        </span>
        <span style={{ fontSize: 12, color: '#9CA3AF' }}>{formatTime(comment.createdAt)}</span>
        {comment.resolved && (
          <span
            style={{
              fontSize: 11,
              backgroundColor: '#D1FAE5',
              color: '#065F46',
              padding: '1px 6px',
              borderRadius: 4,
            }}
          >
            Resolved
          </span>
        )}
      </div>

      {/* Content */}
      {isEditing ? (
        <div style={{ marginBottom: 8 }}>
          <textarea
            value={editContent}
            onChange={(e) => {
              setEditContent(e.target.value);
            }}
            onKeyDown={(e) => {
              handleKeyDown(e, handleSubmitEdit);
            }}
            style={textareaStyle}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button
              onClick={handleSubmitEdit}
              style={{
                ...buttonStyle,
                backgroundColor: '#3B82F6',
                color: 'white',
                padding: '4px 12px',
                borderRadius: 4,
              }}
            >
              Save
            </button>
            <button
              onClick={() => {
                setIsEditing(false);
                setEditContent(comment.content);
              }}
              style={{ ...buttonStyle, padding: '4px 12px' }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div style={contentStyle}>{comment.content}</div>
      )}

      {/* Reactions */}
      {comment.reactions.length > 0 && (
        <div style={reactionsContainerStyle}>
          {comment.reactions.map((reaction) => {
            const hasReacted = reaction.userIds.includes(currentUserId);
            return (
              <button
                key={reaction.emoji}
                onClick={() => {
                  onReaction(reaction.emoji);
                }}
                style={{
                  ...reactionStyle,
                  backgroundColor: hasReacted ? '#DBEAFE' : 'transparent',
                  borderColor: hasReacted ? '#3B82F6' : '#E5E7EB',
                }}
              >
                <span>{reaction.emoji}</span>
                <span style={{ fontWeight: 500 }}>{reaction.userIds.length}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Actions */}
      <div style={actionsStyle}>
        {depth < MAX_DEPTH && (
          <button
            style={buttonStyle}
            onClick={() => {
              setIsReplying(!isReplying);
            }}
          >
            Reply
          </button>
        )}
        <div style={{ position: 'relative' }}>
          <button
            style={buttonStyle}
            onClick={() => {
              setShowReactions(!showReactions);
            }}
          >
            😀
          </button>
          {showReactions && (
            <div
              style={{
                position: 'absolute',
                bottom: '100%',
                left: 0,
                backgroundColor: 'white',
                border: '1px solid #E5E7EB',
                borderRadius: 8,
                padding: 4,
                display: 'flex',
                gap: 4,
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                zIndex: 10,
              }}
            >
              {QUICK_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    onReaction(emoji);
                    setShowReactions(false);
                  }}
                  style={{
                    ...buttonStyle,
                    fontSize: 16,
                    padding: 4,
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          style={buttonStyle}
          onClick={() => {
            onResolve(!comment.resolved);
          }}
        >
          {comment.resolved ? 'Unresolve' : 'Resolve'}
        </button>
        {isOwn && onEdit && (
          <button
            style={buttonStyle}
            onClick={() => {
              setIsEditing(true);
            }}
          >
            Edit
          </button>
        )}
        {isOwn && onDelete && (
          <button
            style={{ ...buttonStyle, color: '#EF4444' }}
            onClick={() => {
              onDelete();
            }}
          >
            Delete
          </button>
        )}
      </div>

      {/* Reply Input */}
      {isReplying && (
        <div style={{ marginTop: 12 }}>
          <textarea
            ref={inputRef}
            value={replyContent}
            onChange={(e) => {
              setReplyContent(e.target.value);
            }}
            onKeyDown={(e) => {
              handleKeyDown(e, handleSubmitReply);
            }}
            placeholder="Write a reply..."
            style={textareaStyle}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button
              onClick={handleSubmitReply}
              disabled={!replyContent.trim()}
              style={{
                ...buttonStyle,
                backgroundColor: replyContent.trim() ? '#3B82F6' : '#E5E7EB',
                color: replyContent.trim() ? 'white' : '#9CA3AF',
                padding: '6px 12px',
                borderRadius: 4,
              }}
            >
              Reply
            </button>
            <button
              onClick={() => {
                setIsReplying(false);
                setReplyContent('');
              }}
              style={{ ...buttonStyle, padding: '6px 12px' }}
            >
              Cancel
            </button>
          </div>
          <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>
            Press Cmd+Enter to submit
          </div>
        </div>
      )}

      {/* Replies */}
      {comment.replies.length > 0 && (
        <div style={{ marginTop: 12 }}>
          {comment.replies.map((reply) => (
            <SingleComment
              key={reply.id}
              comment={reply}
              currentUserId={currentUserId}
              onReply={(content) => {
                onReply(content);
              }}
              onResolve={onResolve}
              onReaction={(emoji) => {
                onReaction(emoji);
              }}
              onEdit={onEdit}
              onDelete={onDelete}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const CommentThread: React.FC<CommentThreadProps> = ({
  comments,
  currentUserId,
  onAddComment,
  onResolve,
  onReaction,
  onEdit,
  onDelete,
  isLoading = false,
  placeholder = 'Add a comment...',
  emptyMessage = 'No comments yet',
}) => {
  const [newComment, setNewComment] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = useCallback(() => {
    if (!newComment.trim()) return;
    onAddComment(newComment.trim());
    setNewComment('');
  }, [newComment, onAddComment]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const containerStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: 'white',
  };

  const headerStyle: CSSProperties = {
    padding: 16,
    borderBottom: '1px solid #E5E7EB',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  };

  const listStyle: CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    padding: 16,
  };

  const inputContainerStyle: CSSProperties = {
    padding: 16,
    borderTop: '1px solid #E5E7EB',
  };

  const textareaStyle: CSSProperties = {
    width: '100%',
    padding: 12,
    border: '1px solid #D1D5DB',
    borderRadius: 8,
    fontSize: 14,
    resize: 'none',
    minHeight: 80,
    fontFamily: 'inherit',
  };

  const submitButtonStyle: CSSProperties = {
    marginTop: 8,
    padding: '8px 16px',
    backgroundColor: newComment.trim() ? '#3B82F6' : '#E5E7EB',
    color: newComment.trim() ? 'white' : '#9CA3AF',
    border: 'none',
    borderRadius: 6,
    cursor: newComment.trim() ? 'pointer' : 'not-allowed',
    fontWeight: 500,
    fontSize: 14,
  };

  // Count unresolved comments
  const unresolvedCount = comments.filter((c) => !c.resolved).length;

  // Helper function to render comment list content
  const renderCommentListContent = () => {
    if (isLoading) {
      return (
        <div style={{ textAlign: 'center', color: '#6B7280', padding: 32 }}>
          Loading comments...
        </div>
      );
    }

    if (comments.length === 0) {
      return (
        <div style={{ textAlign: 'center', color: '#6B7280', padding: 32 }}>{emptyMessage}</div>
      );
    }

    return comments.map((comment) => (
      <SingleComment
        key={comment.id}
        comment={comment}
        currentUserId={currentUserId}
        onReply={(content) => {
          onAddComment(content, comment.id);
        }}
        onResolve={(resolved) => {
          onResolve(comment.id, resolved);
        }}
        onReaction={(emoji) => {
          onReaction(comment.id, emoji);
        }}
        onEdit={
          onEdit
            ? (content) => {
                onEdit(comment.id, content);
              }
            : undefined
        }
        onDelete={
          onDelete
            ? () => {
                onDelete(comment.id);
              }
            : undefined
        }
        depth={0}
      />
    ));
  };

  // Helper to format count text
  const pluralizedComment = comments.length === 1 ? 'comment' : 'comments';
  const unresolvedText = unresolvedCount > 0 ? ` (${unresolvedCount} unresolved)` : '';

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Comments</h3>
          <span style={{ fontSize: 13, color: '#6B7280' }}>
            {comments.length} {pluralizedComment}
            {unresolvedText}
          </span>
        </div>
      </div>

      {/* Comment List */}
      <div style={listStyle}>{renderCommentListContent()}</div>

      {/* New Comment Input */}
      <div style={inputContainerStyle}>
        <textarea
          ref={textareaRef}
          value={newComment}
          onChange={(e) => {
            setNewComment(e.target.value);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          style={textareaStyle}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: '#9CA3AF' }}>Press Cmd+Enter to submit</span>
          <button onClick={handleSubmit} disabled={!newComment.trim()} style={submitButtonStyle}>
            Comment
          </button>
        </div>
      </div>
    </div>
  );
};

export default CommentThread;
