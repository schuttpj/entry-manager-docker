#!/bin/bash
echo "Setting up Grid View Project Companion..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed or not in PATH"
    echo "Please install Docker Desktop from https://www.docker.com/products/docker-desktop"
    echo "and make sure it is running before continuing."
    exit 1
fi

# Create directories
echo "Creating required directories..."
mkdir -p public/uploads public/exports public/backups

# Create .env.example
echo "Creating environment file..."
cat > .env.example << EOL
# OpenAI API Key for voice features (optional)
OPENAI_API_KEY=your_api_key_here
NEXT_PUBLIC_OPENAI_API_KEY=your_api_key_here
EOL

# Copy .env.example to .env.local
echo "Creating .env.local from template..."
cp .env.example .env.local

# Function to validate API key format
validate_api_key() {
    local api_key=$1
    if [[ $api_key =~ ^sk- ]]; then
        return 0
    else
        return 1
    fi
}

# Prompt for API key
echo
read -p "Would you like to add your OpenAI API key for voice features? (y/N) " ADD_KEY
if [[ $ADD_KEY =~ ^[Yy]$ ]]; then
    while true; do
        echo
        echo "Please enter your OpenAI API key:"
        echo "(It should start with 'sk-')"
        echo "(You can paste it using Ctrl+Shift+V or Command+V)"
        read API_KEY
        
        if validate_api_key "$API_KEY"; then
            echo
            echo "API key format verified."
            # Replace placeholder in .env.local with actual API key
            sed -i "s/your_api_key_here/$API_KEY/g" .env.local
            echo "API key has been added to .env.local"
            break
        else
            echo
            echo "Error: The API key format appears to be invalid."
            echo "It should start with 'sk-'"
            echo
            read -p "Would you like to try again? (y/N) " RETRY
            if [[ ! $RETRY =~ ^[Yy]$ ]]; then
                echo
                echo "Continuing without API key..."
                break
            fi
        fi
    done
else
    echo
    echo ".env.local created with placeholder API key."
    echo "You can add your API key later by editing .env.local"
fi

# Create docker-compose.yml
echo "Creating docker-compose.yml..."
cat > docker-compose.yml << EOL
version: '3.8'
services:
  app:
    image: schuttpj1986/grid-view-project-companion:latest
    ports:
      - "3000:3000"
    volumes:
      - ./.env.local:/app/.env.local
      - ./public/uploads:/app/public/uploads
      - ./public/exports:/app/public/exports
      - ./public/backups:/app/public/backups
      - indexeddb-data:/app/.next/cache/indexeddb
      - app-data:/app/data
    restart: unless-stopped
volumes:
  app-data:
    driver: local
  indexeddb-data:
    driver: local
EOL

echo
echo "Downloading Docker image..."
echo "This might take a few minutes depending on your internet connection..."
if ! docker pull schuttpj1986/grid-view-project-companion:latest; then
    echo
    echo "Error: Failed to download Docker image."
    echo "Please check your internet connection and try again."
    exit 1
fi
echo "Docker image downloaded successfully!"

echo
echo "Setup complete!"
if [ -z "$API_KEY" ]; then
    echo
    echo "Note: Voice features will be disabled. You can enable them later by:"
    echo "1. Getting an API key from https://platform.openai.com/api-keys"
    echo "2. Adding it to .env.local in this folder"
fi
echo
echo "Next steps:"
echo "1. Run: docker-compose up -d"
echo "2. Open http://localhost:3000 in your browser" 