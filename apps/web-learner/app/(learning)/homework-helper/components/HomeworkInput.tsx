'use client';

import Image from 'next/image';
import React, { useState, useRef } from 'react';

interface HomeworkInputProps {
  learnerId: string;
  onSessionStart: (sessionId: string) => void;
}

type Subject = 'ELA' | 'MATH' | 'SCIENCE' | 'OTHER';
type InputMethod = 'text' | 'image';

const SUBJECTS: { id: Subject; label: string; icon: string }[] = [
  { id: 'MATH', label: 'Mathematics', icon: '🔢' },
  { id: 'ELA', label: 'English Language Arts', icon: '📖' },
  { id: 'SCIENCE', label: 'Science', icon: '🔬' },
  { id: 'OTHER', label: 'Other Subject', icon: '📝' },
];

export function HomeworkInput({ learnerId: _learnerId, onSessionStart }: Readonly<HomeworkInputProps>) {
  const [inputMethod, setInputMethod] = useState<InputMethod>('text');
  const [subject, setSubject] = useState<Subject | null>(null);
  const [problemText, setProblemText] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!subject) return;
    if (inputMethod === 'text' && !problemText.trim()) return;
    if (inputMethod === 'image' && !imagePreview) return;

    setIsLoading(true);
    
    // Simulate API call to start session
    // In production, this would call the homework-helper API
    setTimeout(() => {
      const mockSessionId = `session-${Date.now()}`;
      onSessionStart(mockSessionId);
      setIsLoading(false);
    }, 1000);
  };

  const canSubmit = subject && (
    (inputMethod === 'text' && problemText.trim().length > 10) ||
    (inputMethod === 'image' && imagePreview)
  );

  return (
    <div className="space-y-6">
      {/* Input Method Toggle */}
      <div>
        <h2 className="mb-3 font-semibold text-slate-900">How would you like to share your problem?</h2>
        <div className="flex gap-4">
          <button
            onClick={() => { setInputMethod('text'); }}
            className={`flex flex-1 items-center gap-3 rounded-xl border-2 p-4 transition-all ${
              inputMethod === 'text'
                ? 'border-blue-500 bg-blue-50'
                : 'border-slate-200 hover:border-blue-300'
            }`}
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-2xl">
              ⌨️
            </span>
            <div className="text-left">
              <div className="font-medium text-slate-900">Type it out</div>
              <div className="text-sm text-slate-500">Enter your question as text</div>
            </div>
          </button>
          <button
            onClick={() => { setInputMethod('image'); }}
            className={`flex flex-1 items-center gap-3 rounded-xl border-2 p-4 transition-all ${
              inputMethod === 'image'
                ? 'border-blue-500 bg-blue-50'
                : 'border-slate-200 hover:border-blue-300'
            }`}
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-2xl">
              📷
            </span>
            <div className="text-left">
              <div className="font-medium text-slate-900">Upload a photo</div>
              <div className="text-sm text-slate-500">Take a picture of your homework</div>
            </div>
          </button>
        </div>
      </div>

      {/* Subject Selection */}
      <div>
        <h2 className="mb-3 font-semibold text-slate-900">What subject is this for?</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {SUBJECTS.map((s) => (
            <button
              key={s.id}
              onClick={() => { setSubject(s.id); }}
              className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${
                subject === s.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-slate-200 hover:border-blue-300'
              }`}
            >
              <span className="text-3xl">{s.icon}</span>
              <span className="text-sm font-medium text-slate-900">{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Problem Input */}
      <div>
        <h2 className="mb-3 font-semibold text-slate-900">
          {inputMethod === 'text' ? 'Type your problem' : 'Upload your homework'}
        </h2>
        
        {inputMethod === 'text' ? (
          <textarea
            value={problemText}
            onChange={(e) => { setProblemText(e.target.value); }}
            placeholder="Type or paste your homework question here. Include all the details so I can help you step by step..."
            className="h-40 w-full resize-none rounded-xl border border-slate-300 p-4 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        ) : (
          <div className="relative">
            {imagePreview ? (
              <div className="relative rounded-xl border-2 border-dashed border-blue-300 bg-blue-50 p-4">
                <Image
                  src={imagePreview}
                  alt="Homework preview"
                  width={400}
                  height={256}
                  className="mx-auto max-h-64 rounded-lg object-contain"
                />
                <button
                  onClick={() => {
                    setImagePreview(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="absolute right-2 top-2 rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full flex-col items-center gap-3 rounded-xl border-2 border-dashed border-slate-300 p-8 transition-colors hover:border-blue-400 hover:bg-blue-50"
              >
                <span className="text-5xl">📸</span>
                <div className="text-center">
                  <div className="font-medium text-slate-900">Click to upload an image</div>
                  <div className="text-sm text-slate-500">PNG, JPG up to 10MB</div>
                </div>
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>
        )}
      </div>

      {/* Tips */}
      <div className="rounded-xl bg-amber-50 p-4">
        <h3 className="flex items-center gap-2 font-medium text-amber-900">
          <span>💡</span> Tips for getting the best help
        </h3>
        <ul className="mt-2 space-y-1 text-sm text-amber-800">
          <li>• Include the complete question, not just part of it</li>
          <li>• Mention what you&apos;ve already tried</li>
          <li>• For math problems, include all numbers and instructions</li>
          <li>• For reading questions, include the passage if possible</li>
        </ul>
      </div>

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={!canSubmit || isLoading}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-4 text-lg font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLoading ? (
          <>
            <span className="animate-spin">⏳</span>
            <span>Analyzing your problem...</span>
          </>
        ) : (
          <>
            <span>🚀</span>
            <span>Get Help Now</span>
          </>
        )}
      </button>
    </div>
  );
}
