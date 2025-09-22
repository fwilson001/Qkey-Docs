#!/bin/bash

# Qkey Docs Build Script
# Prepares the documentation for deployment

set -e

echo "🔨 Building Qkey Docs..."

# Create build directory
BUILD_DIR="build"
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

# Copy source files
cp -r src/* "$BUILD_DIR/"

# Copy documentation
cp -r docs "$BUILD_DIR/"

# Create a simple server script for local testing
cat > "$BUILD_DIR/serve.py" << 'EOF'
#!/usr/bin/env python3
import http.server
import socketserver
import os
import webbrowser
from pathlib import Path

PORT = 8000

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def guess_type(self, path):
        mimetype, encoding = super().guess_type(path)
        if path.endswith('.md'):
            return 'text/plain', encoding
        return mimetype, encoding

if __name__ == "__main__":
    os.chdir(Path(__file__).parent)
    
    with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
        print(f"🚀 Serving Qkey Docs at http://localhost:{PORT}")
        print(f"📁 Directory: {os.getcwd()}")
        print("Press Ctrl+C to stop the server")
        
        # Try to open browser
        try:
            webbrowser.open(f'http://localhost:{PORT}')
        except:
            pass
            
        httpd.serve_forever()
EOF

chmod +x "$BUILD_DIR/serve.py"

# Create Dockerfile
cat > "$BUILD_DIR/Dockerfile" << 'EOF'
FROM nginx:alpine

# Copy documentation files
COPY . /usr/share/nginx/html/

# Create nginx configuration for SPA
RUN echo 'server { \
    listen 80; \
    server_name localhost; \
    root /usr/share/nginx/html; \
    index index.html; \
    \
    # Handle markdown files \
    location ~ \.md$ { \
        add_header Content-Type text/plain; \
    } \
    \
    # Handle all routes \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    \
    # Security headers \
    add_header X-Frame-Options "SAMEORIGIN" always; \
    add_header X-Content-Type-Options "nosniff" always; \
    add_header X-XSS-Protection "1; mode=block" always; \
    \
    # Caching \
    location ~* \.(css|js|ico|png|jpg|jpeg|gif|svg)$ { \
        expires 1y; \
        add_header Cache-Control "public, immutable"; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
EOF

# Create docker-compose.yml
cat > "$BUILD_DIR/docker-compose.yml" << 'EOF'
version: '3.8'

services:
  qkey-docs:
    build: .
    ports:
      - "8080:80"
    volumes:
      - ./docs:/usr/share/nginx/html/docs:ro
    restart: unless-stopped
EOF

# Create .gitignore for the build
cat > "$BUILD_DIR/.gitignore" << 'EOF'
# Ignore common files that shouldn't be in documentation
*.log
*.tmp
*~
.DS_Store
Thumbs.db
node_modules/
.env
.env.local
EOF

echo "✅ Build complete! Files are in the '$BUILD_DIR' directory."
echo ""
echo "🚀 To test locally:"
echo "   cd $BUILD_DIR && python3 serve.py"
echo ""
echo "🐳 To run with Docker:"
echo "   cd $BUILD_DIR && docker-compose up -d"
echo ""
echo "📝 To deploy:"
echo "   Copy the contents of '$BUILD_DIR' to your web server"