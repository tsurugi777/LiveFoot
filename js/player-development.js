function contractDate(p) {
 const parts=String(p.contractEnd || '').split('/').map(Number);
 if(parts.length===3 && parts.every(Number.isFinite))return new Date(parts[2],parts[1]-1,parts[0]);
 const date=new Date(p.contractEnd);return Number.isFinite(date.getTime())?date:null;
}
function setContract(p,years=3) {
 const d=new Date(gameState.currentDate);d.setFullYear(d.getFullYear()+years);
 p.contractEnd=[String(d.getDate()).padStart(2,'0'),String(d.getMonth()+1).padStart(2,'0'),d.getFullYear()].join('/');delete p.contractWarnings;
}
function ensurePlayerLifecycle(p) {if(!contractDate(p))setContract(p);p.energy=Math.max(0,Math.min(100,Number.isFinite(Number(p.energy))?Number(p.energy):100));}
function energyRating(p){return Math.max(1,Number(p.ovr || 50)-Math.round((100-(p.energy ?? 100))*0.12));}
function cpuMatchPlayers(teamId){return cpuTactics(teamId).starters.map(id=>clubSquad(teamId).find(p=>p.id===id)).filter(Boolean);}
function refreshTeamRating(teamId){const t=gameState.teamMap[teamId],s=clubSquad(teamId,false).filter(p=>!p.isLoanedOut).sort((a,b)=>b.ovr-a.ovr).slice(0,11);if(t && s.length)t.rating=Math.round(s.reduce((n,p)=>n+Number(p.ovr),0)/s.length);}
function fatiguePlayers(players,minutes){for(const p of players){ensurePlayerLifecycle(p);p.energy=Math.max(0,Math.round((p.energy-minutes*(isNaturalGoalkeeper(p)?0.12:0.32))*10)/10);}}
function progressPerformance(p,teamId){
 const ratings=p.sRatings || [],games=ratings.length;
 if(games<5 || games%5 || p.lastDevelopmentGames===games)return;
 p.lastDevelopmentGames=games;const avg=ratings.slice(-5).reduce((n,v)=>n+v,0)/5;
 const delta=avg>=7.5?1:avg<5.8?-1:0;p.ovr=Math.max(30,Math.min(99,Number(p.ovr)+delta));refreshTeamRating(teamId);
}
function renewPlayerContract(p){
 if(!p || liveMatch || (p.isLoan && p.originalTeamId!==gameState.playerTeamId))return false;
 const old=contractDate(p),now=new Date(gameState.currentDate),d=old && old>now?old:now;d.setFullYear(d.getFullYear()+1);
 p.contractEnd=[String(d.getDate()).padStart(2,'0'),String(d.getMonth()+1).padStart(2,'0'),d.getFullYear()].join('/');
 p.salary=(Math.round((parseFloat(p.salary)||0)*1.1*100)/100)+' mil';delete p.contractWarnings;
 gameState.inbox=gameState.inbox.filter(m=>!(m.type==='contract' && m.playerId===p.id));return true;
}
function processPlayerWeek(){
 gameState.inbox ||= [];
 if(gameState.lastPlayerLifecycleWeek===gameState.currentWeek)return;gameState.lastPlayerLifecycleWeek=gameState.currentWeek;
 for(const team of Object.values(gameState.teamMap)){
  let wages=0;
  for(const p of [...clubSquad(team.id,false)]){
   ensurePlayerLifecycle(p);p.energy=Math.min(100,Math.round((p.energy+20)*10)/10);
   wages+=(parseFloat(p.salary)||0)/1000/4.345;
   const days=Math.ceil((contractDate(p)-gameState.currentDate)/86400000),owner=p.originalTeamId || team.id;
   if(owner===gameState.playerTeamId && days>0 && days<=90){
    const band=days<=30?30:90;p.contractWarnings ||= [];
    if(!p.contractWarnings.includes(band)){p.contractWarnings.push(band);gameState.inbox.push({id:'contract-'+p.id+'-'+p.contractEnd+'-'+band,type:'contract',playerId:p.id,playerName:p.name,text:`O contrato de ${p.name} vence em ${days} dias (${p.contractEnd}). Renove no perfil do jogador.`});}
   }
   if(days<=0){
    const ratings=p.sRatings?.length?p.sRatings:[];const average=ratings.length?ratings.reduce((n,v)=>n+v,0)/ratings.length:(p.careerStats?.at(-1)?.rating ?? 7);
    if(owner!==gameState.playerTeamId && (ratings.length<5 && !p.careerStats?.length || average>=6.2)){setContract(p,2);continue;}
    recordPlayerMove(p,team.id,null,'Fim de contrato');
    archiveCareer(p,team.id,playerSeason(team.id));removeClubPlayer(team.id,p.id);p.isLoan=false;delete p.originalTeamId;delete p.loanEndSeason;p.careerTeamId=null;p.listed=false;p.listedForLoan=false;
    (gameState.freeAgents ||= []).push(p);gameState.inbox=gameState.inbox.filter(m=>m.playerId!==p.id);
    if(owner===gameState.playerTeamId)gameState.inbox.push({id:'expired-'+p.id+'-'+gameState.currentWeek,type:'contract',text:`${p.name} deixou o clube ao fim do contrato e está livre no mercado.`});
   }
  }
  let payrollSeason=playerSeason(team.id);while(Object.hasOwn(gameState.payrollPaid || {},movementKey(team.id,payrollSeason)))payrollSeason++;const payrollKey=movementKey(team.id,payrollSeason);gameState.payrollAccrued ||= {};gameState.payrollAccrued[payrollKey]=(gameState.payrollAccrued[payrollKey] || 0)+wages;refreshTeamRating(team.id);
 }
}
function trainingCost(p){return Math.round((0.5+(p.totalTrainings || 0)*0.5)*100)/100;}
function trainingOptions(p){if((p.learnedStrengths?.length ?? Math.max(0,(p.totalTrainings || 0)-(p.learnedPositions || []).length))>=2)return [];return [...new Set([...(p.weaknesses || []),...(isNaturalGoalkeeper(p)?['Reflexos','Posicionamento','Saída de Bola']:['Finalização','Passe Curto','Desarme','Velocidade','Cabeceio','Visão de Jogo'])])].filter(s=>!p.strengths?.includes(s));}
function openPlayerTraining(p){
 if(liveMatch){showModal('Treino indisponível','Aguarde o fim da partida.');return;}
 const options=trainingOptions(p),positions=positionTrainingOptions(p);showModal('Treinamento','Escolha o que deseja aprender.');
 const box=document.getElementById('modal-text');if(!options.length && !positions.length){box.innerText="Limites de aprendizado atingidos: duas posições e dois pontos fortes.";return;}
 box.innerHTML=`<p>Treino: <strong>${trainingCost(p).toFixed(2)} M</strong>. O próximo treino ficará mais caro.</p><select id="training-focus">${options.map(s=>`<option value="${escapeEditorValue(s)}">Ponto forte: ${escapeEditorValue(s)}</option>`).join('')}${positions.map(s=>`<option value="position:${s}">Posição: ${s}</option>`).join('')}</select><button class="primary-button" id="confirm-training">Treinar</button>`;
 document.getElementById('confirm-training').onclick=()=>applyTraining(p,trainingCost(p),document.getElementById('training-focus').value);
}
function trainPlayer(p,focus){
 if(focus.startsWith('position:'))return trainPosition(p,focus.slice(9));
 const team=gameState.teamMap[gameState.playerTeamId],cost=trainingCost(p);
 if(liveMatch || !gameState.mySquad.includes(p) || p.isLoan || !trainingOptions(p).includes(focus) || Number(team.budget)<cost)return false;
 team.budget=(Number(team.budget)-cost).toFixed(2);(p.strengths ||= []).push(focus);(p.learnedStrengths ||= Array(Math.max(0,(p.totalTrainings || 0)-(p.learnedPositions || []).length)).fill('Treino anterior')).push(focus);p.weaknesses=(p.weaknesses || []).filter(s=>s!==focus);p.totalTrainings=(p.totalTrainings || 0)+1;p.trainingsThisSeason=(p.trainingsThisSeason || 0)+1;p.ovr=Math.min(99,Number(p.ovr)+1);fatiguePlayers([p],20);refreshTeamRating(team.id);return true;
}
function selectedProfilePlayer(){return clubSquad(gameState.profileTeamId || gameState.playerTeamId,false).find(p=>p.id===gameState.selectedPlayerId);}
function openMarketPlayer(playerId,teamId){gameState.profileTeamId=teamId;gameState.selectedPlayerId=playerId;renderClassicHub();selectPlayer(playerId,teamId);}
function signFreeAgent(index){const p=gameState.freeAgents?.[index];if(!p || liveMatch || gameState.mySquad.length>=32)return;setContract(p);p.careerTeamId=gameState.playerTeamId;p.careerSeason=playerSeason(gameState.playerTeamId);recordPlayerMove(p,null,gameState.playerTeamId,'Contratação livre');gameState.mySquad.push(p);gameState.freeAgents.splice(index,1);if(gameState.profileTeamId==='__free__')gameState.profileTeamId=gameState.playerTeamId;refreshTeamRating(gameState.playerTeamId);renderClassicHub();}
function renderFreeAgents(){return !(gameState.freeAgents || []).length?'':`<section class="pending-offers"><h3>Jogadores sem contrato</h3>${gameState.freeAgents.map((p,i)=>`<article><span>${escapeEditorValue(p.name)} · ${p.pos} · OVR ${p.ovr} · Salário ${escapeEditorValue(p.salary)}</span><button class="secondary-button" onclick="signFreeAgent(${i})">Contratar sem taxa</button></article>`).join('')}</section>`;}

function renewContractNotice(index){const msg=gameState.inbox[index];if(!msg || msg.type!=='contract' || !msg.playerId)return;const p=Object.keys(gameState.teamMap).flatMap(id=>clubSquad(id,false)).find(p=>p.id===msg.playerId);if(p && (gameState.mySquad.includes(p) || p.originalTeamId===gameState.playerTeamId) && renewPlayerContract(p)){showModal('Contrato renovado',`${p.name}: contrato até ${p.contractEnd}.`);renderClassicHub();}}
function signFreeAgentById(id){const index=(gameState.freeAgents || []).findIndex(p=>p.id===id);if(index>=0)signFreeAgent(index);}
function playerSquadNotices(p){
 const offers=pendingTransferOffers().filter(m=>m.playerId===p.id);
 const date=contractDate(p),days=date?Math.ceil((date-new Date(gameState.currentDate))/86400000):Infinity;
 const contract=days<=90?`<span class="squad-notice contract-notice" title="Contrato até ${escapeEditorValue(p.contractEnd)}">${days<=0?'Contrato vencido':'Contrato: '+days+' dias'}</span>`:'';
 return contract+(offers.length?`<span class="squad-notice offer-notice" title="${escapeEditorValue(offers.map(m=>(m.buyerName || 'Clube interessado')+': '+(m.type==='loan'?'Empréstimo':'Compra')).join(' · '))}">${offers.length} proposta${offers.length>1?'s':''} · ${[...new Set(offers.map(m=>m.type==='loan'?'Empréstimo':'Compra'))].join(' / ')}</span>`:'');
}
function positionTrainingOptions(p){if((p.learnedPositions || []).length>=2)return [];return ['GO','ZC','LD','LE','VOL','MLG','MLE','MLD','MAT','PTE','PTD','CA'].filter(pos=>!p.pos.split('/').includes(pos));}
function trainPosition(p,pos){const team=gameState.teamMap[gameState.playerTeamId],cost=trainingCost(p);if(liveMatch || !gameState.mySquad.includes(p) || p.isLoan || !positionTrainingOptions(p).includes(pos) || Number(team.budget)<cost)return false;team.budget=(Number(team.budget)-cost).toFixed(2);p.pos+='/'+pos;(p.learnedPositions ||= []).push(pos);p.totalTrainings=(p.totalTrainings || 0)+1;fatiguePlayers([p],20);return true;}
function energyClass(value){const energy=Number(value ?? 100);return energy<40?'energy-low':energy<70?'energy-medium':'energy-high';}
function paySeasonPayroll(teamId,season){
 const key=movementKey(teamId,season);gameState.payrollPaid ||= {};if(Object.hasOwn(gameState.payrollPaid,key))return;
 const amount=Number(gameState.payrollAccrued?.[key] || 0),team=gameState.teamMap[teamId];if(!team)return;
 team.budget=(Number(team.budget ?? 15)-amount).toFixed(2);gameState.payrollPaid[key]=amount;
 if(teamId===gameState.playerTeamId && amount>0)(gameState.inbox ||= []).push({id:'payroll-'+season,type:'finance',playerName:'Folha salarial',offer:`Pagamento ao final da temporada ${season}: ${amount.toFixed(2)} M.`});
}
