const playingStyles = {
  Equilibrado: {
    attack: 1,
    exposure: 1,
    description: "Equilíbrio entre criação e proteção defensiva.",
  },
  Ofensivo: {
    attack: 1.25,
    exposure: 1.2,
    description: "Cria mais chances, mas cede mais espaço ao adversário.",
  },
  Defensivo: {
    attack: 0.8,
    exposure: 0.75,
    description: "Reduz as chances dos dois lados e protege a defesa.",
  },
  "Contra-ataque": {
    attack: 0.95,
    exposure: 0.9,
    description:
      "Defende mais baixo e ganha eficiência contra rivais ofensivos.",
  },
  "Posse de bola": {
    attack: 1.08,
    exposure: 0.94,
    description: "Circulação paciente, criação moderada e menor exposição.",
  },
};
function setPlayingStyle(style) {
  if (!playingStyles[style]) return;
  gameState.myLineup.style = style;
  renderClassicHub();
}
function isNaturalGoalkeeper(player) {
  return !!normalizePosition(player?.pos)?.split("/").includes("GO");
}
function getMatchStyle(teamId) {
  const name =
    teamId === gameState.playerTeamId
      ? gameState.myLineup.style
      : cpuTactics(teamId).style;
  return {
    name: playingStyles[name] ? name : "Equilibrado",
    ...(playingStyles[name] || playingStyles.Equilibrado),
  };
}
function getLiveGoalChances(homeId, awayId, minutes = 1) {
  const diff =
    getEffectiveTeamRating(homeId) - getEffectiveTeamRating(awayId) + 3;
  const home = getMatchStyle(homeId),
    away = getMatchStyle(awayId);
  const factor = (own, other) =>
    own.attack *
    other.exposure *
    (own.name === "Contra-ataque" && other.name === "Ofensivo" ? 1.25 : 1);
  // Expected goals over 90 minutes; strength changes the expectation smoothly.
  const strength = Math.max(-40, Math.min(40, Number.isFinite(diff) ? diff : 0));
  const chance = (edge, own, other) => Math.max(0.15, Math.min(3.8, 1.35 * Math.exp(edge * 0.045) * factor(own, other))) / 90;
  const interval = Math.max(1, Math.min(2, Number(minutes) || 1));
  return {home: chance(strength, home, away) * interval, away: chance(-strength, away, home) * interval};
}
function getLiveEventPlayer(teamId, purpose = "attack") {
  if (teamId !== gameState.playerTeamId) {
    return {
      name:
        purpose === "keeper"
          ? "Goleiro"
          : "Camisa " + (2 + Math.floor(Math.random() * 10)),
      isGeneric: true,
    };
  }
  const side = liveMatch.fixture.home === teamId ? "home" : "away";
  let players = liveMatch.playersOnPitch[side]
    .map((id) => gameState.mySquad.find((p) => p.id === id))
    .filter(Boolean);
  const keeperId = gameState.myLineup.starters[0];
  if (purpose === "keeper")
    return (
      players.find((p) => p.id === keeperId && isNaturalGoalkeeper(p)) || null
    );
  if (purpose !== "discipline")
    players = players.filter(
      (p) => p.id !== keeperId && !isNaturalGoalkeeper(p),
    );
  const weighted = [];
  for (const p of players) {
    const index = gameState.myLineup.starters.indexOf(p.id);
    const role = getTacticsPositions()[index]?.role || p.pos;
    const weight =
      purpose === "goal"
        ? ["CA", "PTE", "PTD"].includes(role)
          ? 5
          : role === "MAT"
            ? 3
            : 1
        : purpose === "assist"
          ? ["MLE", "MLD", "MLG", "MAT", "PTE", "PTD"].includes(role)
            ? 4
            : 1
          : 1;
    for (let i = 0; i < weight; i++) weighted.push(p);
  }
  return weighted.length
    ? weighted[Math.floor(Math.random() * weighted.length)]
    : null;
}
function serializeLiveMatch() {
  return liveMatch ? { ...liveMatch, timer: null, paused: true } : null;
}
function restoreLiveMatch(saved) {
  if (liveMatch?.timer) clearInterval(liveMatch.timer);
  liveMatch = null;
  if (!saved) return;
  const fixture = gameState.fixtures.find(
    (f) =>
      !f.played &&
      f.home === saved.fixture.home &&
      f.away === saved.fixture.away &&
      f.compId === saved.fixture.compId &&
      f.season === saved.fixture.season &&
      f.globalWeek === saved.fixture.globalWeek,
  );
  if (fixture)
    liveMatch = {
      ...saved,
      fixture,
      paused: true,
      timer: null,
      substitutedOut: saved.substitutedOut || [],
      sentOff: saved.sentOff || [],
      sentOffSlots: saved.sentOffSlots || [],
    };
}
function returnToLiveMatch() {
  if (liveMatch) switchView("match");
}
function validateTacticsSwap(firstIndex, firstBench, secondIndex, secondBench) {
  const get = (idx, bench) =>
    (bench ? gameState.myLineup.bench : gameState.myLineup.starters)[idx];
  const first = get(firstIndex, firstBench),
    second = get(secondIndex, secondBench);
  if (liveMatch && (!first || !second))
    return "Não é possível preencher uma vaga de jogador expulso.";
  if (!first && !second) return "Selecione um jogador para a troca.";
  if (liveMatch && !liveMatch.finished) {
    const banned = [
      ...(liveMatch.substitutedOut || []),
      ...(liveMatch.sentOff || []),
    ];
    if (banned.includes(first) || banned.includes(second))
      return "Jogadores substituídos ou expulsos não podem voltar à partida.";
    if (firstBench !== secondBench && liveMatch.subsLeft <= 0)
      return "Sem substituições restantes.";
  }
  for (const [id, index, bench] of [
    [first, secondIndex, secondBench],
    [second, firstIndex, firstBench],
  ]) {
    if (bench || !id) continue;
    const keeper = isNaturalGoalkeeper(
      gameState.mySquad.find((p) => p.id === id),
    );
    if (index === 0 && !keeper)
      return "A vaga de goleiro deve ser ocupada por um goleiro.";
    if (index !== 0 && keeper)
      return "Goleiros ficam na vaga fixa da área defensiva.";
  }
  return null;
}
