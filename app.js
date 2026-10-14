"use strict";

const STORAGE_KEY = "wettkampfwertung.v1";
const state = { players: [], rounds: [], createdAt: null };

const elements = {
  setupView: document.querySelector("#setup-view"),
  tournamentView: document.querySelector("#tournament-view"),
  playerForm: document.querySelector("#player-form"),
  playerList: document.querySelector("#player-list"),
  playerTemplate: document.querySelector("#player-row-template"),
  playerCount: document.querySelector("#player-count"),
  formMessage: document.querySelector("#form-message"),
  rounds: document.querySelector("#rounds"),
  ranking: document.querySelector("#ranking"),
  roundStatus: document.querySelector("#round-status"),
  roundMessage: document.querySelector("#round-message"),
  nextRound: document.querySelector("#next-round"),
  tournamentMeta: document.querySelector("#tournament-meta"),
  rankingTitle: document.querySelector("#ranking-title"),
  completionCard: document.querySelector("#completion-card"),
  podium: document.querySelector("#podium")
};

function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

function shuffled(values) {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function addPlayerField(name = "", focus = false) {
  const row = elements.playerTemplate.content.firstElementChild.cloneNode(true);
  const input = row.querySelector("input");
  input.value = name;
  row.querySelector(".remove-player").addEventListener("click", () => {
    row.remove();
    updatePlayerRows();
  });
  elements.playerList.append(row);
  updatePlayerRows();
  if (focus) input.focus();
}

function updatePlayerRows() {
  const rows = [...elements.playerList.querySelectorAll(".player-row")];
  rows.forEach((row, index) => {
    row.querySelector(".player-number").textContent = String(index + 1).padStart(2, "0");
    row.querySelector(".remove-player").disabled = rows.length <= 2;
  });
  elements.playerCount.textContent = rows.length;
}

function playerName(id) {
  return state.players.find((player) => player.id === id)?.name || "Unbekannt";
}

function stats() {
  const result = new Map(state.players.map((player) => [player.id, {
    id: player.id,
    name: player.name,
    wins: 0,
    losses: 0,
    byes: 0,
    opponents: []
  }]));

  state.rounds.forEach((round) => round.matches.forEach((match) => {
    if (match.bye) {
      if (match.winnerId) {
        result.get(match.winnerId).wins += 1;
        result.get(match.winnerId).byes += 1;
      }
      return;
    }
    result.get(match.player1Id).opponents.push(match.player2Id);
    result.get(match.player2Id).opponents.push(match.player1Id);
    if (!match.winnerId) return;
    const loserId = match.winnerId === match.player1Id ? match.player2Id : match.player1Id;
    result.get(match.winnerId).wins += 1;
    result.get(loserId).losses += 1;
  }));

  result.forEach((entry) => {
    entry.buchholz = entry.opponents.reduce((sum, opponentId) => sum + result.get(opponentId).wins, 0);
  });
  return result;
}

function rankedPlayers() {
  const table = stats();
  return [...table.values()].sort((a, b) =>
    b.wins - a.wins ||
    b.buchholz - a.buchholz ||
    a.losses - b.losses ||
    headToHeadResult(a.id, b.id) ||
    playerSeed(a.id) - playerSeed(b.id)
  );
}

function playerSeed(id) {
  return state.players.find((player) => player.id === id)?.seed ?? Number.MAX_SAFE_INTEGER;
}

function headToHeadResult(idA, idB) {
  const match = state.rounds
    .flatMap((round) => round.matches)
    .find((item) => !item.bye && (
      (item.player1Id === idA && item.player2Id === idB) ||
      (item.player1Id === idB && item.player2Id === idA)
    ));
  if (!match?.winnerId) return 0;
  return match.winnerId === idA ? -1 : 1;
}

function maximumRounds() {
  const playerCount = state.players.length;
  if (playerCount <= 2) return 1;
  const uniquePairingRounds = playerCount % 2 === 0 ? playerCount - 1 : playerCount;
  return Math.min(uniquePairingRounds, Math.ceil(Math.log2(playerCount)) + 1);
}

function tournamentIsComplete() {
  return state.rounds.length >= maximumRounds() && isRoundComplete(state.rounds.at(-1));
}

function havePlayed(idA, idB) {
  return state.rounds.some((round) => round.matches.some((match) =>
    !match.bye && ((match.player1Id === idA && match.player2Id === idB) || (match.player1Id === idB && match.player2Id === idA))
  ));
}

function pairPlayers(playerIds, firstRound = false) {
  let pool = firstRound ? shuffled(playerIds) : [...playerIds];
  const matches = [];

  if (!firstRound) {
    const table = stats();
    const scoreGroups = new Map();
    pool.forEach((id) => {
      const wins = table.get(id).wins;
      if (!scoreGroups.has(wins)) scoreGroups.set(wins, []);
      scoreGroups.get(wins).push(id);
    });
    pool = [...scoreGroups.keys()]
      .sort((a, b) => b - a)
      .flatMap((wins) => shuffled(scoreGroups.get(wins)));
  }

  if (pool.length % 2 === 1) {
    const table = stats();
    const candidates = [...pool].reverse();
    const byeId = candidates.find((id) => table.get(id).byes === 0) || candidates[0];
    pool = pool.filter((id) => id !== byeId);
    matches.push({ id: uid(), player1Id: byeId, player2Id: null, winnerId: byeId, bye: true });
  }

  while (pool.length) {
    const player1Id = pool.shift();
    let opponentIndex = pool.findIndex((id) => !havePlayed(player1Id, id));
    if (opponentIndex < 0) opponentIndex = 0;
    const [player2Id] = pool.splice(opponentIndex, 1);
    matches.push({ id: uid(), player1Id, player2Id, winnerId: null, bye: false });
  }

  return matches;
}

function startTournament(names) {
  state.players = names.map((name) => ({ id: uid(), name }));
  shuffled(state.players).forEach((player, index) => { player.seed = index; });
  state.rounds = [{ number: 1, matches: pairPlayers(state.players.map((player) => player.id), true) }];
  state.createdAt = new Date().toISOString();
  persist();
  showTournament();
}

function isRoundComplete(round) {
  return round.matches.every((match) => Boolean(match.winnerId));
}

function selectWinner(roundIndex, matchId, winnerId) {
  if (roundIndex !== state.rounds.length - 1) return;
  const match = state.rounds[roundIndex].matches.find((item) => item.id === matchId);
  if (!match || match.bye) return;
  match.winnerId = match.winnerId === winnerId ? null : winnerId;
  persist();
  renderTournament();
}

function createNextRound() {
  const current = state.rounds.at(-1);
  if (!current || !isRoundComplete(current) || state.rounds.length >= maximumRounds()) return;
  state.rounds.push({
    number: state.rounds.length + 1,
    matches: pairPlayers(rankedPlayers().map((player) => player.id))
  });
  persist();
  renderTournament();
  elements.rounds.lastElementChild?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderTournament() {
  elements.rounds.replaceChildren();
  const activeRoundIndex = state.rounds.length - 1;

  state.rounds.forEach((round, roundIndex) => {
    const block = document.createElement("section");
    block.className = "round-block";
    const complete = isRoundComplete(round);
    block.innerHTML = `<div class="round-heading"><h3>Runde ${round.number}</h3><span>${complete ? "abgeschlossen" : "offen"} · ${round.matches.length} Begegnungen</span></div>`;

    round.matches.forEach((match, matchIndex) => {
      const row = document.createElement("div");
      row.className = "match";
      const number = document.createElement("span");
      number.className = "match-number";
      number.textContent = String(matchIndex + 1).padStart(2, "0");
      row.append(number);

      if (match.bye) {
        const bye = document.createElement("div");
        bye.className = "bye";
        bye.innerHTML = `<strong>${escapeHtml(playerName(match.player1Id))}</strong><small>Freilos · automatischer Sieg</small>`;
        row.append(bye);
      } else {
        const locked = roundIndex !== activeRoundIndex;
        row.append(
          playerButton(match, match.player1Id, locked, roundIndex),
          Object.assign(document.createElement("span"), { className: "versus", textContent: "GEGEN" }),
          playerButton(match, match.player2Id, locked, roundIndex)
        );
      }
      block.append(row);
    });
    elements.rounds.append(block);
  });

  renderRanking();
  const current = state.rounds.at(-1);
  const complete = isRoundComplete(current);
  const finished = tournamentIsComplete();
  const roundLimit = maximumRounds();
  elements.roundStatus.textContent = finished ? "Beendet" : `Runde ${current.number} von ${roundLimit}`;
  elements.nextRound.hidden = finished;
  elements.nextRound.disabled = !complete;
  elements.nextRound.textContent = complete ? "Nächste Runde auslosen" : "Ergebnisse fehlen";
  elements.roundMessage.textContent = finished
    ? `Nach ${roundLimit} Runden ist das Turnier beendet. Die Endplatzierung steht fest.`
    : complete
      ? "Runde vollständig – die nächste Auslosung gruppiert nach Siegen."
      : "Wähle in jeder Begegnung den Gewinner aus.";
  elements.tournamentMeta.textContent = `${state.players.length} Teilnehmende · ${state.rounds.length} von ${roundLimit} Runden`;
  elements.rankingTitle.textContent = finished ? "Endplatzierung" : "Tabelle";
  renderCompletion(finished);
}

function renderCompletion(finished) {
  elements.completionCard.hidden = !finished;
  if (!finished) return;
  elements.podium.replaceChildren();
  rankedPlayers().slice(0, 3).forEach((player, index) => {
    const place = document.createElement("div");
    place.className = "podium-place";
    place.innerHTML = `<span>Platz ${index + 1}</span><strong>${escapeHtml(player.name)}</strong>`;
    elements.podium.append(place);
  });
}

function playerButton(match, playerId, locked, roundIndex) {
  const button = document.createElement("button");
  const selected = match.winnerId === playerId;
  button.type = "button";
  button.className = `player-choice${selected ? " selected" : ""}${match.winnerId && !selected ? " lost" : ""}`;
  button.textContent = playerName(playerId);
  button.disabled = locked;
  button.setAttribute("aria-pressed", String(selected));
  button.addEventListener("click", () => selectWinner(roundIndex, match.id, playerId));
  return button;
}

function renderRanking() {
  elements.ranking.replaceChildren();
  rankedPlayers().forEach((player) => {
    const item = document.createElement("li");
    item.innerHTML = `<span class="rank-name">${escapeHtml(player.name)}</span><span class="rank-score"><span><strong>${player.wins}</strong> S</span><span>${player.losses} N</span><span>${player.buchholz} BH</span></span>`;
    elements.ranking.append(item);
  });
}

function escapeHtml(value) {
  const node = document.createElement("span");
  node.textContent = value;
  return node.innerHTML;
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function showTournament() {
  elements.setupView.hidden = true;
  elements.tournamentView.hidden = false;
  renderTournament();
}

function resetTournament() {
  if (!window.confirm("Möchtest du das aktuelle Turnier wirklich löschen und neu beginnen?")) return;
  localStorage.removeItem(STORAGE_KEY);
  state.players = [];
  state.rounds = [];
  state.createdAt = null;
  elements.playerList.replaceChildren();
  for (let index = 0; index < 4; index += 1) addPlayerField();
  elements.tournamentView.hidden = true;
  elements.setupView.hidden = false;
  elements.formMessage.textContent = "";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function exportTournament() {
  const table = rankedPlayers();
  const lines = [
    "Wettkampfwertung",
    `Export: ${new Date().toLocaleString("de-DE")}`,
    "",
    "PLATZIERUNG",
    ...table.map((player, index) => `${index + 1}. ${player.name} — ${player.wins} Siege, ${player.losses} Niederlagen, ${player.buchholz} Buchholz`),
    "",
    "BEGEGNUNGEN",
    ...state.rounds.flatMap((round) => [
      `Runde ${round.number}`,
      ...round.matches.map((match) => match.bye
        ? `  ${playerName(match.player1Id)} — Freilos`
        : `  ${playerName(match.player1Id)} vs. ${playerName(match.player2Id)} — Sieger: ${match.winnerId ? playerName(match.winnerId) : "offen"}`)
    ])
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `wettkampfwertung-${new Date().toISOString().slice(0, 10)}.txt`;
  link.click();
  URL.revokeObjectURL(link.href);
}

elements.playerForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const names = [...elements.playerList.querySelectorAll(".player-name")].map((input) => input.value.trim()).filter(Boolean);
  const normalized = names.map((name) => name.toLocaleLowerCase("de"));
  if (names.length < 2) {
    elements.formMessage.textContent = "Bitte gib mindestens zwei Namen ein.";
    return;
  }
  if (new Set(normalized).size !== normalized.length) {
    elements.formMessage.textContent = "Jeder Name darf nur einmal vorkommen.";
    return;
  }
  elements.formMessage.textContent = "";
  startTournament(names);
});

document.querySelector("#add-player").addEventListener("click", () => addPlayerField("", true));
document.querySelector("#next-round").addEventListener("click", createNextRound);
document.querySelector("#reset-tournament").addEventListener("click", resetTournament);
document.querySelector("#export-tournament").addEventListener("click", exportTournament);

try {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
  if (saved?.players?.length >= 2 && saved?.rounds?.length) {
    Object.assign(state, saved);
    const usedSeeds = new Set(state.players.map((player) => player.seed).filter(Number.isInteger));
    state.players.forEach((player, index) => {
      if (!Number.isInteger(player.seed)) {
        let seed = index;
        while (usedSeeds.has(seed)) seed += 1;
        player.seed = seed;
        usedSeeds.add(seed);
      }
    });
    persist();
    showTournament();
  } else {
    for (let index = 0; index < 4; index += 1) addPlayerField();
  }
} catch {
  localStorage.removeItem(STORAGE_KEY);
  for (let index = 0; index < 4; index += 1) addPlayerField();
}
