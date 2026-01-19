/**
 * Compose Message Component
 *
 * Modal dialog for composing and sending new messages to teachers.
 * Supports selecting teacher, child, subject, and message content.
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Send, User, Search, Paperclip, Loader2 } from 'lucide-react';

interface Teacher {
  id: string;
  name: string;
  avatar?: string;
  subject?: string;
  email?: string;
}

interface Child {
  id: string;
  name: string;
  grade?: string;
  teachers?: Teacher[];
}

interface ComposeMessageProps {
  children: Child[];
  onClose: () => void;
  onSend: (data: {
    teacherId: string;
    childId: string;
    subject: string;
    content: string;
    attachments?: File[];
  }) => Promise<void>;
  isLoading?: boolean;
}

export function ComposeMessage({
  children,
  onClose,
  onSend,
  isLoading,
}: ComposeMessageProps) {
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Auto-select child if only one
  useEffect(() => {
    if (children.length === 1) {
      setSelectedChild(children[0]);
    }
  }, [children]);

  const filteredTeachers = selectedChild?.teachers?.filter((teacher) =>
    teacher.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    teacher.subject?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedTeacher || !selectedChild || !subject.trim() || !content.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      await onSend({
        teacherId: selectedTeacher.id,
        childId: selectedChild.id,
        subject: subject.trim(),
        content: content.trim(),
        attachments,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments((prev) => [...prev, ...files]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div
        ref={modalRef}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="compose-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 id="compose-title" className="text-xl font-semibold text-gray-900">
            New Message
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-5">
            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Child Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Child
              </label>
              <div className="grid grid-cols-2 gap-2">
                {children.map((child) => (
                  <button
                    key={child.id}
                    type="button"
                    onClick={() => {
                      setSelectedChild(child);
                      setSelectedTeacher(null);
                    }}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                      selectedChild?.id === child.id
                        ? 'border-violet-500 bg-violet-50'
                        : 'border-gray-200 hover:border-violet-300 hover:bg-violet-50/50'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                      <User className="w-4 h-4 text-gray-500" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-gray-900">
                        {child.name}
                      </p>
                      {child.grade && (
                        <p className="text-xs text-gray-500">Grade {child.grade}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Teacher Selector */}
            {selectedChild && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Teacher
                </label>

                {/* Search */}
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search teachers..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm"
                  />
                </div>

                {/* Teacher List */}
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {filteredTeachers.length > 0 ? (
                    filteredTeachers.map((teacher) => (
                      <button
                        key={teacher.id}
                        type="button"
                        onClick={() => setSelectedTeacher(teacher)}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                          selectedTeacher?.id === teacher.id
                            ? 'border-violet-500 bg-violet-50'
                            : 'border-gray-200 hover:border-violet-300 hover:bg-violet-50/50'
                        }`}
                      >
                        {teacher.avatar ? (
                          <img
                            src={teacher.avatar}
                            alt={teacher.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center">
                            <span className="text-white font-medium">
                              {teacher.name.charAt(0)}
                            </span>
                          </div>
                        )}
                        <div className="text-left flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {teacher.name}
                          </p>
                          {teacher.subject && (
                            <p className="text-xs text-gray-500">
                              {teacher.subject}
                            </p>
                          )}
                        </div>
                      </button>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">
                      {searchQuery
                        ? 'No teachers found matching your search'
                        : 'No teachers available for this child'}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Subject */}
            {selectedTeacher && (
              <div>
                <label
                  htmlFor="subject"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Subject
                </label>
                <input
                  id="subject"
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="What's this message about?"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </div>
            )}

            {/* Message Content */}
            {selectedTeacher && (
              <div>
                <label
                  htmlFor="content"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Message
                </label>
                <textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Type your message here..."
                  rows={5}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </div>
            )}

            {/* Attachments */}
            {selectedTeacher && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Attachments
                </label>

                {attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {attachments.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg"
                      >
                        <Paperclip className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-700 truncate max-w-[150px]">
                          {file.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeAttachment(index)}
                          className="text-gray-400 hover:text-gray-600"
                          aria-label={`Remove ${file.name}`}
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 border border-dashed border-gray-300 rounded-lg hover:border-violet-400 hover:text-violet-600 transition-colors"
                >
                  <Paperclip className="w-4 h-4" />
                  Add Attachment
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx"
                />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedTeacher || !subject.trim() || !content.trim() || isLoading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send Message
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ComposeMessage;
