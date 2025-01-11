import { useEffect } from 'react';
import { useToast } from "@/components/ui/use-toast";
import { isOpenAIAvailable } from '@/lib/openai';

const AI_DISABLED_TOAST_DURATION = 5000; // 5 seconds

export function useOpenAI() {
  const { toast } = useToast();

  useEffect(() => {
    if (!isOpenAIAvailable()) {
      toast({
        title: "AI Features Disabled",
        description: "OpenAI API key not configured. Voice transcription and AI features are disabled. Add your API key to enable these features.",
        duration: AI_DISABLED_TOAST_DURATION,
      });
    }
  }, [toast]);

  return {
    isAvailable: isOpenAIAvailable(),
  };
} 