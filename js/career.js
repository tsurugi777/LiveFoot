function clubSquad(teamId, create = true) {
  if (teamId === '__free__') return gameState.freeAgents || [];
  if (teamId === gameState.playerTeamId) return gameState.mySquad;
  const team = gameState.teamMap[teamId];
  if (!team) return [];
  if (!team.generatedSquad && create) team.generatedSquad = generateSquad(teamId,team.rating);
  return team.generatedSquad || [];
}
function playerSeason(teamId) {
  const root = getTeamBaseCompetition(gameState.teamMap[teamId]);
  return gameState.countrySeason[root] || gameState.currentDate.getFullYear();
}
function prepareCareerSeason(player,teamId,season) {
  if (player.careerSeason != null && player.careerSeason < season) archiveCareer(player,teamId,player.careerSeason);
  player.careerSeason=season;player.careerTeamId=teamId;
}
function careerRow(player,teamId,season) {
  const team = gameState.teamMap[teamId];
  const ratings=player.sRatings || [];
  return {season,teamId,teamName:team?.name || teamId,logoUrl:team?.logoUrl || '',games:player.sGames||0,goals:player.sGoals||0,assists:player.sAssists||0,yellows:player.sYellows||0,reds:player.sReds||0,rating:ratings.length?ratings.reduce((a,b)=>a+b,0)/ratings.length:null};
}
function archiveCareer(player,teamId,season) {
  (player.careerStats ||= []).push(careerRow(player,player.careerTeamId || teamId,player.careerSeason ?? season));
  for (const field of ['sGames','sGoals','sAssists','sYellows','sReds']) player[field]=0;
  player.sRatings=[];player.lastDevelopmentGames=0;
}
function careerRows(player) {
  const rows=[...(player.careerStats || [])];
  let teamId=player.careerTeamId;
  if (!teamId) teamId=Object.keys(gameState.teamMap).find(id=>clubSquad(id,false).some(p=>p.id===player.id));
  if (teamId) rows.push(careerRow(player,teamId,player.careerSeason ?? playerSeason(teamId)));
  const grouped=new Map();
  for(const raw of rows) {
    const team=gameState.teamMap[raw.teamId] || Object.values(gameState.teamMap).find(t=>t.name===raw.teamName);
    const key=JSON.stringify([raw.season,team?.id || raw.teamName]);
    const row=grouped.get(key) || {season:raw.season,teamId:team?.id || null,teamName:raw.teamName || team?.name,logoUrl:raw.logoUrl || team?.logoUrl || '',games:0,goals:0,assists:0,yellows:0,reds:0,ratingSum:0,ratingGames:0};
    for(const f of ['games','goals','assists','yellows','reds'])row[f]+=Number(raw[f])||0;
    if(raw.rating!==null && Number.isFinite(Number(raw.rating))){row.ratingSum+=Number(raw.rating)*(Number(raw.games)||0);row.ratingGames+=Number(raw.games)||0;}
    grouped.set(key,row);
  }
  return [...grouped.values()].sort((a,b)=>b.season-a.season);
}
function careerBadge(row) {
  return row.logoUrl ? `<img src="${escapeEditorValue(row.logoUrl)}" alt="Escudo" style="width:24px;height:24px;object-fit:contain" onerror="this.style.display='none'">` : '<span aria-label="Clube sem escudo">🛡️</span>';
}
function renderPlayerCareer(player) {
  return careerRows(player).map((row,i)=>`<div class="career-row"><span>${row.season}</span><button type="button" class="career-club" onclick="showCareerClub(${i})">${careerBadge(row)} ${escapeEditorValue(row.teamName)}</button><span>J ${row.games} · G ${row.goals} · A ${row.assists} · CA ${row.yellows} · CV ${row.reds} · Nota ${row.ratingGames?(row.ratingSum/row.ratingGames).toFixed(1):'—'}</span></div>`).join('') || '<p>Sem histórico registrado.</p>';
}
function showCareerClub(index) {
  const player=selectedProfilePlayer();
  if(!player)return;
  const rows=careerRows(player),selected=rows[index];if(!selected)return;
  const clubRows=rows.filter(r=>selected.teamId?r.teamId===selected.teamId:r.teamName===selected.teamName);
  const totals={games:0,goals:0,assists:0,yellows:0,reds:0,ratingSum:0,ratingGames:0};
  for(const row of clubRows)for(const field of Object.keys(totals))totals[field]+=row[field];
  showModal(`${player.name} · ${selected.teamName}`,`Temporadas: ${clubRows.map(r=>r.season).join(', ')}\nJogos: ${totals.games}\nGols: ${totals.goals}\nAssistências: ${totals.assists}\nAmarelos: ${totals.yellows}\nVermelhos: ${totals.reds}\nNota média: ${totals.ratingGames?(totals.ratingSum/totals.ratingGames).toFixed(1):'—'}`);
}
function recordSimulatedPlayerStats(fixture) {
  if(fixture.playerStatsRecorded || !fixture.played || !fixture.away)return;
  fixture.playerStatsRecorded=true;
  const scorerPlayers=[...(fixture.liveScorerPlayers || [])];
  for(const [teamId,goals] of [[fixture.home,fixture.homeScore],[fixture.away,fixture.awayScore]]) {
    if(teamId===gameState.playerTeamId && fixture.humanStatsRecorded)continue;
    const squad=clubSquad(teamId);
    let players;
    if(teamId===gameState.playerTeamId)players=gameState.myLineup.starters.map(id=>squad.find(p=>p.id===id)).filter(Boolean);
    else players=cpuMatchPlayers(teamId);
    for(const p of players){prepareCareerSeason(p,teamId,fixture.season);p.sGames=(p.sGames||0)+1;p.cGames=(p.cGames||0)+1;(p.sRatings ||= []).push(6+Math.random()*2);}
    fatiguePlayers(players,90);
    for(const p of players)progressPerformance(p,teamId);
    const snapshots=new Map(players.map(p=>[p.id,scoringSnapshot(p,teamId)]));
    const attackers=players.filter(p=>!isNaturalGoalkeeper(p));
    const forwards=attackers.filter(p=>['CA','PTE','PTD','MAT'].some(pos=>p.pos.split('/').includes(pos)));
    const scorers=forwards.length?forwards:attackers;
    for(let i=0;i<goals && scorers.length;i++){
      const p=scorers[Math.floor(Math.random()*scorers.length)];p.sGoals=(p.sGoals||0)+1;p.cGoals=(p.cGoals||0)+1;snapshots.get(p.id).goals++;
      const helpers=attackers.filter(a=>a.id!==p.id);
      if(helpers.length){const a=helpers[Math.floor(Math.random()*helpers.length)];a.sAssists=(a.sAssists||0)+1;a.cAssists=(a.cAssists||0)+1;}
    }
    scorerPlayers.push(...snapshots.values());
  }
  recordFixtureScorers(fixture,scorerPlayers);
}
function finalizeCareerSeasons() {
  gameState.closedCareerSeasons ||= {};
  const seasons=new Set(Object.keys(gameState.completedDivisionSeasons || {}).map(k=>JSON.parse(k)[1]));
  for(const season of seasons)for(const country of db.countries){
    const key=movementKey(country.id,season);if(gameState.closedCareerSeasons[key])continue;
    const roots=db.competitions.filter(c=>c.countryId===country.id && (!c.parentId || c.parentId==='NONE'));
    if(!roots.length || roots.some(c=>!gameState.completedDivisionSeasons[movementKey(c.id,season)]))continue;
    if(!titleSeasonReady(country.id,season) || movementRules().filter(c=>c.countryId===country.id).some(c=>!gameState.divisionTransitions?.[movementKey(c.id,season)]?.applied))continue;
    for(const team of Object.values(gameState.teamMap).filter(t=>getTeamCountryId(t)===country.id))paySeasonPayroll(team.id,season);
    for(const team of Object.values(gameState.teamMap).filter(t=>getTeamCountryId(t)===country.id))for(const p of [...clubSquad(team.id,false)]){
      if((p.careerSeason ?? season)>season)continue;
      archiveCareer(p,team.id,season);p.careerSeason=season+1;p.careerTeamId=team.id;
      if(p.isLoan && p.originalTeamId && gameState.teamMap[p.originalTeamId] && (p.loanEndSeason ?? season)<=season){
        const owner=p.originalTeamId;recordPlayerMove(p,team.id,owner,'Retorno de empréstimo');
        removeClubPlayer(team.id,p.id);clubSquad(owner).push(p);
        p.careerTeamId=owner;p.isLoan=false;p.isLoanedOut=false;delete p.originalTeamId;delete p.loanEndSeason;
      }
    }
    gameState.closedCareerSeasons[key]=true;
  }
}
