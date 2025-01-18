import type { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import { Configuration, OpenAIApi } from 'openai';

export const config = {
  api: {
    bodyParser: false,
  },
};

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const form = formidable();
    const [fields, files] = await form.parse(req);
    const file = files.file?.[0];

    if (!file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    const response = await openai.createTranscription(
      // @ts-ignore - The type definitions aren't quite right for this
      file,
      'whisper-1'
    );

    return res.status(200).json({ text: response.data.text });
  } catch (error: any) {
    console.error('Transcription error:', error);
    return res.status(500).json({ 
      error: error.response?.data?.error?.message || 'Failed to transcribe audio' 
    });
  }
} 