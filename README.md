# TSI PV Studio

Samodzielna aplikacja do analizy fotowoltaiki, magazynu energii i wymiany z siecią. Pierwszy moduł liczy godzinowy bilans oraz koszt zmienny energii według podanych cen.

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
