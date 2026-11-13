from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import json
import socket
import struct

from simulation import Battery, simulate


def read_register(data):
    host, port, unit, address = (data[key] for key in ("host", "port", "unit", "address"))
    if not isinstance(host, str) or not host.strip() or len(host) > 253:
        raise ValueError("Podaj adres hosta.")
    for value, low, high in ((port, 1, 65535), (unit, 0, 255), (address, 0, 65535)):
        if type(value) is not int or not low <= value <= high:
            raise ValueError("Parametr Modbus poza zakresem.")
    function = 4 if data.get("input") is True else 3
    with socket.create_connection((host, port), timeout=3) as conn, conn.makefile("rb") as stream:
        conn.sendall(struct.pack(">HHHBBHH", 1, 0, 6, unit, function, address, 1))
        transaction, protocol, length, device = struct.unpack(">HHHB", stream.read(7))
        if (transaction, protocol, device) != (1, 0, unit) or length not in (3, 5):
            raise ValueError("Nieprawidłowy nagłówek odpowiedzi Modbus.")
        body = stream.read(length - 1)
        if len(body) == 2 and body[0] == function | 128:
            raise ValueError(f"Urządzenie zwróciło wyjątek Modbus {body[1]}.")
        if len(body) != 4 or body[:2] != bytes((function, 2)):
            raise ValueError("Nieprawidłowa odpowiedź rejestru.")
        return int.from_bytes(body[2:], "big")


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path != "/":
            self.send_error(404)
            return
        self.respond(200, "text/html; charset=utf-8", Path(__file__).with_name("index.html").read_bytes())

    def do_POST(self):
        if self.path not in ("/simulate", "/modbus-read"):
            self.send_error(404)
            return
        if self.path == "/modbus-read" and self.headers.get("Origin") != "http://" + self.headers.get("Host", ""):
            self.send_error(403)
            return
        try:
            size = int(self.headers.get("Content-Length", 0))
            if not 0 < size <= 1_000_000:
                raise ValueError("Nieprawidłowy rozmiar danych.")
            data = json.loads(self.rfile.read(size))
            if self.path == "/modbus-read":
                try:
                    result = {"value": read_register(data)}
                except (OSError, struct.error):
                    result = {"error": "Brak połączenia lub kompletnej odpowiedzi urządzenia."}
                except (ValueError, KeyError, TypeError) as error:
                    result = {"error": str(error)}
                self.respond(400 if "error" in result else 200, "application/json", json.dumps(result).encode())
                return
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
