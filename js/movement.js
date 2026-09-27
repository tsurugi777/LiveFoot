// End-of-season division transitions. Playoff fixtures use the normal match engine.
function isLastDivision(comp) {
  const divisions = db.countries.find((c) => c.id === comp?.countryId)?.divisions || [];
  return divisions.length > 0 && divisions[divisions.length - 1].id === comp?.divisionId;
}
function movementConfig(comp) {
  const m = comp?.movement || {};
  const n = (value) => Math.max(0, Math.floor(Number(value) || 0));
  return {
    enabled: !!m.enabled && !isLastDivision(comp),
    targetCompId: m.targetCompId || "",
    table: m.table || "aggregate",
    direct: n(m.direct),
    mode: ["internal", "mixed", "promotion"].includes(m.mode) ? m.mode : "none",
    playoffTeams: n(m.playoffTeams),
    slots: n(m.slots),
    promotionPhases: Array.isArray(m.promotionPhases) ? m.promotionPhases.map(p=>({...p})) : [],
    promotionFormat: ["league", "knockout", "groups"].includes(m.promotionFormat) ? m.promotionFormat : "league",
    promotionRounds: Number(m.promotionRounds) === 2 ? 2 : 1,
    promotionGroups: m.promotionGroups == null ? 2 : n(m.promotionGroups),
    winnerSources: Array.isArray(m.winnerSources) ? [...new Set(m.winnerSources.filter((id) => typeof id === "string"))] : [],
  };
}
// Each source reserves one place within the configured playoff field.
function promotionWinnerSources(comp) {
  const sources = [];
  const hasWinner = (p) => p && (p.type === "LEAGUE" || (p.type === "KNOCKOUT" && Number(p.stopAtTeams || 1) === 1));
  for (const c of db.competitions.filter((c) => c.countryId === comp.countryId)) {
    for (const p of c.phases || []) {
      if (hasWinner(p)) sources.push({id: "phase:" + p.id, phaseId: p.id, name: c.name + " · " + p.name});
    }
    const final = c.phases?.[c.phases.length - 1];
    if (hasWinner(final)) sources.push({id: "competition:" + c.id, phaseId: final.id, name: "Vencedor de " + c.name});
  }
  return sources;
}
function recordPromotionWinner(phaseId, season, teamId) {
  (gameState.promotionWinners ||= {})[movementKey(phaseId, season)] = teamId || null;
  // Preserve full rankings already recorded; handle a final decided by a bye.
  if (!gameState.titleRankings?.[movementKey(phaseId, season)])
    recordTitleRanking(phaseId, season, [teamId, ...(gameState.titleEliminated?.[phaseId + "_" + season] || [])]);
}
function promotionSourceResults(comp, season) {
  const available = promotionWinnerSources(comp);
  return movementConfig(comp).winnerSources.map((id) => {
    const source = available.find((s) => s.id === id);
    const key = source && movementKey(source.phaseId, season);
    return {source: id, ready: !!key && Object.prototype.hasOwnProperty.call(gameState.promotionWinners || {}, key), teamId: gameState.promotionWinners?.[key]};
  });
}
function promotionParticipants(comp, season, rank) {
  const m = movementConfig(comp), direct = new Set(rank.slice(0, m.direct));
  const lower = db.competitions.find((c) => c.id === m.targetCompId);
  const downRule = movementConfig(lower);
  const excluded = downRule.enabled ? downRule.direct + movementCounts(downRule).upper : 0;
  const eligible = new Set(excluded ? rank.slice(0, -excluded) : rank);
  const reserved = promotionSourceResults(comp, season).map((r) => r.teamId)
    .filter((id) => eligible.has(id) && !direct.has(id));
  // Repeated winners, already promoted clubs and ineligible winners release the place to the table.
  return [...new Set([...reserved, ...rank.filter((id) => eligible.has(id) && !direct.has(id))])].slice(0, m.playoffTeams);
}
function movementRules() {
  return db.competitions.filter((c) => movementConfig(c).enabled);
}
function movementCounts(config) {
  return {
    upper:
      ["mixed", "promotion"].includes(config.mode)
        ? config.slots
        : config.mode === "internal"
          ? config.playoffTeams
          : 0,
    lower: config.direct + (config.mode === "promotion" ? config.playoffTeams : config.mode === "none" ? 0 : config.slots),
  };
}
function movementRuleErrors(comp) {
  const m = movementConfig(comp);
  if (!m.enabled) return [];
  const errors = [];
  for (const field of ["direct", "playoffTeams", "slots"]) {
    const value = Number(comp.movement?.[field] ?? 0);
    if (!Number.isInteger(value) || value < 0)
      errors.push("quantidades devem ser números inteiros não negativos");
  }
  const target = db.competitions.find((c) => c.id === m.targetCompId);
  const country = db.countries.find((c) => c.id === comp.countryId);
  const level =
    country?.divisions.findIndex((d) => d.id === comp.divisionId) ?? -1;
  const targetLevel =
    country?.divisions.findIndex((d) => d.id === target?.divisionId) ?? -1;
  if ((comp.parentId && comp.parentId !== "NONE") || !comp.divisionId)
    errors.push("configure a regra numa competição base com divisão definida");
  if (
    !target ||
    target.countryId !== comp.countryId ||
    (target.parentId && target.parentId !== "NONE") ||
    level < 0 ||
    targetLevel !== level + 1
  )
    errors.push(
      "escolha uma competição base da divisão imediatamente inferior no mesmo país",
    );
  if (
    target &&
    Number(comp.startYear || 2026) !== Number(target.startYear || 2026)
  )
    errors.push("as duas ligas precisam iniciar no mesmo ano");
  if (
    m.table !== "aggregate" &&
    !comp.phases?.some((p) => p.id === m.table && p.type === "LEAGUE")
  )
    errors.push(
      "a tabela de referência precisa ser uma fase de liga desta competição",
    );
  if (!m.direct && (m.mode === "none" || !m.slots))
    errors.push("defina ao menos uma vaga direta ou de playoff");
  if (m.mode !== "none" && m.slots < 1)
    errors.push("defina ao menos uma vaga de playoff");
  if (
    ["internal", "promotion"].includes(m.mode) &&
    (m.playoffTeams < 2 || m.slots >= m.playoffTeams)
  )
    errors.push(
      "o playoff interno precisa de pelo menos 2 clubes e menos vagas do que participantes",
    );
  const hasAggregate = (league) =>
    db.competitions
      .filter((c) => c.id === league?.id || c.parentId === league?.id)
      .some((c) => c.phases?.some((p) => p.countsToAggregatedTable !== false));
  if (m.table === "aggregate" && !hasAggregate(comp))
    errors.push(
      "ative Somar na Tabela Geral em uma fase ou escolha uma fase de liga como referência",
    );
  if (target && !hasAggregate(target))
    errors.push(
      "a liga inferior precisa de uma fase que some pontos na Tabela Geral",
    );
  if (m.mode === "promotion") {
    const available = promotionWinnerSources(comp);
    errors.push(...validatePromotionPhases(m));
    if (!m.promotionPhases.length && m.promotionFormat === "groups" && (m.promotionGroups < 2 || m.playoffTeams % m.promotionGroups !== 0 || m.slots % m.promotionGroups !== 0 || m.slots < m.promotionGroups || m.playoffTeams / m.promotionGroups < 2))
      errors.push("nos grupos, participantes e vagas devem ser divisíveis pelo número de grupos, com ao menos 2 clubes e 1 vaga por grupo");
    if (m.winnerSources.length > m.playoffTeams) errors.push("as vagas reservadas a vencedores excedem os participantes do playoff");
    if (m.winnerSources.some((id) => !available.some((s) => s.id === id))) errors.push("selecione fases ou competições do país com vencedor único");
  }
  const counts = movementCounts(m);
  if (m.direct + counts.upper > getCompetitionTeams(comp.id).length)
    errors.push(
      "rebaixados e participantes do playoff excedem os clubes da liga",
    );
  if (target && counts.lower > getCompetitionTeams(target.id).length)
    errors.push(
      "não há clubes suficientes na divisão inferior para preencher as vagas",
    );
  return errors.map((error) => `${comp.name}: ${error}.`);
}
function validateMovementRules() {
  const rules = movementRules(),
    errors = rules.flatMap(movementRuleErrors);
  const used = new Set();
  for (const c of rules) {
    const key = c.countryId + "|" + c.divisionId;
    if (used.has(key))
      errors.push(
        `${c.name}: apenas uma competição por divisão pode definir o rebaixamento.`,
      );
    used.add(key);
  }
  for (const c of db.competitions) {
    const incoming = rules.filter(
      (r) => movementConfig(r).targetCompId === c.id,
    );
    if (incoming.length > 1)
      errors.push(
        `${c.name}: mais de uma regra de acesso aponta para esta liga.`,
      );
    const own = movementConfig(c),
      down = own.enabled ? own.direct + movementCounts(own).upper : 0;
    const up = incoming.reduce(
      (sum, r) => sum + movementCounts(movementConfig(r)).lower,
      0,
    );
    if (down + up > getCompetitionTeams(c.id).length)
      errors.push(`${c.name}: zonas de acesso e rebaixamento se sobrepõem.`);
  }
  return errors;
}
function renderMovementEditor(comp) {
  const m = movementConfig(comp);
  if (isLastDivision(comp)) {
    const incoming = movementRules().filter((c) => movementConfig(c).targetCompId === comp.id);
    return `<section class="movement-editor"><h4>Acesso e rebaixamento</h4><p>Esta é a última divisão do país: não há rebaixamento nem necessidade de criar outra divisão.</p><p>O acesso direto e o playoff de promoção são configurados na competição da divisão imediatamente superior, selecionando esta liga como destino do rebaixamento. ${incoming.length ? `Regra vinculada: ${incoming.map((c) => escapeEditorValue(c.name)).join(", ")}.` : "Nenhuma regra de acesso vinculada ainda."}</p></section>`;
  }
  const country = db.countries.find((c) => c.id === comp.countryId);
  const nextDivision = country?.divisions[(country?.divisions.findIndex((d) => d.id === comp.divisionId) ?? -1) + 1]?.id;
  const field = (name, label, type = "number", value = 0) =>
    `<label>${label}<input id="move-${name}-${comp.id}" type="${type}" min="0" step="1" value="${escapeEditorValue(value)}"></label>`;
  const targets = db.competitions.filter(
    (c) =>
      c.id !== comp.id &&
      c.countryId === comp.countryId &&
      (!c.parentId || c.parentId === "NONE") &&
      c.divisionId === nextDivision,
  );
  return `<section class="movement-editor"><h4>Acesso, rebaixamento e playoffs</h4><label class="movement-toggle"><input type="checkbox" id="move-enabled-${comp.id}" ${m.enabled ? "checked" : ""}> Ativar movimentação ao fim da temporada</label><div class="movement-fields"><label>Liga da divisão inferior<select id="move-target-${comp.id}"><option value="">Selecione</option>${targets.map((c) => `<option value="${c.id}" ${m.targetCompId === c.id ? "selected" : ""}>${escapeEditorValue(c.name)}</option>`).join("")}</select></label><label>Tabela que decide o rebaixamento<select id="move-table-${comp.id}"><option value="aggregate">Tabela anual agregada</option>${(
    comp.phases || []
  )
    .filter((p) => p.type === "LEAGUE")
    .map(
      (p) =>
        `<option value="${p.id}" ${m.table === p.id ? "selected" : ""}>${escapeEditorValue(p.name)}</option>`,
    )
    .join(
      "",
    )}</select></label>${field("direct", "Trocas diretas (sem contar vagas do playoff)", "number", m.direct)}<label>Playoff<select id="move-mode-${comp.id}"><option value="none" ${m.mode === "none" ? "selected" : ""}>Sem playoff</option><option value="internal" ${m.mode === "internal" ? "selected" : ""}>Contra o rebaixamento: clubes da própria divisão</option><option value="promotion" ${m.mode === "promotion" ? "selected" : ""}>Pelo acesso: clubes da divisão inferior</option><option value="mixed" ${m.mode === "mixed" ? "selected" : ""}>Misto entre duas divisões</option></select></label>${field("teams", "Participantes (playoff de rebaixamento ou acesso)", "number", m.playoffTeams)}${field("slots", "Vagas no playoff", "number", m.slots)}<label>Formato do playoff de promoção<select id="move-format-${comp.id}">${[["league","Liga"],["knockout","Mata-mata"],["groups","Grupos"]].map(([v,label])=>`<option value="${v}" ${m.promotionFormat===v?'selected':''}>${label}</option>`).join('')}</select></label><label>Jogos / turnos<select id="move-rounds-${comp.id}"><option value="1" ${m.promotionRounds===1?'selected':''}>Jogo único / um turno</option><option value="2" ${m.promotionRounds===2?'selected':''}>Ida e volta / dois turnos</option></select></label>${field("groups", "Número de grupos (formato Grupos)", "number", m.promotionGroups)}</div>${renderPromotionPhasesEditor(comp)}<fieldset><legend>Vencedores com vaga no playoff de promoção</legend>${promotionWinnerSources(comp).map((source) => `<label class="movement-toggle"><input type="checkbox" name="move-winners-${comp.id}" value="${escapeEditorValue(source.id)}" ${m.winnerSources.includes(source.id) ? "checked" : ""}> ${escapeEditorValue(source.name)}</label>`).join("")}<p>Usado no formato “Pelo acesso”. Cada seleção reserva uma vaga entre os participantes configurados. Se o vencedor já subiu diretamente, venceu outra origem selecionada ou não pertence à divisão elegível, a vaga passa ao próximo clube da tabela anual de promoção. A competição usa o vencedor da sua última fase. O playoff aguarda todos esses resultados.</p></fieldset><p>Direto: os últimos caem e os melhores da liga inferior sobem. Interno: os clubes logo acima da zona direta jogam uma liga em turno único; “vagas” define quantos deles caem. Misto: cada vaga reúne um clube de cada divisão em jogo único na casa do clube da divisão superior; o vencedor fica na divisão superior. Empates no misto são decididos nos pênaltis.</p><p>No playoff pelo acesso, os melhores da divisão inferior após os promovidos diretamente disputam o formato escolhido. Liga: os primeiros colocados sobem. Mata-mata: os vencedores avançam até restar o número de vagas, com folgas para os melhores classificados quando necessário; empate no agregado vai aos pênaltis, sem gol fora. Grupos: os primeiros de cada grupo sobem, dividindo as vagas igualmente. Participantes e vagas devem ser divisíveis pelo número de grupos. A divisão superior rebaixa diretamente a soma das trocas diretas e das vagas do playoff. Exemplo: 1 troca direta + 1 vaga de playoff = 2 rebaixados, 1 acesso direto e 1 vencedor do playoff promovido.</p><p>A liga inferior usa sua tabela anual: primeiros colocados sobem diretamente, seguidos pelos classificados ao playoff misto. As trocas são aplicadas juntas, após as ligas e playoffs terminarem.</p></section>`;
}
function syncMovementEditor(comp) {
  if (isLastDivision(comp)) {
    if (comp.movement) comp.movement.enabled = false;
    return;
  }
  const el = (name) => document.getElementById(`move-${name}-${comp.id}`);
  if (!el("enabled")) return;
  const promotionPhases = readPromotionPhasesEditor(comp);
  comp.movement = {
    promotionPhases,
    enabled: el("enabled").checked,
    targetCompId: el("target").value,
    table: el("table").value,
    direct: Number(el("direct").value),
    mode: el("mode").value,
    playoffTeams: Number(el("teams").value),
    slots: Number(el("slots").value),
    promotionFormat: el("format")?.value || "league",
    promotionRounds: Number(el("rounds")?.value) || 1,
    promotionGroups: Number(el("groups")?.value) || 2,
    winnerSources: Array.from(document.getElementsByName?.(`move-winners-${comp.id}`) || []).filter((el) => el.checked).map((el) => el.value),
  };
}
function movementState() {
  gameState.completedDivisionSeasons ||= {};
  gameState.divisionTransitions ||= {};
  return gameState.divisionTransitions;
}
function movementKey(id, season) {
  return JSON.stringify([id, season]);
}
function rankMovementTable(table, seed = []) {
  return Object.entries(table || {})
    .map(([id, s]) => ({ id, ...s }))
    .sort(
      (a, b) =>
        (a.competitionPlace || 99) - (b.competitionPlace || 99) ||
        b.pts - a.pts ||
        b.gd - a.gd ||
        b.gf - a.gf ||
        (seed.length ? seed.indexOf(a.id) - seed.indexOf(b.id) : 0),
    )
    .map((row) => row.id);
}
function divisionSeasonSnapshot(rootId, season) {
  const phases = {};
  for (const stage of gameState.stages[rootId] || [])
    for (const p of stage.phases || []) {
      if (p.type === "LEAGUE")
        phases[p.id] = rankMovementTable(
          gameState.standings[p.id + "_" + season],
        );
    }
  return {
    aggregate: rankMovementTable(gameState.globalStandings[season]?.[rootId]),
    phases,
  };
}
function markDivisionSeasonFinished(rootId, season) {
  movementState();
  gameState.completedDivisionSeasons[movementKey(rootId, season)] ||=
    divisionSeasonSnapshot(rootId, season);
  createReadyDivisionPlayoffs(season);
}
function divisionSeasonReady(rootId, season) {
  movementState();
  if (!titleSeasonReady(gameState.compMap[rootId]?.countryId, season - 1) && gameState.completedDivisionSeasons[movementKey(rootId, season - 1)]) return false;
  if (!gameState.completedDivisionSeasons[movementKey(rootId, season - 1)])
    return true;
  const countryId = gameState.compMap[rootId]?.countryId;
  return movementRules()
    .filter((c) => c.countryId === countryId)
    .every(
      (c) =>
        gameState.divisionTransitions[movementKey(c.id, season - 1)]?.applied,
    );
}
function movementMessage(season, text) {
  (gameState.inbox ||= []).push({
    id: "movement-" + season + "-" + Math.random().toString(36).slice(2),
    type: "finance",
    playerName: "Divisões · " + season,
    playerId: "divisions",
    offer: text,
  });
}
function createReadyDivisionPlayoffs(season) {
  const jobs = movementState();
  for (const comp of movementRules()) {
    const key = movementKey(comp.id, season);
    if (jobs[key]) continue;
    const m = movementConfig(comp),
      target =
        gameState.compMap[m.targetCompId] ||
        db.competitions.find((c) => c.id === m.targetCompId);
    const upper = gameState.completedDivisionSeasons[key];
    const lower =
      gameState.completedDivisionSeasons[movementKey(m.targetCompId, season)];
    if (!upper || !lower) continue;
    if (m.mode === "promotion" && promotionSourceResults(comp, season).some((r) => !r.ready)) continue;
    const rank =
      m.table === "aggregate" ? upper.aggregate : upper.phases[m.table] || [];
    const lowerRank = lower.aggregate;
    const counts = movementCounts(m);
    const errors = movementRuleErrors(comp);
    if (
      m.direct + counts.upper > rank.length ||
      counts.lower > lowerRank.length
    )
      errors.push("A classificação final não tem participantes suficientes.");
    if (errors.length) {
      jobs[key] = {
        key,
        compId: comp.id,
        targetCompId: m.targetCompId,
        countryId: comp.countryId,
        season,
        status: "skipped",
        applied: false,
        error: errors.join(" "),
      };
      movementMessage(season, `Regra não aplicada: ${errors.join(" ")}`);
      continue;
    }
    const directDownCount = m.direct + (m.mode === "promotion" ? m.slots : 0);
    const job = (jobs[key] = {
      key,
      compId: comp.id,
      targetCompId: target.id,
      countryId: comp.countryId,
      season,
      config: { ...m },
      upperDivision: comp.divisionId,
      lowerDivision: target.divisionId,
      directDown: directDownCount ? rank.slice(-directDownCount) : [],
      directUp: lowerRank.slice(
        0,
        m.direct + (m.mode === "internal" ? m.slots : 0),
      ),
      upperPlayoff: m.mode === "promotion" ? [] : rank.slice(
        rank.length - m.direct - counts.upper,
        rank.length - m.direct,
      ),
      lowerPlayoff:
        m.mode === "promotion" ? promotionParticipants(comp, season, lowerRank) : m.mode === "mixed" ? lowerRank.slice(m.direct, m.direct + m.slots) : [],
      fixtureIds: [],
      status: m.mode === "none" ? "complete" : "playing",
      applied: false,
    });
    const phaseId = "division-playoff-" + comp.id + "-" + season;
    job.phaseId = phaseId;
    const stats = () => ({
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      gf: 0,
      ga: 0,
      gd: 0,
      pts: 0,
    });
    job.playoffParticipants = m.mode === "promotion" ? job.lowerPlayoff : job.upperPlayoff;
    gameState.standings[phaseId + "_" + season] = Object.fromEntries(
      job.playoffParticipants.map((id) => [id, stats()]),
    );
    let fixtures = [];
    if (m.mode === "internal")
      fixtures = generateRoundRobin(
        job.playoffParticipants,
        1,
        gameState.currentWeek + 1,
        phaseId,
        comp.id,
        season,
      ).filter((f) => f.away !== null);
    if (m.mode === "promotion") fixtures = startPromotionFormat(job);
    if (m.mode === "mixed")
      fixtures = job.upperPlayoff.map((id, index) => ({
        home: id,
        away: job.lowerPlayoff[m.slots - 1 - index],
        globalWeek: gameState.currentWeek + 1,
        compId: phaseId,
        baseCompId: comp.id,
        season,
        played: false,
        homeScore: null,
        awayScore: null,
      }));
    addMovementFixtures(job, fixtures);
    if (fixtures.length)
      movementMessage(
        season,
        `Playoff de ${comp.name} agendado. Consulte os jogos na agenda e em Tabelas.`,
      );
  }
  commitReadyDivisionMoves(season);
}
function recordMovementPlayoffResult(fixture) {
  const job = promotionFixtureJob(fixture);
  if (!job || fixture.movementResultRecorded) return;
  fixture.movementResultRecorded = true;
  if (job.config.mode === "promotion" && job.config.promotionFormat === "knockout") {
    resolvePromotionTie(fixture);
  } else if (job.config.mode === "mixed") {
    resolveMixedPlayoffWinner(fixture, fixture.homeScore, fixture.awayScore);
  } else {
    const table = gameState.standings[job.phaseId + "_" + job.season];
    const h = table[fixture.home],
      a = table[fixture.away];
    if (!h || !a) return;
    h.played++;
    a.played++;
    h.gf += fixture.homeScore;
    h.ga += fixture.awayScore;
    a.gf += fixture.awayScore;
    a.ga += fixture.homeScore;
    h.gd = h.gf - h.ga;
    a.gd = a.gf - a.ga;
    if (fixture.homeScore > fixture.awayScore) {
      h.pts += 3;
      h.won++;
      a.lost++;
    } else if (fixture.homeScore < fixture.awayScore) {
      a.pts += 3;
      a.won++;
      h.lost++;
    } else {
      h.pts++;
      a.pts++;
      h.drawn++;
      a.drawn++;
    }
  }
}
function processDivisionPlayoffs() {
  // A cup may finish after the two league tables are complete.
  for (const season of new Set(Object.keys(gameState.completedDivisionSeasons || {}).map((key) => JSON.parse(key)[1]))) createReadyDivisionPlayoffs(season);
  const jobs = movementState();
  for (const job of Object.values(jobs)) {
    if (job.status !== "playing") continue;
    const fixtures = job.fixtureIds.map((id) =>
      gameState.fixtures.find((f) => f.id === id),
    );
    if (fixtures.some((f) => !f || !f.played)) continue;
    fixtures.forEach(recordMovementPlayoffResult);
    if (job.config.mode === "internal")
      job.playoffDown = rankMovementTable(
        gameState.standings[job.phaseId + "_" + job.season],
        job.upperPlayoff,
      ).slice(-job.config.slots);
    if (job.config.mode === "promotion") {
      if (!finishPromotionRound(job)) continue;
    }
    job.status = "complete";
  }
  for (const season of new Set(Object.values(jobs).map((j) => j.season))) {
    commitReadyDivisionMoves(season);
    applyReadySquadProgression(season);
  }
}
function commitReadyDivisionMoves(season) {
  const jobs = movementState();
  for (const country of db.countries) {
    if (!titleSeasonReady(country.id, season)) continue;
    const rules = movementRules().filter((c) => c.countryId === country.id);
    if (!rules.length) continue;
    const batch = rules.map((c) => jobs[movementKey(c.id, season)]);
    if (
      batch.some((j) => !j || !["complete", "skipped"].includes(j.status)) ||
      batch.every((j) => j.applied)
    )
      continue;
    const moves = new Map();
    let conflict = false;
    const assign = (id, divisionId, compId) => {
      if (moves.has(id) && moves.get(id).divisionId !== divisionId)
        conflict = true;
      moves.set(id, { divisionId, compId });
    };
    for (const job of batch.filter(
      (j) => j.status === "complete" && !j.applied,
    )) {
      job.directDown.forEach((id) =>
        assign(id, job.lowerDivision, job.targetCompId),
      );
      job.directUp.forEach((id) => assign(id, job.upperDivision, job.compId));
      if (job.config.mode === "internal")
        job.playoffDown.forEach((id) =>
          assign(id, job.lowerDivision, job.targetCompId),
        );
      if (job.config.mode === "promotion")
        job.playoffUp.forEach((id) => assign(id, job.upperDivision, job.compId));
      if (job.config.mode === "mixed")
        for (const id of job.fixtureIds) {
          const f = gameState.fixtures.find((f) => f.id === id),
            loser = f.playoffWinner === f.home ? f.away : f.home;
          assign(f.playoffWinner, job.upperDivision, job.compId);
          assign(loser, job.lowerDivision, job.targetCompId);
        }
    }
    if (conflict) {
      batch.forEach((j) => {
        j.status = "skipped";
        j.applied = true;
        j.error = "Zonas de movimentação conflitantes.";
      });
      movementMessage(
        season,
        "Movimentação cancelada: zonas de acesso e rebaixamento conflitantes.",
      );
      continue;
    }
    const summary = [];
    for (const [id, move] of moves) {
      const team = gameState.teamMap[id];
      if (!team || team.divisionId === move.divisionId) continue;
      const division = country.divisions.find((d) => d.id === move.divisionId);
      summary.push(`${team.name} → ${division?.name || move.divisionId}`);
      team.divisionId = move.divisionId;
      team.compId = move.compId;
    }
    batch.forEach((j) => {
      j.applied = true;
      j.summary = summary;
    });
    if (summary.length) movementMessage(season, summary.join("; "));
    if (gameState.teamMap[gameState.playerTeamId])
      gameState.playerBaseCompId = getTeamBaseCompetition(
        gameState.teamMap[gameState.playerTeamId],
      );
    for (const comp of db.competitions.filter(
      (c) =>
        c.countryId === country.id && (!c.parentId || c.parentId === "NONE"),
    )) {
      if (gameState.completedDivisionSeasons[movementKey(comp.id, season)])
        initGlobalStandings(comp.id, season + 1);
    }
  }
}
function movementZone(compId, table, index, total, season = gameState.countrySeason?.[compId] || gameState.startYear) {
  const comp =
      gameState.compMap[compId] || db.competitions.find((c) => c.id === compId),
    m = movementConfig(comp);
  if (m.enabled && m.table === table) {
    const down = m.direct + (m.mode === "promotion" ? m.slots : 0);
    if (down && index >= total - down)
      return { kind: "down", label: "Rebaixamento direto" };
    const pool = m.mode === "promotion" ? 0 : movementCounts(m).upper;
    if (pool && index >= total - m.direct - pool && index < total - m.direct)
      return {
        kind: "playoff",
        label:
          m.mode === "mixed"
            ? "Playoff misto"
            : "Playoff contra o rebaixamento",
      };
  }
  if (table === "aggregate") {
    const rule = movementRules().find(
      (c) => movementConfig(c).targetCompId === compId,
    );
    if (rule) {
      const r = movementConfig(rule),
        promoted = r.direct + (r.mode === "internal" ? r.slots : 0);
      if (index < promoted) return { kind: "up", label: "Acesso direto" };
      if (r.mode === "promotion") {
        const rank = rankMovementTable(gameState.globalStandings[season]?.[compId]);
        const teamId = rank[index];
        if (promotionParticipants(rule, season, rank).includes(teamId)) {
          const reserved = promotionSourceResults(rule, season).some((result) => result.teamId === teamId);
          return { kind: "playoff", label: reserved ? "Playoff de promoção · vencedor" : "Playoff de promoção" };
        }
      }
      if (r.mode === "mixed" && index < r.direct + r.slots)
        return { kind: "playoff", label: "Playoff misto pelo acesso" };
    }
  }
  return null;
}
function movementZoneBadge(compId, table, index, total, season) {
  const zone = movementZone(compId, table, index, total, season);
  return zone
    ? `<span class="movement-badge ${zone.kind}">${zone.label}</span>`
    : "";
}
function renderMovementPanel(compId, season) {
  const comp = gameState.compMap[compId],
    own = movementConfig(comp),
    incoming = movementRules().some(
      (c) => movementConfig(c).targetCompId === compId,
    );
  const jobs = Object.values(movementState()).filter(
    (j) =>
      (j.compId === compId || j.targetCompId === compId) && j.season === season,
  );
  if (!own.enabled && !incoming && !jobs.length) return "";
  const sourceInfo = movementRules().filter((c) => (c.id === compId || movementConfig(c).targetCompId === compId) && movementConfig(c).mode === "promotion")
    .flatMap((c) => promotionSourceResults(c, season).map((r) => {
      const source = promotionWinnerSources(c).find((s) => s.id === r.source);
      return `<p>${escapeEditorValue(source?.name || r.source)}: ${r.ready ? escapeEditorValue(gameState.teamMap[r.teamId]?.name || "sem vencedor elegível; vaga pela tabela") : "aguardando definição"}.</p>`;
    })).join("");
  return `<section class="movement-panel"><h3>Acesso, rebaixamento e playoffs</h3>${sourceInfo}<p><span class="movement-badge down">Rebaixamento direto</span> <span class="movement-badge playoff">Playoff</span> <span class="movement-badge up">Acesso direto</span></p><p>As zonas refletem a classificação atual da tabela de referência. Desempate: pontos, saldo, gols marcados; no playoff interno, persiste a ordem de classificação da liga em caso de igualdade total.</p>${jobs
    .map(
      (job) =>
        `<div class="playoff-card"><strong>${escapeEditorValue(gameState.compMap[job.compId]?.name || job.compId)} · ${job.status === "playing" ? "Playoff em andamento" : job.status === "skipped" ? "Regra não aplicada" : job.applied ? "Movimentação concluída" : "Aguardando outras divisões"}</strong>${job.error ? `<p>${escapeEditorValue(job.error)}</p>` : ""}${(
          job.fixtureIds || []
        )
          .map((id) => {
            const f = gameState.fixtures.find((f) => f.id === id);
            return `<p>${escapeEditorValue(gameState.teamMap[f.home]?.name)} <b>${f.played ? f.homeScore + " × " + f.awayScore : "×"}</b> ${escapeEditorValue(gameState.teamMap[f.away]?.name)} ${f.penaltyHome !== undefined ? `(pênaltis ${f.penaltyHome}–${f.penaltyAway})` : ""} <small>${f.promotionStage!==undefined?escapeEditorValue(job.stageRuns[f.promotionStage].stageName)+" · ":""}Semana ${f.globalWeek + 1}</small></p>`;
          })
          .join("")}${
          job.config?.mode === "promotion" ? renderPromotionStandings(job) : job.config?.mode === "internal"
            ? `<ol>${rankMovementTable(
                gameState.standings[job.phaseId + "_" + job.season],
                job.playoffParticipants || job.upperPlayoff,
              )
                .map(
                  (id) =>
                    `<li>${escapeEditorValue(gameState.teamMap[id]?.name)} — ${gameState.standings[job.phaseId + "_" + job.season][id].pts} pts</li>`,
                )
                .join("")}</ol>`
            : ""
        }${job.applied && job.summary?.length ? `<p>${escapeEditorValue(job.summary.join("; "))}</p>` : ""}</div>`,
    )
    .join("")}</section>`;
}

function resolveMixedPlayoffWinner(fixture, homeScore, awayScore) {
  if (fixture.playoffWinner) return;
  if (homeScore === awayScore) {
    const homeWon = Math.random() >= 0.5;
    fixture.penaltyHome = homeWon ? 5 : 4;
    fixture.penaltyAway = homeWon ? 4 : 5;
    fixture.playoffWinner = homeWon ? fixture.home : fixture.away;
  } else
    fixture.playoffWinner = homeScore > awayScore ? fixture.home : fixture.away;
}

// Loans and annual player development wait until relegation playoffs are over.
function queuePlayerSeasonProgression(season, countryId) {
  gameState.pendingSquadProgression ||= {};
  gameState.pendingSquadProgression[season] = countryId;
  applyReadySquadProgression(season);
}
function applyReadySquadProgression(season) {
  const countryId = gameState.pendingSquadProgression?.[season];
  if (!countryId || gameState.squadProgressedSeasons?.[season]) return;
  if (!titleSeasonReady(countryId, season)) return;
  const ready = movementRules()
    .filter((c) => c.countryId === countryId)
    .every(
      (c) =>
        gameState.divisionTransitions?.[movementKey(c.id, season)]?.applied,
    );
  if (!ready) return;
  finalizeCareerSeasons();
  gameState.mySquad = gameState.mySquad.filter((p) => !p.isLoan || p.originalTeamId);
  gameState.mySquad.forEach((p) => {
    p.isLoanedOut = false;
  });
  applyEndSeasonProgression();
  (gameState.squadProgressedSeasons ||= {})[season] = true;
  delete gameState.pendingSquadProgression[season];
}

function addMovementFixtures(job, fixtures) {
  for (const fixture of fixtures) {
    if (fixture.promotionRound !== undefined) {
      const first = gameState.fixtures.find(f => f.movementPlayoffId === job.key && f.promotionStage === job.stageIndex && f.promotionRound === fixture.promotionRound && f.promotionTie === fixture.promotionTie);
      if (first) fixture.globalWeek = Math.max(fixture.globalWeek, first.globalWeek + 1);
    }
    while (gameState.fixtures.some(f=>!f.played && f.globalWeek===fixture.globalWeek && [f.home,f.away].some(id=>id===fixture.home || id===fixture.away))) fixture.globalWeek++;
    fixture.movementPlayoffId=job.key;
    if(job.stageIndex!==undefined)fixture.promotionStage=job.stageIndex;
    fixture.id=job.phaseId+'-'+job.fixtureIds.length;
    job.fixtureIds.push(fixture.id);gameState.fixtures.push(fixture);
    if(job.stageIndex!==undefined)gameState.divisionTransitions[job.key].fixtureIds.push(fixture.id);
  }
}
function promotionLeagueFixtures(job, ids) {
  return generateRoundRobin(ids,job.config.promotionRounds || 1,gameState.currentWeek+1,job.phaseId,job.compId,job.season).filter(f=>f.away!==null);
}
function startPromotionFormat(job) {
  if(job.config.promotionPhases?.length) { startPromotionStage(job,job.lowerPlayoff); return []; }
  const format=job.config.promotionFormat || 'league';
  if(format==='knockout') return promotionKnockoutFixtures(job,job.lowerPlayoff);
  if(format==='groups') {
    job.promotionGroups=Array.from({length:job.config.promotionGroups},()=>[]);
    job.lowerPlayoff.forEach((id,i)=>{const row=Math.floor(i/job.promotionGroups.length),col=i%job.promotionGroups.length;job.promotionGroups[row%2?job.promotionGroups.length-1-col:col].push(id);});
    return job.promotionGroups.flatMap((ids,index)=>promotionLeagueFixtures(job,ids).map(f=>({...f,promotionGroup:index})));
  }
  return promotionLeagueFixtures(job,job.lowerPlayoff);
}
function promotionKnockoutFixtures(job,ids) {
  const matches=Math.min(ids.length-job.config.slots,Math.floor(ids.length/2));
  const byes=ids.slice(0,ids.length-matches*2),pool=ids.slice(byes.length);
  const round={byes,ties:[]};(job.promotionKnockout ||= []).push(round);
  const roundIndex=job.promotionKnockout.length-1,fixtures=[];
  for(let i=0;i<matches;i++){
    const a=pool[i],b=pool[pool.length-1-i];round.ties.push({a,b});
    for(let leg=0;leg<(job.config.promotionRounds || 1);leg++)fixtures.push({home:job.config.promotionRounds===2 && leg===0?b:a,away:job.config.promotionRounds===2 && leg===0?a:b,globalWeek:gameState.currentWeek+1+leg,compId:job.phaseId,baseCompId:job.compId,season:job.season,played:false,homeScore:null,awayScore:null,promotionRound:roundIndex,promotionTie:i});
  }
  return fixtures;
}
function resolvePromotionTie(fixture,homeScore=fixture.homeScore,awayScore=fixture.awayScore) {
  if(fixture.promotionRound===undefined)return;
  const job=promotionFixtureJob(fixture);
  const tie=job?.promotionKnockout?.[fixture.promotionRound]?.ties[fixture.promotionTie];
  if(!tie || tie.winner)return;
  const fixtures=job.fixtureIds.map(id=>gameState.fixtures.find(f=>f.id===id)).filter(f=>f.promotionRound===fixture.promotionRound && f.promotionTie===fixture.promotionTie);
  if(fixtures.some(f=>f.id!==fixture.id && !f.played))return;
  let a=0,b=0;
  for(const f of fixtures){const h=f.id===fixture.id?homeScore:f.homeScore,v=f.id===fixture.id?awayScore:f.awayScore;a+=f.home===tie.a?h:v;b+=f.home===tie.b?h:v;}
  if(a===b){const last=fixtures[fixtures.length-1];resolveMixedPlayoffWinner(last,0,0);tie.winner=last.playoffWinner;}else tie.winner=a>b?tie.a:tie.b;
}
function rankPromotionGroup(job,ids) {
  const table=gameState.standings[job.phaseId+'_'+job.season];
  return rankMovementTable(Object.fromEntries(ids.map(id=>[id,table[id]])),ids);
}
function finishPromotionRound(job) {
  if(job.stageRuns) return finishPromotionStages(job);
  if(job.config.promotionFormat==='knockout') {
    const round=job.promotionKnockout[job.promotionKnockout.length-1];
    const winners=[...round.byes,...round.ties.map(t=>t.winner)].sort((a,b)=>job.lowerPlayoff.indexOf(a)-job.lowerPlayoff.indexOf(b));
    if(winners.length>job.config.slots){addMovementFixtures(job,promotionKnockoutFixtures(job,winners));return false;}
    job.playoffUp=winners;
  } else if(job.config.promotionFormat==='groups') {
    job.playoffUp=job.promotionGroups.flatMap(ids=>rankPromotionGroup(job,ids).slice(0,job.config.slots/job.promotionGroups.length));
  } else job.playoffUp=rankPromotionGroup(job,job.lowerPlayoff).slice(0,job.config.slots);
  return true;
}
function renderPromotionStandings(job) {
  if(job.stageRuns)return job.stageRuns.map(stage=>`<section><h4>${escapeEditorValue(stage.stageName)} · ${stage.config.promotionRounds===2?"Ida e volta / dois turnos":"Jogo único / um turno"}</h4>${renderPromotionStandings(stage)}${stage.playoffUp?`<p>Classificados: ${stage.playoffUp.map(id=>escapeEditorValue(gameState.teamMap[id]?.name || id)).join(", ")}</p>`:""}</section>`).join("");
  const name=id=>escapeEditorValue(gameState.teamMap[id]?.name || id);
  if(job.config.promotionFormat==='knockout')return '<h4>Mata-mata de promoção</h4>'+(job.promotionKnockout || []).map((r,i)=>`<p>Etapa ${i+1}${r.byes.length?' · Folgas: '+r.byes.map(name).join(', '):''}</p>${r.ties.map(t=>`<p>${name(t.a)} × ${name(t.b)}${t.winner?' → '+name(t.winner):''}</p>`).join('')}`).join('');
  const groups=job.promotionGroups || [job.lowerPlayoff];
  return groups.map((ids,i)=>`<h4>${job.promotionGroups?'Grupo '+(i+1):'Liga de promoção'}</h4><ol>${rankPromotionGroup(job,ids).map(id=>`<li>${name(id)} — ${gameState.standings[job.phaseId+'_'+job.season][id].pts} pts${job.playoffUp?.includes(id)?' · Promovido':''}</li>`).join('')}</ol>`).join('');
}

function validatePromotionPhases(config) {
  const phases=config.promotionPhases || [],errors=[];let count=config.playoffTeams;
  phases.forEach((p,i)=>{
    const next=Number(p.advancing),groups=Number(p.groups),prefix=`fase ${i+1} do playoff de promoção`;
    if(!['league','knockout','groups'].includes(p.format))errors.push(prefix+': formato inválido');
    if(![1,2].includes(Number(p.rounds)))errors.push(prefix+': escolha um ou dois jogos/turnos');
    if(!Number.isInteger(next) || next<1 || next>=count)errors.push(prefix+': os classificados devem ser pelo menos 1 e menos que os participantes');
    if(p.format==='groups' && (!Number.isInteger(groups) || groups<2 || count%groups || next%groups || next<groups || count/groups<2))errors.push(prefix+': distribua igualmente participantes e classificados entre pelo menos dois grupos');
    count=next;
  });
  if(phases.length && count!==config.slots)errors.push('os classificados da última fase devem coincidir com as vagas de promoção');
  return errors;
}
function renderPromotionPhasesEditor(comp) {
  const phases=movementConfig(comp).promotionPhases;
  return `<section class="movement-editor"><h4>Fases individuais do playoff de promoção</h4><p>${phases.length?'Estas fases substituem o formato geral acima. A última fase deve classificar exatamente o número de vagas de promoção.':'Sem fases individuais, será usado o formato geral acima. Adicione fases para combinar grupos, liga e mata-mata.'}</p>${phases.map((p,i)=>`<div class="playoff-card"><h4>Fase ${i+1}</h4><div class="movement-fields"><label>Nome<input id="prom-name-${comp.id}-${i}" value="${escapeEditorValue(p.name)}"></label><label>Formato<select id="prom-format-${comp.id}-${i}">${[['league','Liga'],['groups','Grupos'],['knockout','Mata-mata']].map(([v,label])=>`<option value="${v}" ${p.format===v?'selected':''}>${label}</option>`).join('')}</select></label><label>Jogos / turnos<select id="prom-rounds-${comp.id}-${i}"><option value="1" ${Number(p.rounds)===1?'selected':''}>Jogo único / um turno</option><option value="2" ${Number(p.rounds)===2?'selected':''}>Ida e volta / dois turnos</option></select></label><label>Classificados<input type="number" min="1" step="1" id="prom-advancing-${comp.id}-${i}" value="${escapeEditorValue(p.advancing)}"></label><label>Número de grupos (somente Grupos)<input type="number" min="2" step="1" id="prom-groups-${comp.id}-${i}" value="${escapeEditorValue(p.groups || 2)}"></label></div><button type="button" onclick="changePromotionPhase('${comp.id}',${i},'up')">Subir</button> <button type="button" onclick="changePromotionPhase('${comp.id}',${i},'down')">Descer</button> <button type="button" onclick="changePromotionPhase('${comp.id}',${i},'remove')">Remover fase</button></div>`).join('')}<button type="button" onclick="changePromotionPhase('${comp.id}',-1,'add')">Adicionar fase</button><p>As fases são disputadas em ordem, com pontos zerados em cada nova fase. As vagas por título e seus repasses definem os participantes da primeira fase.</p></section>`;
}
function readPromotionPhasesEditor(comp) {
  return movementConfig(comp).promotionPhases.map((p,i)=>{
    const value=(field,fallback)=>document.getElementById(`prom-${field}-${comp.id}-${i}`)?.value ?? fallback;
    return {name:value('name',p.name),format:value('format',p.format),rounds:Number(value('rounds',p.rounds)),advancing:Number(value('advancing',p.advancing)),groups:Number(value('groups',p.groups || 2))};
  });
}
function changePromotionPhase(compId,index,action) {
  syncEditorDOMToMemory();
  const comp=db.competitions.find(c=>c.id===compId),m=movementConfig(comp),phases=m.promotionPhases;
  if(action==='add')phases.push({name:'Fase '+(phases.length+1),format:phases.length?'knockout':m.promotionFormat,rounds:phases.length?1:m.promotionRounds,advancing:m.slots || 1,groups:m.promotionGroups});
  else if(action==='remove')phases.splice(index,1);
  else {const other=index+(action==='up'?-1:1);if(other>=0 && other<phases.length)[phases[index],phases[other]]=[phases[other],phases[index]];}
  comp.movement.promotionPhases=phases;renderEditorContent();
}
function promotionFixtureJob(fixture) {
  const parent=gameState.divisionTransitions?.[fixture.movementPlayoffId];
  return fixture.promotionStage===undefined?parent:parent?.stageRuns?.[fixture.promotionStage];
}
function startPromotionStage(job,ids) {
  const index=(job.stageRuns ||= []).length,p=job.config.promotionPhases[index];
  const stage={key:job.key,compId:job.compId,season:job.season,phaseId:job.phaseId+'-stage-'+index,stageIndex:index,stageName:p.name,
    config:{...job.config,promotionPhases:[],promotionFormat:p.format,promotionRounds:Number(p.rounds),promotionGroups:Number(p.groups),slots:Number(p.advancing)},lowerPlayoff:ids,playoffParticipants:ids,fixtureIds:[]};
  job.stageRuns.push(stage);
  gameState.standings[stage.phaseId+'_'+stage.season]=Object.fromEntries(ids.map(id=>[id,{played:0,won:0,drawn:0,lost:0,gf:0,ga:0,gd:0,pts:0}]));
  addMovementFixtures(stage,startPromotionFormat(stage));
}
function finishPromotionStages(job) {
  const stage=job.stageRuns[job.stageRuns.length-1];
  if(!finishPromotionRound(stage))return false;
  if(job.stageRuns.length<job.config.promotionPhases.length){startPromotionStage(job,stage.playoffUp);return false;}
  job.playoffUp=stage.playoffUp;return true;
}
