let sofaImportDraft=null;
function openSofascoreImport(){
 sofaImportDraft=null;showModal('Importar time do Sofascore','');
 document.getElementById('modal-text').innerHTML=`<form id="sofa-import-form"><label>Link do time<input id="sofa-url" type="url" required placeholder="https://www.sofascore.com/pt/football/team/palmeiras/1963" style="width:100%;padding:10px"></label><button class="primary-button" type="submit">Buscar time</button><p id="sofa-status" role="status"></p><div id="sofa-preview"></div></form>`;
 document.getElementById('sofa-import-form').onsubmit=async event=>{event.preventDefault();await fetchSofascoreDraft();};
}
async function fetchSofascoreDraft(){
 const form=document.getElementById('sofa-import-form'),status=document.getElementById('sofa-status'),preview=document.getElementById('sofa-preview');
 if(form.dataset.loading==='true')return;form.dataset.loading='true';
 const url=document.getElementById('sofa-url').value.trim();sofaImportDraft=null;preview.innerHTML='';status.textContent='Consultando time e elenco…';form.querySelector('button').disabled=true;
 try{
  const data=await requestSofascoreImport(url);
  if(!data.team?.name || !data.players?.length)throw Error('Time ou elenco indisponível.');
  if(!form.isConnected)return;sofaImportDraft=data;status.textContent='Confira o time antes de importar.';
  const comps=db.competitions.filter(c=>!c.parentId || c.parentId==='NONE');
  preview.innerHTML=`<h3>${escapeEditorValue(data.team.name)}</h3><p>${escapeEditorValue(data.team.country)} · Técnico: ${escapeEditorValue(data.team.managerName || 'Não informado')} · ${data.players.length} jogadores</p><label>Competição de destino<select id="sofa-destination"><option value="">Criar liga no país do time</option>${comps.map(c=>`<option value="${escapeEditorValue(c.id)}">${escapeEditorValue(db.countries.find(x=>x.id===c.countryId)?.name || '')} — ${escapeEditorValue(c.name)}</option>`).join('')}</select></label><label>Overall inicial<input id="sofa-rating" type="number" min="30" max="99" value="70"></label><p>Overall, salário (20 mil/mês) e orçamento (15 M) são valores iniciais do jogo. Posições gerais serão convertidas para GO, ZC, MLG e CA; revise os detalhes no editor.</p><p>${data.players.map(p=>escapeEditorValue(p.name)).join(' · ')}</p><p>Se este time já foi importado, o cadastro e o elenco serão atualizados. A carreira em andamento será preservada.</p><button id="sofa-confirm" class="primary-button" type="button">Confirmar importação</button>`;
  document.getElementById('sofa-confirm').onclick=confirmSofascoreImport;
 }catch(e){if(form.isConnected)status.textContent=e.name==='TimeoutError'?'A consulta demorou demais. Tente novamente.':e.message;}finally{form.dataset.loading='false';if(form.isConnected)form.querySelector('button').disabled=false;}
}
function sofaDate(timestamp){return Number.isFinite(timestamp)?new Date(timestamp*1000).toLocaleDateString('pt-BR',{timeZone:'UTC'}):null;}
function mapSofaPlayers(players,rating,now=new Date()){
 return players.map(p=>{const birthday=Number.isFinite(p.dateOfBirthTimestamp)?new Date(p.dateOfBirthTimestamp*1000):null;let age=birthday?now.getUTCFullYear()-birthday.getUTCFullYear():20;if(birthday && (now.getUTCMonth()<birthday.getUTCMonth() || now.getUTCMonth()===birthday.getUTCMonth() && now.getUTCDate()<birthday.getUTCDate()))age--;
 return {id:'sofa-player-'+p.id,name:p.name,pos:({G:'GO',D:'ZC',M:'MLG',F:'CA'})[p.position] || 'MLG',ovr:rating,energy:100,age:Math.max(15,Math.min(60,age)),leg:p.preferredFoot==='Left'?'E':p.preferredFoot==='Both'?'A':'D',nationality:p.country || 'Desconhecido',photoUrl:personPhoto(p.photoUrl),contractEnd:sofaDate(p.contractUntilTimestamp),salary:'20 mil',value:1,strengths:[],weaknesses:[],sofascoreId:p.id};});
}
function commitSofascoreTeam(data,compId,rating){
 if(!data?.team?.id || !data.players?.length || !Number.isFinite(rating) || rating<30 || rating>99)throw Error('Informe um overall entre 30 e 99.');
 let comp=db.competitions.find(c=>c.id===compId && (!c.parentId || c.parentId==='NONE'));
 if(compId && !comp)throw Error('Escolha uma competição base válida.');
 const id='sofa-team-'+data.team.id,existing=db.teams.find(t=>t.id===id || t.sofascoreId===data.team.id);
 if(!comp && existing)comp=db.competitions.find(c=>c.id===existing.compId);
 if(!comp){
  const name=data.team.country || 'País não informado';let country=db.countries.find(c=>c.name.toLowerCase()===name.toLowerCase());
  if(!country){country={id:'sofa-country-'+data.team.id,name,flag:'🏳️',divisions:[{id:'sofa-division-'+data.team.id,name:'Primeira divisão'}]};db.countries.push(country);}
  comp=db.competitions.find(c=>c.countryId===country.id && (!c.parentId || c.parentId==='NONE'));
  if(!comp){comp={id:'sofa-league-'+data.team.id,countryId:country.id,divisionId:country.divisions?.[0]?.id,name:'Liga '+name,parentId:'NONE',startYear:new Date().getFullYear(),startMonth:1,phases:[{id:'sofa-phase-'+data.team.id,name:'Liga',type:'LEAGUE',rounds:2,awardsTitle:true,countsToAggregatedTable:true}]};db.competitions.push(comp);}
 }
 const team={...(existing || {}),id:existing?.id || id,sofascoreId:data.team.id,name:data.team.name,countryId:comp.countryId,country:db.countries.find(c=>c.id===comp.countryId)?.name,compId:comp.id,divisionId:comp.divisionId,rating,color:existing?.color || '#087f79',budget:existing?.budget ?? 15,logoUrl:data.team.logoUrl,managerName:data.team.managerName || 'Interino',stadium:data.team.stadium || '',stadiumCapacity:data.team.stadiumCapacity || 10000,importedPlayers:mapSofaPlayers(data.players,rating)};
 if(existing)db.teams[db.teams.indexOf(existing)]=team;else db.teams.push(team);
 normalizeDivisions();return team;
}
function confirmSofascoreImport(){try{const team=commitSofascoreTeam(sofaImportDraft,document.getElementById('sofa-destination').value,Number(document.getElementById('sofa-rating').value));sofaImportDraft=null;const oldTeams={...gameState.teamMap},oldComps={...gameState.compMap};renderTeamSelection();if(gameState.playerTeamId){gameState.teamMap=oldTeams;gameState.compMap=oldComps;}showModal('Importação concluída',`${team.name}: ${team.importedPlayers.length} jogadores. Revise posições e valores no editor e exporte a base para guardar as alterações. As mudanças serão usadas em uma nova carreira.`);}catch(e){document.getElementById('sofa-status').textContent=e.message;}}

async function requestSofascoreImport(url){
 if(!['http:','https:'].includes(location.protocol))throw Error('A importação por link não funciona abrindo o HTML diretamente. Inicie o jogo com npm start e abra http://localhost:3000, ou publique o projeto completo na Vercel.');
 if(typeof navigator!=='undefined' && navigator.onLine===false)throw Error('Você está sem conexão. Reconecte-se e clique em Buscar time novamente.');
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),28000);
 try{
  let response;
  try{response=await fetch('/api/sofascore?url='+encodeURIComponent(url),{signal:controller.signal,headers:{Accept:'application/json'},cache:'no-store'});}
  catch(e){if(controller.signal.aborted)throw Error('O servidor demorou para responder. Tente novamente.');throw Error('Não foi possível conectar à função de importação do jogo. Verifique a conexão e se o projeto completo foi publicado. Se estiver no computador, execute npm start.');}
  if(response.status===404 || response.status===405 || !response.headers.get('content-type')?.includes('application/json'))throw Error('A função /api/sofascore não está disponível nesta hospedagem. Publique também a pasta api e o vercel.json, ou execute npm start localmente.');
  let data;try{data=await response.json();}catch{throw Error('O servidor retornou uma resposta inválida. Tente novamente.');}
  if(!response.ok)throw Error(data.error || `A consulta falhou no servidor (HTTP ${response.status}).`);
  return data;
 }finally{clearTimeout(timer);}
}
