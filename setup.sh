#!/bin/bash
echo "Setting up Entry Manager..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed or not in PATH"
    echo "Please install Docker Desktop from https://www.docker.com/products/docker-desktop"
    echo "and make sure it is running before continuing."
    exit 1
fi

# Check for .env.example
if [ ! -f .env.example ]; then
    echo "Error: .env.example file not found!"
    echo "Please make sure you're running this script in the correct directory."
    exit 1
fi

# Create directories
echo "Creating required directories..."
if ! mkdir -p public/uploads public/exports public/backups; then
    echo "Warning: Some directories could not be created. They might already exist."
fi

# Copy .env.example to .env.local
echo
echo "Creating .env.local from template..."
cp .env.example .env.local

# Function to validate API key format
validate_api_key() {
    local api_key=$1
    if [[ $api_key =~ ^sk-[A-Za-z0-9]{48}$ ]]; then
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
        echo "(It should start with 'sk-' and be about 51 characters long)"
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
            echo "It should start with 'sk-' and be followed by 48 characters."
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

# Create docker-compose.yml if it doesn't exist
if [ ! -f docker-compose.yml ]; then
    echo "Creating docker-compose.yml..."
    cat > docker-compose.yml << EOL
version: '3.8'
services:
  app:
    image: yourusername/entry-manager:latest
    ports:
      - "3000:3000"
    volumes:
      - ./.env.local:/app/.env.local
      - ./public/uploads:/app/public/uploads
      - ./public/exports:/app/public/exports
      - ./public/backups:/app/public/backups
      - app-data:/app/data
    restart: unless-stopped
volumes:
  app-data:
    driver: local
EOL
fi

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