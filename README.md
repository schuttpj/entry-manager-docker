# Entry List Manager - Docker Setup Guide

A powerful, locally-hosted application for managing and organizing entry lists with advanced features. Perfect for property inspections, construction projects, and any scenario requiring detailed documentation with photos and annotations.

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

### 🎤 AI-Powered Voice Features
- Voice-to-text transcription using OpenAI Whisper
- Voice commands for navigation
- Voice notes for quick documentation
- Multi-language support
- Automatic punctuation and formatting

### 💾 Offline-First Architecture
- Works 100% offline after initial setup
- Local data storage with IndexedDB
- Automatic local backups
- Data export/import functionality
- No internet required for core features

### 📱 Modern User Interface
- Responsive single-page design
- Dark/Light mode support
- Touch-friendly controls
- Keyboard shortcuts
- Customizable layout

### 🔍 Smart Search & Filtering
- Full-text search across all entries
- Filter by date, project, or status
- Advanced search operators
- Save custom search filters
- Quick search suggestions

### 📊 Reporting & Export
- Generate professional PDF reports
- Customizable report templates
- Batch export functionality
- Include/exclude specific entries
- Export with or without annotations

### 🔒 Security & Privacy
- All data stored locally
- No cloud dependencies
- Encrypted storage support
- Role-based access control
- Audit logging

### 🔄 Project Management
- Multiple project support
- Project templates
- Bulk operations
- Status tracking
- Due date management

### 🛠️ Technical Features
- Docker containerization
- Volume-based persistence
- Easy backup/restore
- Performance optimized
- Cross-platform support

## 🚀 Getting Started

### Quick Start (Using Pre-built Image)
If someone shared the Docker image with you:

1. **Install Docker Desktop** only
   - Download from: https://www.docker.com/products/docker-desktop
   - Install and start Docker Desktop

2. **Load the Image**
   ```bash
   # If you received a .tar file:
   docker load < entry-manager.tar
   
   # OR if it's on Docker Hub:
   docker pull username/entry-manager:latest
   ```

3. **Create Project Directory and Setup**
   ```bash
   # Create directory for data
   mkdir entry-manager
   cd entry-manager
   
   # Download the simple compose file
   curl -O https://raw.githubusercontent.com/yourusername/entry-manager-docker/main/docker-compose.simple.yml
   
   # Create environment file
   curl -O https://raw.githubusercontent.com/yourusername/entry-manager-docker/main/.env.simple.example
   copy .env.simple.example .env.local    # Windows
   # or
   cp .env.simple.example .env.local      # Mac/Linux
   ```

4. **Configure API Key (Optional)**
   - Open `.env.local` in a text editor
   - Add your OpenAI API key if you want voice features
   - Save the file
   - The app works without an API key, but voice features will be disabled

5. **Start the Application**
   ```bash
   # Start the container
   docker-compose -f docker-compose.simple.yml up -d
   ```

6. **Access the Application**
   - Open http://localhost:3000 in your browser
   - All data is stored locally in the `public` folder
   - Voice features will work if you added an API key

### Full Installation (Building from Source)
If you want to build the image yourself:

### 1. Required Software
Before you begin, you'll need to install these applications:

1. **Docker Desktop** (Required)
   - Download from: https://www.docker.com/products/docker-desktop
   - This provides the easiest way to run Docker containers
   - After installation, start Docker Desktop and wait for it to fully load

2. **Visual Studio Code** (Recommended)
   - Download from: https://code.visualstudio.com/
   - This is the recommended editor for working with the code
   - Install the "Docker" extension in VS Code for better Docker integration

3. **Git** (Required)
   - Download from: https://git-scm.com/downloads
   - This is needed to clone the repository
   - During installation, use the default options if unsure

4. **Node.js** (Required)
   - Download from: https://nodejs.org/
   - Install version 20 or later
   - Choose the "LTS" (Long Term Support) version

### 2. Installation Steps

#### A. Create Project Directory
1. Open File Explorer
2. Navigate to where you want to create the project (e.g., `C:\Projects\`)
3. Create a new folder named `entry-manager-docker`

#### B. Clone the Repository
1. Open Terminal (or PowerShell on Windows):
   ```bash
   # Navigate to your project folder
   cd C:\Projects\entry-manager-docker  # Windows example
   # or
   cd ~/Projects/entry-manager-docker   # Mac/Linux example

   # Clone the repository (the dot at the end is important)
   git clone https://github.com/schuttpj/entry-manager-docker .
   ```

#### C. Install Dependencies
```bash
# Install project dependencies
npm clean-install --legacy-peer-deps
```

#### D. Set Up Environment
1. Create your environment file:
   ```bash
   # Windows
   copy .env.example .env.local

   # Mac/Linux
   cp .env.example .env.local
   ```

2. Edit `.env.local` in VS Code (or any text editor)
   - OpenAI API key is optional (only needed for voice features)
   - Save the file after editing

#### E. Start the Application
1. Make sure Docker Desktop is running
2. Open Terminal in your project folder and run:
   ```bash
   # Build and start the container
   docker-compose up -d
   ```

   > **Note:** The first time you run this command, Docker will build the image which can take 10-15 minutes. 
   > This happens only once. After that, starting the container takes just a few seconds.

3. You can watch the build progress with:
   ```bash
   # View the logs while building/starting
   docker-compose logs -f
   ```

4. The application is ready when you see:
   ```
   entry-manager-docker-app-1  | Ready - started server on 0.0.0.0:3000
   ```

#### F. Access the Application
1. Open your web browser
2. Go to: http://localhost:3000
3. You should see the application running

### What's Next?
- All your data will be stored locally on your computer
- Images will be saved in the `public/uploads` folder
- The application works offline once started
- Use the troubleshooting guide below if you encounter any issues

## 🔧 Environment Setup

1. Create environment file
```bash
# Windows (CMD/PowerShell)
copy .env.example .env.local

# Linux/MacOS
cp .env.example .env.local
```

2. Edit `.env.local` and add your API keys:
```env
# OpenAI API Key for voice transcription (optional)
NEXT_PUBLIC_OPENAI_API_KEY=your_openai_api_key_here

# Port for the development server (optional, defaults to 3000)
PORT=3000
```

3. Start Docker with environment variables:
```bash
# Start the container (it will automatically use variables from .env.local)
docker-compose up -d

# Alternative: explicitly specify the env file
docker-compose --env-file .env.local up -d
```

4. Verify environment variables in the container:
```bash
# Check specific environment variables
docker-compose exec app env | findstr NEXT_PUBLIC

# Or check all environment variables
docker-compose exec app env
```

If you need to update environment variables:
1. Edit `.env.local` with your new values
2. Restart the container:
```bash
docker-compose down
docker-compose up -d
```

## ⚠️ Troubleshooting Common Issues

### Dependency Installation Issues
1. Always use the `--legacy-peer-deps` flag:
   ```bash
   # Fresh install (recommended)
   npm clean-install --legacy-peer-deps

   # Alternative install
   npm install --legacy-peer-deps
   ```

2. If you get canvas-related errors:
   ```bash
   # Windows: Install build tools
   npm install --global windows-build-tools

   # Linux: Install required packages
   sudo apt-get install build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev
   ```

3. If you get OpenAI API errors:
   - Ensure you've set up OPENAI_API_KEY in your .env.local file
   - Voice transcription won't work without this key
   - Other features will still work without the API key

### Port Conflicts
If port 3000 is already in use, you can:
1. Change the port in docker-compose.yml:
   ```yaml
   ports:
     - "3001:3000"   # Maps container port 3000 to host port 3001
   ```
2. Or stop the service using port 3000:
   ```bash
   # Windows: Find process using port 3000
   netstat -ano | findstr :3000
   # Kill the process (replace PID with the process ID)
   taskkill /PID PID /F
   ```

### Data Persistence
- All data is stored in Docker volumes
- Check volume status: `docker volume ls`
- Backup volumes before updates
- Use `docker-compose down` (not `docker-compose down -v`) to preserve data

## 📁 Directory Structure

The application uses several directories for data storage, all persisted through Docker volumes:

```
public/
├── uploads/    # For uploaded images and files
├── exports/    # For generated PDF exports
└── backups/    # For database backups and restores
```

## 🐳 Docker Configuration

### Volume Mapping
The application uses the following volume mappings:
- `./public/uploads:/app/public/uploads` - For uploaded files
- `./public/exports:/app/public/exports` - For PDF exports
- `./public/backups:/app/public/backups` - For database backups
- `app-data:/app/data` - For application data

### Environment Variables
Required environment variables:
- `NEXT_PUBLIC_OPENAI_API_KEY` - For voice transcription (optional)
- `PORT` - Application port (default: 3000)

## 🛠️ Docker Commands

### Starting the Application
```bash
# Start in development mode
docker-compose up

# Start in detached mode
docker-compose up -d
```

### Stopping the Application
```bash
# Stop the application
docker-compose down

# Stop and remove volumes (warning: this will delete all data)
docker-compose down -v
```