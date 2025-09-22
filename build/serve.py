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
        result = super().guess_type(path)
        if isinstance(result, tuple) and len(result) >= 2:
            mimetype, encoding = result[0], result[1]
        else:
            mimetype, encoding = result, None
            
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
