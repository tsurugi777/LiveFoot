// Division IDs are scoped to a country. Unconfigured competitions keep legacy membership.
function escapeEditorValue(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ],
  );
}
function getTeamCountryId(team) {
  return (
    team.countryId ||
    db.competitions.find((comp) => comp.id === team.compId)?.countryId
  );
}
function normalizeDivisions() {
  normalizePeople(db);
  db.countries.forEach((country) => {
    if (!Array.isArray(country.divisions) || !country.divisions.length) {
      country.divisions = [{ id: "division-1", name: "1ª Divisão" }];
    }
  });
  db.teams.forEach((team) => {
    const country = db.countries.find((c) => c.id === getTeamCountryId(team));
    if (!country) return;
    team.countryId = country.id;
    if (!country.divisions.some((d) => d.id === team.divisionId)) {
      const inherited = db.competitions.find(
        (c) => c.id === team.compId,
      )?.divisionId;
      team.divisionId =
        country.divisions.find((d) => d.id === inherited)?.id ||
        country.divisions[0].id;
    }
  });
}
function divisionOptions(countryId, selected, allowUnfiltered = false) {
  const divisions =
    db.countries.find((c) => c.id === countryId)?.divisions || [];
  return (
    (allowUnfiltered
      ? `<option value="" ${!selected ? "selected" : ""}>Sem divisão (vínculo original / herdar da competição base)</option>`
      : "") +
    divisions
      .map(
        (d) =>
          `<option value="${escapeEditorValue(d.id)}" ${selected === d.id ? "selected" : ""}>${escapeEditorValue(d.name)}</option>`,
      )
      .join("")
  );
}
function getCompetitionTeams(compId, rootId = null) {
  if (!rootId) {
    let ancestor = db.competitions.find((c) => c.id === compId);
    const visited = new Set();
    while (
      ancestor?.parentId &&
      ancestor.parentId !== "NONE" &&
      !visited.has(ancestor.id)
    ) {
      visited.add(ancestor.id);
      const parent = db.competitions.find((c) => c.id === ancestor.parentId);
      if (!parent) break;
      ancestor = parent;
    }
    rootId = ancestor?.id || compId;
  }
  const comp = db.competitions.find((c) => c.id === compId);
  const root = db.competitions.find((c) => c.id === rootId);
  const divisionId = comp?.divisionId || root?.divisionId;
  if (!divisionId) return db.teams.filter((t) => t.compId === rootId);
  const countryId = comp?.countryId || root?.countryId;
  return db.teams.filter(
    (t) => getTeamCountryId(t) === countryId && t.divisionId === divisionId,
  );
}
function getTeamBaseCompetition(team) {
  const roots = db.competitions.filter(
    (c) => !c.parentId || c.parentId === "NONE",
  );
  const eligible = roots.filter((c) =>
    getCompetitionTeams(c.id).some((t) => t.id === team.id),
  );
  return (
    eligible.find(
      (c) => c.divisionId === team.divisionId && c.id === team.compId,
    )?.id ||
    eligible.find((c) => c.divisionId === team.divisionId)?.id ||
    eligible.find((c) => c.id === team.compId)?.id ||
    eligible[0]?.id ||
    null
  );
}
function renderDivisionEditor() {
  const country = db.countries.find((c) => c.id === currentEditorCountry);
  const container = document.getElementById("editor-content-area");
  container.innerHTML = `<section class="division-editor"><h3>Divisões de ${escapeEditorValue(country.name)}</h3><p>A ordem indica o nível: a primeira é a elite. Defina a divisão inicial dos clubes na aba Clubes e a divisão de cada torneio na aba Competições.</p><p>Configure acesso, rebaixamento e playoffs na aba Competições e Fases.</p><div class="division-list">${country.divisions.map((d, index) => `<div class="division-row"><span class="division-level">${index + 1}º nível</span><label>Nome da divisão<input id="edit-division-${escapeEditorValue(d.id)}" value="${escapeEditorValue(d.name)}" maxlength="60"></label><button class="secondary-button" onclick="moveCountryDivision(${index}, -1)" aria-label="Subir divisão ${index + 1}" ${index === 0 ? "disabled" : ""}>↑</button><button class="secondary-button" onclick="moveCountryDivision(${index}, 1)" aria-label="Descer divisão ${index + 1}" ${index === country.divisions.length - 1 ? "disabled" : ""}>↓</button><button class="secondary-button" onclick="removeCountryDivision(${index})" ${country.divisions.length === 1 ? "disabled" : ""}>Excluir</button></div>`).join("")}</div><button class="primary-button" onclick="addCountryDivision()"><i class="fas fa-plus"></i> Adicionar divisão</button></section>`;
}
function syncDivisionNames() {
  const country = db.countries.find((c) => c.id === currentEditorCountry);
  country?.divisions.forEach((d, index) => {
    const input = document.getElementById("edit-division-" + d.id);
    if (input) d.name = input.value.trim() || `${index + 1}ª Divisão`;
  });
}
function addCountryDivision() {
  syncEditorDOMToMemory();
  const country = db.countries.find((c) => c.id === currentEditorCountry);
  country.divisions.push({
    id: "division-" + crypto.randomUUID(),
    name: `${country.divisions.length + 1}ª Divisão`,
  });
  renderEditorContent();
}
function moveCountryDivision(index, direction) {
  syncEditorDOMToMemory();
  const list = db.countries.find(
    (c) => c.id === currentEditorCountry,
  ).divisions;
  if (index + direction < 0 || index + direction >= list.length) return;
  [list[index], list[index + direction]] = [
    list[index + direction],
    list[index],
  ];
  renderEditorContent();
}
function removeCountryDivision(index) {
  syncEditorDOMToMemory();
  const country = db.countries.find((c) => c.id === currentEditorCountry);
  const division = country.divisions[index];
  if (!division || country.divisions.length === 1) return;
  const inUse =
    db.teams.some(
      (t) => getTeamCountryId(t) === country.id && t.divisionId === division.id,
    ) ||
    db.competitions.some(
      (c) => c.countryId === country.id && c.divisionId === division.id,
    );
  if (inUse)
    return showModal(
      "Divisão em uso",
      "Mova os clubes e as competições para outra divisão antes de excluir esta.",
    );
  country.divisions.splice(index, 1);
  renderEditorContent();
}
