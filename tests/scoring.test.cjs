"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
const match = source.match(/function stats\(\) \{[\s\S]*?\n\}\n\nfunction rankedPlayers/);
assert.ok(match, "Die Wertungsfunktion wurde nicht gefunden.");

const statsSource = match[0].replace(/\n\nfunction rankedPlayers$/, "");
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
