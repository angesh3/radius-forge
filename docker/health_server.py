#!/usr/bin/env python3
import http.server
import socketserver
import json

class HealthHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/health':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            status = {
                'status': 'healthy',
                'version': '1.4.0',
                'container': 'docker',
                'ports': '8910-8926'
            }
            self.wfile.write(json.dumps(status).encode())
        else:
            self.send_response(404)
            self.end_headers()
    
    def log_message(self, format, *args):
        pass

if __name__ == '__main__':
    with socketserver.TCPServer(('', 8917), HealthHandler) as httpd:
        httpd.serve_forever()
