// Championship brackets are independent of promotion and regular league tables.
function titleConfig(comp) {
  const c = comp?.titlePlayoff || {};
  return {enabled: !!c.enabled, automatic: c.automatic !== false,
    sources: Array.isArray(c.sources) ? c.sources : [],
    rounds: Array.isArray(c.rounds) ? c.rounds : [{name: 'Final', legs: 1}]};
}
function titleRules() { return db.competitions.filter(c => titleConfig(c).enabled); }
function titleSources(comp) {
  return [...promotionWinnerSources(comp), ...db.competitions.filter(c => c.countryId === comp.countryId && (!c.parentId || c.parentId === 'NONE'))
    .map(c => ({id: 'aggregate:' + c.id, rootId: c.id, name: 'Tabela agregada · ' + c.name}))];
}
function validateTitleRules() {
  const errors = [];
  for (const comp of titleRules()) {
    const c = titleConfig(comp), options = titleSources(comp);
    const fail = text => errors.push(`${comp.name}: ${text}.`);
    if (comp.parentId && comp.parentId !== 'NONE') fail('configure o playoff pelo título na competição base');
    if (!c.sources.length) fail('selecione ao menos uma origem para o título');
    if (c.sources.some(s => !options.some(o => o.id === s.id))) fail('origem de classificação para o título inválida');
    if (new Set(c.sources.map(s => s.id)).size !== c.sources.length) fail('não repita a mesma origem do título');
    if (!c.automatic && c.sources.length < 2) fail('sem título automático são necessárias ao menos duas origens');
    if (c.rounds.length < Math.ceil(Math.log2(c.sources.length || 1))) fail('adicione etapas suficientes para decidir o título');
    if (c.rounds.some(r => ![1,2].includes(Number(r.legs)))) fail('cada etapa deve ter jogo único ou ida e volta');
  }
  return errors;
}
function renderTitleEditor(comp) {
  if (comp.parentId && comp.parentId !== 'NONE') return '';
  const c = titleConfig(comp), options = titleSources(comp);
  return `<section class="movement-editor"><h4>Playoff pelo título</h4>
    <label class="movement-toggle"><input id="title-enabled-${comp.id}" type="checkbox" ${c.enabled?'checked':''}> Ativar disputa do título</label>
    <label class="movement-toggle"><input id="title-auto-${comp.id}" type="checkbox" ${c.automatic?'checked':''}> Dar título automaticamente se restar apenas um classificado</label>
    <p>O playoff decide o título principal no lugar do título automático da tabela anual. Cada origem classifica seu vencedor. As origens são processadas na ordem abaixo. O repasse é individual: se o clube já entrou, classifica-se o próximo da mesma origem quando marcado. Sem repasse, a vaga é eliminada.</p>
    ${c.sources.map((s,i)=>`<div class="movement-fields"><label>Origem ${i+1}<select id="title-source-${comp.id}-${i}"><option value="">Selecione</option>${options.map(o=>`<option value="${escapeEditorValue(o.id)}" ${s.id===o.id?'selected':''}>${escapeEditorValue(o.name)}</option>`).join('')}</select></label><label class="movement-toggle"><input type="checkbox" id="title-pass-${comp.id}-${i}" ${s.passDown?'checked':''}> Repassar vaga duplicada</label><button type="button" onclick="changeTitleEditor('${comp.id}','source',${i})">Remover origem</button></div>`).join('')}
    <button type="button" onclick="changeTitleEditor('${comp.id}','source',-1)">Adicionar origem</button>
    <h4>Etapas, da primeira até a final</h4>${c.rounds.map((r,i)=>`<div class="movement-fields"><label>Nome da etapa<input id="title-round-${comp.id}-${i}" value="${escapeEditorValue(r.name)}"></label><label>Formato<select id="title-legs-${comp.id}-${i}"><option value="1" ${Number(r.legs)===1?'selected':''}>Jogo único</option><option value="2" ${Number(r.legs)===2?'selected':''}>Ida e volta</option></select></label><button type="button" onclick="changeTitleEditor('${comp.id}','round',${i})">Remover etapa</button></div>`).join('')}
    <button type="button" onclick="changeTitleEditor('${comp.id}','round',-1)">Adicionar etapa antes da final</button>
    <p>Com menos classificados, as primeiras etapas são puladas. Folgas favorecem a ordem das origens. Jogo único e volta na casa do melhor classificado. Empate no placar total vai aos pênaltis, sem gol fora. Se restar um clube e o título automático estiver desativado, não haverá campeão. Sem classificados, não há título.</p></section>`;
}
function syncTitleEditor(comp) {
  const el = id => document.getElementById(`title-${id}-${comp.id}`);
  if (!el('enabled')) return;
  const c = titleConfig(comp);
  comp.titlePlayoff = {enabled: el('enabled').checked, automatic: el('auto').checked,
    sources: c.sources.map((s,i)=>({id:document.getElementById(`title-source-${comp.id}-${i}`).value,passDown:document.getElementById(`title-pass-${comp.id}-${i}`).checked})),
    rounds:c.rounds.map((r,i)=>({name:document.getElementById(`title-round-${comp.id}-${i}`).value,legs:Number(document.getElementById(`title-legs-${comp.id}-${i}`).value)}))};
}
function changeTitleEditor(id, kind, index) {
  syncEditorDOMToMemory();
  const comp = db.competitions.find(c=>c.id===id), c = titleConfig(comp);
  const list = kind === 'source' ? c.sources : c.rounds;
  if (index >= 0) list.splice(index,1);
  else if (kind === 'source') list.push({id:'',passDown:false});
  else list.splice(Math.max(0,list.length-1),0,{name:'Eliminatória',legs:1});
  comp.titlePlayoff = c;
  renderEditorContent();
}
function recordTitleRanking(phaseId, season, ids) {
  (gameState.titleRankings ||= {})[movementKey(phaseId,season)] = [...new Set(ids.filter(Boolean))];
}
function titleSourceResult(comp, source, season) {
  const option = titleSources(comp).find(o=>o.id===source.id);
  if (!option) return null;
  if (option.rootId) return gameState.completedDivisionSeasons?.[movementKey(option.rootId,season)]?.aggregate || null;
  const key = movementKey(option.phaseId,season);
  if (gameState.titleRankings?.[key]) return gameState.titleRankings[key];
  if (Object.prototype.hasOwnProperty.call(gameState.promotionWinners || {},key)) return [gameState.promotionWinners[key]].filter(Boolean);
  return null;
}
function titleSeasonReady(countryId, season) {
  return titleRules().filter(c=>c.countryId===countryId).every(c=>gameState.titlePlayoffs?.[movementKey(c.id,season)]?.complete);
}
function finishTitleJob(job, champion, reason) {
  if (job.complete) return;
  job.complete = true; job.champion = champion || null; job.reason = reason;
  if (champion) {
    gameState.titles[champion] ||= {};
    gameState.titles[champion][job.compId] = (gameState.titles[champion][job.compId] || 0) + 1;
    gameState.history.push({season:job.season,teamId:champion,targetCompId:job.compId,originName:job.name+' · Playoff pelo título'});
  }
  movementMessage(job.season, `${job.name}: ${champion ? gameState.teamMap[champion]?.name + ' campeão. ' : ''}${reason}`);
}
function scheduleTitleRound(job, teams) {
  if (teams.length <= 1) {
    const allowed = teams.length === 1 && (job.rounds.length > 0 || job.config.automatic);
    finishTitleJob(job, allowed ? teams[0] : null, allowed ? (job.rounds.length ? 'Título decidido no playoff.' : 'Título automático.') : 'Título não atribuído: classificados insuficientes.');
    return;
  }
  const remaining = Math.ceil(Math.log2(teams.length));
  const config = job.config.rounds[job.config.rounds.length - remaining];
  const round = {name:config.name,legs:Number(config.legs),ties:[],byes:[]};
  const capacity = 2 ** remaining, byeCount = capacity - teams.length;
  round.byes = teams.slice(0,byeCount);
  const pool = teams.slice(byeCount);
  job.rounds.push(round);
  const firstWeek = Math.max(gameState.currentWeek + 1, ...gameState.fixtures.filter(f=>!f.played && teams.some(id=>id===f.home || id===f.away)).map(f=>f.globalWeek + 1));
  for (let i=0;i<pool.length/2;i++) {
    const a=pool[i], b=pool[pool.length-1-i], tie={a,b,fixtureIds:[]};
    round.ties.push(tie);
    for (let leg=0;leg<round.legs;leg++) {
      const id=`title-${job.compId}-${job.season}-${job.rounds.length}-${i}-${leg}`;
      const fixture={id,titlePlayoffId:job.key,home:round.legs===2 && leg===0 ? b:a,away:round.legs===2 && leg===0 ? a:b,
        compId:`title-${job.compId}-${job.season}`,baseCompId:job.compId,season:job.season,globalWeek:firstWeek+leg,played:false,homeScore:null,awayScore:null};
      tie.fixtureIds.push(id);gameState.fixtures.push(fixture);
    }
  }
}
function resolveTitleFixture(fixture, homeScore=fixture.homeScore, awayScore=fixture.awayScore) {
  if (!fixture.titlePlayoffId) return;
  const job=gameState.titlePlayoffs?.[fixture.titlePlayoffId];
  const tie=job?.rounds.flatMap(r=>r.ties).find(t=>t.fixtureIds.includes(fixture.id));
  if (!tie || tie.winner) return;
  const matches=tie.fixtureIds.map(id=>gameState.fixtures.find(f=>f.id===id));
  if (matches.some(f=>!f || (f.id!==fixture.id && !f.played))) return;
  let a=0,b=0;
  for (const f of matches) {
    const h=f.id===fixture.id?homeScore:f.homeScore, v=f.id===fixture.id?awayScore:f.awayScore;
    a+=f.home===tie.a?h:v;b+=f.home===tie.b?h:v;
  }
  if (a===b) {
    const last=matches[matches.length-1];
    resolveMixedPlayoffWinner(last,0,0);
    tie.winner=last.playoffWinner;
  } else tie.winner=a>b?tie.a:tie.b;
}
function processTitlePlayoffs() {
  gameState.titlePlayoffs ||= {};
  const seasons=new Set(Object.keys(gameState.completedDivisionSeasons || {}).map(key=>JSON.parse(key)[1]));
  for (const comp of titleRules()) for (const season of seasons) {
    const key=movementKey(comp.id,season);
    if (gameState.titlePlayoffs[key]) continue;
    // Finish the host's regular season as well, keeping rosters and years stable.
    if (!gameState.completedDivisionSeasons?.[key]) continue;
    const config=titleConfig(comp), results=config.sources.map(s=>titleSourceResult(comp,s,season));
    if (results.some(r=>r===null)) continue;
    const teams=[], qualifications=[];
    config.sources.forEach((source,i)=>{
      const rank=results[i].filter(id=>gameState.teamMap[id]);
      const selected=source.passDown ? rank.find(id=>!teams.includes(id)) : rank[0];
      const accepted=selected && !teams.includes(selected);
      if (accepted) teams.push(selected);
      qualifications.push({source:source.id,teamId:accepted?selected:null,passed:accepted && selected!==rank[0]});
    });
    const job=gameState.titlePlayoffs[key]={key,compId:comp.id,name:comp.name,countryId:comp.countryId,season,config,teams,qualifications,rounds:[],complete:false};
    scheduleTitleRound(job,teams);
  }
  for (const job of Object.values(gameState.titlePlayoffs)) {
    if (job.complete) continue;
    const round=job.rounds[job.rounds.length-1];
    const fixtures=round.ties.flatMap(t=>t.fixtureIds.map(id=>gameState.fixtures.find(f=>f.id===id)));
    if (fixtures.some(f=>!f?.played)) continue;
    fixtures.forEach(f=>resolveTitleFixture(f));
    const winners=[...round.byes,...round.ties.map(t=>t.winner)].sort((a,b)=>job.teams.indexOf(a)-job.teams.indexOf(b));
    scheduleTitleRound(job,winners);
  }
  for (const season of seasons) applyReadySquadProgression(season);
}
function renderTitlePanel(compId,season) {
  const comp=gameState.compMap[compId];
  if (!titleConfig(comp).enabled) return '';
  const job=gameState.titlePlayoffs?.[movementKey(compId,season)];
  const name=id=>escapeEditorValue(gameState.teamMap[id]?.name || id || 'Vaga não utilizada');
  const sources=titleSources(comp);
  const pending=titleConfig(comp).sources.map(s=>`<p>${escapeEditorValue(sources.find(o=>o.id===s.id)?.name || s.id)} · ${titleSourceResult(comp,s,season)===null?'Aguardando resultado':'Resultado definido'} · ${s.passDown?'Com repasse':'Sem repasse'}</p>`).join('');
  return `<section class="movement-panel"><h3>Playoff pelo título</h3>${!job?pending+'<p>Aguardando o fim das origens e da temporada regular.</p>':`<p>${job.complete?(job.champion?name(job.champion)+' campeão — ':'')+escapeEditorValue(job.reason):'Disputa em andamento'}</p>${job.qualifications.map(q=>`<p>${escapeEditorValue(sources.find(o=>o.id===q.source)?.name || q.source)} → ${name(q.teamId)}${q.passed?' (repasse)':''}</p>`).join('')}${job.rounds.map(r=>`<div class="playoff-card"><strong>${escapeEditorValue(r.name)} · ${r.legs===2?'Ida e volta':'Jogo único'}</strong>${r.byes.length?'<p>Folga: '+r.byes.map(name).join(', ')+'</p>':''}${r.ties.flatMap(t=>t.fixtureIds.map(id=>{const f=gameState.fixtures.find(f=>f.id===id);return `<p>${name(f.home)} ${f.played?f.homeScore+' × '+f.awayScore:'×'} ${name(f.away)}${f.penaltyHome!==undefined?' · Pênaltis '+f.penaltyHome+'–'+f.penaltyAway:''} · Semana ${f.globalWeek+1}</p>`})).join('')}</div>`).join('')}`}</section>`;
}
