function confirmManagerName() {
    const input = document.getElementById('manager-name-input');
    const name = input.value.trim() || "Treinador";
    humanManagerName = name;
    gameState.managerName = name;
    isNameConfirmed = true;
    localStorage.setItem('super_manager_manager_name', name);
    document.getElementById('name-input-modal').classList.replace('flex', 'hidden');
    
    const myTeam = gameState.teamMap[gameState.playerTeamId];
    if (myTeam) {
        myTeam.managerName = name;
        myTeam.isHumanManaged = true;
    }
    if (window._pendingTeamId) {
        renderTeamSelection();
    } else if (myTeam) {
        renderClassicHub();
    }
}

function showNameInputModal() {
    document.getElementById('name-input-modal').classList.replace('hidden', 'flex');
    document.getElementById('manager-name-input').value = humanManagerName;
    document.getElementById('manager-name-input').focus();
    document.getElementById('manager-name-input').select();
}

function releaseManager(team,reason='Saída') {
    if(!team || team.isHumanManaged || !team.managerName || team.managerName==='Interino')return;
    const manager={id:team.managerId || 'manager-'+team.id,name:team.managerName,photoUrl:team.managerPhotoUrl || null,lastTeamId:team.id};
    gameState.freeManagers ||= [];
    if(!gameState.freeManagers.some(m=>m.id===manager.id))gameState.freeManagers.push(manager);
    (gameState.managerHistory ||= []).push({week:gameState.currentWeek,teamId:team.id,managerId:manager.id,name:manager.name,reason});
    team.managerName='Interino';team.managerPhotoUrl=null;delete team.managerId;
}
function assignHumanManager(team){
    releaseManager(team,'Substituído pelo treinador humano');
    team.managerName=gameState.managerName || humanManagerName || 'Treinador';
    team.managerPhotoUrl=gameState.managerPhoto || null;team.isHumanManaged=true;team.managerId='human';
}
function initializeManagers(teamId){
    gameState.freeManagers=[];gameState.managerHistory=[];delete gameState.lastManagerMovementWeek;
    for(const t of Object.values(gameState.teamMap)){
        const original=db.teams.find(x=>x.id===t.id);
        t.managerName=original?.managerName || 'Interino';t.managerPhotoUrl=original?.managerPhotoUrl || null;
        t.isHumanManaged=false;t.managerId='manager-'+t.id;t.managerSinceWeek=0;
    }
    gameState.managerName=typeof humanManagerName==='string' && humanManagerName.trim()?humanManagerName:gameState.managerName || 'Treinador';
    assignHumanManager(gameState.teamMap[teamId]);
}
function simulateManagerMovements() {
    if(gameState.lastManagerMovementWeek===gameState.currentWeek)return;
    gameState.lastManagerMovementWeek=gameState.currentWeek;
    const teams=Object.values(gameState.teamMap).filter(t=>t.id!==gameState.playerTeamId && !t.isHumanManaged);
    for(const team of teams){
        const recent=gameState.fixtures.filter(f=>f.played && (f.home===team.id || f.away===team.id)).slice(-5);
        const points=recent.reduce((n,f)=>{const own=f.home===team.id?f.homeScore:f.awayScore,other=f.home===team.id?f.awayScore:f.homeScore;return n+(own>other?3:own===other?1:0);},0);
        if(gameState.currentWeek-(team.managerSinceWeek || 0)>=4 && team.managerName!=='Interino'){
            const poor=recent.length===5 && points<=3;
            if(Math.random()<(poor?0.18:0.015))releaseManager(team,poor?'Demitido por resultados':'Rescisão de contrato');
        }
    }
    for(const team of teams.filter(t=>!t.managerName || t.managerName==='Interino')){
        if(!(gameState.freeManagers || []).length)continue;
        const candidates=gameState.freeManagers.filter(m=>m.lastTeamId!==team.id);if(!candidates.length)continue;
        const manager=candidates[Math.floor(Math.random()*candidates.length)];gameState.freeManagers=gameState.freeManagers.filter(m=>m.id!==manager.id);
        team.managerId=manager.id;team.managerName=manager.name;team.managerPhotoUrl=manager.photoUrl;team.managerSinceWeek=gameState.currentWeek;
        (gameState.managerHistory ||= []).push({week:gameState.currentWeek,teamId:team.id,managerId:manager.id,name:manager.name,reason:'Contratado'});
    }
}

function applyForJob(targetTeamId) {
    const target = gameState.teamMap[targetTeamId];
    const myTeam = gameState.teamMap[gameState.playerTeamId];
    const myReputation = myTeam.rating + (Object.keys(gameState.titles[gameState.playerTeamId] || {}).length * 1.5);
    
    if (target.isHumanManaged) {
        showModal("Vaga Ocupada", `O ${target.name} já possui um treinador humano.`);
        return;
    }
    
    const chance = Math.random() * 10;
    
    if (myReputation + chance >= target.rating - 2) {
        showActionModal("Proposta de Emprego Aceita", 
            `A diretoria do ${target.name} gostou do seu perfil de trabalho!\nEles te oferecem o cargo de Treinador Principal.\n\nDeseja rescindir com o ${myTeam.name} e assinar o novo contrato?`, 
            "Assinar Contrato", () => { changePlayerTeam(targetTeamId); }, 
            "Recusar", () => {}
        );
    } else {
        showModal("Candidatura Recusada", `A diretoria do ${target.name} avaliou seu currículo, mas acham que você ainda não tem experiência e peso suficiente para comandar este clube no momento.`);
    }
}

function changePlayerTeam(newTeamId) {
    const oldTeam = gameState.teamMap[gameState.playerTeamId];
    if (oldTeam) {
        oldTeam.generatedSquad = gameState.mySquad;
        oldTeam.isHumanManaged = false;
        oldTeam.managerName='Interino';oldTeam.managerPhotoUrl=null;delete oldTeam.managerId;
    }
    
    gameState.playerTeamId = newTeamId;
    gameState.playerBaseCompId = getTeamBaseCompetition(gameState.teamMap[newTeamId]);
    const targetTeam = gameState.teamMap[newTeamId];
    
    if (!targetTeam.generatedSquad) targetTeam.generatedSquad = generateSquad(newTeamId, targetTeam.rating);
    gameState.mySquad = targetTeam.generatedSquad;
    assignHumanManager(targetTeam);
    
    autoLineup('4-4-2');
    switchView('squad');
    showModal("Novo Clube!", `Bem-vindo ao ${targetTeam.name}!\nA torcida te recebe com festa no aeroporto. Agora mostre trabalho!`);
}