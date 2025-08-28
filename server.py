#!/usr/bin/env python3
"""
Simple HTTP server for Flip 7 website with aggressive cache-busting headers
Run with: python3 server.py
Access at: http://localhost:8080
"""

import http.server
import socketserver
import os
from urllib.parse import urlparse

class NoCacheHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Add aggressive no-cache headers
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path in ('/new', '/new/'):
            self.path = '/index.html'
            return http.server.SimpleHTTPRequestHandler.do_GET(self)
        if parsed.path in ('/old', '/old/'):
            self.path = '/index-old.html'
            return http.server.SimpleHTTPRequestHandler.do_GET(self)
        if parsed.path == '/':
            # Default to /new for convenience
            self.send_response(302)
            self.send_header('Location', '/new')
            self.end_headers()
            return
        return super().do_GET()

def run_server():
    PORT = 8080
    # Use current directory instead of hardcoded path
    # Server will run from wherever the script is located
    
    with socketserver.TCPServer(("", PORT), NoCacheHTTPRequestHandler) as httpd:
        print(f"🚀 NUCLEAR SERVER RUNNING!")
        print(f"📱 New (modular): http://localhost:{PORT}/new")
        print(f"🕹️ Old (legacy): http://localhost:{PORT}/old")
        print(f"🔄 No-cache headers active - fresh files every time!")
        print(f"📱 Test on mobile device or resize browser < 1024px")
        print(f"⚡ Press Ctrl+C to stop")
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n🛑 Server stopped")

if __name__ == "__main__":
    run_server()