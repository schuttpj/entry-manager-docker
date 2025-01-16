# Snag List Manager

A modern web application for managing construction and property snag lists with AI-powered voice features. Upload photos, add annotations, record voice notes, and organize issues efficiently.

## Features

- 📸 Photo uploads with auto-numbering
- 🎯 Image annotation tools
- 🎤 Voice-to-text using OpenAI Whisper
- 📱 Responsive single-page interface
- 🔍 Advanced search and filtering
- 📑 PDF report generation
- 💾 Local-first storage (works offline)

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [Git](https://git-scm.com/)
- [VS Code](https://code.visualstudio.com/) or [Cursor](https://cursor.sh/) (recommended)
- [Chrome](https://www.google.com/chrome/) or [Edge](https://www.microsoft.com/edge) (latest version)

## Setup Instructions

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/snag-list2.git
   cd snag-list2
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create environment file:
   - Copy `.env.example` to `.env.local`
   - Add your API keys:
     ```
     NEXT_PUBLIC_OPENAI_API_KEY=your_openai_key_here
     NEXT_PUBLIC_SERPAPI_API_KEY=your_serpapi_key_here
     ```
   Get your API keys from:
   - [OpenAI](https://platform.openai.com/account/api-keys)
   - [SerpAPI](https://serpapi.com/dashboard)

4. Start development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Development Tools

- **Framework**: Next.js 14 with App Router
- **UI**: Tailwind CSS + Shadcn/ui
- **Database**: SQLite (via Prisma)
- **AI**: OpenAI Whisper API

## License

MIT 