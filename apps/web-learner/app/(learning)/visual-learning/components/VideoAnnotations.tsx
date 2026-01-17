'use client';

import { useState, useEffect, useRef } from 'react';
import {
  AnnotatedVideo,
  VideoAnnotation,
  getAnnotatedVideos,
  getAnnotatedVideo,
  createAnnotatedVideo,
  addVideoAnnotation,
  updateVideoAnnotation,
  deleteVideoAnnotation,
  deleteAnnotatedVideo,
} from '@/lib/visual-learning-api';

const ANNOTATION_COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];

export function VideoAnnotations() {
  const [videos, setVideos] = useState<AnnotatedVideo[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<AnnotatedVideo | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedAnnotation, setSelectedAnnotation] = useState<VideoAnnotation | null>(null);
  const [loading, setLoading] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    loadVideos();
  }, []);

  useEffect(() => {
    if (videoRef.current) {
      const video = videoRef.current;
      const handleTimeUpdate = () => setCurrentTime(video.currentTime);
      const handlePlay = () => setIsPlaying(true);
      const handlePause = () => setIsPlaying(false);

      video.addEventListener('timeupdate', handleTimeUpdate);
      video.addEventListener('play', handlePlay);
      video.addEventListener('pause', handlePause);

      return () => {
        video.removeEventListener('timeupdate', handleTimeUpdate);
        video.removeEventListener('play', handlePlay);
        video.removeEventListener('pause', handlePause);
      };
    }
  }, [selectedVideo]);

  const loadVideos = async () => {
    try {
      const vids = await getAnnotatedVideos('user123');
      setVideos(vids);
    } catch (error) {
      console.error('Failed to load videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVideo = async (title: string, videoUrl: string) => {
    try {
      const newVideo = await createAnnotatedVideo({
        userId: 'user123',
        title,
        videoUrl,
        duration: 300, // Default 5 minutes
      });
      setVideos([newVideo, ...videos]);
      setSelectedVideo(newVideo);
      setIsCreating(false);
    } catch (error) {
      console.error('Failed to create video:', error);
    }
  };

  const handleSelectVideo = async (videoId: string) => {
    try {
      const video = await getAnnotatedVideo(videoId);
      setSelectedVideo(video);
      setCurrentTime(0);
    } catch (error) {
      console.error('Failed to load video:', error);
    }
  };

  const handleAddAnnotation = async (type: VideoAnnotation['type'], content: string) => {
    if (!selectedVideo) return;
    try {
      const updated = await addVideoAnnotation(selectedVideo.id, {
        timestamp: currentTime,
        type,
        content,
        color: ANNOTATION_COLORS[0],
      });
      setSelectedVideo(updated);
      setVideos(videos.map((v) => (v.id === updated.id ? updated : v)));
    } catch (error) {
      console.error('Failed to add annotation:', error);
    }
  };

  const handleUpdateAnnotation = async (annotationId: string, updates: Partial<VideoAnnotation>) => {
    if (!selectedVideo) return;
    try {
      const updated = await updateVideoAnnotation(selectedVideo.id, annotationId, updates);
      setSelectedVideo(updated);
      setVideos(videos.map((v) => (v.id === updated.id ? updated : v)));
    } catch (error) {
      console.error('Failed to update annotation:', error);
    }
  };

  const handleDeleteAnnotation = async (annotationId: string) => {
    if (!selectedVideo || !confirm('Delete this annotation?')) return;
    try {
      const updated = await deleteVideoAnnotation(selectedVideo.id, annotationId);
      setSelectedVideo(updated);
      setVideos(videos.map((v) => (v.id === updated.id ? updated : v)));
      setSelectedAnnotation(null);
    } catch (error) {
      console.error('Failed to delete annotation:', error);
    }
  };

  const handleDeleteVideo = async (videoId: string) => {
    if (!confirm('Delete this video and all annotations?')) return;
    try {
      await deleteAnnotatedVideo(videoId);
      setVideos(videos.filter((v) => v.id !== videoId));
      if (selectedVideo?.id === videoId) {
        setSelectedVideo(null);
      }
    } catch (error) {
      console.error('Failed to delete video:', error);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const seekToAnnotation = (timestamp: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = timestamp;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Sidebar */}
      <div className="lg:col-span-1">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">My Videos</h2>
            <button
              onClick={() => setIsCreating(true)}
              className="px-3 py-1 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700"
            >
              Add
            </button>
          </div>

          <div className="space-y-2">
            {videos.map((video) => (
              <div
                key={video.id}
                className={`p-3 rounded-md cursor-pointer transition-colors ${
                  selectedVideo?.id === video.id
                    ? 'bg-indigo-50 border-2 border-indigo-600'
                    : 'bg-gray-50 hover:bg-gray-100'
                }`}
                onClick={() => handleSelectVideo(video.id)}
              >
                <h3 className="font-medium text-sm">{video.title}</h3>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-500">
                    {video.annotations.length} annotations
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteVideo(video.id);
                    }}
                    className="text-xs text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Area */}
      <div className="lg:col-span-3">
        {isCreating && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">Add Video for Annotation</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                handleCreateVideo(
                  formData.get('title') as string,
                  formData.get('videoUrl') as string
                );
              }}
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    name="title"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Video URL
                  </label>
                  <input
                    type="url"
                    name="videoUrl"
                    required
                    placeholder="https://example.com/video.mp4"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div className="flex space-x-3">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                  >
                    Add Video
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {selectedVideo ? (
          <div className="space-y-6">
            {/* Video Player */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="p-4 border-b">
                <h2 className="text-xl font-semibold">{selectedVideo.title}</h2>
              </div>
              <div className="relative bg-black">
                <video
                  ref={videoRef}
                  src={selectedVideo.videoUrl}
                  controls
                  className="w-full"
                  style={{ maxHeight: '500px' }}
                />
                {/* Annotation markers on timeline */}
                <div className="absolute bottom-12 left-0 right-0 px-4">
                  {selectedVideo.annotations.map((ann) => {
                    const position = (ann.timestamp / selectedVideo.duration) * 100;
                    return (
                      <div
                        key={ann.id}
                        className="absolute w-2 h-2 rounded-full cursor-pointer"
                        style={{
                          left: `${position}%`,
                          backgroundColor: ann.color,
                          bottom: '0',
                        }}
                        onClick={() => seekToAnnotation(ann.timestamp)}
                        title={ann.content}
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Add Annotation */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="text-sm font-semibold mb-3">
                Add Annotation at {formatTime(currentTime)}
              </h3>
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    const content = prompt('Enter note:');
                    if (content) handleAddAnnotation('note', content);
                  }}
                  className="flex-1 px-3 py-2 bg-blue-100 text-blue-800 rounded-md hover:bg-blue-200 text-sm"
                >
                  📝 Note
                </button>
                <button
                  onClick={() => {
                    const content = prompt('Enter question:');
                    if (content) handleAddAnnotation('question', content);
                  }}
                  className="flex-1 px-3 py-2 bg-purple-100 text-purple-800 rounded-md hover:bg-purple-200 text-sm"
                >
                  ❓ Question
                </button>
                <button
                  onClick={() => handleAddAnnotation('highlight', 'Important moment')}
                  className="flex-1 px-3 py-2 bg-yellow-100 text-yellow-800 rounded-md hover:bg-yellow-200 text-sm"
                >
                  ⭐ Highlight
                </button>
                <button
                  onClick={() => handleAddAnnotation('bookmark', 'Bookmark')}
                  className="flex-1 px-3 py-2 bg-green-100 text-green-800 rounded-md hover:bg-green-200 text-sm"
                >
                  🔖 Bookmark
                </button>
              </div>
            </div>

            {/* Annotations List */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="text-lg font-semibold mb-4">
                Annotations ({selectedVideo.annotations.length})
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {selectedVideo.annotations
                  .sort((a, b) => a.timestamp - b.timestamp)
                  .map((annotation) => (
                    <div
                      key={annotation.id}
                      className="p-3 border rounded-md hover:bg-gray-50 cursor-pointer"
                      style={{ borderLeftWidth: '4px', borderLeftColor: annotation.color }}
                      onClick={() => seekToAnnotation(annotation.timestamp)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="text-xs font-medium text-gray-600 uppercase">
                              {annotation.type}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatTime(annotation.timestamp)}
                            </span>
                          </div>
                          <p className="text-sm">{annotation.content}</p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteAnnotation(annotation.id);
                          }}
                          className="ml-2 text-red-600 hover:text-red-800 text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                {selectedVideo.annotations.length === 0 && (
                  <p className="text-center text-gray-500 py-8">
                    No annotations yet. Add your first annotation above!
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <svg
              className="mx-auto h-16 w-16 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">No Video Selected</h3>
            <p className="mt-2 text-gray-600">
              Select a video from the sidebar or add a new one to start annotating
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
