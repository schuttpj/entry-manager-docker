import type { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import OpenAI from 'openai';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false,
  },
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

    // Create a ReadStream from the file
    const fileStream = fs.createReadStream(file.filepath);

    const response = await openai.audio.transcriptions.create({
      file: fileStream,
      model: "whisper-1",
      language: "en"
    });

    return res.status(200).json({ text: response.text });
  } catch (error: any) {
    console.error('Transcription error:', error);
    return res.status(500).json({ 
      error: error.response?.data?.error?.message || 'Failed to transcribe audio' 
    });
  }
} 