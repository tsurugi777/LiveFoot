function simulationSettings() {
  const s=gameState.simulationSettings || {};
  return {live:s.live!==false,speed:[0.5,1,2,4,8].includes(Number(s.speed))?Number(s.speed):1};
}
function setSimulationSetting(key,value) {
  gameState.simulationSettings={...simulationSettings(),[key]:value};
  if(key==='speed' && liveMatch && !liveMatch.paused && !liveMatch.finished){clearInterval(liveMatch.timer);liveMatch.timer=setInterval(tickLiveMatch,250/simulationSettings().speed);}
}
function renderSimulationSettings() {
  const s=simulationSettings();
  return `<div class="simulation-settings"><label><input type="checkbox" ${s.live?'checked':''} onchange="setSimulationSetting('live',this.checked)"> Transmissão ao vivo</label><p>Desative para simular suas partidas instantaneamente. A alteração vale para a próxima partida.</p><label>Velocidade da transmissão<select onchange="setSimulationSetting('speed',Number(this.value))">${[0.5,1,2,4,8].map(v=>`<option value="${v}" ${s.speed===v?'selected':''}>${v}×</option>`).join('')}</select></label></div>`;
}
function simulateInstantMatch(fixture) {
  if(fixture.played)return;
  const chances=getLiveGoalChances(fixture.home,fixture.away);let home=0,away=0;
  for(let minute=0;minute<90;minute++){if(Math.random()<chances.home)home++;if(Math.random()<chances.away)away++;}
  fixture.homeScore=home;fixture.awayScore=away;fixture.played=true;
  applyMatchResultToTables(fixture);
  if(fixture.home===gameState.playerTeamId)generateMatchRevenue();
  if ([fixture.home,fixture.away].includes(gameState.playerTeamId)) movementMessage(fixture.season,`${gameState.teamMap[fixture.home].name} ${home} × ${away} ${gameState.teamMap[fixture.away].name} — simulação instantânea.`);
}
