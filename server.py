#!/usr/bin/env python3
"""
Simple HTTP server for Flip 7 website with aggressive cache-busting headers
Run with: python3 server.py
Access at: http://localhost:8080
"""

import http.server
import socketserver
import os

class NoCacheHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Add aggressive no-cache headers
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

def run_server():
    PORT = 8080
    os.chdir('/Users/gibsonwitz/Desktop/Flip7-Website')
    
    with socketserver.TCPServer(("", PORT), NoCacheHTTPRequestHandler) as httpd:
        print(f"🚀 NUCLEAR SERVER RUNNING!")
        print(f"📱 Mobile Layout Test: http://localhost:{PORT}")
        print(f"🔄 No-cache headers active - fresh files every time!")
        print(f"📱 Test on mobile device or resize browser < 1024px")
        print(f"⚡ Press Ctrl+C to stop")
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n🛑 Server stopped")

if __name__ == "__main__":
    run_server()