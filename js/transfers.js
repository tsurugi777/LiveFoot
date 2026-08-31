function simulateAIMarket() {
    const teams = Object.values(gameState.teamMap).filter(t => t.id !== gameState.playerTeamId);
    
    teams.forEach(team => {
        if (!team.generatedSquad) return;
        
        if (Math.random() < 0.02) {
            const availablePlayers = [];
            teams.forEach(otherTeam => {
                if (otherTeam.id === team.id || !otherTeam.generatedSquad) return;
                otherTeam.generatedSquad.forEach(p => {
                    if (p.listed || p.listedForLoan) {
                        availablePlayers.push({ player: p, team: otherTeam });
                    }
                });
            });
            
            if (availablePlayers.length > 0) {
                const target = availablePlayers[Math.floor(Math.random() * availablePlayers.length)];
                const price = parseFloat(target.player.value) * (1.0 + Math.random() * 0.3);
                
                const teamBudget = parseFloat(team.budget || 15);
                if (teamBudget >= price) {
                    team.budget = (teamBudget - price).toFixed(2);
                    target.team.budget = (parseFloat(target.team.budget || 15) + price).toFixed(2);
                    target.team.generatedSquad = target.team.generatedSquad.filter(p => p.id !== target.player.id);
                    
                    const newPlayer = {...target.player};
                    newPlayer.sGames = 0; newPlayer.sGoals = 0; newPlayer.sAssists = 0; 
                    newPlayer.sRatings = []; newPlayer.sYellows = 0; newPlayer.sReds = 0;
                    newPlayer.listed = false; newPlayer.listedForLoan = false;
                    newPlayer.isLoan = false; newPlayer.isLoanedOut = false;
                    
                    if (!team.generatedSquad) team.generatedSquad = [];
                    team.generatedSquad.push(newPlayer);
                }
            }
        }
        
        if (Math.random() < 0.01 && team.generatedSquad.length > 18) {
            const loanCandidates = team.generatedSquad.filter(p => p.age < 23 && p.ovr < 70);
            if (loanCandidates.length > 0) {
                const player = loanCandidates[Math.floor(Math.random() * loanCandidates.length)];
                const interestedTeams = teams.filter(t => t.id !== team.id && t.generatedSquad && t.generatedSquad.length < 30);
                if (interestedTeams.length > 0) {
                    const loanTeam = interestedTeams[Math.floor(Math.random() * interestedTeams.length)];
                    player.isLoanedOut = true;
                    player.originalTeamId = team.id;
                    player.listedForLoan = false;
                    
                    const loanPlayer = {...player};
                    loanPlayer.isLoan = true;
                    loanPlayer.originalTeamId = team.id;
                    loanPlayer.isLoanedOut = false;
                    loanPlayer.sGames = 0; loanPlayer.sGoals = 0; loanPlayer.sAssists = 0;
                    loanPlayer.sRatings = []; loanPlayer.sYellows = 0; loanPlayer.sReds = 0;
                    
                    if (!loanTeam.generatedSquad) loanTeam.generatedSquad = [];
                    loanTeam.generatedSquad.push(loanPlayer);
                    
                    team.generatedSquad = team.generatedSquad.filter(p => p.id !== player.id);
                }
            }
        }
    });
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

function processTransfer(player, fromTeam, price, isLoan) {
    let myBudget = parseFloat(gameState.teamMap[gameState.playerTeamId].budget || 15);
    
    if (isLoan) {
        if (myBudget >= 0.2) {
            myBudget -= 0.2;
            gameState.teamMap[gameState.playerTeamId].budget = myBudget.toFixed(2);
            fromTeam.generatedSquad = fromTeam.generatedSquad.filter(p => p.id !== player.id);
            player.isLoan = true;
            player.originalTeamId = fromTeam.id;
            gameState.mySquad.push(player);
            showModal('Empréstimo Aceito', `A diretoria concordou! ${player.name} jogará por empréstimo no seu time até o final desta temporada.`);
            renderClassicHub();
        } else {
            showModal('Sem fundos', 'O caixa do clube é insuficiente até para a taxa básica de empréstimo ($0.2M)!');
        }
    } else {
        if (myBudget >= price) {
            myBudget -= price;
            gameState.teamMap[gameState.playerTeamId].budget = myBudget.toFixed(2);
            fromTeam.generatedSquad = fromTeam.generatedSquad.filter(p => p.id !== player.id);
            
            if (player.sGames > 0) {
                player.careerStats = player.careerStats || [];
                let avg = player.sRatings && player.sRatings.length ? (player.sRatings.reduce((a,b)=>a+b,0) / player.sRatings.length).toFixed(1) : '--';
                player.careerStats.push({ season: gameState.currentDate.getFullYear(), teamName: fromTeam.name, games: player.sGames, goals: player.sGoals, assists: player.sAssists, rating: avg });
            }

            player.sGames = 0; player.sGoals = 0; player.sAssists = 0; player.sRatings = []; 
            player.sYellows = 0; player.sReds = 0;
            player.listed = false; player.isLoan = false;
            gameState.mySquad.push(player);
            showModal('Contratado', `Negócio fechado! ${player.name} foi comprado em definitivo e já se apresentou ao clube!`);
            renderClassicHub();
        } else {
            showModal('Sem fundos', 'O caixa do clube é insuficiente para cobrir o valor pedido pelo jogador!');
        }
    }
}

function acceptOffer(msgId) {
    if (!gameState.inbox) return;
    const msg = gameState.inbox.find(m => m.id === msgId);
    if (!msg) return;
    
    let myBudget = parseFloat(gameState.teamMap[gameState.playerTeamId].budget || 15);
    
    if (msg.type === 'loan') {
        myBudget += 0.1;
        gameState.teamMap[gameState.playerTeamId].budget = myBudget.toFixed(2);
        
        const p = gameState.mySquad.find(x => x.id === msg.playerId);
        if (p) {
            p.isLoanedOut = true;
            p.listedForLoan = false;
        }
        
        gameState.myLineup.starters = gameState.myLineup.starters.map(id => id === msg.playerId ? null : id);
        gameState.myLineup.bench = gameState.myLineup.bench.filter(id => id !== msg.playerId);
        
        gameState.inbox = gameState.inbox.filter(m => m.id !== msgId);
        showModal('Emprestado', `${msg.playerName} foi emprestado para ganhar experiência. Ele retornará no fim do ano.`);
    } else {
        myBudget += parseFloat(msg.offer);
        gameState.teamMap[gameState.playerTeamId].budget = myBudget.toFixed(2);
        
        const p = gameState.mySquad.find(x => x.id === msg.playerId);
        if (p && p.sGames > 0) {
            p.careerStats = p.careerStats || [];
            let avg = p.sRatings && p.sRatings.length ? (p.sRatings.reduce((a,b)=>a+b,0) / p.sRatings.length).toFixed(1) : '--';
            p.careerStats.push({ season: gameState.currentDate.getFullYear(), teamName: gameState.teamMap[gameState.playerTeamId].name, games: p.sGames, goals: p.sGoals, assists: p.sAssists, rating: avg });
            p.sGames = 0; p.sGoals = 0; p.sAssists = 0; p.sRatings = []; 
            p.sYellows = 0; p.sReds = 0;
        }

        gameState.mySquad = gameState.mySquad.filter(x => x.id !== msg.playerId);
        gameState.myLineup.starters = gameState.myLineup.starters.map(id => id === msg.playerId ? null : id);
        gameState.myLineup.bench = gameState.myLineup.bench.filter(id => id !== msg.playerId);
        
        gameState.inbox = gameState.inbox.filter(m => m.id !== msgId);
        showModal('Vendido', `${msg.playerName} foi vendido em definitivo por $${msg.offer}M.`);
    }
    
    if (gameState.selectedPlayerId === msg.playerId) gameState.selectedPlayerId = null;
    renderClassicHub();
}

function rejectOffer(msgId) {
    gameState.inbox = gameState.inbox.filter(m => m.id !== msgId);
    renderClassicHub();
}

function cancelList(playerId) {
    const p = gameState.mySquad.find(x => x.id === playerId);
    if(p) { p.listed = false; p.listedForLoan = false; renderClassicHub(); }
}