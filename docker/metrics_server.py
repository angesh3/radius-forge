#!/usr/bin/env python3
import http.server
import socketserver

class MetricsHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/metrics':
            self.send_response(200)
            self.send_header('Content-type', 'text/plain')
            self.end_headers()
            metrics = '''# HELP radiusforge_up RadiusForge service status
radiusforge_up 1

radiusforge_version_info{version="1.4.0"} 1

radiusforge_api_requests_total 0

radiusforge_auth_success_total 0

radiusforge_auth_failure_total 0
'''
            self.wfile.write(metrics.encode())
        else:
            self.send_response(404)
            self.end_headers()
    
    def log_message(self, format, *args):
        pass

if __name__ == '__main__':
    with socketserver.TCPServer(('', 8916), MetricsHandler) as httpd:
        httpd.serve_forever()
