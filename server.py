from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import json
import socket
import struct
from math import isfinite

from simulation import Battery, simulate


def read_register(data):
    host, port, unit, address = (data[key] for key in ("host", "port", "unit", "address"))
    if not isinstance(host, str) or not host.strip() or len(host) > 253:
        raise ValueError("Podaj adres hosta.")
    for value, low, high in ((port, 1, 65535), (unit, 0, 255), (address, 0, 65535)):
        if type(value) is not int or not low <= value <= high:
            raise ValueError("Parametr Modbus poza zakresem.")
    kind = data.get("format", "u16")
    if kind not in ("u16", "s16", "u32", "s32"):
        raise ValueError("Nieobsługiwany format rejestru.")
    count = 2 if kind.endswith("32") else 1
    scale = data.get("scale", 1)
    if type(scale) not in (int, float) or not isfinite(scale) or scale == 0 or address + count > 65536:
        raise ValueError("Sprawdź skalę i zakres rejestrów.")
    function = 4 if data.get("input") is True else 3
    with socket.create_connection((host, port), timeout=3) as conn, conn.makefile("rb") as stream:
        conn.sendall(struct.pack(">HHHBBHH", 1, 0, 6, unit, function, address, count))
        transaction, protocol, length, device = struct.unpack(">HHHB", stream.read(7))
        if (transaction, protocol, device) != (1, 0, unit) or length not in (3, 3 + 2 * count):
            raise ValueError("Nieprawidłowy nagłówek odpowiedzi Modbus.")
        body = stream.read(length - 1)
        if len(body) == 2 and body[0] == function | 128:
            raise ValueError(f"Urządzenie zwróciło wyjątek Modbus {body[1]}.")
        if len(body) != 2 + 2 * count or body[:2] != bytes((function, 2 * count)):
            raise ValueError("Nieprawidłowa odpowiedź rejestru.")
        raw = body[2:]
        if count == 2 and data.get("swap") is True:
            raw = raw[2:] + raw[:2]
        value = int.from_bytes(raw, "big", signed=kind.startswith("s")) * scale
        if not isfinite(value):
            raise ValueError("Wynik poza zakresem liczbowym.")
        return value


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        pages = {
            "/": ("index.html", "text/html; charset=utf-8"),
            "/panels/sensor.js": ("panels/sensor.js", "text/javascript; charset=utf-8"),
            "/panels/equipment.js": ("panels/equipment.js", "text/javascript; charset=utf-8"),
            "/panels/meter-comparison.js": ("panels/meter-comparison.js", "text/javascript; charset=utf-8"),
        }
        page = pages.get(self.path)
        if page is None:
            self.send_error(404)
            return
        filename, mime = page
        self.respond(200, mime, (Path(__file__).parent / filename).read_bytes())

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
