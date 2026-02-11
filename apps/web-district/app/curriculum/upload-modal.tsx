'use client';

import { useRouter } from 'next/navigation';
import React, { useState, useCallback } from 'react';

/**
 * Upload Curriculum Modal Component
 *
 * Modal for creating new curricula or uploading curriculum files.
 */

import { createCurriculum, SUBJECT_AREAS, GRADE_LEVELS } from '../../lib/curriculum-api';
import { useAuth } from '../providers';

interface UploadCurriculumModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UploadCurriculumModal({ isOpen, onClose }: UploadCurriculumModalProps) {
  const router = useRouter();
  const { tenantId, userName, accessToken } = useAuth();
  const [activeTab, setActiveTab] = useState<'create' | 'upload'>('create');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    subjectArea: '',
    gradeLevel: '',
  });

  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      setFormData((prev) => ({ ...prev, [name]: value }));
    },
    []
  );

  const handleFileSelect = useCallback((file: File) => {
    const validTypes = [
      'application/json',
      'text/csv',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    if (!validTypes.includes(file.type)) {
      setError('Please upload a JSON, CSV, or Excel file');
      return;
    }
    setSelectedFile(file);
    setError(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId || !userName) return;

    setIsSubmitting(true);
    setError(null);

    try {
      if (activeTab === 'create') {
        await createCurriculum(tenantId, userName, accessToken, formData);
      } else {
        // Handle file upload
        if (!selectedFile) return;
        const uploadFormData = new FormData();
        uploadFormData.append('file', selectedFile);
        uploadFormData.append('tenantId', tenantId);
        uploadFormData.append('userName', userName);

        const response = await fetch('/api/curriculum/upload', {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}` },
          body: uploadFormData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Upload failed');
        }
      }

      onClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create curriculum');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = useCallback(() => {
    setFormData({ name: '', description: '', subjectArea: '', gradeLevel: '' });
    setSelectedFile(null);
    setError(null);
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  if (!isOpen) return null;

  const isCreateValid = formData.name.trim() && formData.subjectArea && formData.gradeLevel;
  const isUploadValid = selectedFile !== null;
  const isValid = activeTab === 'create' ? isCreateValid : isUploadValid;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg rounded-xl bg-surface shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="text-lg font-semibold">Add Curriculum</h2>
          <button
            onClick={handleClose}
            className="rounded-lg p-1 text-muted hover:bg-surface-muted hover:text-text"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-border">
          <div className="flex">
            <button
              onClick={() => {
                setActiveTab('create');
              }}
              className={`flex-1 px-4 py-3 text-sm font-medium transition ${
                activeTab === 'create'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted hover:text-text'
              }`}
            >
              Create New
            </button>
            <button
              onClick={() => {
                setActiveTab('upload');
              }}
              className={`flex-1 px-4 py-3 text-sm font-medium transition ${
                activeTab === 'upload'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted hover:text-text'
              }`}
            >
              Upload File
            </button>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit}>
          <div className="max-h-[60vh] overflow-y-auto p-4">
            {error && (
              <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
            )}

            {activeTab === 'create' ? (
              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label htmlFor="name" className="mb-1 block text-sm font-medium">
                    Curriculum Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g., Algebra I Comprehensive Curriculum"
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <label htmlFor="description" className="mb-1 block text-sm font-medium">
                    Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Brief description of the curriculum..."
                    rows={3}
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                {/* Subject Area */}
                <div>
                  <label htmlFor="subjectArea" className="mb-1 block text-sm font-medium">
                    Subject Area <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="subjectArea"
                    name="subjectArea"
                    value={formData.subjectArea}
                    onChange={handleInputChange}
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    required
                  >
                    <option value="">Select subject...</option>
                    {Object.entries(SUBJECT_AREAS).map(([key, { label }]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Grade Level */}
                <div>
                  <label htmlFor="gradeLevel" className="mb-1 block text-sm font-medium">
                    Grade Level <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="gradeLevel"
                    name="gradeLevel"
                    value={formData.gradeLevel}
                    onChange={handleInputChange}
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    required
                  >
                    <option value="">Select grade...</option>
                    {Object.entries(GRADE_LEVELS).map(([key, { label }]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* File Drop Zone */}
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => {
                    setDragOver(false);
                  }}
                  className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition ${
                    dragOver
                      ? 'border-primary bg-primary/5'
                      : selectedFile
                        ? 'border-green-500 bg-green-50'
                        : 'border-border hover:border-primary/50'
                  }`}
                >
                  {selectedFile ? (
                    <>
                      <svg
                        className="mb-2 h-10 w-10 text-green-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <p className="font-medium text-green-700">{selectedFile.name}</p>
                      <p className="mt-1 text-sm text-muted">
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedFile(null);
                        }}
                        className="mt-2 text-sm text-red-500 hover:underline"
                      >
                        Remove
                      </button>
                    </>
                  ) : (
                    <>
                      <svg
                        className="mb-2 h-10 w-10 text-muted"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                        />
                      </svg>
                      <p className="text-sm text-muted">
                        Drag and drop a file here, or{' '}
                        <label className="cursor-pointer text-primary hover:underline">
                          browse
                          <input
                            type="file"
                            className="hidden"
                            accept=".json,.csv,.xlsx"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleFileSelect(file);
                            }}
                          />
                        </label>
                      </p>
                      <p className="mt-1 text-xs text-muted">Supports JSON, CSV, or Excel files</p>
                    </>
                  )}
                </div>

                {/* File Format Info */}
                <div className="rounded-lg bg-surface-muted p-3">
                  <h4 className="mb-2 text-sm font-medium">Supported Formats</h4>
                  <ul className="space-y-1 text-xs text-muted">
                    <li>
                      <strong>JSON:</strong> Structured curriculum data with units and lessons
                    </li>
                    <li>
                      <strong>CSV:</strong> Flat file with curriculum details and standards
                    </li>
                    <li>
                      <strong>Excel:</strong> Spreadsheet with multiple sheets for units/lessons
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-border p-4">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-muted hover:bg-surface-muted hover:text-text"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isValid || isSubmitting}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting
                ? 'Creating...'
                : activeTab === 'create'
                  ? 'Create Curriculum'
                  : 'Upload'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
