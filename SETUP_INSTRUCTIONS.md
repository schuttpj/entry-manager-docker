# Entry Manager - Quick Setup Guide

## 1. Install Docker Desktop
- Download from: https://www.docker.com/products/docker-desktop
- Install and start Docker Desktop
- Wait until Docker Desktop says "Running"

## 2. Download Files
Download these files to a new folder on your computer:
- Windows users: `setup.bat`
- Mac/Linux users: `setup.sh`

## 3. Run Setup Script

### Windows Users:
1. Create a new folder (e.g., `C:\entry-manager`)
2. Copy `setup.bat` into this folder
3. Double-click `setup.bat`
   - If Windows warns about security, click "More info" then "Run anyway"
4. Follow the prompts to add your OpenAI API key (optional)
5. Wait while the script downloads the Docker image (this may take a few minutes)

### Mac/Linux Users:
1. Create a new folder:
   ```bash
   mkdir entry-manager
   cd entry-manager
   ```
2. Copy `setup.sh` into this folder
3. Open Terminal in this folder and run:
   ```bash
   chmod +x setup.sh
   ./setup.sh
   ```
4. Follow the prompts to add your OpenAI API key (optional)
5. Wait while the script downloads the Docker image (this may take a few minutes)

## 4. Start the Application
1. In the same folder, run:
   ```bash
   docker-compose up -d
   ```
2. Open your web browser
3. Go to: http://localhost:3000

## Notes
- All your data is stored locally in the `public` folder
- The app works offline once started
- Voice features only work if you added an API key
- Need an API key? Get one from: https://platform.openai.com/api-keys
- Want to change your API key later? Edit `.env.local` in your folder

## Troubleshooting

### Docker Image Download
- If the image download fails, check your internet connection
- The download might take several minutes depending on your connection speed
- You can manually download the image by running: `docker pull yourusername/entry-manager:latest`

### API Key Issues
- If you skipped adding the API key during setup, you can add it later
- Voice features won't work until you add a valid API key
- The API key should start with 'sk-' and be about 51 characters long 