# Snag List Management Web App (Locally Hosted)

A locally hosted, single-page application designed for secure and efficient management of snag lists. Upload photos, annotate them, and organize them with descriptions, voice comments, and filters. The app works entirely offline, storing all data locally.

## Features

- **Photo Upload & Management**: Upload and organize photos with auto-numbering
- **Annotations**: Add visual annotations and comments to photos
- **Voice Comments**: Record voice notes (requires OpenAI API key for transcription)
- **Search & Filters**: Quickly find snags by various criteria
- **PDF Export**: Generate reports from selected snags
- **Offline First**: All data stored locally in your browser

## Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/snag-list2.git
   cd snag-list2
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. (Optional) Configure OpenAI API:
   - If you want to use voice transcription features:
     1. Get an API key from [OpenAI](https://platform.openai.com)
     2. Create a `.env.local` file in the project root
     3. Add your API key:
        ```
        NEXT_PUBLIC_OPENAI_API_KEY=your_api_key_here
        ```
   - Note: The app works fully without an OpenAI API key, but voice transcription will be disabled

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Troubleshooting

### Database Issues

The app uses IndexedDB for local storage, which is automatically initialized when you first run the app. If you experience any issues:

1. **Clear Browser Data**: If you encounter database errors, try:
   - Open your browser's developer tools (F12)
   - Go to Application > Storage > IndexedDB
   - Delete the 'snag-list-db' database
   - Refresh the page to reinitialize the database

2. **Browser Support**: 
   - Ensure you're using a modern browser that supports IndexedDB
   - Recommended browsers: Chrome, Firefox, Edge, Safari 14+

3. **Storage Space**: 
   - Check if your browser has sufficient storage space
   - The app needs space for storing images and voice recordings

If problems persist, you can check the browser console for specific error messages.

## AI Features

The app includes optional AI-powered features that require an OpenAI API key:

- **Voice Transcription**: Convert voice recordings to text using OpenAI's Whisper model
- **Smart Commands**: Use voice commands to update snag information (coming soon)

If no API key is provided, these features will be automatically disabled, and the app will show a notification. All other features will continue to work normally.

## License

This project is licensed under the MIT License - see the LICENSE file for details. 