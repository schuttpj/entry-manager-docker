# Grid View Project Companion

A powerful, locally-hosted application for managing and organizing projects with photos, annotations, and voice features. Perfect for property inspections, construction projects, and any scenario requiring detailed documentation with photos and annotations.

## ✨ Key Features

### 📸 Smart Photo Management
- Drag-and-drop photo uploads
- Automatic entry numbering
- Smart image organization by project
- Built-in image compression
- Thumbnail generation for quick viewing

### 🎨 Advanced Annotation Tools
- Draw, highlight, and mark up photos
- Add arrows, text, and measurements
- Custom color and line thickness
- Save annotation templates
- Multiple annotation layers

### 🎤 AI-Powered Voice Features (Optional)
- Voice-to-text transcription using OpenAI Whisper
- Voice notes for quick documentation
- Multi-language support
- Automatic punctuation and formatting
- Requires OpenAI API key

### 💾 Offline-First Architecture
- Works 100% offline after initial setup
- Local data storage with IndexedDB
- Automatic local backups
- Data export/import functionality
- No internet required for core features

## 🚀 Quick Installation

### Prerequisites
- Docker Desktop installed ([Download here](https://www.docker.com/products/docker-desktop))
- That's it! No other software required.

### Installation Steps

1. **Download the Setup Script**
   - For Windows: Download `setup.bat`
   - For Linux/Mac: Download `setup.sh`

2. **Run the Setup Script**
   - Windows: Double-click `setup.bat`
   - Linux/Mac: 
     ```bash
     chmod +x setup.sh
     ./setup.sh
     ```

3. **Start the Application**
   ```bash
   docker-compose up -d
   ```

4. **Access the Application**
   - Open http://localhost:3000 in your browser
   - Start creating projects and adding entries!

### Optional: Enable Voice Features
- Get an OpenAI API key from https://platform.openai.com/api-keys
- The setup script will ask if you want to add your API key
- You can also add it later by editing `.env.local`

## 📝 Notes
- All data is stored locally on your computer
- Images are saved in the `public/uploads` folder
- The application works offline once started
- Data persists between container restarts

## 🔄 Updates
To update to the latest version:
```bash
docker-compose down
docker pull schuttpj1986/grid-view-project-companion:latest
docker-compose up -d
```

## 🔧 Troubleshooting

### Port Already in Use
If port 3000 is already in use:
1. Edit `docker-compose.yml`
2. Change `"3000:3000"` to `"3001:3000"` (or any other available port)
3. Restart the container with `docker-compose up -d`

### Data Persistence
Your data is automatically saved in Docker volumes. To completely reset:
```bash
docker-compose down -v  # Warning: This will delete all data!
```