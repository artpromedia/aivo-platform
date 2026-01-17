import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { TextToSpeech } from '../app/(learning)/reading-tools/components/TextToSpeech';
import * as readingApi from '../lib/reading-api';

// Mock the reading API
vi.mock('../lib/reading-api');

const mockVoices = [
  {
    id: 'voice-1',
    name: 'Emma',
    language: 'en-US',
    gender: 'female',
  },
  {
    id: 'voice-2',
    name: 'James',
    language: 'en-US',
    gender: 'male',
  },
];

const mockSettings = {
  voiceId: 'voice-1',
  rate: 1.0,
  pitch: 1.0,
  volume: 1.0,
  highlightText: true,
  autoScroll: false,
};

// Mock Speech Synthesis API
const mockSpeechSynthesis = {
  speak: vi.fn(),
  cancel: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  getVoices: vi.fn(() => []),
};

global.window.speechSynthesis = mockSpeechSynthesis as any;
global.SpeechSynthesisUtterance = vi.fn() as any;

describe('TextToSpeech', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(readingApi.getTTSVoices).mockResolvedValue(mockVoices);
    vi.mocked(readingApi.getTTSSettings).mockResolvedValue(mockSettings);
    vi.mocked(readingApi.updateTTSSettings).mockResolvedValue(mockSettings);
    vi.mocked(readingApi.saveReadingSession).mockResolvedValue(undefined);
  });

  it('should render text-to-speech component', async () => {
    render(<TextToSpeech learnerId="learner-123" />);
    
    await waitFor(() => {
      expect(screen.getByText('Text to Read')).toBeInTheDocument();
    });
  });

  it('should load voices and settings on mount', async () => {
    render(<TextToSpeech learnerId="learner-123" />);
    
    await waitFor(() => {
      expect(readingApi.getTTSVoices).toHaveBeenCalled();
      expect(readingApi.getTTSSettings).toHaveBeenCalledWith('learner-123');
    });
  });

  it('should display voice selection dropdown', async () => {
    render(<TextToSpeech learnerId="learner-123" />);
    
    await waitFor(() => {
      const voiceSelect = screen.getByRole('combobox');
      expect(voiceSelect).toBeInTheDocument();
    });
  });

  it('should update text when typing', async () => {
    render(<TextToSpeech learnerId="learner-123" />);
    
    await waitFor(() => {
      const textarea = screen.getByPlaceholderText(/paste or type text here/i);
      expect(textarea).toBeInTheDocument();
      
      fireEvent.change(textarea, { target: { value: 'New test text' } });
      expect(textarea).toHaveValue('New test text');
    });
  });

  it('should update settings when sliders change', async () => {
    render(<TextToSpeech learnerId="learner-123" />);
    
    await waitFor(() => {
      const speedSlider = screen.getByLabelText(/speed:/i);
      fireEvent.change(speedSlider, { target: { value: '1.5' } });
    });

    await waitFor(() => {
      expect(readingApi.updateTTSSettings).toHaveBeenCalledWith(
        expect.objectContaining({ rate: 1.5 })
      );
    });
  });

  it('should show start reading button', async () => {
    render(<TextToSpeech learnerId="learner-123" />);
    
    await waitFor(() => {
      const startButton = screen.getByText(/start reading/i);
      expect(startButton).toBeInTheDocument();
    });
  });

  it('should toggle highlight text setting', async () => {
    render(<TextToSpeech learnerId="learner-123" />);
    
    await waitFor(() => {
      const checkbox = screen.getByLabelText(/highlight text as it's read/i);
      expect(checkbox).toBeChecked();
      
      fireEvent.click(checkbox);
    });

    await waitFor(() => {
      expect(readingApi.updateTTSSettings).toHaveBeenCalledWith(
        expect.objectContaining({ highlightText: false })
      );
    });
  });

  it('should load sample text', async () => {
    render(<TextToSpeech learnerId="learner-123" />);
    
    await waitFor(() => {
      const loadSampleButton = screen.getByText(/load sample/i);
      fireEvent.click(loadSampleButton);
    });

    const textarea = screen.getByPlaceholderText(/paste or type text here/i);
    expect(textarea).toHaveValue(expect.stringContaining('Welcome to text-to-speech'));
  });
});
