import http.server
import socketserver
import os
import sys

PORT = 8081
DIRECTORY = os.path.join(os.path.dirname(__file__), "site")

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        super().end_headers()

class ThreadingHTTPServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    daemon_threads = True
    allow_reuse_address = True

def run():
    with ThreadingHTTPServer(("127.0.0.1", PORT), CustomHandler) as httpd:
        print(f"======================================================")
        print(f" Hidden Gem Cafe Server running at: http://localhost:{PORT}")
        print(f" Serving directory: {DIRECTORY}")
        print(f" Press Ctrl+C to stop.")
        print(f"======================================================")
        sys.stdout.flush()
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")

if __name__ == "__main__":
    run()
