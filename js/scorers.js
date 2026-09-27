const scorersView={country:null,competition:null,season:null};
function scorerCompetitionIds(fixture){
 const owner=db.competitions.find(c=>c.phases?.some(p=>p.id===fixture.compId));
 const job=gameState.divisionTransitions?.[fixture.movementPlayoffId];
 return [...new Set([owner?.id,fixture.baseCompId,job?.targetCompId].filter(id=>id && gameState.compMap[id]))];
}
function recordFixtureScorers(fixture,players){
 if(fixture.scorersRecorded)return;
 fixture.scorersRecorded=true;fixture.scorerPlayers=players;
 const season=(gameState.competitionScorers ||= {})[fixture.season] ||= {};
 for(const compId of scorerCompetitionIds(fixture)){
  const table=season[compId] ||= {};
  for(const p of players){
   const row=table[p.id] ||= {id:p.id,name:p.name,photoUrl:p.photoUrl,goals:0,games:0,clubs:{}};
   row.name=p.name;row.photoUrl=p.photoUrl;row.games++;row.goals+=p.goals || 0;
   const club=row.clubs[p.teamId] ||= {games:0,goals:0};club.games++;club.goals+=p.goals || 0;
  }
 }
}
function recordLiveScorer(player){
 if(!player?.id || player.isGeneric)return;
 liveMatch.scorerGoals ||= {};liveMatch.scorerGoals[player.id]=(liveMatch.scorerGoals[player.id] || 0)+1;
}
function scoringSnapshot(player,teamId,goals=0){return {id:player.id,name:player.name,photoUrl:personPhoto(player.photoUrl),teamId,goals};}
function competitionScorerRanking(compId,season){return Object.values(gameState.competitionScorers?.[season]?.[compId] || {}).filter(p=>p.goals>0).sort((a,b)=>b.goals-a.goals || a.games-b.games || a.name.localeCompare(b.name,'pt-BR'));}
function setScorersFilter(field,value){scorersView[field]=field==='season'?Number(value):value;if(field==='country')scorersView.competition=null;if(field!=='season')scorersView.season=null;renderClassicHub();}
function renderScorers(){
 const state=scorersView,initial=gameState.compMap[gameState.playerBaseCompId];
 if(!db.countries.some(c=>c.id===state.country))state.country=initial?.countryId || db.countries[0]?.id;
 const comps=db.competitions.filter(c=>c.countryId===state.country);
 if(!comps.some(c=>c.id===state.competition))state.competition=comps.find(c=>c.id===initial?.id)?.id || comps[0]?.id;
 const comp=gameState.compMap[state.competition];if(!comp)return '<div class="phase-empty">Nenhuma competição disponível.</div>';
 const root=comp.parentId && comp.parentId!=='NONE'?comp.parentId:comp.id;
 const current=gameState.countrySeason[root] || gameState.startYear;
 const seasons=[...new Set([current,...Object.keys(gameState.competitionScorers || {}).map(Number),...gameState.fixtures.filter(f=>f.baseCompId===root).map(f=>f.season)])].sort((a,b)=>b-a);
 if(!seasons.includes(state.season))state.season=current;
 const rows=competitionScorerRanking(comp.id,state.season);
 return `<div class="competition-center"><div class="competition-filters"><label>País<select onchange="setScorersFilter('country',this.value)">${db.countries.map(c=>`<option value="${escapeEditorValue(c.id)}" ${c.id===state.country?'selected':''}>${escapeEditorValue(c.name)}</option>`).join('')}</select></label><label>Competição<select onchange="setScorersFilter('competition',this.value)">${comps.map(c=>`<option value="${escapeEditorValue(c.id)}" ${c.id===state.competition?'selected':''}>${escapeEditorValue(c.name)}</option>`).join('')}</select></label><label>Temporada<select onchange="setScorersFilter('season',this.value)">${seasons.map(s=>`<option ${s===state.season?'selected':''}>${s}</option>`).join('')}</select></label></div><div class="competition-banner"><div><span class="eyebrow">ARTILHARIA</span><h2>${escapeEditorValue(comp.name)}</h2><p>Temporada ${state.season} · ${rows.length} jogadores com gols</p></div><i class="fas fa-futbol"></i></div><section class="phase-content">${rows.length?`<div class="phase-table-scroll"><table class="phase-table"><thead><tr><th>#</th><th>Jogador</th><th>Clube(s)</th><th>Gols</th><th>Jogos</th><th>Gols/jogo</th></tr></thead><tbody>${rows.map((p,i)=>`<tr class="${p.clubs[gameState.playerTeamId]?'my-club-row':''}"><td>${i+1}</td><td><span class="phase-club">${personImage(p.photoUrl,'','width:28px;height:28px;border-radius:50%;object-fit:cover')} ${escapeEditorValue(p.name)}</span></td><td>${Object.keys(p.clubs).map(id=>phaseClub(id)).join(' · ')}</td><td><strong>${p.goals}</strong></td><td>${p.games}</td><td>${(p.goals/p.games).toFixed(2)}</td></tr>`).join('')}</tbody></table></div>`:'<div class="phase-empty"><i class="fas fa-futbol"></i><h3>Ainda não há gols registrados</h3><p>O ranking será atualizado ao concluir as partidas desta competição.</p></div>'}<p class="phase-legend">Inclui fases e playoffs vinculados à competição. Disputas de pênaltis não contam como gols. Em empates: menos jogos e nome. Saves antigos começam a registrar a artilharia por competição a partir desta versão.</p></section></div>`;
}
