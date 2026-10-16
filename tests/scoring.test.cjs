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

function functionSource(name) {
  const match = source.match(new RegExp(`function ${name}\\([^)]*\\) \\{[\\s\\S]*?\\r?\\n\\}`));
  assert.ok(match, `Die Funktion ${name} wurde nicht gefunden.`);
  return match[0];
}

const makeGame = (player1Id, player2Id) => ({
  id: "generated", player1Id, player2Id, whiteId: player1Id, blackId: player2Id,
  winnerId: null, draw: false, bye: false
});
const makeOpeningRounds = new Function("state", "uid", "shuffled", "chessGame", `
  ${functionSource("initialChessRound")}
  ${functionSource("chessReturnRound")}
  return { initialChessRound, chessReturnRound };
`)({ players: ["a", "b", "c", "d"].map((id) => ({ id })) }, () => "id", (ids) => ids, makeGame);
const firstRound = makeOpeningRounds.initialChessRound();
assert.equal(firstRound.length, 2, "Vier Teilnehmende sollen in Runde 1 zwei Paarungen bilden.");
const returnedRound = new Function("state", "uid", functionSource("chessReturnRound") + "; return chessReturnRound();")(
  { rounds: [{ matches: firstRound }] }, () => "return"
);
assert.equal(returnedRound.length, firstRound.length);
firstRound.forEach((game) => {
  const returnGame = returnedRound.find((candidate) =>
    candidate.player1Id === game.player2Id && candidate.player2Id === game.player1Id
  );
  assert.ok(returnGame, "Runde 2 muss dieselben Gegner mit vertauschten Farben enthalten.");
  assert.equal(returnGame.whiteId, game.blackId);
  assert.equal(returnGame.blackId, game.whiteId);
});

const players = ["a", "b", "c", "d", "e", "f"].map((id) => ({ id }));
const roundOne = { matches: [
  { player1Id: "a", player2Id: "b", winnerId: "a", draw: false, bye: false },
  { player1Id: "c", player2Id: "d", winnerId: "c", draw: false, bye: false },
  { player1Id: "e", player2Id: "f", winnerId: null, draw: true, bye: false }
] };
const roundTwo = { matches: [
  { player1Id: "b", player2Id: "a", winnerId: "a", draw: false, bye: false },
  { player1Id: "d", player2Id: "c", winnerId: "c", draw: false, bye: false },
  { player1Id: "f", player2Id: "e", winnerId: null, draw: true, bye: false }
] };
let swissPool;
const swissPairings = (ids) => {
  swissPool = [...ids];
  return [makeGame(ids[0], ids[1]), makeGame(ids[2], ids[3])];
};
const thirdRound = new Function("state", "rankedPlayers", "pairPlayers", "withChessColors", "chessGame", "chessGamePoints", `
  ${functionSource("chessGamePoints")}
  ${functionSource("chessThirdRound")}
  return chessThirdRound();
`)({ players, rounds: [roundOne, roundTwo] }, () => players.map((player) => player), swissPairings, (games) => games, makeGame);
assert.deepEqual(swissPool.sort(), ["a", "b", "c", "d"]);
assert.ok(thirdRound.some((game) => new Set([game.player1Id, game.player2Id]).has("e") && new Set([game.player1Id, game.player2Id]).has("f")), "Das ausgeglichene Duell erhält ein Entscheidungsspiel.");
assert.equal(thirdRound.length, 3, "Nicht ausgeglichene Duelle laufen in der dritten Runde in die Schweizer Auslosung.");

console.log("Schachtest bestanden: feste Rückrunde, Entscheidungsspiel und Schweizer Paarungen.");

function createChessPairingModel(state) {
  const stats = () => new Map(state.players.map((player) => [player.id, {
    points: 0,
    byes: state.rounds.flatMap((round) => round.matches)
      .filter((game) => game.bye && game.player1Id === player.id).length
  }]));
  return new Function("state", "uid", "shuffled", "stats", "maximumRounds", "isRoundComplete", `
    ${functionSource("havePlayed")}
    ${functionSource("findUnplayedPairs")}
    ${functionSource("hasUnplayedPairingRound")}
    ${functionSource("chessGamePoints")}
    ${functionSource("hasPendingChessTiebreak")}
    ${functionSource("tournamentIsComplete")}
    ${functionSource("pairPlayers")}
    return { pairPlayers, hasUnplayedPairingRound, hasPendingChessTiebreak, tournamentIsComplete };
  `)(state, () => "generated", (values) => values, stats, () => 5, () => true);
}

const threePlayerState = {
  mode: "chess",
  players: ["a", "b", "c"].map((id) => ({ id })),
  rounds: [
    { matches: [
      { player1Id: "a", player2Id: "b", winnerId: "b", draw: false, bye: false },
      { player1Id: "c", player2Id: null, winnerId: "c", draw: false, bye: true }
    ] },
    { matches: [
      { player1Id: "b", player2Id: "a", winnerId: "b", draw: false, bye: false },
      { player1Id: "c", player2Id: null, winnerId: "c", draw: false, bye: true }
    ] }
  ]
};
const threePlayerModel = createChessPairingModel(threePlayerState);
assert.equal(threePlayerModel.hasUnplayedPairingRound(), true);
assert.equal(threePlayerModel.tournamentIsComplete(), false);

const thirdSwissRound = threePlayerModel.pairPlayers(["a", "b", "c"], false, true);
assert.ok(thirdSwissRound, "Die dritte Runde soll eine noch ungespielte Paarung finden.");
assert.equal(thirdSwissRound.filter((game) => !game.bye).length, 1);
assert.ok(thirdSwissRound.every((game) => game.bye || ![
  ["a", "b"], ["b", "a"]
].some(([first, second]) => game.player1Id === first && game.player2Id === second)));
threePlayerState.rounds.push({ matches: thirdSwissRound.map((game) => game.bye
  ? game
  : { ...game, winnerId: game.player1Id }) });

const fourthSwissRound = threePlayerModel.pairPlayers(["a", "b", "c"], false, true);
assert.ok(fourthSwissRound, "Die vierte Runde soll das letzte ungespielte Paar ansetzen.");
threePlayerState.rounds.push({ matches: fourthSwissRound.map((game) => game.bye
  ? game
  : { ...game, winnerId: game.player1Id }) });
assert.equal(threePlayerModel.hasUnplayedPairingRound(), false);
assert.equal(threePlayerModel.tournamentIsComplete(), true, "Nach allen unterschiedlichen Gegnerpaarungen endet das Dreierturnier vor der Maximalrundenzahl.");

const tiedOpeningModel = createChessPairingModel({
  mode: "chess",
  players: [{ id: "a" }, { id: "b" }],
  rounds: [
    { matches: [{ player1Id: "a", player2Id: "b", winnerId: null, draw: true, bye: false }] },
    { matches: [{ player1Id: "b", player2Id: "a", winnerId: null, draw: true, bye: false }] }
  ]
});
assert.equal(tiedOpeningModel.hasUnplayedPairingRound(), false);
assert.equal(tiedOpeningModel.hasPendingChessTiebreak(), true);
assert.equal(tiedOpeningModel.tournamentIsComplete(), false, "Ein ausgeglichenes Auftaktduell muss trotz ausgeschöpfter Gegner ein Entscheidungsspiel erhalten.");

console.log("Schachtest bestanden: keine Wiederholungen nach Auftakt, früher Abschluss und Entscheidungsspiel.");
