import os
import json
from http.server import SimpleHTTPRequestHandler, HTTPServer
import urllib.parse

PORT = 8000
EXAMS_DIR = 'recursos/examenes'

class ExamAppHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        # API endpoint to list all available exams
        if self.path == '/api/examenes':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
            self.end_headers()
            
            exam_files = []
            if os.path.exists(EXAMS_DIR):
                for filename in os.listdir(EXAMS_DIR):
                    if filename.endswith('.json'):
                        filepath = os.path.join(EXAMS_DIR, filename)
                        # Read the JSON to get the title (id_examen or similar)
                        try:
                            with open(filepath, 'r', encoding='utf-8') as f:
                                data = json.load(f)
                                exam_files.append({
                                    "filename": filename,
                                    "path": f"/{EXAMS_DIR}/{filename}",
                                    "id_examen": data.get("id_examen", filename),
                                    "numero_parte": data.get("numero_parte", "")
                                })
                        except Exception as e:
                            print(f"Error reading {filename}: {e}")
            
            # Respond with the list of exams
            self.wfile.write(json.dumps(exam_files).encode('utf-8'))
            return
        
        # Disable caching for Dev
        self.send_response(200)
        
        return SimpleHTTPRequestHandler.do_GET(self)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        SimpleHTTPRequestHandler.end_headers(self)

if __name__ == '__main__':
    # Ensure the exams directory exists
    os.makedirs(EXAMS_DIR, exist_ok=True)
    
    server_address = ('', PORT)
    httpd = HTTPServer(server_address, ExamAppHandler)
    print(f"Servidor iniciado en http://localhost:{PORT}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    httpd.server_close()
    print("Servidor detenido.")
