'use client';

import { useState } from 'react';

interface VoiceRecordingsProps {
  learnerId: string;
}

interface Recording {
  id: string;
  title: string;
  date: string;
  duration: string;
  exercise: string;
  starred: boolean;
}

const MOCK_RECORDINGS: Recording[] = [
  { id: '1', title: 'Tongue Twister Practice', date: '2026-01-25', duration: '0:45', exercise: 'Tongue Twisters', starred: true },
  { id: '2', title: 'R Sound - Initial Position', date: '2026-01-24', duration: '1:20', exercise: 'Articulation', starred: false },
  { id: '3', title: 'Sentence Rhythm Exercise', date: '2026-01-24', duration: '2:15', exercise: 'Fluency', starred: false },
  { id: '4', title: 'Vowel Sounds Practice', date: '2026-01-23', duration: '1:05', exercise: 'Phonemes', starred: true },
  { id: '5', title: 'Reading Passage - Story Time', date: '2026-01-22', duration: '3:30', exercise: 'Reading', starred: false },
];

export function VoiceRecordings({ learnerId: _learnerId }: Readonly<VoiceRecordingsProps>) {
  const [recordings, setRecordings] = useState<Recording[]>(MOCK_RECORDINGS);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const toggleStar = (id: string) => {
    setRecordings((prev) =>
      prev.map((r) => (r.id === id ? { ...r, starred: !r.starred } : r))
    );
  };

  const deleteRecording = (id: string) => {
    setRecordings((prev) => prev.filter((r) => r.id !== id));
  };

  const togglePlayback = (id: string) => {
    setPlayingId(playingId === id ? null : id);
  };

  const startRecording = () => {
    setIsRecording(true);
    setRecordingTime(0);
    // In production, would use MediaRecorder API
  };

  const stopRecording = () => {
    setIsRecording(false);
    // Add new recording to list
    const newRecording: Recording = {
      id: Date.now().toString(),
      title: 'New Recording',
      date: new Date().toISOString().split('T')[0],
      duration: `${Math.floor(recordingTime / 60)}:${(recordingTime % 60).toString().padStart(2, '0')}`,
      exercise: 'Practice',
      starred: false,
    };
    setRecordings((prev) => [newRecording, ...prev]);
  };

  const starredRecordings = recordings.filter((r) => r.starred);
  const recentRecordings = recordings.filter((r) => !r.starred);

  return (
    <div className="space-y-6">
      {/* Recording Studio */}
      <div className="rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 p-8 text-center text-white">
        <h2 className="text-xl font-semibold">Recording Studio</h2>
        <p className="mt-1 text-indigo-100">Record yourself to track your progress</p>

        <div className="mt-6 flex flex-col items-center">
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={`flex h-24 w-24 items-center justify-center rounded-full transition-all ${
              isRecording
                ? 'animate-pulse bg-red-500 hover:bg-red-600'
                : 'bg-white/20 hover:bg-white/30'
            }`}
          >
            <span className="text-4xl">{isRecording ? '⏹️' : '🎙️'}</span>
          </button>
          <p className="mt-4 text-lg">
            {isRecording ? (
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 animate-pulse rounded-full bg-red-400" />{' '}
                Recording...
              </span>
            ) : (
              <span>Tap to start recording</span>
            )}
          </p>
        </div>
      </div>

      {/* Starred Recordings */}
      {starredRecordings.length > 0 && (
        <div>
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
            <span>⭐</span> Starred Recordings
          </h3>
          <div className="space-y-3">
            {starredRecordings.map((recording) => (
              <RecordingCard
                key={recording.id}
                recording={recording}
                isPlaying={playingId === recording.id}
                onToggleStar={() => { toggleStar(recording.id); }}
                onDelete={() => { deleteRecording(recording.id); }}
                onTogglePlay={() => { togglePlayback(recording.id); }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Recent Recordings */}
      <div>
        <h3 className="mb-4 text-lg font-semibold text-slate-900">Recent Recordings</h3>
        {recentRecordings.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-slate-200 p-8 text-center">
            <span className="text-4xl">🎙️</span>
            <p className="mt-2 text-slate-500">No recordings yet. Start practicing!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentRecordings.map((recording) => (
              <RecordingCard
                key={recording.id}
                recording={recording}
                isPlaying={playingId === recording.id}
                onToggleStar={() => { toggleStar(recording.id); }}
                onDelete={() => { deleteRecording(recording.id); }}
                onTogglePlay={() => { togglePlayback(recording.id); }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface RecordingCardProps {
  recording: Recording;
  isPlaying: boolean;
  onToggleStar: () => void;
  onDelete: () => void;
  onTogglePlay: () => void;
}

function RecordingCard({
  recording,
  isPlaying,
  onToggleStar,
  onDelete,
  onTogglePlay,
}: Readonly<RecordingCardProps>) {
  return (
    <div className="flex items-center gap-4 rounded-xl bg-white p-4 shadow-sm">
      <button
        onClick={onTogglePlay}
        className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full transition-colors ${
          isPlaying ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-600 hover:bg-purple-200'
        }`}
      >
        {isPlaying ? '⏸️' : '▶️'}
      </button>

      <div className="min-w-0 flex-1">
        <h4 className="truncate font-medium text-slate-900">{recording.title}</h4>
        <div className="mt-1 flex items-center gap-3 text-sm text-slate-500">
          <span>{recording.date}</span>
          <span>•</span>
          <span>{recording.duration}</span>
          <span>•</span>
          <span className="rounded bg-slate-100 px-2 py-0.5 text-xs">{recording.exercise}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onToggleStar}
          className="p-2 text-xl hover:scale-110 transition-transform"
          aria-label={recording.starred ? 'Remove from starred' : 'Add to starred'}
        >
          {recording.starred ? '⭐' : '☆'}
        </button>
        <button
          onClick={onDelete}
          className="p-2 text-slate-400 hover:text-red-500 transition-colors"
          aria-label="Delete recording"
        >
          🗑️
        </button>
      </div>
    </div>
  );
}
