"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
const match = source.match(/function stats\(\) \{[\s\S]*?\r?\n\}\r?\n\r?\nfunction rankedPlayers/);
assert.ok(match, "Die Wertungsfunktion wurde nicht gefunden.");

const statsSource = match[0].replace(/\r?\n\r?\nfunction rankedPlayers$/, "");
const calculateStats = new Function("state", `${statsSource}; return stats();`);

const state = {
  players: [
    { id: "a", name: "Anna" },
    { id: "b", name: "Ben" },
    { id: "c", name: "Cem" }
  ],
  rounds: [
    {
      matches: [
        { player1Id: "a", player2Id: "b", winnerId: null, draw: true, bye: false },
        { player1Id: "c", player2Id: null, winnerId: "c", draw: false, bye: true }
      ]
    },
    {
      matches: [
        { player1Id: "a", player2Id: "c", winnerId: "a", draw: false, bye: false },
        { player1Id: "b", player2Id: null, winnerId: "b", draw: false, bye: true }
      ]
    }
  ]
};

const table = calculateStats(state);
assert.deepEqual(
  {
    anna: [table.get("a").points, table.get("a").wins, table.get("a").draws, table.get("a").losses],
    ben: [table.get("b").points, table.get("b").wins, table.get("b").draws, table.get("b").losses],
    cem: [table.get("c").points, table.get("c").wins, table.get("c").draws, table.get("c").losses]
  },
  {
    anna: [1.5, 1, 1, 0],
    ben: [1.5, 1, 1, 0],
    cem: [1, 1, 0, 1]
  }
);

console.log("Wertungstest bestanden: Sieg 1, Remis 0,5, Niederlage 0 Punkte.");

const chessMatch = source.match(/function chessRound\(roundNumber\) \{[\s\S]*?\r?\n\}/);
assert.ok(chessMatch, "Die Schach-Rundenauslosung wurde nicht gefunden.");
const createChessRound = new Function("state", "uid", `${chessMatch[0]}; return chessRound;`)({
  players: ["a", "b", "c", "d", "e"].map((id) => ({ id }))
}, () => "match");
const chessMatches = Array.from({ length: 10 }, (_, index) => createChessRound(index + 1)).flat();
const pairs = new Map();
chessMatches.filter((game) => !game.bye).forEach((game) => {
  const pair = [game.whiteId, game.blackId].sort().join("|");
  if (!pairs.has(pair)) pairs.set(pair, []);
  pairs.get(pair).push([game.whiteId, game.blackId]);
});
assert.equal(pairs.size, 10, "Jedes Teilnehmerpaar soll vorkommen.");
for (const games of pairs.values()) {
  assert.equal(games.length, 2, "Jedes Teilnehmerpaar soll genau zweimal spielen.");
  assert.deepEqual(games[0], [...games[1]].reverse(), "Die Rückrunde soll die Farben tauschen.");
}
assert.equal(chessMatches.filter((game) => game.bye).length, 10, "Bei fünf Teilnehmenden gibt es pro Runde ein Freilos.");

const createEvenChessRound = new Function("state", "uid", `${chessMatch[0]}; return chessRound;`)({
  players: ["a", "b", "c", "d"].map((id) => ({ id }))
}, () => "match");
const evenChessMatches = Array.from({ length: 6 }, (_, index) => createEvenChessRound(index + 1)).flat();
const evenPairs = new Map();
evenChessMatches.forEach((game) => {
  assert.equal(game.bye, false, "Bei vier Teilnehmenden darf es kein Freilos geben.");
  const pair = [game.whiteId, game.blackId].sort().join("|");
  if (!evenPairs.has(pair)) evenPairs.set(pair, []);
  evenPairs.get(pair).push([game.whiteId, game.blackId]);
});
assert.equal(evenPairs.size, 6, "Bei vier Teilnehmenden soll jedes Paar vorkommen.");
for (const games of evenPairs.values()) {
  assert.equal(games.length, 2, "Jedes gerade Teilnehmerpaar soll genau zweimal spielen.");
  assert.deepEqual(games[0], [...games[1]].reverse(), "Auch bei gerader Teilnehmerzahl werden die Farben getauscht.");
}

console.log("Schachtest bestanden: Doppelrundlauf mit Farbtausch.");
