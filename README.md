# Wettkampfwertung

Ein lokales Modul für den [Lesezeichen-Hub](https://github.com/Lesezeichen-Hub): Teilnehmende erfassen, Begegnungen auslosen, Ergebnisse festhalten und die Endplatzierung ermitteln.

## Funktionen

- Beliebig viele Namensfelder hinzufügen oder entfernen
- Zufällige Auslosung der ersten Runde
- Wahl zwischen Schweizer System und Schachturnier mit Farbwechsel im Auftakt
- Ausgeglichene Auftaktduelle erhalten ein Entscheidungsspiel; danach gilt das Schweizer System
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

Im Schweizer System wird die erste Runde vollständig zufällig ausgelost; spätere Runden gruppieren nach Punkten. Im Schachmodus werden zufällige Auftaktgegner in Runde 2 mit vertauschten Farben erneut gepaart. Wenn ein solches Duell nach zwei Partien ausgeglichen steht, spielen diese beiden in Runde 3 ein Entscheidungsspiel; alle übrigen Teilnehmenden werden in dieser Runde bereits nach Schweizer System gepaart. Ab Runde 4 gilt das Schweizer System für alle. Bei ungerader Teilnehmerzahl gibt es Freilose. Ein Sieg zählt 1 Punkt, ein Unentschieden ½ Punkt und eine Niederlage 0 Punkte. Das Turnier endet nach der für den Modus und das Starterfeld berechneten Rundenzahl.

Die Endplatzierung sortiert nach Punkten, Buchholz-Wertung, Siegen, wenigen Niederlagen, direktem Vergleich und als letztem eindeutigen Kriterium nach der zufälligen Startreihenfolge. Im Schachmodus fließen Auftakt- und Entscheidungsspiele normal in die Wertung ein.

### Beispiel mit drei Personen

Bei drei Teilnehmenden werden drei Runden gespielt. In jeder Runde findet eine Begegnung statt und eine Person erhält ein Freilos. Dadurch spielt jede Person genau einmal gegen jede andere und erhält genau einmal ein Freilos. Nach der dritten Runde werden die Plätze 1 bis 3 vergeben.
