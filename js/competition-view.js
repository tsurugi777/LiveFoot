const competitionView={country:null,comp:null,season:null,phase:null};
function setCompetitionView(field,value){competitionView[field]=field==='season'?Number(value):value;if(field==='country')competitionView.comp=null;if(['country','comp'].includes(field)){competitionView.season=null;competitionView.phase=null;}if(field==='season')competitionView.phase=null;renderClassicHub();}
function competitionPhases(comp,season){
 const rootId=comp.parentId && comp.parentId!=='NONE'?comp.parentId:comp.id,phases=[];
 const add=p=>phases.push(p);
 if(comp.id===rootId)add({id:'aggregate',name:'Classificação geral',kind:'league',category:'Temporada',table:gameState.globalStandings[season]?.[rootId],zone:'aggregate',compId:rootId,fixtures:[],status:'Tabela anual'});
 const competitions=comp.id===rootId?[comp,...db.competitions.filter(c=>c.parentId===rootId)]:[comp];
 for(const c of competitions)for(const p of c.phases || []){
   const fixtures=gameState.fixtures.filter(f=>f.compId===p.id && f.season===season),table=gameState.standings[p.id+'_'+season];
   let groups=null;if(p.type==='GROUPS' && table){groups={};for(const [id,s] of Object.entries(table))(groups[s.groupId || '1'] ||= []).push(id);}
   add({id:'regular:'+p.id,name:p.name,kind:p.type==='KNOCKOUT'?'knockout':groups?'groups':'league',category:c.id===comp.id?'Fase regular':c.name,table,groups,fixtures,compId:c.id,zone:p.id});
 }
 for(const rule of movementRules().filter(c=>c.id===rootId || movementConfig(c).targetCompId===rootId)){
   const job=gameState.divisionTransitions?.[movementKey(rule.id,season)],config=job?.config || movementConfig(rule);
   if(config.mode==='none')continue;
   const category=config.mode==='promotion'?'Playoff de promoção':config.mode==='mixed'?'Playoff de acesso e permanência':'Playoff de rebaixamento';
   const specs=config.mode==='promotion' && config.promotionPhases?.length?config.promotionPhases:[{name:category,format:config.mode==='mixed'?'knockout':config.mode==='internal'?'league':config.promotionFormat}];
   specs.forEach((spec,i)=>{
     const stage=job?.stageRuns?job.stageRuns[i]:i===0?job:null;
     const ids=stage?.fixtureIds || [],fixtures=ids.map(id=>gameState.fixtures.find(f=>f.id===id)).filter(Boolean);
     const groups=stage?.promotionGroups?Object.fromEntries(stage.promotionGroups.map((g,index)=>[index+1,g])):null;
     add({id:`movement:${rule.id}:${i}`,name:spec.name,category,kind:spec.format || 'league',table:stage?gameState.standings[stage.phaseId+'_'+season]:null,groups,seed:stage?.playoffParticipants || [],fixtures,status:job?.status==='skipped'?'Regra não aplicada':!stage?'Aguardando classificados':undefined,note:job?.error || (job?.applied?'Movimentação entre divisões concluída.':''),winners:movementPhaseWinners(job),winnerLabel:config.mode==='promotion'?'Promovido':'Permanência garantida',qualified:stage?.playoffUp || [],byes:stage?.promotionKnockout?.flatMap(r=>r.byes) || []});
   });
 }
 const host=gameState.compMap[rootId] || comp,config=titleConfig(host),job=gameState.titlePlayoffs?.[movementKey(rootId,season)];
 if(config.enabled){
   const skipped=job?Math.max(0,config.rounds.length-Math.ceil(Math.log2(Math.max(1,job.teams.length)))):0;
   (config.rounds.length?config.rounds:[{name:'Decisão do título'}]).forEach((spec,i)=>{
     const round=job?.rounds?.[i-skipped],fixtures=round?.ties.flatMap(t=>t.fixtureIds.map(id=>gameState.fixtures.find(f=>f.id===id))).filter(Boolean) || [];
     add({winners:job?.complete && job.champion?[job.champion]:[],winnerLabel:'Campeão',id:'title:'+i,name:spec.name,category:'Playoff pelo título',kind:'knockout',fixtures,byes:round?.byes || [],status:job?.complete && !round?'Não disputada':!round?'Aguardando classificados':undefined,note:job?.complete?(job.champion?`${gameState.teamMap[job.champion]?.name || job.champion} campeão. `:'')+job.reason:'',qualified:round?.ties.map(t=>t.winner).filter(Boolean) || []});
   });
 }
 return phases;
}
function phaseStatus(phase){if(phase.status)return phase.status;const games=phase.fixtures || [];return !games.length?'Não iniciada':games.every(f=>f.played)?'Concluída':games.some(f=>f.played)?'Em andamento':'Jogos agendados';}
function phaseClub(id){const t=gameState.teamMap[id];return `<span class="phase-club">${t?.logoUrl?`<img src="${escapeEditorValue(t.logoUrl)}" alt="" onerror="this.style.display='none'">`:'<span class="club-monogram">'+escapeEditorValue(t?.name?.slice(0,1) || '?')+'</span>'}<span>${escapeEditorValue(t?.name || id)}</span></span>`;}
function phaseTable(phase,ids,season){
 const table=phase.table || {},seed=phase.seed || ids;
 const rank=rankMovementTable(Object.fromEntries(ids.map(id=>[id,table[id]])),seed);
 return `<div class="phase-table-scroll"><table class="phase-table"><thead><tr><th>#</th><th>Clube</th><th>PTS</th><th title="Jogos">J</th><th title="Vitórias">V</th><th title="Empates">E</th><th title="Derrotas">D</th><th title="Gols a favor">GP</th><th title="Gols contra">GC</th><th title="Saldo de gols">SG</th></tr></thead><tbody>${rank.map((id,i)=>{const row=table[id];return `<tr class="${phase.winners?.includes(id)?'playoff-winner-row':id===gameState.playerTeamId?'my-club-row':''}"><td>${i+1}</td><td>${phaseClub(id)}${row.competitionPlace?`<span class="winner-badge">${row.competitionPlace===1?'🏆 Campeão':'Vice-campeão'}</span>`:''}${phase.winners?.includes(id)?`<span class="winner-badge">🏆 ${phase.winnerLabel}</span>`:phase.zone?movementZoneBadge(phase.compId,phase.zone,i,rank.length,season):phase.qualified?.includes(id)?'<span class="phase-status">Classificado</span>':''}</td><td><strong>${row.pts || 0}</strong></td>${['played','won','drawn','lost','gf','ga','gd'].map(k=>`<td>${row[k] || 0}</td>`).join('')}</tr>`}).join('')}</tbody></table></div>`;
}
function phaseGames(phase){
 if(!phase.fixtures.length)return '<div class="phase-empty"><i class="fas fa-calendar-alt"></i><h3>Confrontos ainda não definidos</h3><p>Os jogos aparecerão aqui quando os classificados forem conhecidos.</p></div>';
 const weeks=[...new Set(phase.fixtures.map(f=>f.globalWeek))].sort((a,b)=>a-b);
 return weeks.map(week=>`<section class="phase-matchweek"><h4>Semana ${week+1}</h4>${phase.fixtures.filter(f=>f.globalWeek===week).map(f=>`<div class="phase-match"><div class="${phase.winners?.includes(f.home)?'playoff-winner-team':''}">${phaseClub(f.home)}${phase.winners?.includes(f.home)?`<span class="winner-badge">🏆 ${phase.winnerLabel}</span>`:''}</div><div class="phase-score">${f.played?`${f.homeScore} <span>–</span> ${f.awayScore}`:'<span>×</span>'}${f.penaltyHome!==undefined?`<small>Pênaltis ${f.penaltyHome}–${f.penaltyAway}</small>`:''}</div><div class="${phase.winners?.includes(f.away)?'playoff-winner-team':''}">${f.away?phaseClub(f.away):'Classificação direta'}${phase.winners?.includes(f.away)?`<span class="winner-badge">🏆 ${phase.winnerLabel}</span>`:''}</div></div>`).join('')}</section>`).join('');
}
function renderCompetitionCenter(){
 const state=competitionView,initial=gameState.compMap[gameState.playerBaseCompId];
 if(!db.countries.some(c=>c.id===state.country))state.country=initial?.countryId || db.countries[0]?.id;
 const comps=db.competitions.filter(c=>c.countryId===state.country && (!c.parentId || c.parentId==='NONE'));
 if(!comps.some(c=>c.id===state.comp))state.comp=comps.find(c=>c.id===initial?.id)?.id || comps[0]?.id;
 const comp=gameState.compMap[state.comp] || comps[0];
 if(!comp)return '<div class="phase-empty"><h3>Nenhuma competição disponível</h3><p>Adicione uma competição no editor para começar.</p></div>';
 const root=comp.parentId && comp.parentId!=='NONE'?comp.parentId:comp.id;
 const current=gameState.countrySeason[root] || gameState.startYear;
 const seasons=startedCompetitionSeasons(root);
 if(!seasons.includes(state.season))state.season=seasons[0] ?? null;
 const phases=state.season===null?[]:competitionPhases(comp,state.season);
 if(!phases.some(p=>p.id===state.phase))state.phase=phases[0]?.id;
 const phase=phases.find(p=>p.id===state.phase);
 return `<div class="competition-center"><div class="competition-filters"><label>País<select onchange="setCompetitionView('country',this.value)">${db.countries.map(c=>`<option value="${escapeEditorValue(c.id)}" ${state.country===c.id?'selected':''}>${escapeEditorValue(c.name)}</option>`).join('')}</select></label><label>Competição<select onchange="setCompetitionView('comp',this.value)">${comps.map(c=>`<option value="${escapeEditorValue(c.id)}" ${state.comp===c.id?'selected':''}>${escapeEditorValue(c.name)}</option>`).join('')}</select></label><label>Temporada<select ${seasons.length?'':'disabled'} onchange="setCompetitionView('season',this.value)">${!seasons.length?'<option>Ainda não iniciada</option>':''}${seasons.map(s=>`<option ${state.season===s?'selected':''}>${s}</option>`).join('')}</select></label><button class="secondary-button" onclick="showCompetitionRules(competitionView.comp)"><i class="fas fa-info-circle"></i> Regulamento</button></div><div class="competition-banner"><div><span class="eyebrow">ACOMPANHE A TEMPORADA</span><h2>${escapeEditorValue(comp.name)}</h2><p>${state.season ?? 'Temporada ainda não iniciada'} · ${phases.length} fases e classificações</p></div><i class="fas fa-trophy"></i></div><div class="competition-layout"><nav class="phase-navigation" aria-label="Fases da competição"><h3>Fases da competição</h3><label class="phase-mobile-select">Fase<select onchange="setCompetitionView('phase',this.value)">${phases.map(p=>`<option value="${escapeEditorValue(p.id)}" ${p.id===state.phase?'selected':''}>${escapeEditorValue(p.name)} · ${escapeEditorValue(p.category)}</option>`).join('')}</select></label>${phases.map((p,i)=>`<button class="phase-nav ${p.id===state.phase?'selected':''}" aria-current="${p.id===state.phase?'page':'false'}" onclick="setCompetitionView('phase',competitionPhases(gameState.compMap[competitionView.comp],competitionView.season)[${i}].id)"><span>${escapeEditorValue(p.name)}</span><small>${escapeEditorValue(p.category)} · ${phaseStatus(p)}</small></button>`).join('')}</nav><section class="phase-content">${phase?`<header class="phase-header"><div><span class="eyebrow">${escapeEditorValue(phase.category)}</span><h2>${escapeEditorValue(phase.name)}</h2></div><span class="phase-status">${phaseStatus(phase)}</span></header>${phase.winners?.length?`<div class="playoff-winner-banner"><strong>🏆 ${phase.winnerLabel}</strong>${phase.winners.map(phaseClub).join('')}</div>`:''}${phase.note?`<p class="phase-notice">${escapeEditorValue(phase.note)}</p>`:''}${phase.byes?.length?`<p class="phase-notice">Classificação direta nesta etapa: ${[...new Set(phase.byes)].map(id=>escapeEditorValue(gameState.teamMap[id]?.name || id)).join(', ')}</p>`:''}${phase.kind!=='knockout'?(phase.table && Object.keys(phase.table).length?(phase.groups?Object.entries(phase.groups).map(([group,ids])=>`<h3 class="phase-group-title">Grupo ${escapeEditorValue(group)}</h3>${phaseTable(phase,ids,state.season)}`).join(''):phaseTable(phase,Object.keys(phase.table),state.season)):'<div class="phase-empty"><h3>Aguardando classificados</h3><p>A classificação será atualizada assim que esta fase começar.</p></div>'):''}${phase.id!=='aggregate'?`<h3 class="phase-group-title">Jogos da fase</h3>${phaseGames(phase)}`:'<p class="phase-legend">PTS: pontos · J: jogos · V/E/D: vitórias, empates e derrotas · GP/GC: gols a favor e contra · SG: saldo</p>'}`:'<div class="phase-empty">A temporada ainda não foi iniciada.</div>'}</section></div></div>`;
}
const editorOpenSections=new Set();
function enhanceEditorLayout(){
 const container=document.getElementById('editor-content-area');if(!container)return;
 container.querySelectorAll('.movement-editor').forEach(section=>{
   if(section.closest('details'))return;
   const heading=section.querySelector('h4');if(!heading)return;
   const details=document.createElement('details'),summary=document.createElement('summary');details.className='editor-disclosure';summary.textContent=heading.textContent;details.open=editorOpenSections.has(summary.textContent);details.addEventListener('toggle',()=>{if(details.isConnected){if(details.open)editorOpenSections.add(summary.textContent);else editorOpenSections.delete(summary.textContent);}});heading.remove();details.append(summary);section.replaceWith(details);details.append(section);
 });
}

const titleHistoryView={country:null,competition:null};
function competitionTitleCounts(comp){
 const positive=value=>Number.isFinite(Number(value))?Math.max(0,Math.floor(Number(value))):0;
 const recorded={};
 for(const h of gameState.history || [])if(h.targetCompId===comp.id)recorded[h.teamId]=(recorded[h.teamId] || 0)+1;
 const ids=new Set([...Object.keys(comp.initialTitles || {}),...Object.keys(gameState.titles || {}),...Object.keys(recorded)]);
 return [...ids].map(id=>{
   const team=gameState.teamMap[id] || db.teams.find(t=>t.id===id);
   const initial=positive(comp.initialTitles?.[id]),earned=Math.max(positive(gameState.titles?.[id]?.[comp.id]),recorded[id] || 0);
   return {id,team,initial,earned,total:initial+earned};
 }).filter(row=>row.team && row.total>0).sort((a,b)=>b.total-a.total || a.team.name.localeCompare(b.team.name,'pt-BR'));
}
function setTitleHistoryFilter(field,value){titleHistoryView[field]=value;if(field==='country')titleHistoryView.competition=null;renderClassicHub();}
function renderClubTitleHistory(){
 const state=titleHistoryView;
 if(!db.countries.some(c=>c.id===state.country))state.country=gameState.compMap[gameState.playerBaseCompId]?.countryId || db.countries[0]?.id;
 const competitions=db.competitions.filter(c=>c.countryId===state.country).map(comp=>({comp,rows:competitionTitleCounts(comp)})).filter(item=>item.rows.length);
 if(!competitions.some(item=>item.comp.id===state.competition))state.competition=competitions[0]?.comp.id || null;
 const selected=competitions.find(item=>item.comp.id===state.competition);
 const records=(gameState.history || []).filter(h=>h.targetCompId===state.competition).sort((a,b)=>b.season-a.season);
 return `<div class="competition-center"><div class="competition-filters"><label>País<select onchange="setTitleHistoryFilter('country',this.value)">${db.countries.map(c=>`<option value="${escapeEditorValue(c.id)}" ${state.country===c.id?'selected':''}>${escapeEditorValue(c.name)}</option>`).join('')}</select></label><label>Competição com campeões<select ${!competitions.length?'disabled':''} onchange="setTitleHistoryFilter('competition',this.value)">${competitions.length?competitions.map(({comp})=>`<option value="${escapeEditorValue(comp.id)}" ${state.competition===comp.id?'selected':''}>${escapeEditorValue(comp.name)}</option>`).join(''):'<option>Nenhuma competição com campeões</option>'}</select></label></div>${selected?`<div class="competition-banner"><div><span class="eyebrow">GALERIA DE CAMPEÕES</span><h2>${escapeEditorValue(selected.comp.name)}</h2><p>${selected.rows.length} clubes campeões · ${selected.rows.reduce((n,row)=>n+row.total,0)} títulos registrados</p></div><i class="fas fa-trophy"></i></div><section class="phase-content"><header class="phase-header"><h2>Títulos por clube</h2></header><div class="phase-table-scroll"><table class="phase-table"><thead><tr><th>#</th><th>Clube</th><th>Títulos cadastrados</th><th>Na carreira</th><th>Total</th></tr></thead><tbody>${selected.rows.map((row,i)=>`<tr class="${row.id===gameState.playerTeamId?'my-club-row':''}"><td>${i+1}</td><td>${phaseClub(row.id)}</td><td>${row.initial}</td><td>${row.earned}</td><td><strong>${row.total}</strong></td></tr>`).join('')}</tbody></table></div><p class="phase-legend">Total: títulos históricos cadastrados no editor mais conquistas nesta carreira. Apenas clubes com títulos são exibidos.</p></section><section class="phase-content"><header class="phase-header"><h2>Campeões por temporada</h2></header>${records.length?`<div class="phase-table-scroll"><table class="phase-table"><thead><tr><th>Temporada</th><th>Campeão</th><th>Disputa</th></tr></thead><tbody>${records.map(h=>`<tr><td>${escapeEditorValue(h.season)}</td><td>${phaseClub(h.teamId)}</td><td>${escapeEditorValue(h.originName || selected.comp.name)}</td></tr>`).join('')}</tbody></table></div>`:'<div class="phase-empty"><p>Ainda não há campeões por temporada nesta carreira. Os títulos cadastrados estão contabilizados acima.</p></div>'}</section>`:'<div class="phase-empty"><i class="fas fa-trophy"></i><h3>Nenhum campeão registrado neste país</h3><p>Cadastre campeões no editor ou conquiste títulos durante a carreira.</p></div>'}</div>`;
}

function movementPhaseWinners(job){
 if(!job || job.status!=='complete')return [];
 if(job.config.mode==='promotion')return job.playoffUp || [];
 if(job.config.mode==='internal')return (job.upperPlayoff || []).filter(id=>!job.playoffDown?.includes(id));
 if(job.config.mode==='mixed')return (job.fixtureIds || []).map(id=>gameState.fixtures.find(f=>f.id===id)?.playoffWinner).filter(Boolean);
 return [];
}
function startedCompetitionSeasons(root){
 const seasons=new Set();
 for(const [key,week] of Object.entries(gameState.startedCompetitionSeasons || {})){const [id,year]=JSON.parse(key);if(id===root && week<=gameState.currentWeek)seasons.add(Number(year));}
 for(const f of gameState.fixtures)if(f.baseCompId===root && (f.played || f.globalWeek<=gameState.currentWeek))seasons.add(Number(f.season));
 for(const h of gameState.history || [])if(h.targetCompId===root)seasons.add(Number(h.season));
 for(const key of Object.keys(gameState.completedDivisionSeasons || {})){const [id,year]=JSON.parse(key);if(id===root)seasons.add(Number(year));}
 // Old saves may have tables but no explicit season-start record.
 for(const [year,tables] of Object.entries(gameState.globalStandings || {}))if(Object.values(tables[root] || {}).some(row=>row.played>0))seasons.add(Number(year));
 return [...seasons].filter(Number.isFinite).sort((a,b)=>b-a);
}
