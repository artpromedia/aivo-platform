/**
 * ScreenShare Component
 *
 * Screen sharing for teachers with:
 * - Screen capture API
 * - WebRTC streaming
 * - Viewer controls
 * - Recording support
 * - Quality settings
 */

'use client';

import type { CSSProperties } from 'react';
import React, { useCallback, useEffect, useRef, useState } from 'react';

export interface ScreenShareUser {
  userId: string;
  displayName: string;
  avatarUrl?: string;
}

interface ScreenShareProps {
  roomId: string;
  currentUserId: string;
  currentUserName: string;
  isHost: boolean;
  onStreamStart?: (stream: MediaStream) => void;
  onStreamEnd?: () => void;
  onViewerJoin?: (userId: string) => void;
  onViewerLeave?: (userId: string) => void;
  socket?: unknown; // Socket.io socket for signaling
}

type ShareStatus = 'idle' | 'requesting' | 'sharing' | 'viewing' | 'error';

interface ControlButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'danger' | 'default';
}

const ControlButton: React.FC<ControlButtonProps> = ({
  icon,
  label,
  onClick,
  disabled = false,
  variant = 'default',
}) => {
  const getBackgroundColor = () => {
    if (disabled) return '#E5E7EB';
    switch (variant) {
      case 'primary':
        return '#3B82F6';
      case 'danger':
        return '#EF4444';
      default:
        return '#FFFFFF';
    }
  };

  const getTextColor = () => {
    if (disabled) return '#9CA3AF';
    switch (variant) {
      case 'primary':
      case 'danger':
        return '#FFFFFF';
      default:
        return '#374151';
    }
  };

  const buttonStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 20px',
    backgroundColor: getBackgroundColor(),
    color: getTextColor(),
    border: variant === 'default' ? '1px solid #D1D5DB' : 'none',
    borderRadius: 8,
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: 14,
    fontWeight: 500,
    transition: 'all 0.15s',
  };

  return (
    <button onClick={onClick} disabled={disabled} style={buttonStyle}>
      {icon}
      <span>{label}</span>
    </button>
  );
};

// Icons
const icons = {
  screen: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
      <path d="M4 6h16v10H4V6zm0-2a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h6v2H7v2h10v-2h-3v-2h6a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H4z" />
    </svg>
  ),
  stop: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
      <path d="M6 6h12v12H6z" />
    </svg>
  ),
  fullscreen: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
      <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
    </svg>
  ),
  exitFullscreen: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
      <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
    </svg>
  ),
  pip: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
      <path d="M19 7h-8v6h8V7zm2-4H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14z" />
    </svg>
  ),
  record: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
      <circle cx="12" cy="12" r="8" />
    </svg>
  ),
  pause: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
      <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
    </svg>
  ),
  viewers: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
      <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
    </svg>
  ),
};

export const ScreenShare: React.FC<ScreenShareProps> = ({
  roomId,
  currentUserId,
  currentUserName,
  isHost,
  onStreamStart,
  onStreamEnd,
  onViewerJoin,
  onViewerLeave,
  socket,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const [status, setStatus] = useState<ShareStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [viewers, setViewers] = useState<ScreenShareUser[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [quality, setQuality] = useState<'low' | 'medium' | 'high'>('medium');

  const getConstraints = useCallback((): DisplayMediaStreamOptions => {
    const qualitySettings = {
      low: { width: 1280, height: 720, frameRate: 15 },
      medium: { width: 1920, height: 1080, frameRate: 30 },
      high: { width: 2560, height: 1440, frameRate: 60 },
    };

    const settings = qualitySettings[quality];

    return {
      video: {
        width: { ideal: settings.width },
        height: { ideal: settings.height },
        frameRate: { ideal: settings.frameRate },
      },
      audio: true,
    };
  }, [quality]);

  // Start screen sharing
  const startSharing = useCallback(async () => {
    try {
      setStatus('requesting');
      setError(null);

      const stream = await navigator.mediaDevices.getDisplayMedia(getConstraints());

      // Handle stream ending (user clicks "Stop sharing")
      stream.getVideoTracks()[0].addEventListener('ended', () => {
        stopSharing();
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setStatus('sharing');
      onStreamStart?.(stream);
    } catch (err) {
      console.error('Screen share error:', err);
      setError((err as Error).message || 'Failed to start screen sharing');
      setStatus('error');
    }
  }, [getConstraints, onStreamStart]);

  // Stop screen sharing
  const stopSharing = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    if (isRecording) {
      stopRecording();
    }

    setStatus('idle');
    onStreamEnd?.();
  }, [isRecording, onStreamEnd]);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    const container = videoRef.current?.parentElement;
    if (!container) return;

    if (!isFullscreen) {
      container.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }, [isFullscreen]);

  // Picture-in-Picture
  const togglePiP = useCallback(async () => {
    if (!videoRef.current) return;

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (err) {
      console.error('PiP error:', err);
    }
  }, []);

  // Start recording
  const startRecording = useCallback(() => {
    if (!streamRef.current) return;

    try {
      recordedChunksRef.current = [];
      mediaRecorderRef.current = new MediaRecorder(streamRef.current, {
        mimeType: 'video/webm;codecs=vp9',
      });

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `screen-recording-${Date.now()}.webm`;
        a.click();
        URL.revokeObjectURL(url);
      };

      mediaRecorderRef.current.start(1000);
      setIsRecording(true);
    } catch (err) {
      console.error('Recording error:', err);
    }
  }, []);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  }, []);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSharing();
    };
  }, [stopSharing]);

  // Styles
  const containerStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#111827',
    borderRadius: 12,
    overflow: 'hidden',
    minHeight: 400,
  };

  const videoContainerStyle: CSSProperties = {
    flex: 1,
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
    minHeight: 300,
  };

  const videoStyle: CSSProperties = {
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain',
  };

  const controlsStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: '#1F2937',
  };

  const statusBarStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 16px',
    backgroundColor: '#374151',
    fontSize: 13,
    color: '#D1D5DB',
  };

  const idleStateStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
    color: '#9CA3AF',
    textAlign: 'center',
  };

  const settingsPanelStyle: CSSProperties = {
    position: 'absolute',
    bottom: 60,
    right: 16,
    backgroundColor: '#1F2937',
    borderRadius: 8,
    padding: 16,
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    zIndex: 10,
  };

  return (
    <div style={containerStyle}>
      {/* Status Bar */}
      <div style={statusBarStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {status === 'sharing' && (
            <>
              <span
                style={{
                  width: 8,
                  height: 8,
                  backgroundColor: isRecording ? '#EF4444' : '#10B981',
                  borderRadius: '50%',
                  animation: isRecording ? 'pulse 1s infinite' : 'none',
                }}
              />
              <span>{isRecording ? 'Recording...' : 'Sharing screen'}</span>
            </>
          )}
          {status === 'viewing' && <span>Viewing shared screen</span>}
          {status === 'idle' && <span>Screen sharing</span>}
        </div>
        {viewers.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {icons.viewers}
            <span>
              {viewers.length} viewer{viewers.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {/* Video Container */}
      <div style={videoContainerStyle}>
        {status === 'idle' && isHost && (
          <div style={idleStateStyle}>
            <div style={{ marginBottom: 16 }}>{icons.screen}</div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#F3F4F6' }}>
              Share your screen
            </h3>
            <p style={{ margin: '8px 0 24px', maxWidth: 300 }}>
              Share your screen with everyone in this room. Perfect for presentations and demos.
            </p>
            <ControlButton
              icon={icons.screen}
              label="Start Sharing"
              onClick={startSharing}
              variant="primary"
            />
          </div>
        )}

        {status === 'idle' && !isHost && (
          <div style={idleStateStyle}>
            <div style={{ marginBottom: 16 }}>{icons.screen}</div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#F3F4F6' }}>
              Waiting for screen share
            </h3>
            <p style={{ margin: '8px 0', maxWidth: 300 }}>
              The host will share their screen when ready.
            </p>
          </div>
        )}

        {status === 'requesting' && (
          <div style={idleStateStyle}>
            <div
              style={{
                width: 40,
                height: 40,
                border: '3px solid #4B5563',
                borderTopColor: '#3B82F6',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }}
            />
            <p style={{ marginTop: 16 }}>Requesting screen access...</p>
          </div>
        )}

        {status === 'error' && (
          <div style={idleStateStyle}>
            <div style={{ color: '#EF4444', marginBottom: 16 }}>
              <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor">
                <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm-1-7v2h2v-2h-2zm0-8v6h2V7h-2z" />
              </svg>
            </div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#F3F4F6' }}>
              Unable to share screen
            </h3>
            <p style={{ margin: '8px 0 24px', color: '#EF4444' }}>{error}</p>
            <ControlButton
              icon={icons.screen}
              label="Try Again"
              onClick={startSharing}
              variant="primary"
            />
          </div>
        )}

        {(status === 'sharing' || status === 'viewing') && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={status === 'sharing'}
            style={videoStyle}
          />
        )}

        {/* Settings Panel */}
        {showSettings && (
          <div style={settingsPanelStyle}>
            <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600, color: '#F3F4F6' }}>
              Quality Settings
            </h4>
            {(['low', 'medium', 'high'] as const).map((q) => (
              <label
                key={q}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 0',
                  cursor: 'pointer',
                  color: '#D1D5DB',
                }}
              >
                <input
                  type="radio"
                  name="quality"
                  checked={quality === q}
                  onChange={() => {
                    setQuality(q);
                  }}
                />
                <span style={{ textTransform: 'capitalize' }}>{q}</span>
                <span style={{ fontSize: 12, color: '#6B7280' }}>
                  {q === 'low' && '720p, 15fps'}
                  {q === 'medium' && '1080p, 30fps'}
                  {q === 'high' && '1440p, 60fps'}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Controls */}
      {status === 'sharing' && (
        <div style={controlsStyle}>
          <ControlButton
            icon={icons.stop}
            label="Stop Sharing"
            onClick={stopSharing}
            variant="danger"
          />
          <ControlButton
            icon={isRecording ? icons.pause : icons.record}
            label={isRecording ? 'Stop Recording' : 'Record'}
            onClick={isRecording ? stopRecording : startRecording}
          />
          <ControlButton
            icon={isFullscreen ? icons.exitFullscreen : icons.fullscreen}
            label={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            onClick={toggleFullscreen}
          />
          <ControlButton icon={icons.pip} label="Picture in Picture" onClick={togglePiP} />
          <ControlButton
            icon={icons.settings}
            label="Settings"
            onClick={() => {
              setShowSettings(!showSettings);
            }}
          />
        </div>
      )}

      {status === 'viewing' && (
        <div style={controlsStyle}>
          <ControlButton
            icon={isFullscreen ? icons.exitFullscreen : icons.fullscreen}
            label={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            onClick={toggleFullscreen}
          />
          <ControlButton icon={icons.pip} label="Picture in Picture" onClick={togglePiP} />
        </div>
      )}

      {/* CSS for animations */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default ScreenShare;
