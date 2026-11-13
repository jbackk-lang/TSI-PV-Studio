# TSI PV Studio

Samodzielna aplikacja do analizy fotowoltaiki, magazynu energii i wymiany z siecią. Pierwszy moduł liczy godzinowy bilans oraz koszt zmienny energii według podanych cen.

## Uruchomienie aplikacji

Skopiuj cały folder aplikacji. Na Windows uruchom `START.bat` albo wykonaj `python server.py`. Potrzebny jest Python 3. Aplikacja korzysta z biblioteki standardowej, własnych plików i profilu demonstracyjnego. Nie wymaga instalacji bibliotek ani pobierania danych z innych repozytoriów.

Otwórz `http://127.0.0.1:8767/`. Aplikacja startuje z 24 godzinami oznaczonych danych demonstracyjnych. W panelu **Dane i sterowanie** możesz wkleić własny profil godzinowy CSV i zmienić parametry magazynu lub limit oddawania energii.

Ekran **Przegląd** pokazuje kierunki przepływu energii dla wybranej godziny. Panel **Wykresy i pomiary** umożliwia włączanie serii, odczyt punktu i sprawdzenie wartości godzinowych w tabeli. Wykresy opisano w kWh, parametry mocy w kW, a koszt zmienny w zł. 

## Panele

| Panel | Dane wejściowe | Dane do prezentacji | Stan |
|---|---|---|---|
| Bilans PV | Godzinowa produkcja i zużycie | Produkcja, zużycie, import, eksport, ograniczenie produkcji | Silnik gotowy |
| Magazyn | Pojemność, moc, sprawność, rezerwa i stan początkowy | Stan naładowania, ładowanie i rozładowanie | Silnik gotowy |
| Rozliczenie | Ceny kupna i sprzedaży w każdej godzinie | Koszt netto energii w każdej godzinie oraz suma | Koszt zmienny gotowy. Pełne rozliczenie w planie |
| Przewody | Parametry obwodów AC/DC | Obciążalność, spadek napięcia, straty | W planie |
| Symulator sterowania | Profil, ograniczenia i wybrana strategia | Porównanie reguł i przebiegi godzinowe | Autokonsumpcja i limit eksportu gotowe. Pozostałe strategie w planie |

## Uruchomienie obliczeń

```python
from simulation import Battery, simulate

profile = [
    {"pv_kwh": 5, "load_kwh": 1, "buy_price": 1.00, "sell_price": 0.30},
    {"pv_kwh": 0, "load_kwh": 3, "buy_price": 1.00, "sell_price": 0.30},
]
result = simulate(profile, Battery(capacity_kwh=4, power_kw=2), export_limit_kw=1)
```

Każdy wpis to jedna godzina. `rows` zasila wykresy i tabele, `totals` zasila karty podsumowania, a `battery` i `export_limit_kw` zachowują założenia. Wynik można zapisać jako JSON. Sprawność jest stosowana osobno przy ładowaniu i rozładowaniu. Kalkulator kosztu obejmuje podane stawki jednostkowe. Opłaty stałe, dystrybucja i reguły rozliczeń wymagają osobnego modułu.

## Czujniki i kalibracja — plan

Panel **Czujniki** będzie dostępny z menu oraz z dymków przy urządzeniach i przewodach. Wykorzystamy istniejący moduł kontroli czujników TIMDR po sprawdzeniu jego wejść, wyników i zależności. Potrzebne elementy trafią do paczki PV Studio, aby aplikacja działała samodzielnie.

- **Odczyty:** wartość, jednostka, czas ostatniej próbki i źródło danych. Wykres rozróżni pomiar, dane demonstracyjne i wynik symulacji.
- **Stany:** odczyt poprawny, ostrzeżenie, brak danych, odczyt poza zakresem i wymagana kalibracja. Stan czujnika będzie widoczny obok stanu urządzenia.
- **Kalibracja:** wpisanie pomiarów odniesienia, porównanie odczytu surowego i skorygowanego oraz zapis współczynników z datą i możliwością przywrócenia poprzedniej wersji. Pierwsza wersja zastosuje korektę w analizie danych.
