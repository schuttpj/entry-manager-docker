# Entry Manager - Simple Installation Guide

## Step 1: Install Docker Desktop
1. Download Docker Desktop from https://www.docker.com/products/docker-desktop
2. Install Docker Desktop
3. Start Docker Desktop and wait until you see "Docker Desktop is running" in the system tray

## Step 2: Create Installation Folder
1. Open File Explorer
2. Create a new folder called `entry-manager` (e.g., at `C:\entry-manager`)

## Step 3: Download Setup Files
1. Download these two files into your `entry-manager` folder:
   - `setup.bat`
   - `.env.example`

## Step 4: Run Setup
1. Double-click `setup.bat`
2. If Windows shows a security warning:
   - Click "More info"
   - Click "Run anyway"
3. When asked about adding an OpenAI API key:
   - Option 1: Type `Y` and press Enter, then paste your API key
   - Option 2: Type `N` and press Enter to skip (you can add it later)
4. Wait while the script downloads the Docker image
   - This takes about 5-10 minutes on first run
   - You'll see a "Setup complete!" message when done

## Step 5: Start the App
1. After setup completes, type this command:
   ```
   docker-compose up -d
   ```
2. Open your web browser
3. Go to: http://localhost:3000

## Notes
- The app works offline once started
- All data is stored on your computer
- Voice features only work if you added an API key
- Need help? Contact [Your Contact Info]

## Troubleshooting

### Docker Image Download
- If the image download fails, check your internet connection
- The download might take several minutes depending on your connection speed
- You can manually download the image by running: `docker pull schuttpj1986/entry-manager:latest`

### API Key Issues
- If you skipped adding the API key during setup, you can add it later by editing `.env.local`
- Voice features won't work until you add a valid API key
- The API key should start with 'sk-' and be about 51 characters long
- Get an API key from: https://platform.openai.com/api-keys 