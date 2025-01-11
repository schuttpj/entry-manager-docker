import { renderHook } from '@testing-library/react';
import { useOpenAI } from '@/hooks/use-openai';
import { useToast } from '@/components/ui/use-toast';

// Mock the useToast hook
jest.mock('@/components/ui/use-toast', () => ({
  useToast: jest.fn()
}));

describe('useOpenAI', () => {
  const mockToast = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
    (useToast as jest.Mock).mockReturnValue({ toast: mockToast });
  });

  it('should show toast when OpenAI is not available', () => {
    // Ensure no API key is set
    delete process.env.NEXT_PUBLIC_OPENAI_API_KEY;
    
    const { result } = renderHook(() => useOpenAI());
    
    expect(mockToast).toHaveBeenCalledWith({
      title: "AI Features Disabled",
      description: "OpenAI API key not configured. Voice transcription and AI features are disabled. Add your API key to enable these features.",
      duration: 5000,
    });
    expect(result.current.isAvailable).toBe(false);
  });

  it('should not show toast when OpenAI is available', () => {
    // Set API key
    process.env.NEXT_PUBLIC_OPENAI_API_KEY = 'test-key';
    
    const { result } = renderHook(() => useOpenAI());
    
    expect(mockToast).not.toHaveBeenCalled();
    expect(result.current.isAvailable).toBe(true);
  });
}); 