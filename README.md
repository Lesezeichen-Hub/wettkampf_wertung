# Wettkampfwertung

Ein lokales Modul für den [Lesezeichen-Hub](https://github.com/Lesezeichen-Hub): Teilnehmende erfassen, zufällige Erstbegegnungen auslosen, Gewinner festhalten und weitere Runden nach dem Schweizer System bilden.

## Funktionen

- Beliebig viele Namensfelder hinzufügen oder entfernen
- Zufällige Auslosung der ersten Runde
- Gewinner je Begegnung direkt anklicken
- Unentschieden mit ½ Punkt für beide Seiten erfassen
- Weitere Paarungen nach gleicher Punktzahl (Gewinner gegen Gewinner)
- Automatisch begrenzte Rundenzahl passend zur Größe des Starterfelds
- Wiederholte Begegnungen werden nach Möglichkeit vermieden
- Automatische Freilose bei ungerader Teilnehmerzahl
- Live-Tabelle mit Punkten, Siegen, Remis, Niederlagen und Buchholz-Wertung
- Verbindliche Endplatzierung von Platz 1 bis n nach der letzten Runde
- Lokales Fortsetzen nach einem Browser-Neustart
- Ergebnisexport als Textdatei
- Responsive Oberfläche für Desktop und Smartphone

## Start

`index.html` direkt im Browser öffnen oder den Ordner im Lesezeichen-Hub als lokales Modul hinzufügen. Es gibt keine Abhängigkeiten und keinen Build-Schritt.

Die Turnierdaten bleiben ausschließlich im `localStorage` des Browsers. **Neues Turnier** löscht den aktuellen Stand nach einer Sicherheitsabfrage.

Wertungslogik prüfen:

```bash
node tests/scoring.test.cjs
```

## Wertungslogik

Die erste Runde wird vollständig zufällig ausgelost. Ein Sieg zählt 1 Punkt, ein Unentschieden ½ Punkt und eine Niederlage 0 Punkte. In späteren Runden werden Teilnehmende nach Punkten gruppiert und innerhalb vergleichbarer Wertungen gemischt. Die Rundenzahl wird aus der Größe des Starterfelds berechnet und ist zusätzlich durch die Zahl möglicher Gegner begrenzt. Danach endet das Turnier automatisch.

Die Endplatzierung sortiert nach Punkten, Buchholz-Wertung, Siegen, wenigen Niederlagen, direktem Vergleich und als letztem eindeutigen Kriterium nach der zufälligen Startreihenfolge.

### Beispiel mit drei Personen

Bei drei Teilnehmenden werden drei Runden gespielt. In jeder Runde findet eine Begegnung statt und eine Person erhält ein Freilos. Dadurch spielt jede Person genau einmal gegen jede andere und erhält genau einmal ein Freilos. Nach der dritten Runde werden die Plätze 1 bis 3 vergeben.
