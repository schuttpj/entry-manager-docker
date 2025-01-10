# Snag List Management Web App

A locally hosted, single-page application for secure and efficient management of snag lists. Upload photos, add annotations, organize with descriptions, and include voice comments - all working offline with local data storage.

## Features

- 📸 Photo Upload & Auto-numbering
- ✏️ Photo Annotations
- 🎤 Voice Comments (using OpenAI Whisper)
- 💾 Offline-first with Local Storage
- 🔍 Search and Filter Capabilities
- 📑 PDF Export

## Tech Stack

- Next.js 14 with App Router
- TypeScript
- Tailwind CSS
- IndexedDB for local storage
- Fabric.js for annotations
- OpenAI Whisper API for voice transcription

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Create a `.env.local` file and add your OpenAI API key:
```
OPENAI_API_KEY=your_api_key_here
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Development Status

🚧 Under Development 