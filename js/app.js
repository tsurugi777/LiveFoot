function advanceWeekManager() {
    let currentFixtures = gameState.fixtures.filter(f => f.globalWeek === gameState.currentWeek && !f.played && f.away !== null);
    let myMatch = currentFixtures.find(f => f.home === gameState.playerTeamId || f.away === gameState.playerTeamId);

    if (myMatch) {
        startLiveMatch(myMatch);
        return;
    }

    let skips = 0;
    let foundMatch = false;
    
    while (skips < 15 && !foundMatch) {
        currentFixtures.forEach(fixture => {
            const home = gameState.teamMap[fixture.home]; 
            const away = gameState.teamMap[fixture.away];
            if (!home || !away) return;
            
            const effHomeRating = getEffectiveTeamRating(fixture.home);
            const effAwayRating = getEffectiveTeamRating(fixture.away);
            const diff = (effHomeRating + 3) - effAwayRating;
            let hG = 0, aG = 0;
            for(let i=0; i<Math.max(1, 4+Math.round(diff/4)); i++) if(Math.random()>0.65) hG++;
            for(let i=0; i<Math.max(1, 3-Math.round(diff/4)); i++) if(Math.random()>0.65) aG++;
            
            fixture.homeScore = hG; fixture.awayScore = aG; fixture.played = true;
            applyMatchResultToTables(fixture);
        });

        Object.keys(gameState.activePhases).forEach(phaseKey => {
            const activeState = gameState.activePhases[phaseKey];
            if (!activeState) return;
            
            const allPhaseFixtures = gameState.fixtures.filter(f => f.compId === activeState.phaseId && f.season === activeState.season);
            const realFixtures = allPhaseFixtures.filter(f => f.away !== null);
            const byeFixtures = allPhaseFixtures.filter(f => f.isBye && f.away === null);
            
            byeFixtures.forEach(f => {
                f.played = true;
                f.knockoutProcessed = true;
            });
            
            const allRealPlayed = realFixtures.length === 0 || realFixtures.every(f => f.played);
            
            if (allRealPlayed) {
                processPhaseEnd(activeState.rootId, activeState);
            }
        });

        simulateManagerMovements();
        simulateAIMarket();

        if (!gameState.inbox) gameState.inbox = [];
        gameState.mySquad.forEach(p => {
            if (p.listed && Math.random() > 0.65 && !gameState.inbox.find(m => m.playerId === p.id)) {
                gameState.inbox.push({
                    id: 'msg_'+Math.random().toString(36).substr(2, 9),
                    playerId: p.id,
                    playerName: p.name,
                    type: 'buy',
                    offer: (parseFloat(p.value) * (0.7 + Math.random() * 0.6)).toFixed(1)
                });
            } else if (p.listedForLoan && !p.isLoanedOut && Math.random() > 0.60 && !gameState.inbox.find(m => m.playerId === p.id)) {
                gameState.inbox.push({
                    id: 'msg_'+Math.random().toString(36).substr(2, 9),
                    playerId: p.id,
                    playerName: p.name,
                    type: 'loan',
                    offer: 'Taxa: 0.1M (Salários Pagos)'
                });
            }
        });

        gameState.currentDate.setDate(gameState.currentDate.getDate() + 7);
        gameState.currentWeek++;
        checkPendingStages();

        currentFixtures = gameState.fixtures.filter(f => f.globalWeek === gameState.currentWeek && !f.played && f.away !== null);
        let nextMyMatch = currentFixtures.find(f => f.home === gameState.playerTeamId || f.away === gameState.playerTeamId);
        
        if (nextMyMatch || currentFixtures.length > 0) {
            foundMatch = true;
        } else {
            skips++;
        }
    }
    renderClassicHub();
}

function renderClassicHub() {
    const myTeam = gameState.teamMap[gameState.playerTeamId];
    
    if (currentMainView === 'home') {
        document.getElementById('pes-dashboard').classList.remove('hidden');
        document.getElementById('pes-main-content-overlay').classList.replace('flex', 'hidden');
        
        const comp = gameState.compMap[gameState.playerBaseCompId];
        document.getElementById('pes-comp-name').innerText = comp ? comp.name : 'Amistosos';
        
        const w = gameState.currentWeek + 1;
        document.getElementById('pes-date-display').innerText = `${gameState.currentDate.getFullYear()} Week ${w}`;
        
        const nextMatch = gameState.fixtures.find(f => (f.home === myTeam.id || f.away === myTeam.id) && !f.played && f.away !== null);
        const matchContainer = document.getElementById('pes-next-match-container');
        if (nextMatch) {
            const hTeam = gameState.teamMap[nextMatch.home];
            const aTeam = gameState.teamMap[nextMatch.away];
            
            document.getElementById('pes-fixture-display').innerText = gameState.compMap[nextMatch.baseCompId].historyName || 'Partida Oficial';
            
            matchContainer.innerHTML = `
                <div class="pes-glass rounded-xl p-2 flex items-center justify-between shadow-lg flex-1 border-l-8 border-l-blue-500">
                    ${hTeam.logoUrl ? `<img src="${hTeam.logoUrl}" class="team-logo-large shrink-0 drop-shadow-md">` : `<div class="w-10 h-10 sm:w-14 sm:h-14 rounded-full border border-gray-400 flex items-center justify-center font-bold text-xl sm:text-2xl bg-white shadow-inner shrink-0" style="color: ${hTeam.color}">${hTeam.name.charAt(0)}</div>`}
                    <span class="font-bold text-lg sm:text-xl text-gray-800 drop-shadow-sm pr-2 truncate ml-2 text-right">${hTeam.name}</span>
                </div>
                <div class="pes-glass rounded-xl p-2 flex items-center justify-between shadow-lg flex-1 flex-row-reverse border-r-8 border-r-red-500">
                    ${aTeam.logoUrl ? `<img src="${aTeam.logoUrl}" class="team-logo-large shrink-0 drop-shadow-md">` : `<div class="w-10 h-10 sm:w-14 sm:h-14 rounded-full border border-gray-400 flex items-center justify-center font-bold text-xl sm:text-2xl bg-white shadow-inner shrink-0" style="color: ${aTeam.color}">${aTeam.name.charAt(0)}</div>`}
                    <span class="font-bold text-lg sm:text-xl text-gray-800 drop-shadow-sm pl-2 truncate mr-2 text-left">${aTeam.name}</span>
                </div>
            `;
        } else {
            document.getElementById('pes-fixture-display').innerText = 'Férias / Fim de Temporada';
            matchContainer.innerHTML = `<div class="pes-glass rounded-xl p-4 text-center font-bold text-gray-600 shadow-lg w-full">Nenhuma partida agendada.</div>`;
        }

        const logoContainer = document.getElementById('pes-my-logo-container');
        const logoImg = document.getElementById('pes-my-logo-img');
        const logoText = document.getElementById('pes-my-logo-text');
        
        if (myTeam.logoUrl) {
            logoImg.src = myTeam.logoUrl;
            logoImg.style.display = 'block';
            logoText.style.display = 'none';
        } else {
            logoImg.style.display = 'none';
            logoText.style.display = 'flex';
            logoText.innerText = myTeam.name.charAt(0);
            logoText.style.color = myTeam.color;
        }
        
        document.getElementById('pes-my-name').innerText = myTeam.name;
        document.getElementById('pes-my-rating').innerText = `OVR: ${myTeam.rating}`;
        
        document.getElementById('pes-funds').innerText = parseFloat(myTeam.budget || 15).toLocaleString('pt-BR');
        let totalSal = 0;
        gameState.mySquad.forEach(p => { 
            if(!p.isLoanedOut) {
                let sVal = String(p.salary || '0').replace(/[^0-9]/g, '');
                totalSal += parseInt(sVal) || 0;
            } 
        });
        document.getElementById('pes-salary').innerText = totalSal.toLocaleString('pt-BR');
        
        renderPesNavBar();
        return;
    }

    // Views simplificadas para o restante
    document.getElementById('pes-dashboard').classList.add('hidden');
    document.getElementById('pes-main-content-overlay').classList.replace('hidden', 'flex');
    
    const activeNav = navItems.find(i => i.id === currentMainView);
    document.getElementById('pes-content-title').innerText = activeNav ? activeNav.label : 'Menu';
    
    const mainContent = document.getElementById('main-content');
    
    if (currentMainView === 'squad') {
        mainContent.innerHTML = `
            <div class="flex flex-col md:flex-row gap-2 h-full w-full">
                <div class="flex-1 bg-white h-full overflow-auto classic-border-inset">
                    <table class="w-full text-left border-collapse squad-table">
                        <thead class="sticky top-0 shadow-sm z-10 bg-gray-200">
                            <tr>
                                <th class="w-6">P</th><th>Nome</th><th class="w-6">P</th><th class="w-6">F</th>
                                <th class="w-16">Energia</th><th class="w-16">Salário</th><th class="w-16">Passe</th>
                                <th class="w-8">G</th><th class="w-10">Idade</th><th class="w-8">J</th><th class="w-8">A</th><th class="w-8">NM</th>
                            </tr>
                        </thead>
                        <tbody id="squad-tbody">
                            ${gameState.mySquad.map(p => `
                                <tr id="row-${p.id}" onclick="selectPlayer('${p.id}')" class="cursor-pointer hover:bg-gray-100">
                                    <td class="text-center font-bold">${p.pos.split('/')[0]}</td>
                                    <td>${p.name}</td>
                                    <td class="text-center">${p.leg}</td>
                                    <td class="text-center font-bold">${p.ovr}</td>
                                    <td class="text-center"><span class="bg-yellow-300 px-1 font-bold">${p.energy}%</span></td>
                                    <td class="text-right pr-2">${p.salary}</td>
                                    <td class="text-right pr-2">${p.value}M</td>
                                    <td class="text-center">${p.sGoals||0}</td>
                                    <td class="text-center text-blue-600 font-bold">${p.age}</td>
                                    <td class="text-center">${p.sGames||0}</td>
                                    <td class="text-center">${p.sAssists||0}</td>
                                    <td class="text-center">${p.sRatings && p.sRatings.length ? (p.sRatings.reduce((a,b)=>a+b,0)/p.sRatings.length).toFixed(1) : '--'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                <div class="w-full md:w-[300px] pes-glass border-2 border-gray-500 shrink-0 p-1 shadow-inner h-64 md:h-full overflow-y-auto">
                    <div id="player-detail-empty" class="h-full flex items-center justify-center text-gray-700 font-bold text-center p-4">
                        Selecione um jogador na tabela para exibir os detalhes.
                    </div>
                </div>
            </div>
        `;
    } else if (currentMainView === 'standings') {
        mainContent.innerHTML = `<div class="bg-white p-4 h-full overflow-auto"><div class="text-center font-bold text-xl">Tabelas</div><div class="mt-4 text-gray-600">Carregando classificações...</div></div>`;
    } else if (currentMainView === 'market') {
        mainContent.innerHTML = `<div class="bg-white p-4 h-full overflow-auto"><div class="text-center font-bold text-xl">Mercado</div><div class="mt-4 text-gray-600">Negociações disponíveis...</div></div>`;
    } else if (currentMainView === 'lineup') {
        mainContent.innerHTML = `<div class="bg-white p-4 h-full overflow-auto"><div class="text-center font-bold text-xl">Táticas</div><div class="mt-4 text-gray-600">Formação: ${gameState.myLineup.formation}</div></div>`;
    } else if (currentMainView === 'stadium') {
        mainContent.innerHTML = `<div class="bg-white p-4 h-full overflow-auto"><div class="text-center font-bold text-xl">Estádio</div><div class="mt-4 text-gray-600">Capacidade: ${myTeam.stadiumCapacity || 10000}</div></div>`;
    } else if (currentMainView === 'history') {
        mainContent.innerHTML = `<div class="bg-white p-4 h-full overflow-auto"><div class="text-center font-bold text-xl">Histórico</div><div class="mt-4 text-gray-600">${gameState.history.length} títulos registrados.</div></div>`;
    } else if (currentMainView === 'jobs') {
        mainContent.innerHTML = `<div class="bg-white p-4 h-full overflow-auto"><div class="text-center font-bold text-xl">Empregos</div><div class="mt-4 text-gray-600">Vagas disponíveis para treinador.</div></div>`;
    } else if (currentMainView === 'options') {
        mainContent.innerHTML = `
            <div class="bg-white p-4 h-full overflow-auto flex flex-col items-center justify-center gap-4">
                <div class="text-center font-bold text-xl">Sistema</div>
                <button class="pes-btn px-6 py-2 font-bold" onclick="saveGame()"><i class="fas fa-save mr-2"></i> Salvar Jogo</button>
                <button class="pes-btn px-6 py-2 font-bold" onclick="document.getElementById('load-game-input').click()"><i class="fas fa-folder-open mr-2"></i> Carregar Jogo</button>
                <button class="pes-btn px-6 py-2 font-bold text-red-700" onclick="exitToMenu()"><i class="fas fa-sign-out-alt mr-2"></i> Sair para Menu</button>
                <input type="file" id="load-game-input" class="hidden" accept=".json" onchange="loadGame(event)">
            </div>
        `;
    } else if (currentMainView === 'match' && liveMatch) {
        mainContent.innerHTML = `
            <div class="bg-white h-full w-full flex flex-col classic-border-inset shadow-inner">
                <div class="bg-gradient-to-b from-gray-800 to-black text-yellow-400 p-3 flex justify-between font-bold text-xl border-b border-gray-600">
                    <span class="truncate text-right flex-1">${gameState.teamMap[liveMatch.fixture.home].name}</span>
                    <span class="text-white mx-4 font-black">${liveMatch.homeScore} x ${liveMatch.awayScore}</span>
                    <span class="truncate text-left flex-1">${gameState.teamMap[liveMatch.fixture.away].name}</span>
                </div>
                <div class="bg-black p-4 overflow-auto match-event-box flex-1 text-sm">
                    ${liveMatch.events.map(e => `<div class="mb-1">${e}</div>`).join('')}
                </div>
                <div class="p-3 bg-gray-300 flex gap-4 justify-center border-t border-gray-500 h-16 shrink-0 items-center">
                    <button class="pes-btn font-bold px-6 py-2" onclick="pauseLiveMatch()">Pausar</button>
                    <button class="pes-btn font-bold px-6 py-2 text-green-800" onclick="resumeLiveMatch()">Continuar</button>
                </div>
            </div>
        `;
    } else if (currentMainView === 'agenda') {
        const myFixtures = gameState.fixtures.filter(f => f.home === gameState.playerTeamId || f.away === gameState.playerTeamId);
        const upcomingFixtures = myFixtures.filter(f => !f.played).sort((a,b) => a.globalWeek - b.globalWeek).slice(0, 5);
        
        mainContent.innerHTML = `
            <div class="bg-white p-4 h-full overflow-auto">
                <div class="text-center font-bold text-xl mb-4">Agenda</div>
                ${upcomingFixtures.length === 0 ? '<div class="text-gray-600 text-center">Nenhum jogo agendado.</div>' : 
                    upcomingFixtures.map(f => `
                        <div class="border-b border-gray-200 py-2 flex justify-between">
                            <span>${gameState.teamMap[f.home].name} vs ${gameState.teamMap[f.away].name}</span>
                            <span class="text-gray-500">Semana ${f.globalWeek}</span>
                        </div>
                    `).join('')
                }
                ${gameState.inbox && gameState.inbox.length > 0 ? `
                    <div class="mt-4 border-t-2 border-gray-300 pt-4">
                        <div class="font-bold text-blue-900">📬 Mensagens</div>
                        ${gameState.inbox.slice(0, 3).map(m => `
                            <div class="bg-gray-100 p-2 mt-2 rounded border border-gray-300 text-sm">
                                <b>${m.playerName}</b>: ${m.type === 'buy' ? 'Proposta de compra' : 'Pedido de empréstimo'} - ${m.offer}
                                <div class="flex gap-2 mt-1">
                                    <button class="text-xs bg-green-200 px-2 py-0.5 rounded" onclick="acceptOffer('${m.id}')">Aceitar</button>
                                    <button class="text-xs bg-red-200 px-2 py-0.5 rounded" onclick="rejectOffer('${m.id}')">Recusar</button>
                                </div>
                            </div>
                        `).join('')}
                        ${gameState.inbox.length > 3 ? `<div class="text-xs text-gray-500 mt-1">+${gameState.inbox.length - 3} mensagens</div>` : ''}
                    </div>
                ` : ''}
            </div>
        `;
    }
}

window.onload = () => {
    const savedName = localStorage.getItem('super_manager_manager_name');
    if (savedName) {
        humanManagerName = savedName;
        gameState.managerName = savedName;
        isNameConfirmed = true;
    }
    renderTeamSelection();
};

// Tornar funções globais para acesso via onclick
window.advanceWeekManager = advanceWeekManager;
window.switchView = switchView;
window.confirmManagerName = confirmManagerName;
window.openEditor = openEditor;
window.closeEditor = closeEditor;
window.switchEditorMode = switchEditorMode;
window.saveEditorChanges = saveEditorChanges;
window.importDB = importDB;
window.importTeam = importTeam;
window.exportDB = exportDB;
window.saveGame = saveGame;
window.loadGame = loadGame;
window.exitToMenu = exitToMenu;
window.selectPlayer = selectPlayer;
window.selectTacticsSlot = selectTacticsSlot;
window.handlePlayerAction = handlePlayerAction;
window.acceptOffer = acceptOffer;
window.rejectOffer = rejectOffer;
window.cancelList = cancelList;
window.expandStadium = expandStadium;
window.updateTicketPrice = updateTicketPrice;
window.applyForJob = applyForJob;
window.pauseLiveMatch = pauseLiveMatch;
window.resumeLiveMatch = resumeLiveMatch;
window.finishLiveMatch = finishLiveMatch;
window.showCompetitionRules = showCompetitionRules;
window.attemptBuyPlayer = attemptBuyPlayer;
window.renderClassicHub = renderClassicHub;