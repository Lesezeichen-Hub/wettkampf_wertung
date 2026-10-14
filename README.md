# Wettkampfwertung

Ein lokales Modul für den [Lesezeichen-Hub](https://github.com/Lesezeichen-Hub): Teilnehmende erfassen, zufällige Erstbegegnungen auslosen, Gewinner festhalten und weitere Runden nach dem Schweizer System bilden.

## Funktionen

- Beliebig viele Namensfelder hinzufügen oder entfernen
- Zufällige Auslosung der ersten Runde
- Gewinner je Begegnung direkt anklicken
- Weitere Paarungen nach gleicher Siegzahl (Gewinner gegen Gewinner)
- Wiederholte Begegnungen werden nach Möglichkeit vermieden
- Automatische Freilose bei ungerader Teilnehmerzahl
- Live-Tabelle mit Siegen, Niederlagen und Buchholz-Wertung
- Lokales Fortsetzen nach einem Browser-Neustart
- Ergebnisexport als Textdatei
- Responsive Oberfläche für Desktop und Smartphone

## Start

`index.html` direkt im Browser öffnen oder den Ordner im Lesezeichen-Hub als lokales Modul hinzufügen. Es gibt keine Abhängigkeiten und keinen Build-Schritt.

Die Turnierdaten bleiben ausschließlich im `localStorage` des Browsers. **Neues Turnier** löscht den aktuellen Stand nach einer Sicherheitsabfrage.

## Wertungslogik

Die erste Runde wird vollständig zufällig ausgelost. In späteren Runden werden Teilnehmende nach Siegen gruppiert und innerhalb vergleichbarer Wertungen gemischt. Die Tabelle sortiert nach Siegen, Buchholz-Wertung, wenigen Niederlagen und zuletzt alphabetisch.
