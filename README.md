# Entry List Management Web App (Locally Hosted)

A locally hosted, single-page application designed for secure and efficient management of entry lists. Upload photos, annotate them, and organize them with descriptions, voice comments, and filters. The app works entirely offline, storing all data locally.

## Features

- **Photo Upload**: Upload and organize photos with descriptions
- **Annotations**: Add pins and comments to specific areas of photos
- **Voice Comments**: Record voice notes that are transcribed automatically
- **Search & Filters**: Quickly find entries by various criteria
- **PDF Export**: Generate reports from selected entries
- **Offline First**: All data stored locally for security and speed
- **Dark Mode**: Toggle between light and dark themes

## Browser Compatibility

The app uses IndexedDB for local storage, which is supported in all modern browsers:

### Desktop Browsers
- Chrome 24+
- Firefox 16+
- Safari 10+
- Edge 12+
- Opera 15+

### Mobile Browsers
- iOS Safari 10.3+
- Android Chrome
- Android Firefox
- Samsung Internet

### Storage Limits
Storage limits vary by browser and device:
- **Chrome/Edge**: ~80% of available disk space
- **Firefox**: No fixed limit (asks for permission above 50MB)
- **Safari**: ~1GB limit (prompts at ~750MB)
- **Mobile Browsers**: Generally 50MB-250MB
- **Private/Incognito Mode**: Much more limited, typically 50-100MB

### Browser-Specific Notes
- **Safari**: Requires user interaction before allowing IndexedDB access
- **iOS**: Data may be cleared by the system in low storage conditions
- **Private/Incognito Mode**: Data is cleared when closing the browser
- **Multiple Tabs**: IndexedDB works across tabs in the same browser

## Installation & Setup

1. **Clone the Repository**
```bash
git clone https://github.com/yourusername/snag-list2.git
cd snag-list2
```

2. **Install Dependencies**
```bash
npm install
```

3. **Environment Setup**
Create a `.env.local` file in the root directory:
```env
# Required for voice transcription (optional feature)
NEXT_PUBLIC_OPENAI_API_KEY=your_api_key_here

# Port configuration (optional, defaults to 3001)
PORT=3001
```

4. **Start Development Server**
```bash
npm run dev
```

The app will be available at `http://localhost:3001` (or your configured PORT)

## Development

### Prerequisites
- Node.js 18 or higher
- npm 8 or higher
- A modern web browser with IndexedDB support (Chrome, Firefox, Safari, Edge)

### Database Information
- The app uses IndexedDB for local storage
- Database is automatically created on first run
- Current schema version: 10
- Data is stored in two stores: 'snags' and 'projects'
- Each browser maintains its own separate database
- Data persists until explicitly cleared or browser data is cleared

### Troubleshooting

#### Database Issues
If you encounter database issues:
1. Close the application
2. Open browser developer tools (F12)
3. Go to Application > Storage > IndexedDB
4. Delete the 'snag-list-db' database
5. Restart the application

#### Browser-Specific Issues

1. **Safari**
   - Enable "Prevent cross-site tracking" for consistent IndexedDB access
   - Clear website data if database becomes corrupted

2. **Firefox**
   - Check `about:config` for `dom.indexedDB.enabled` (should be true)
   - Increase `dom.indexedDB.warningQuota` if needed

3. **Chrome/Edge**
   - Check chrome://settings/cookies for "Allow all cookies"
   - Verify sufficient disk space is available

4. **Mobile Browsers**
   - Ensure "Website Data" storage is enabled
   - Check for and clear "Offline Website Data" if issues occur

#### Common Issues
1. **Port Already in Use**
   ```bash
   # Change port in package.json or use
   npm run dev -- -p 3002
   ```

2. **Missing Dependencies**
   ```bash
   # Clear npm cache and reinstall
   npm cache clean --force
   npm install
   ```

3. **Database Version Mismatch**
   - Clear IndexedDB as described above
   - Clear browser cache
   - Restart the application

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch
```

## Project Structure

```
snag-list2/
├── app/                 # Next.js app directory
├── components/         # React components
├── lib/               # Utilities and database
├── public/            # Static assets
├── styles/            # Global styles
├── types/             # TypeScript types
└── __tests__/         # Test files
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 