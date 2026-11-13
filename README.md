# TSI PV Studio

**Fotowoltaika, magazyn energii i koszty instalacji w jednym lokalnym panelu.**  
Wydanie 0.1 · 13 listopada 2026 · Windows x64

TSI PV Studio pomaga właścicielom instalacji i instalatorom porównać warianty pracy instalacji na godzinowym profilu produkcji i zużycia. Sprawdzisz, ile energii zużywa dom, ile przejmuje magazyn i ile trzeba pobrać z sieci. Wyniki możesz przejrzeć na schemacie, wykresach i w tabelach.

## Co oferuje pełna wersja

| Panel | Zastosowanie |
|---|---|
| **Przegląd** | Interaktywny schemat paneli PV, falownika, magazynu, licznika i sieci. Strzałki pokazują przepływ w wybranej godzinie, a dymki prowadzą do odczytów i analiz. |
| **Magazyn i sterowanie** | Symulacja autokonsumpcji z ustawieniem pojemności, mocy, sprawności, rezerwy i limitu oddawania energii do sieci. |
| **Licznik i czujniki** | Rejestr urządzeń, ręczny odczyt Modbus TCP i RTU, historia próbek oraz porównanie poboru z symulacją z eksportem CSV. |
| **Analizy** | Porównanie przekrojów przewodów według spadku napięcia i strat, model temperatury przewodu oraz scenariusze pracy akumulatora. |
| **Bilans** | Koszt zakupu energii, dystrybucja, opłaty stałe, wartość eksportu, inwestycja, serwis i szacowany wynik po wydatkach. |
| **Asystent TSI i Pomoc** | Odpowiedzi na wybrane pytania o symulację i ostatni odczyt, raport produkcji i użytkowania, rejestr awarii oraz instrukcja konfiguracji sprzętu. |

Bilans jest szacunkiem według podanych stawek. Modbus sprawdzono z symulatorami. Bluetooth LE pozwala zapisać konfigurację urządzenia. Asystent korzysta z reguł i danych panelu. Funkcje sterowania działają w symulatorze.

## Demo i pełne wydanie

| Wydanie | Rozmiar | Uruchomienie |
|---|---:|---|
| **Demo** | ok. 1,6 KB | Zapisz plik `START.html` i otwórz w przeglądarce. Porównasz bilans dwóch przykładowych godzin dla różnych parametrów magazynu. |
| **Pełne 0.1** | ok. 126 KB plików aplikacji przed dodaniem tej dokumentacji | Rozpakuj cały folder wydania, zainstaluj wymagania i uruchom `START.bat`. Pełna paczka jest w lokalnym zestawie wydania. |

[Pobierz demo](https://raw.githubusercontent.com/jbackk-lang/TSI-PV-Studio/main/demo/START.html)

## Wymagania i uruchomienie

**Szacowane minimum** to Windows x64, procesor dwurdzeniowy, 4 GB RAM łącznie z systemem oraz 1 GB wolnego miejsca na Pythona 3.12 x64 i biblioteki. Obliczenia działają na CPU. Testy obliczeń wykonano na Intel Core i5-3470T. Minimalnego zużycia RAM jeszcze nie zmierzono.

1. W folderze pełnego wydania wykonaj `py -3.12 -m pip install -r requirements.txt`.
2. Uruchom `START.bat` lub wpisz `py -3.12 -B server.py`.
3. Otwórz [lokalny panel](http://127.0.0.1:8767/). Serwer zamkniesz skrótem Ctrl+C w jego oknie.

Python i biblioteki instaluje się osobno. Do analiz potrzebny jest NumPy, a do odczytu RS‑485 biblioteka pySerial i adapter zgodny z urządzeniem.
