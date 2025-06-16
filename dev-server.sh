#!/bin/bash

# Development server script for the AI Agents Research Group paper system

echo "🚀 Starting AI Agents Research Group Paper System..."
echo "📂 Serving from: $(pwd)"
echo "🌐 URL: http://localhost:8000"
echo ""
echo "📝 Available pages:"
echo "   • Home: http://localhost:8000"
echo "   • Upload: http://localhost:8000/upload.html" 
echo "   • Browse: http://localhost:8000/browse.html"
echo "   • Schedule: http://localhost:8000/schedule.html"
echo ""
echo "🔧 Development tips:"
echo "   • Edit files and refresh browser to see changes"
echo "   • Check browser console for JavaScript errors"
echo "   • Papers are stored in /papers/ directory"
echo "   • Schedule data in /schedule/schedule.json"
echo ""
echo "Press Ctrl+C to stop the server"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Start Python HTTP server
python3 -m http.server 8000
