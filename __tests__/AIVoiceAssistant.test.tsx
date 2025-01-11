import { render, screen, fireEvent, act } from '@testing-library/react';
import { AIVoiceAssistant } from '@/components/AIVoiceAssistant';
import { useOpenAI } from '@/hooks/use-openai';

// Mock the useOpenAI hook
jest.mock('@/hooks/use-openai', () => ({
  useOpenAI: jest.fn()
}));

// Mock the database functions
jest.mock('@/lib/db', () => ({
  getVoiceRecordingsByProject: jest.fn().mockResolvedValue([]),
  saveVoiceRecording: jest.fn(),
  getVoiceRecording: jest.fn(),
  getDB: jest.fn()
}));

describe('AIVoiceAssistant', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should disable recording button when AI is not available', async () => {
    (useOpenAI as jest.Mock).mockReturnValue({ isAvailable: false });
    
    await act(async () => {
      render(<AIVoiceAssistant projectName="test-project" />);
    });
    
    const recordButton = screen.getByRole('button', { name: /click to speak/i });
    expect(recordButton).toBeDisabled();
    expect(recordButton).toHaveAttribute('title', 'AI features are disabled. Add your OpenAI API key to enable voice recording.');
  });

  it('should enable recording button when AI is available', async () => {
    (useOpenAI as jest.Mock).mockReturnValue({ isAvailable: true });
    
    await act(async () => {
      render(<AIVoiceAssistant projectName="test-project" />);
    });
    
    const recordButton = screen.getByRole('button', { name: /click to speak/i });
    expect(recordButton).toBeEnabled();
    expect(recordButton).not.toHaveAttribute('title');
  });

  it('should disable recording button when no project is selected', async () => {
    (useOpenAI as jest.Mock).mockReturnValue({ isAvailable: true });
    
    await act(async () => {
      render(<AIVoiceAssistant projectName="" />);
    });
    
    const recordButton = screen.getByRole('button', { name: /click to speak/i });
    expect(recordButton).toBeDisabled();
  });
}); 