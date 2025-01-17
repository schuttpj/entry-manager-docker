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

## �� Initial Setup

### 1. Create Project Directory

#### Windows
1. Open File Explorer
2. Navigate to where you want to create the project (e.g., `C:\Projects\`)
3. Create a new folder named `entry-manager-docker`

Example directory structure:
```
C:\Projects\
└── entry-manager-docker\    # Your project folder
```

To navigate using Command Prompt (CMD):
```bash
# Navigate to C: drive
C:

# Go to Projects folder (create it if it doesn't exist)
mkdir Projects
cd Projects

# Create and enter project directory
mkdir entry-manager-docker
cd entry-manager-docker
```


Example directory structure:
```
~/Projects/
└── entry-manager-docker/    # Your project folder
```

### 2. Clone Repository

Once you're inside the `entry-manager-docker` directory, clone the repository:
```bash
git clone https://github.com/schuttpj/entry-manager-docker .
```
Note: The dot (.) at the end is important - it clones into the current directory instead of creating a new subdirectory.

### 3. Verify Setup
After cloning, your directory structure should look like this:
```
entry-manager-docker/
├── app/
├── components/
├── lib/
├── public/
│   ├── uploads/
│   ├── exports/
│   └── backups/
├── .env.example
├── docker-compose.yml
├── Dockerfile
└── README.md
```

To verify the setup:
```bash
# List all files (Windows CMD/PowerShell)
dir

# List all files (Linux/MacOS)
ls -la
```

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
NEXT_PUBLIC_OPENAI_API_KEY=your_openai_api_key_here
NEXT_PUBLIC_SERP_API_KEY=your_serp_api_key_here
PORT=3000
```

3. Build and run with Docker Compose
```bash
docker-compose up --build
```

The application will be available at `http://localhost:3000`

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
- `NEXT_PUBLIC_SERP_API_KEY` - For enhanced search (optional)
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

### Viewing Logs
```bash
# View logs
docker-compose logs

# Follow logs
docker-compose logs -f
```

## 💾 Data Persistence

### File Storage
- All uploaded files are stored in `./public/uploads`
- PDF exports are saved to `./public/exports`
- Database backups are stored in `./public/backups`

### Accessing Files
- Uploads: `http://localhost:3000/uploads/
- Exports: `http://localhost:3000/exports/
- Backups: `http://localhost:3000/backups/

### Backup and Restore
1. Backups are automatically stored in the `./public/backups` directory
2. To restore from a backup:
   - Place the backup file in the `./public/backups` directory
   - Use the application's restore functionality
   - The backup will be accessible through the mounted volume

## 🔒 Security Notes

1. API Keys:
   - Never commit `.env.local` to version control
   - Use secure API keys and rotate them regularly
   - The `.env.example` file provides a template for required variables

2. File Permissions:
   - The application runs as a non-root user (nextjs:nodejs)
   - All data directories have appropriate permissions set
   - Host directory permissions should be set appropriately

## 🚨 Troubleshooting

1. **Permission Issues**
   ```bash
   # Fix permissions on host machine
   sudo chown -R 1001:1001 public/uploads public/exports public/backups
   ```

2. **Container Won't Start**
   - Check if ports are already in use
   - Verify environment variables are set correctly
   - Check Docker logs for detailed error messages

3. **Files Not Persisting**
   - Verify volume mappings in docker-compose.yml
   - Check host directory permissions
   - Ensure directories exist on host machine

## 📝 Development Notes

### Building for Production
```bash
# Build production image
docker build -t entry-manager .

# Run production container
docker run -p 3000:3000 entry-manager
```

### Local Development
For local development without Docker:
1. Install dependencies: `npm install`
2. Start development server: `npm run dev`

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details. 