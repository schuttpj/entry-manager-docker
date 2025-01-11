import { isOpenAIAvailable, transcribeAudio } from '@/lib/openai';

describe('OpenAI Integration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('isOpenAIAvailable', () => {
    it('should return false when API key is not set', () => {
      delete process.env.NEXT_PUBLIC_OPENAI_API_KEY;
      expect(isOpenAIAvailable()).toBe(false);
    });

    it('should return false when API key is empty string', () => {
      process.env.NEXT_PUBLIC_OPENAI_API_KEY = '';
      expect(isOpenAIAvailable()).toBe(false);
    });

    it('should return true when API key is set', () => {
      process.env.NEXT_PUBLIC_OPENAI_API_KEY = 'test-api-key';
      expect(isOpenAIAvailable()).toBe(true);
    });
  });

  describe('transcribeAudio', () => {
    it('should return error when API key is not configured', async () => {
      delete process.env.NEXT_PUBLIC_OPENAI_API_KEY;
      const blob = new Blob(['test audio'], { type: 'audio/webm' });
      const result = await transcribeAudio(blob);
      expect(result.error).toBe('OpenAI API key not configured. Voice transcription and AI features are disabled.');
      expect(result.text).toBe('');
    });
  });
}); 