# WildFrontier

Pierwszy grywalny szkic świata 3D. Wędruj po leśnej dolinie, odkrywaj ścieżki, obserwuj sarny i zobacz, jak nad lasem zmienia się dzień i noc.

## Uruchomienie

Gra działa w nowoczesnej przeglądarce i pobiera Three.js z CDN, dlatego potrzebne jest połączenie z internetem.

W katalogu projektu uruchom prosty serwer:

```bash
python3 -m http.server 8000
```

Otwórz potem [http://localhost:8000](http://localhost:8000).

## Sterowanie

- **W / A / S / D** albo **strzałki** — poruszanie się.
- **Przeciąganie myszą** — obracanie kamery.
- **Dotyk** — przeciągnij palcem po scenie, aby poruszyć postacią.

Kliknij **Rozpocznij wędrówkę**, aby wejść do świata.

## Co już jest

- scena 3D z pagórkowatą leśną doliną i krętą ścieżką,
- kamera z perspektywy trzeciej osoby,
- chodzenie, kolizje z drzewami i skałami,
- cykl dnia i nocy ze słońcem, księżycem i gwiazdami,
- trzy wędrujące sarny,
- interfejs po polsku, współrzędne i zegar świata.

To początek projektu — kolejne elementy świata i rozgrywki będziemy dodawać stopniowo.
