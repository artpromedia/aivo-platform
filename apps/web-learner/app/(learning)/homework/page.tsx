'use client';

import { useState, useRef, useCallback, type DragEvent, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  Brain,
  Type,
  ImagePlus,
  Upload,
  Loader2,
  AlertCircle,
  Clock,
  ChevronRight,
  Trash2,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────

const SUBJECTS = [
  { value: 'math', label: 'Math', emoji: '🔢' },
  { value: 'science', label: 'Science', emoji: '🔬' },
  { value: 'ela', label: 'English / ELA', emoji: '📝' },
  { value: 'history', label: 'History', emoji: '🏛️' },
  { value: 'coding', label: 'Coding', emoji: '💻' },
] as const;

interface HistoryItem {
  id: string;
  problem: string;
  subject: string;
  date: string;
}

// ── Component ──────────────────────────────────────────────

export default function HomeworkPage() {
  const router = useRouter();

  // Form state
  const [mode, setMode] = useState<'text' | 'image'>('text');
  const [text, setText] = useState('');
  const [subject, setSubject] = useState('math');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Submission state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Placeholder history (read from localStorage in real use)
  const [history] = useState<HistoryItem[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem('aivo_homework_history');
      return raw ? (JSON.parse(raw) as HistoryItem[]) : [];
    } catch {
      return [];
    }
  });

  // ── Image handlers ────────────────────────────────────────

  const processFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
    setMode('image');
  }, []);

  const handleDrag = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  const handleFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  const clearImage = useCallback(() => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  // ── Submit ────────────────────────────────────────────────

  const canSubmit =
    !loading && ((mode === 'text' && text.trim().length > 0) || (mode === 'image' && imageFile));

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setLoading(true);
    setError(null);

    try {
      let imageBase64: string | undefined;
      if (mode === 'image' && imageFile) {
        const buf = await imageFile.arrayBuffer();
        imageBase64 = Buffer.from(buf).toString('base64');
      }

      const res = await fetch('/api/homework/analyze', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: mode === 'text' ? text.trim() : undefined,
          imageBase64,
          subject,
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || 'Failed to analyze your problem.');
      }

      const data = await res.json();

      // Save to history
      const newItem: HistoryItem = {
        id: crypto.randomUUID(),
        problem: mode === 'text' ? text.trim().slice(0, 120) : '(Photo upload)',
        subject,
        date: new Date().toISOString(),
      };
      const updated = [newItem, ...history].slice(0, 20);
      localStorage.setItem('aivo_homework_history', JSON.stringify(updated));

      // Store solution in sessionStorage and navigate
      sessionStorage.setItem('aivo_homework_solution', JSON.stringify({
        problem: mode === 'text' ? text.trim() : '(Photo upload)',
        subject,
        ...data,
      }));
      router.push('/homework/solve');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
          <Brain className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Homework Helper</h1>
          <p className="text-sm text-gray-500">
            Get step-by-step help with any problem
          </p>
        </div>
      </div>

      {/* Subject chips */}
      <div className="flex flex-wrap gap-2">
        {SUBJECTS.map((s) => (
          <button
            key={s.value}
            onClick={() => setSubject(s.value)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium transition-colors ${
              subject === s.value
                ? 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-300'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <span>{s.emoji}</span>
            {s.label}
          </button>
        ))}
      </div>

      {/* Input mode cards */}
      <div className="grid sm:grid-cols-2 gap-4">
        {/* Text input card */}
        <button
          onClick={() => setMode('text')}
          className={`flex flex-col items-start gap-3 p-5 rounded-2xl border text-left transition-all ${
            mode === 'text'
              ? 'border-indigo-300 bg-indigo-50 shadow-sm'
              : 'border-gray-100 bg-white hover:border-gray-200'
          }`}
        >
          <div
            className={`p-2.5 rounded-xl ${
              mode === 'text' ? 'bg-indigo-100' : 'bg-gray-100'
            }`}
          >
            <Type
              className={`w-5 h-5 ${
                mode === 'text' ? 'text-indigo-600' : 'text-gray-500'
              }`}
            />
          </div>
          <div>
            <p className="font-semibold text-gray-900">Type Your Problem</p>
            <p className="text-sm text-gray-500 mt-0.5">
              Type or paste the homework question
            </p>
          </div>
        </button>

        {/* Image upload card */}
        <button
          onClick={() => setMode('image')}
          className={`flex flex-col items-start gap-3 p-5 rounded-2xl border text-left transition-all ${
            mode === 'image'
              ? 'border-indigo-300 bg-indigo-50 shadow-sm'
              : 'border-gray-100 bg-white hover:border-gray-200'
          }`}
        >
          <div
            className={`p-2.5 rounded-xl ${
              mode === 'image' ? 'bg-indigo-100' : 'bg-gray-100'
            }`}
          >
            <ImagePlus
              className={`w-5 h-5 ${
                mode === 'image' ? 'text-indigo-600' : 'text-gray-500'
              }`}
            />
          </div>
          <div>
            <p className="font-semibold text-gray-900">Upload a Photo</p>
            <p className="text-sm text-gray-500 mt-0.5">
              Drag &amp; drop or pick a file
            </p>
          </div>
        </button>
      </div>

      {/* Text area (when text mode) */}
      {mode === 'text' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-3">
          <textarea
            rows={5}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste or type your homework problem here…"
            className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition"
          />
          <p className="text-xs text-gray-400 text-right">{text.length} characters</p>
        </div>
      )}

      {/* Image upload zone (when image mode) */}
      {mode === 'image' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          {imagePreview ? (
            <div className="relative">
              <img
                src={imagePreview}
                alt="Homework photo"
                className="w-full max-h-64 object-contain rounded-xl border border-gray-200"
              />
              <button
                onClick={clearImage}
                className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-lg shadow hover:bg-red-50 transition"
              >
                <Trash2 className="w-4 h-4 text-red-500" />
              </button>
            </div>
          ) : (
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center gap-3 py-12 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${
                dragActive
                  ? 'border-indigo-400 bg-indigo-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Upload
                className={`w-8 h-8 ${dragActive ? 'text-indigo-500' : 'text-gray-400'}`}
              />
              <div className="text-center">
                <p className="text-sm font-medium text-gray-700">
                  Drop your image here or{' '}
                  <span className="text-indigo-600">browse</span>
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  PNG, JPG, or WEBP up to 10 MB
                </p>
              </div>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Submit button */}
      <button
        disabled={!canSubmit}
        onClick={handleSubmit}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Analyzing your problem…
          </>
        ) : (
          <>
            <Brain className="w-4 h-4" />
            Get Step-by-Step Help
          </>
        )}
      </button>

      {/* Recent history */}
      {history.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Recent Problems
          </h2>
          <div className="space-y-2">
            {history.slice(0, 5).map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-3.5 bg-white rounded-xl border border-gray-100 hover:border-gray-200 transition-colors"
              >
                <Clock className="w-4 h-4 text-gray-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 truncate">{item.problem}</p>
                  <p className="text-xs text-gray-400 mt-0.5 capitalize">{item.subject}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
