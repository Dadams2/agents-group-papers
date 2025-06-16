#!/bin/bash

# Setup script for AI Agents Research Group Paper System

echo "🧠 AI Agents Research Group Paper System Setup"
echo "=============================================="
echo ""

# Check if we're in the right directory
if [ ! -f "index.html" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

echo "✅ Project structure verified"

# Check for required tools
echo "🔍 Checking dependencies..."

if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required but not installed"
    echo "   Please install Python 3 and try again"
    exit 1
fi

if ! command -v git &> /dev/null; then
    echo "❌ Git is required but not installed"
    echo "   Please install Git and try again"
    exit 1
fi

echo "✅ All dependencies found"

# Initialize git if not already done
if [ ! -d ".git" ]; then
    echo "📦 Initializing Git repository..."
    git init
    git add .
    git commit -m "Initial commit: AI Agents Research Group Paper System"
    echo "✅ Git repository initialized"
else
    echo "✅ Git repository already exists"
fi

# Create local configuration
echo "⚙️  Setting up local configuration..."

# Update config with user input
echo ""
echo "📝 Please provide some information to customize your setup:"
echo ""

read -p "👥 Group name (default: AI Agents Research Group): " GROUP_NAME
GROUP_NAME=${GROUP_NAME:-"AI Agents Research Group"}

read -p "📅 Meeting day (default: Friday): " MEETING_DAY  
MEETING_DAY=${MEETING_DAY:-"Friday"}

read -p "🕐 Meeting time (default: 2:00 PM): " MEETING_TIME
MEETING_TIME=${MEETING_TIME:-"2:00 PM"}

read -p "🌍 Timezone (default: EST): " TIMEZONE
TIMEZONE=${TIMEZONE:-"EST"}

# Update tracks config
python3 << EOF
import json

# Load and update tracks config
with open('tracks/config.json', 'r') as f:
    config = json.load(f)

config['settings']['groupName'] = "$GROUP_NAME"
config['settings']['meetingDay'] = "$MEETING_DAY"  
config['settings']['meetingTime'] = "$MEETING_TIME"
config['settings']['timezone'] = "$TIMEZONE"

with open('tracks/config.json', 'w') as f:
    json.dump(config, f, indent=2)

print("✅ Configuration updated")
EOF

# Make scripts executable
chmod +x dev-server.sh

echo ""
echo "🎉 Setup complete!"
echo ""
echo "🚀 Next steps:"
echo "   1. Start development server: ./dev-server.sh"
echo "   2. Open http://localhost:8000 in your browser"
echo "   3. Test the upload and browse functionality"
echo ""
echo "📚 For GitHub Pages deployment:"
echo "   1. Push this repository to GitHub"
echo "   2. Enable GitHub Pages in repository settings"
echo "   3. Update the repository URL in package.json and _config.yml"
echo "   4. Optionally set up GitHub OAuth for authentication"
echo ""
echo "📖 See README.md for detailed instructions"
echo ""
echo "Happy paper reading! 📚"
