from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import json

from simulation import Battery, simulate


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path != "/":
            self.send_error(404)
            return
        self.respond(200, "text/html; charset=utf-8", Path(__file__).with_name("index.html").read_bytes())

    def do_POST(self):
        if self.path != "/simulate":
            self.send_error(404)
            return
        try:
            size = int(self.headers.get("Content-Length", 0))
            if not 0 < size <= 1_000_000:
                raise ValueError("Nieprawidłowy rozmiar danych.")
            data = json.loads(self.rfile.read(size))
            result = simulate(data["profile"], Battery(**data["battery"]), data.get("export_limit_kw"))
            self.respond(200, "application/json", json.dumps(result, allow_nan=False).encode())
        except (KeyError, TypeError, ValueError, OverflowError):
            self.respond(400, "application/json", b'{"error":"Sprawdz profil i parametry magazynu."}')

    def respond(self, status, mime, body):
        self.send_response(status)
        self.send_header("Content-Type", mime)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


if __name__ == "__main__":
    print("TSI PV Studio: http://127.0.0.1:8767", flush=True)
    ThreadingHTTPServer(("127.0.0.1", 8767), Handler).serve_forever()
