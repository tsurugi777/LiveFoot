function cpuTactics(teamId){
 const team=gameState.teamMap[teamId];if(!team)return {formation:'4-4-2',style:'Equilibrado',slots:[],starters:[]};
 const fixed=liveMatch?.fixture?.cpuTactics?.[teamId];if(fixed)return fixed;
 const squad=clubSquad(teamId).filter(p=>!p.isLoanedOut),signature=squad.map(p=>[p.id,p.pos,p.ovr,Math.round(p.energy ?? 100)].join(':')).join('|');
 if(team.cpuTactics?.signature===signature)return team.cpuTactics;
 let best=null;
 for(const [formation,slots] of Object.entries(formationsDB)){
  const starters=assignCpuSlots(slots,squad);let score=0;
  slots.forEach((slot,i)=>{const p=squad.find(p=>p.id===starters[i]);if(p)score+=energyRating(p)+getPositionPenalty(p.pos,slot.role);});
  if(!best || score>best.score)best={formation,slots,starters,score,signature};
 }
 const players=best.starters.map(id=>squad.find(p=>p.id===id)).filter(Boolean);
 const avg=roles=>{const list=players.filter(p=>p.pos.split('/').some(r=>roles.includes(r)));return list.length?list.reduce((n,p)=>n+energyRating(p),0)/list.length:0;};
 const attack=avg(['CA','PTE','PTD','MAT']),defense=avg(['ZC','LD','LE','VOL']),mid=avg(['MLG','MLE','MLD','MAT']);
 best.style=attack>defense+5?'Ofensivo':defense>attack+5?(players.some(p=>p.strengths?.includes('Velocidade'))?'Contra-ataque':'Defensivo'):mid>Math.max(attack,defense)+2?'Posse de bola':'Equilibrado';
 team.playingStyle=best.style;team.formation=best.formation;team.cpuTactics=best;return best;
}
function captureCpuTactics(fixture){fixture.cpuTactics ||= {};for(const id of [fixture.home,fixture.away])if(id && id!==gameState.playerTeamId)fixture.cpuTactics[id]=JSON.parse(JSON.stringify(cpuTactics(id)));}
function validateHumanLineup(notify=true){
 const starters=gameState.myLineup.starters || [],expelled=liveMatch?.sentOffSlots || [];
 const missing=Array.from({length:11},(_,i)=>i).filter(i=>!expelled.includes(i) && (!starters[i] || !gameState.mySquad.some(p=>p.id===starters[i] && !p.isLoanedOut)));
 const filled=starters.filter(Boolean),duplicates=new Set(filled).size!==filled.length;
 if(!missing.length && !duplicates)return true;
 if(notify){switchView('lineup');showModal('Complete a escalação',duplicates?'Há jogadores repetidos entre os titulares.':`Preencha as ${missing.length} vagas vazias entre os titulares para continuar.`);}return false;
}
function showCpuLineup(teamId){
 const t=gameState.teamMap[teamId];if(!t || teamId===gameState.playerTeamId)return;
 const plan=cpuTactics(teamId),squad=clubSquad(teamId);
 showModal('Escalação · '+t.name,'');
 document.getElementById('modal-text').innerHTML=`<p class="cpu-manager">Técnico atual: <strong>${escapeEditorValue(t.managerName || 'Interino')}</strong></p><p><strong>${plan.formation}</strong> · ${plan.style}</p><div class="cpu-lineup-pitch">${plan.slots.map((slot,i)=>{const p=squad.find(p=>p.id===plan.starters[i]);return `<div class="cpu-pitch-player" style="left:${slot.left};top:${slot.top}">${personImage(p?.photoUrl,'cpu-player-photo')}<strong>${slot.role} · ${p?Math.max(1,energyRating(p)+getPositionPenalty(p.pos,slot.role)):'—'}</strong><span>${escapeEditorValue(p?.name || 'Vaga')}</span></div>`;}).join('')}</div><h4>Reservas</h4><p>${squad.filter(p=>!plan.starters.includes(p.id)).map(p=>escapeEditorValue(p.name)+' ('+p.pos+')').join(' · ') || 'Sem reservas'}</p>`;
}
function renderTransferHistory(){
 const rows=[...(gameState.transferHistory || [])].reverse();
 return `<section class="pending-offers"><h3>Histórico de negociações</h3>${rows.length?rows.map(r=>`<article><div><strong>${escapeEditorValue(r.playerName)}</strong><p>${escapeEditorValue(gameState.teamMap[r.fromId]?.name || 'Sem contrato')} → ${escapeEditorValue(gameState.teamMap[r.toId]?.name || 'Sem contrato')}</p><small>${r.season} · Semana ${(r.week || 0)+1} · ${r.kind || (r.isLoan?'Empréstimo':'Compra')} · ${Number(r.fee || 0).toFixed(2)} M</small></div></article>`).join(''):'<p>Nenhuma transferência registrada.</p>'}</section>`;
}
function recordPlayerMove(p,fromId,toId,kind){(gameState.transferHistory ||= []).push({week:gameState.currentWeek,season:playerSeason(toId || fromId),playerId:p.id,playerName:p.name,fromId,toId,fee:0,kind});}

// Rectangular assignment: maximize the strength of all eleven slots together.
function assignCpuSlots(slots,squad){
 const n=slots.length,m=Math.max(n,squad.length),u=Array(n+1).fill(0),v=Array(m+1).fill(0),p=Array(m+1).fill(0),way=Array(m+1).fill(0);
 const cost=(i,j)=>{const player=squad[j-1],role=slots[i-1].role;if(!player || (role==='GO')!==isNaturalGoalkeeper(player))return 1000;return -(energyRating(player)+getPositionPenalty(player.pos,role));};
 for(let i=1;i<=n;i++){
  p[0]=i;let j0=0;const min=Array(m+1).fill(Infinity),used=Array(m+1).fill(false);
  do{used[j0]=true;const i0=p[j0];let delta=Infinity,j1=0;
   for(let j=1;j<=m;j++)if(!used[j]){const cur=cost(i0,j)-u[i0]-v[j];if(cur<min[j]){min[j]=cur;way[j]=j0;}if(min[j]<delta){delta=min[j];j1=j;}}
   for(let j=0;j<=m;j++)if(used[j]){u[p[j]]+=delta;v[j]-=delta;}else min[j]-=delta;
   j0=j1;
  }while(p[j0]);
  do{const j1=way[j0];p[j0]=p[j1];j0=j1;}while(j0);
 }
 const ids=Array(n).fill(null);for(let j=1;j<=m;j++)if(p[j] && cost(p[j],j)<1000)ids[p[j]-1]=squad[j-1].id;return ids;
}
