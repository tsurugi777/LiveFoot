function removeClubPlayer(teamId,playerId) {
  if(teamId===gameState.playerTeamId){gameState.mySquad=gameState.mySquad.filter(p=>p.id!==playerId);gameState.teamMap[teamId].generatedSquad=gameState.mySquad;gameState.myLineup.starters=gameState.myLineup.starters.map(id=>id===playerId?null:id);gameState.myLineup.bench=gameState.myLineup.bench.filter(id=>id!==playerId);}
  else gameState.teamMap[teamId].generatedSquad=clubSquad(teamId).filter(p=>p.id!==playerId);
}
function executeClubTransfer(playerId,fromId,toId,fee,isLoan=false) {
  if(fromId===toId || !gameState.teamMap[fromId] || !gameState.teamMap[toId])return false;
  if(liveMatch && [fromId,toId].includes(gameState.playerTeamId))return false;
  const seller=gameState.teamMap[fromId],buyer=gameState.teamMap[toId],p=clubSquad(fromId).find(p=>p.id===playerId);
  if(!p || p.isLoan || p.isLoanedOut || !Number.isFinite(fee) || fee<0 || Number(buyer.budget ?? 15)<fee || clubSquad(toId).some(x=>x.id===playerId))return false;
  ensurePlayerLifecycle(p);
  archiveCareer(p,fromId,playerSeason(fromId));
  seller.budget=(Number(seller.budget ?? 15)+fee).toFixed(2);buyer.budget=(Number(buyer.budget ?? 15)-fee).toFixed(2);
  removeClubPlayer(fromId,playerId);clubSquad(toId).push(p);
  p.careerTeamId=toId;p.careerSeason=playerSeason(toId);p.listed=false;p.listedForLoan=false;p.isLoan=isLoan;p.isLoanedOut=false;
  if(isLoan){p.originalTeamId=fromId;p.loanEndSeason=playerSeason(toId);}else {delete p.originalTeamId;delete p.loanEndSeason;setContract(p,3);}
  refreshTeamRating(fromId);refreshTeamRating(toId);
  (gameState.transferHistory ||= []).push({week:gameState.currentWeek,season:p.careerSeason,playerId,playerName:p.name,fromId,toId,fee,isLoan});
  gameState.inbox=(gameState.inbox || []).filter(m=>m.playerId!==playerId);
  return true;
}
function createHumanOffer(buyer,player,isLoan=false) {
  if(!buyer || buyer.id===gameState.playerTeamId || !player || player.isLoan || player.isLoanedOut || (gameState.inbox || []).some(m=>m.playerId===player.id && ['buy','loan'].includes(m.type)))return false;
  const fee=isLoan?0.1:Math.max(0.1,Number(player.value || 0.5)*(0.85+Math.random()*0.4));
  if(Number(buyer.budget ?? 15)<fee || clubSquad(buyer.id).length>=32)return false;
  (gameState.inbox ||= []).push({id:'offer-'+gameState.currentWeek+'-'+buyer.id+'-'+player.id,playerId:player.id,playerName:player.name,buyerTeamId:buyer.id,buyerName:buyer.name,type:isLoan?'loan':'buy',fee:Number(fee.toFixed(2)),offer:fee.toFixed(2)});
  return true;
}
function simulateAIMarket() {
  const teams=Object.values(gameState.teamMap).filter(t=>t.id!==gameState.playerTeamId && !t.isHumanManaged);
  for(const t of teams)clubSquad(t.id);
  let deals=0;
  for(const buyer of teams){
    if(deals>=3 || clubSquad(buyer.id).length>=30 || Math.random()>0.08)continue;
    const sellers=teams.filter(t=>t.id!==buyer.id && clubSquad(t.id).filter(p=>!p.isLoanedOut).length>20);
    if(!sellers.length)continue;
    const seller=sellers[Math.floor(Math.random()*sellers.length)];
    const candidates=clubSquad(seller.id).filter(p=>!p.isLoan && !p.isLoanedOut && !isNaturalGoalkeeper(p)).sort((a,b)=>a.ovr-b.ovr);
    const p=candidates[Math.floor(Math.random()*Math.min(8,candidates.length))];if(!p)continue;
    const loan=p.listedForLoan || (p.age<25 && Math.random()<0.5);
    const fee=loan?0.1:Math.max(0.1,Number(p.value || 0.5)*(0.8+Math.random()*0.4));
    if(executeClubTransfer(p.id,seller.id,buyer.id,Number(fee.toFixed(2)),loan))deals++;
  }
  const candidates=gameState.mySquad.filter(p=>!p.isLoan && !p.isLoanedOut);
  const listed=candidates.filter(p=>p.listed || p.listedForLoan);
  if(teams.length && candidates.length && Math.random()<(listed.length?0.65:0.2)){
    const pool=listed.length?listed:candidates,p=pool[Math.floor(Math.random()*pool.length)];
    const buyers=teams.filter(t=>Number(t.budget ?? 15)>=(p.listedForLoan?0.1:Number(p.value || 0.5)));
    if(buyers.length)createHumanOffer(buyers[Math.floor(Math.random()*buyers.length)],p,!!p.listedForLoan);
  }
}
function processTransfer(player,fromTeam,price,isLoan) {
  if(executeClubTransfer(player.id,fromTeam.id,gameState.playerTeamId,isLoan?0.2:price,isLoan))showModal(isLoan?'Empréstimo aceito':'Contratado',`${player.name} se apresentou ao clube${isLoan?' e retornará ao dono ao fim da temporada':''}.`);
  else showModal('Transferência não realizada','Verifique o orçamento e a disponibilidade do jogador. Negociações do seu clube aguardam o fim de uma partida em andamento.');
  renderClassicHub();
}
function acceptOffer(msgId) {
  const msg=gameState.inbox?.find(m=>m.id===msgId);if(!msg || !['buy','loan'].includes(msg.type))return;
  if(executeClubTransfer(msg.playerId,gameState.playerTeamId,msg.buyerTeamId,Number(msg.fee),msg.type==='loan')){
    if(gameState.selectedPlayerId===msg.playerId)gameState.selectedPlayerId=null;
    showModal('Negócio concluído',`${msg.playerName} foi para ${msg.buyerName}${msg.type==='loan'?' por empréstimo até o fim da temporada':''}.`);
  }else showModal('Oferta indisponível','O comprador precisa ter orçamento e a proposta deve indicar um clube válido. Durante uma partida, aguarde o encerramento para negociar.');
  renderClassicHub();
}
function attemptBuyPlayer(playerId, fromTeamId) {
    if (fromTeamId === gameState.playerTeamId) return;
    const team = gameState.teamMap[fromTeamId];
    if (!team.generatedSquad) team.generatedSquad = generateSquad(fromTeamId, team.rating);
    const player = team.generatedSquad.find(p => p.id === playerId);

    const price = parseFloat(player.value) * (1.2 + Math.random() * 0.5);

    showActionModal(
        'Negociação (Comprar ou Emprestar)',
        `Clube Dono: ${team.name}\nJogador: ${player.name} (${player.pos.split('/')[0]} - OVR ${player.ovr})\nValor Estimado: ${price.toFixed(1)}M\n\nO que deseja propor à diretoria?`,
        `Comprar (${price.toFixed(1)}M)`,
        () => { processTransfer(player, team, price, false); },
        `Pedir Empréstimo`,
        () => { processTransfer(player, team, 0, true); }
    );
}

function rejectOffer(msgId) {
    gameState.inbox = gameState.inbox.filter(m => m.id !== msgId);
    renderClassicHub();
}

function cancelList(playerId) {
    const p = gameState.mySquad.find(x => x.id === playerId);
    if(p) { p.listed = false; p.listedForLoan = false; renderClassicHub(); }
}

function pendingTransferOffers(){return (gameState.inbox || []).filter(m=>['buy','loan'].includes(m.type));}
function updateOfferNotification(){
 const agenda=document.getElementById('nav-btn-agenda');
 if(agenda){let notice=agenda.querySelector('.contract-count');if(!notice){notice=document.createElement('span');notice.className='offer-count contract-count';notice.setAttribute('aria-live','polite');agenda.appendChild(notice);}const count=(gameState.inbox || []).filter(m=>m.type==='contract').length;notice.textContent=String(count);notice.hidden=!count;}

 const button=document.getElementById('nav-btn-market');if(!button)return;
 let badge=button.querySelector('.offer-count');const count=pendingTransferOffers().length;
 if(!badge){badge=document.createElement('span');badge.className='offer-count';badge.setAttribute('aria-live','polite');button.appendChild(badge);}
 badge.textContent=String(count);badge.hidden=count===0;
 button.setAttribute('aria-label',count?`Negociações, ${count} propostas pendentes`:'Negociações');
}
function renderPendingOffers(){
 const offers=pendingTransferOffers();if(!offers.length)return '';
 return `<section class="pending-offers"><h3>Propostas recebidas <span class="offer-count">${offers.length}</span></h3>${offers.map((m,i)=>`<article><div><strong>${escapeEditorValue(m.playerName)}</strong><p>${escapeEditorValue(m.buyerName || 'Clube interessado')} · ${m.type==='loan'?'Empréstimo':'Compra'} · ${escapeEditorValue(m.offer)} M</p></div><div><button type="button" class="primary-button" onclick="acceptOffer(pendingTransferOffers()[${i}].id)">Aceitar</button><button type="button" class="secondary-button" onclick="rejectOffer(pendingTransferOffers()[${i}].id)">Recusar</button></div></article>`).join('')}</section>`;
}
