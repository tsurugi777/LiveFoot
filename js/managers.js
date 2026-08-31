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
    renderClassicHub();
}

function showNameInputModal() {
    document.getElementById('name-input-modal').classList.replace('hidden', 'flex');
    document.getElementById('manager-name-input').value = humanManagerName;
    document.getElementById('manager-name-input').focus();
    document.getElementById('manager-name-input').select();
}

function simulateManagerMovements() {
    const teams = Object.values(gameState.teamMap).filter(t => t.id !== gameState.playerTeamId);
    
    teams.forEach(team => {
        if (!team.managerName || team.managerName === "Interino") {
            team.managerName = "Interino";
            team.managerPhotoUrl = null;
            team.isHumanManaged = false;
        }
    });
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
        oldTeam.isHumanManaged = false;
    }
    
    gameState.playerTeamId = newTeamId;
    gameState.playerBaseCompId = gameState.teamMap[newTeamId].compId;
    const targetTeam = gameState.teamMap[newTeamId];
    
    if (!targetTeam.generatedSquad) targetTeam.generatedSquad = generateSquad(newTeamId, targetTeam.rating);
    gameState.mySquad = targetTeam.generatedSquad;
    targetTeam.managerName = gameState.managerName;
    targetTeam.isHumanManaged = true;
    targetTeam.managerPhotoUrl = null;
    
    autoLineup('4-4-2');
    switchView('squad');
    showModal("Novo Clube!", `Bem-vindo ao ${targetTeam.name}!\nA torcida te recebe com festa no aeroporto. Agora mostre trabalho!`);
}