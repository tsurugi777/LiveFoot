// app.js - Arquivo Principal com UI Completa (Corrigido com Sistema de Fotos)

// ==========================================
// SISTEMA DE GERAÇÃO DE AVATARES E FOTOS
// ==========================================

function generateAvatar() { return GENERIC_PERSON_PHOTO; }
function generatePlayerPhoto() { return GENERIC_PERSON_PHOTO; }
function generateManagerPhoto() { return GENERIC_PERSON_PHOTO; }

// Função para garantir que todos os jogadores tenham foto
function ensurePlayerPhotos(players, teamId = null) {
    if (!players || !Array.isArray(players)) return players;
    
    return players.map(player => {
        player.pos = normalizePosition(player.pos);
        player.photoUrl = personPhoto(player.photoUrl);
        if (!player.photoUrl) {
            const seed = `${player.name}_${player.pos}_${teamId || player.id}`;
            player.photoUrl = generatePlayerPhoto(player.name, player.pos, seed);
        }
        return player;
    });
}

// Função para garantir que times tenham fotos de técnicos
function ensureManagerPhotos(teams) {
    if (!teams || typeof teams !== 'object') return teams;
    
    Object.keys(teams).forEach(teamId => {
        const team = teams[teamId];
        if (team) team.managerPhotoUrl = personPhoto(team.managerPhotoUrl);
        if (team && !team.managerPhotoUrl && team.managerName) {
            const seed = `${team.managerName}_${teamId}`;
            team.managerPhotoUrl = generateManagerPhoto(team.managerName, team.name, seed);
        }
    });
    
    return teams;
}

// Função para verificar e gerar fotos faltantes em todo o estado
function ensureAllPhotos() {
    // Garante fotos para todos os times
    ensureManagerPhotos(gameState.teamMap);
    
    // Garante fotos para todos os jogadores do jogador
    if (gameState.mySquad) {
        gameState.mySquad = ensurePlayerPhotos(gameState.mySquad, gameState.playerTeamId);
    }
    
    // Garante fotos para todos os jogadores de todos os times
    Object.keys(gameState.teamMap).forEach(teamId => {
        const team = gameState.teamMap[teamId];
        if (team.generatedSquad) {
            team.generatedSquad = ensurePlayerPhotos(team.generatedSquad, teamId);
        }
    });
}

// ==========================================
// FIM DO SISTEMA DE AVATARES
// ==========================================

function advanceWeekManager() {
    if (liveMatch) { switchView('match'); return; }
    if(!validateHumanLineup())return;
    let currentFixtures = gameState.fixtures.filter(f => f.globalWeek === gameState.currentWeek && !f.played && f.away !== null);
    let myMatch = currentFixtures.find(f => f.home === gameState.playerTeamId || f.away === gameState.playerTeamId);

    if (myMatch && simulationSettings().live) {
        startLiveMatch(myMatch);
        return;
    }

    let skips = 0;
    let foundMatch = false;
    
    while (skips < 15 && !foundMatch) {
        if(!validateHumanLineup())return;
        currentFixtures.forEach(fixture => {
            simulateInstantMatch(fixture);
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

        processTitlePlayoffs();
        processDivisionPlayoffs();
        simulateManagerMovements();
        simulateAIMarket();

        finalizeCareerSeasons();

        gameState.currentDate.setDate(gameState.currentDate.getDate() + 7);
        gameState.currentWeek++;
        processPlayerWeek();
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
    normalizePeople(gameState.mySquad);
    gameState.mySquad.forEach(ensurePlayerLifecycle);refreshTeamRating(gameState.playerTeamId);
    ensureAllPhotos();
    const myTeam = gameState.teamMap[gameState.playerTeamId];
    document.getElementById('pes-comp-name').textContent = gameState.compMap[gameState.playerBaseCompId]?.name || 'Amistosos';
    const returnButton = document.getElementById('return-live-match');
    if (returnButton) returnButton.hidden = !liveMatch;
    renderPesNavBar();
    if (currentMainView === 'home') {
        document.getElementById('pes-dashboard').classList.remove('hidden');
        document.getElementById('pes-main-content-overlay').classList.replace('flex', 'hidden');
        
        const comp = gameState.compMap[gameState.playerBaseCompId];
        document.getElementById('pes-comp-name').innerText = comp ? comp.name : 'Amistosos';
        
        const w = gameState.currentWeek + 1;
        document.getElementById('pes-date-display').innerText = `${gameState.currentDate.getFullYear()} • Semana ${w}`;
        
        const nextMatch = gameState.fixtures.find(f => (f.home === myTeam.id || f.away === myTeam.id) && !f.played && f.away !== null);
        const matchContainer = document.getElementById('pes-next-match-container');
        if (nextMatch) {
            const hTeam = gameState.teamMap[nextMatch.home];
            const aTeam = gameState.teamMap[nextMatch.away];
            
            document.getElementById('pes-fixture-display').innerText = gameState.compMap[nextMatch.baseCompId].historyName || 'Partida Oficial';
            
            matchContainer.innerHTML = `
                <div class="pes-glass rounded-xl p-2 flex items-center justify-between shadow-lg flex-1 border-l-8 border-l-blue-500">
                    ${hTeam.logoUrl ? `<img src="${hTeam.logoUrl}" class="team-logo-large shrink-0 drop-shadow-md" onerror="this.onerror=null; this.style.display='none'; this.parentElement.innerHTML='<div class=\\'w-10 h-10 sm:w-14 sm:h-14 rounded-full border border-gray-400 flex items-center justify-center font-bold text-xl sm:text-2xl bg-white shadow-inner shrink-0\\' style=\\'color: ${hTeam.color}\\'>${hTeam.name.charAt(0)}</div>';">` : `<div class="w-10 h-10 sm:w-14 sm:h-14 rounded-full border border-gray-400 flex items-center justify-center font-bold text-xl sm:text-2xl bg-white shadow-inner shrink-0" style="color: ${hTeam.color}">${hTeam.name.charAt(0)}</div>`}
                    <span class="font-bold text-lg sm:text-xl text-gray-800 drop-shadow-sm pr-2 truncate ml-2 text-right">${hTeam.name}</span>
                </div>
                <div class="pes-glass rounded-xl p-2 flex items-center justify-between shadow-lg flex-1 flex-row-reverse border-r-8 border-r-red-500">
                    ${aTeam.logoUrl ? `<img src="${aTeam.logoUrl}" class="team-logo-large shrink-0 drop-shadow-md" onerror="this.onerror=null; this.style.display='none'; this.parentElement.innerHTML='<div class=\\'w-10 h-10 sm:w-14 sm:h-14 rounded-full border border-gray-400 flex items-center justify-center font-bold text-xl sm:text-2xl bg-white shadow-inner shrink-0\\' style=\\'color: ${aTeam.color}\\'>${aTeam.name.charAt(0)}</div>';">` : `<div class="w-10 h-10 sm:w-14 sm:h-14 rounded-full border border-gray-400 flex items-center justify-center font-bold text-xl sm:text-2xl bg-white shadow-inner shrink-0" style="color: ${aTeam.color}">${aTeam.name.charAt(0)}</div>`}
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
            logoImg.onerror = function() { 
                this.style.display = 'none'; 
                document.getElementById('pes-my-logo-text').style.display = 'flex';
                document.getElementById('pes-my-logo-text').innerText = myTeam.name.charAt(0);
                document.getElementById('pes-my-logo-text').style.color = myTeam.color;
            };
            logoText.style.display = 'none';
        } else {
            logoImg.style.display = 'none';
            logoText.style.display = 'flex';
            logoText.innerText = myTeam.name.charAt(0);
            logoText.style.color = myTeam.color;
        }
        
        document.getElementById('pes-my-name').innerText = myTeam.name;
        document.getElementById('pes-my-rating').innerText = `OVR: ${myTeam.rating}`;
        
        document.getElementById('pes-funds').innerText = parseFloat(myTeam.budget ?? 15).toLocaleString('pt-BR');
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

    document.getElementById('pes-dashboard').classList.add('hidden');
    document.getElementById('pes-main-content-overlay').classList.replace('hidden', 'flex');
    
    const activeNav = navItems.find(i => i.id === currentMainView);
    document.getElementById('pes-content-title').innerText = activeNav ? activeNav.label : (currentMainView === 'match' ? 'Transmissão Ao Vivo' : 'Menu');
    
    const mainContent = document.getElementById('main-content');

    // Detalhes do jogador (COM FOTOS GERADAS)
    const playerDetailHtml = `
        <div class="flex flex-col bg-white h-full border border-gray-400 shadow-md">
            <div class="player-profile-heading flex p-4 gap-3 h-32 shrink-0">
                <div class="w-[90px] h-[110px] bg-gray-200 border-2 border-gray-500 flex items-center justify-center shrink-0 -mb-4 z-10 shadow-[2px_2px_5px_rgba(0,0,0,0.5)]">
                     <img id="pd-photo" src="" class="w-full h-full object-cover" style="display: none;" onerror="this.onerror=null; this.src=GENERIC_PERSON_PHOTO;">
                     <i class="fas fa-user text-5xl text-gray-400" id="pd-photo-fallback"></i>
                </div>
                <div class="flex-1 flex flex-col pt-1">
                    <span class="font-bold text-sm leading-tight line-clamp-2" id="pd-name">Nome</span>
                    <div class="mt-auto flex justify-between items-end">
                        <span class="font-black text-xl text-green-400" id="pd-pos-ovr">F:49</span>
                    </div>
                </div>
            </div>
            
            <div class="px-2 mt-4 text-[11px] font-bold space-y-1 text-gray-800">
                <div id="pd-role" class="flex items-center gap-1">🌐 Posições - Pé D - 30 anos</div>
                <div id="pd-energy"></div><div id="pd-contract">Contrato até: 24/08/2026</div>
                <div class="flex justify-between border-t border-gray-300 pt-1 mt-1">
                    <span>Salário: <span id="pd-salary" class="text-red-700"></span></span>
                    <span>Passe: <span id="pd-value" class="text-blue-700"></span></span>
                </div>
            </div>
            
            <div class="player-actions flex flex-wrap gap-1 px-2 mt-2 justify-center border-b border-gray-300 pb-2">
                 <button class="pes-btn px-2 py-1 text-[9px] font-bold text-blue-900" onclick="handlePlayerAction('renovar')">Renovar</button>
                 <button class="pes-btn px-2 py-1 text-[9px] font-bold text-emerald-700" onclick="handlePlayerAction('treinar')">Treinar</button>
                 <button class="pes-btn px-2 py-1 text-[9px] font-bold text-orange-700" onclick="handlePlayerAction('emprestar')">Emprestar</button>
                 <button class="pes-btn px-2 py-1 text-[9px] font-bold text-red-700" onclick="handlePlayerAction('vender')">Vender</button>
            </div>

            <div class="grid grid-cols-3 gap-1 px-2 mt-2 text-[10px] bg-gray-100 p-1 rounded border border-gray-200 shadow-inner">
                <div class="flex flex-col"><span class="font-bold text-gray-600">Jogos</span><span><span id="pd-s-jogos">0</span> / <span id="pd-c-jogos">0</span></span></div>
                <div class="flex flex-col"><span class="font-bold text-gray-600">Gols</span><span><span id="pd-s-gols">0</span> / <span id="pd-c-gols">0</span></span></div>
                <div class="flex flex-col"><span class="font-bold text-gray-600">Assist.</span><span><span id="pd-s-ass">0</span> / <span id="pd-c-ass">0</span></span></div>
                <div class="flex flex-col"><span class="font-bold text-gray-600">Amarelos</span><span><span id="pd-s-yel">0</span> / <span id="pd-c-yel">0</span></span></div>
                <div class="flex flex-col"><span class="font-bold text-gray-600">Vermelhos</span><span><span id="pd-s-red">0</span> / <span id="pd-c-red">0</span></span></div>
                <div class="flex flex-col"><span class="font-bold text-gray-600">Nota</span><span><span id="pd-s-nota">--</span> / <span id="pd-c-nota">--</span></span></div>
            </div>
            <div class="px-2 mt-3 text-xs space-y-2">
                <p><strong>Pontos fortes:</strong> <span id="pd-strengths">—</span></p>
                <p><strong>A desenvolver:</strong> <span id="pd-weaknesses">—</span></p>
            </div>
            <div class="px-2 mt-3 pb-2">
                <div class="text-[10px] font-bold text-gray-600 border-b border-gray-300 mb-1">Histórico de Carreira</div>
                <div id="pd-career-history" class="career-history"></div>
            </div>
        </div>
    `;

    // TELA SQUAD (ELENCO)
    if (currentMainView === 'squad') {
        mainContent.innerHTML = `
            <div class="flex flex-col md:flex-row gap-2 h-full w-full">
                <div class="flex-1 bg-white h-full overflow-auto classic-border-inset">
                    <table class="w-full text-left border-collapse squad-table" id="squad-table-el">
                        <thead class="sticky top-0 shadow-sm z-10">
                            <tr>
                                <th class="w-6">P</th><th>Nome</th><th class="w-6" title="Pé">P</th><th class="w-6">F</th>
                                <th class="w-16">Energia</th><th class="w-16">Salário</th><th class="w-16">Passe</th>
                                <th class="w-8">G</th><th class="w-10">Idade</th><th class="w-8">J</th><th class="w-8">A</th><th class="w-8">NM</th>
                            </tr>
                        </thead>
                        <tbody id="squad-tbody"></tbody>
                    </table>
                </div>
                <div class="w-full md:w-[300px] pes-glass border-2 border-gray-500 shrink-0 p-1 shadow-inner h-64 md:h-full overflow-y-auto" id="player-detail-container">
                    <div id="player-detail-box" class="hidden flex-col h-full bg-white border border-gray-400 shadow-md">
                        ${playerDetailHtml}
                    </div>
                    <div id="player-detail-empty" class="h-full flex items-center justify-center text-gray-700 font-bold text-center p-4">
                        Selecione um jogador na tabela para exibir os detalhes e ações.
                    </div>
                </div>
            </div>
        `;
        
        const tbody = document.getElementById('squad-tbody');
        let sortedSquad = [...gameState.mySquad].sort((a, b) => {
            const w = (p) => { let pos = p.split('/')[0]; return pos==='GO'?1:['ZC','LD','LE'].includes(pos)?2:['VOL','MLG','MAT','MLE','MLD'].includes(pos)?3:4; };
            return w(a.pos) - w(b.pos) || b.ovr - a.ovr;
        });
        
        sortedSquad.forEach(p => {
            // Garante que o jogador tenha foto
            if (!p.photoUrl) {
                const seed = `${p.name}_${p.pos}_${gameState.playerTeamId}`;
                p.photoUrl = generatePlayerPhoto(p.name, p.pos, seed);
            }
            
            const tr = document.createElement('tr');
            tr.id = `row-${p.id}`; tr.onclick = () => selectPlayer(p.id);
            let avg = p.sRatings && p.sRatings.length ? (p.sRatings.reduce((a,b)=>a+b,0) / p.sRatings.length).toFixed(1) : '--';
            
            let badges = playerSquadNotices(p);
            if (p.listed) badges += '<i class="fas fa-comment-dollar text-green-600 ml-1" title="À venda"></i>';
            if (p.listedForLoan) badges += '<i class="fas fa-paper-plane text-orange-500 ml-1" title="Disponível para Empréstimo"></i>';
            if (p.isLoan) badges += '<span class="text-[9px] bg-blue-200 text-blue-900 border border-blue-800 px-1 ml-1 rounded font-bold" title="Emprestado ao seu time">EMP</span>';
            if (p.isLoanedOut) badges += '<span class="text-[9px] bg-orange-200 text-orange-900 border border-orange-800 px-1 ml-1 rounded font-bold" title="Emprestado para outro clube">FORA</span>';
            if (p.isYouth) badges += '<span class="text-[9px] bg-yellow-200 text-yellow-800 border border-yellow-600 px-1 ml-1 rounded font-bold" title="Jovem da Base">⭐ BASE</span>';

            tr.innerHTML = `
                <td class="text-center font-bold">${p.pos.split('/')[0]}</td>
                <td class="flex items-center gap-2 py-1">
                    <div class="w-6 h-6 rounded-full bg-gray-300 border border-gray-400 overflow-hidden flex items-center justify-center shrink-0">
                        <img src="${escapeEditorValue(personPhoto(p.photoUrl))}" class="w-full h-full object-cover" onerror="this.onerror=null; this.src=GENERIC_PERSON_PHOTO;">
                        <i class="fas fa-user text-[10px] text-gray-500 hidden"></i>
                    </div>
                    <span>${escapeEditorValue(p.name)}</span><span class="squad-notices">${badges}</span>
                </td>
                <td class="text-center">${p.leg}</td><td class="text-center font-bold">${p.ovr}</td>
                <td class="text-center"><span class="energy-badge ${energyClass(p.energy)}">${Math.round(p.energy)}%</span></td>
                <td class="text-right pr-2">${p.salary}</td><td class="text-right pr-2">${p.value}M</td>
                <td class="text-center">${p.sGoals||0}</td>
                <td class="text-center text-blue-600 font-bold">${p.age}</td>
                <td class="text-center">${p.sGames||0}</td>
                <td class="text-center">${p.sAssists||0}</td><td class="text-center">${avg}</td>
            `;
            tbody.appendChild(tr);
        });
        if(gameState.selectedPlayerId) selectPlayer(gameState.selectedPlayerId);

    // TELA LINEUP (TÁTICAS)
    } else if (currentMainView === 'lineup') {
        const fm = gameState.myLineup.formation;
        const positions = getTacticsPositions();
        
        let pitchHtml = positions.map((pos, idx) => {
            let pId = gameState.myLineup.starters[idx];
            let p = gameState.mySquad.find(x => x.id === pId);
            let isSelected = selectedTacticsSlot === `starter-${idx}` ? 'selected' : '';
            let ovrHtml = '--';
            let avatarHtml = '<i class="fas fa-user text-xs text-gray-500"></i>';
            let playerName = 'Vazio';

            if (p) {
                // Garante que o jogador tenha foto
                if (!p.photoUrl) {
                    const seed = `${p.name}_${p.pos}_${gameState.playerTeamId}`;
                    p.photoUrl = generatePlayerPhoto(p.name, p.pos, seed);
                }
                
                let pen = getPositionPenalty(p.pos, pos.role);
                let displayOvr = Math.max(1, energyRating(p) + pen);
                ovrHtml = pen < 0 ? `<span class="text-red-500 font-black">${displayOvr}</span>` : displayOvr;

                playerName = p.name.split(' ').pop();
                
                avatarHtml = `<img src="${escapeEditorValue(personPhoto(p.photoUrl))}" class="w-full h-full object-cover" onerror="this.onerror=null; this.src=GENERIC_PERSON_PHOTO;"><i class="fas fa-user text-xs text-gray-500 hidden"></i>`;
            }

            return `
                <div class="pitch-marker ${parseFloat(pos.top)>80?'pitch-marker-low':''}" style="position: absolute; top: ${pos.top}; left: ${pos.left}; width: 0; height: 0; pointer-events: none;">
                    <button type="button" id="tactics-player-${idx}" class="pitch-player-avatar ${isSelected}" onclick="clickTacticsPlayer(event, ${idx})" onpointerdown="dragTacticsPlayer(event, ${idx})" onkeydown="keyboardTacticsPlayer(event, ${idx})" aria-label="${escapeEditorValue((p?.name || 'Vaga') + ': ' + pos.role + (idx === 0 ? '. Posição fixa na área defensiva.' : '. Use as setas para mover.'))}" title="${pos.role} · Natural: ${escapeEditorValue(p?.pos || '—')}" style="pointer-events: auto;">
                        ${avatarHtml}
                    </button>
                    <div class="pitch-slot-role">${pos.role}</div>
                    <div class="pitch-player-ovr">${ovrHtml}</div>
                    <div class="pitch-player-energy ${p?energyClass(p.energy):''}">${p?Math.round(p.energy ?? 100)+'%':''}</div>
                    <div class="pitch-player-name">${escapeEditorValue(playerName)}</div>
                </div>
            `;
        }).join('');

        let benchHtml = gameState.myLineup.bench.map((pId, idx) => {
            let p = gameState.mySquad.find(x => x.id === pId);
            if(!p) return '';
            
            // Garante que o jogador tenha foto
            if (!p.photoUrl) {
                const seed = `${p.name}_${p.pos}_${gameState.playerTeamId}`;
                p.photoUrl = generatePlayerPhoto(p.name, p.pos, seed);
            }
            
            const unavailable = !!liveMatch && [...(liveMatch.substitutedOut || []),...(liveMatch.sentOff || [])].includes(p.id);
            let isSelected = selectedTacticsSlot === `bench-${idx}` ? 'bg-blue-900 text-white' : 'hover:bg-gray-200';
            return `
                <div role="button" tabindex="0" aria-disabled="${unavailable}" onkeydown="if(event.key==='Enter' || event.key===' '){event.preventDefault();this.click();}" class="bench-item ${unavailable?'bench-unavailable':''} border-b border-gray-300 p-1 flex justify-between cursor-pointer text-[11px] ${isSelected}" onclick="selectTacticsSlot(${idx}, true)">
                    <div class="flex items-center gap-1">
                        <div class="w-5 h-5 rounded-full bg-gray-300 border border-gray-400 overflow-hidden flex items-center justify-center shrink-0">
                            <img src="${escapeEditorValue(personPhoto(p.photoUrl))}" class="w-full h-full object-cover" onerror="this.onerror=null; this.src=GENERIC_PERSON_PHOTO;">
                            <i class="fas fa-user text-[8px] text-gray-500 hidden"></i>
                        </div>
                        <span class="font-bold w-6 text-center">${p.pos.split('/')[0]}</span> <span>${p.name}${unavailable?'<small class="substitution-status">Já saiu da partida</small>':''}</span>
                    </div>
                    <span class="font-bold text-green-700">${p.ovr}</span>
                </div>
            `;
        }).join('');

        mainContent.innerHTML = `
            <div class="tactics-view bg-white h-full w-full flex flex-col classic-border-inset overflow-hidden shadow-inner">
                <div class="p-1 bg-[#c0c0c0] border-b border-black flex gap-2 items-center shrink-0">
                    <label class="font-bold text-[11px]">Formação:</label>
                    <select aria-label="Formação" onchange="autoLineup(this.value); renderClassicHub();" class="border border-gray-500 bg-white font-bold text-[11px]">
                        ${Object.keys(formationsDB).map(f => `<option value="${f}" ${f === fm ? 'selected' : ''}>${f}</option>`).join('')}
                    </select>
                    <label for="playing-style" class="font-bold text-xs">Estilo:</label><select id="playing-style" onchange="setPlayingStyle(this.value)">${Object.keys(playingStyles).map(style=>`<option ${gameState.myLineup.style===style?'selected':''}>${style}</option>`).join('')}</select>
                    <span class="text-[10px] ml-2 italic text-gray-700 hidden sm:inline">Improvisações sofrem punições (<span class="text-red-600 font-bold">Vermelho</span>).</span>
                </div>
                <p class="style-description">${(playingStyles[gameState.myLineup.style] || playingStyles.Equilibrado).description}</p><div class="tactics-instructions"><span>↑ Ataque · Arraste um jogador de linha ou selecione-o e toque no campo. No teclado, use as setas. Toque em dois jogadores para trocá-los.</span><button class="secondary-button" onclick="resetTacticsPositions()">Restaurar desenho</button></div>
                <div class="tactics-selection" role="status">${selectedTacticsSlot?.startsWith('starter-') ? (() => { const idx = Number(selectedTacticsSlot.split('-')[1]); const player = gameState.mySquad.find(p => p.id === gameState.myLineup.starters[idx]); return `<strong>${escapeEditorValue(player?.name || 'Vaga')}</strong> · Função: ${positions[idx].role} · Natural: ${escapeEditorValue(player?.pos || '—')}`; })() : 'A função tática é definida pela região do campo. As posições naturais permanecem as mesmas.'}</div>
                <div class="flex-1 flex flex-col sm:flex-row overflow-hidden">
                    <div class="flex-1 p-2 bg-[#2e7d32] relative">
                        <div id="tactics-pitch" onclick="moveSelectedOnPitch(event)" class="pitch-container w-full h-full border-2 border-white/50 shadow-inner">
                            <div class="pitch-line-center"></div>
                            <div class="pitch-circle"></div>
                            <div class="pitch-area-top"></div>
                            <div class="pitch-area-bottom"></div>
                            ${pitchHtml}
                        </div>
                    </div>
                    <div class="w-full sm:w-64 bg-white border-l border-gray-400 flex flex-col">
                        <div class="bg-black text-white font-bold text-[11px] p-1 text-center border-b border-black shrink-0">Banco de Reservas</div>
                        <div class="flex-1 overflow-auto bg-gray-50 p-1">
                            ${benchHtml}
                        </div>
                    </div>
                </div>
            </div>
        `;

    // TELA MATCH (TRANSMISSÃO)
    } else if (currentMainView === 'match') {
        if(!liveMatch) { switchView('home'); return; }
        const homeTeam = gameState.teamMap[liveMatch.fixture.home];
        const awayTeam = gameState.teamMap[liveMatch.fixture.away];
        
        let isMyTeam = liveMatch.fixture.home === gameState.playerTeamId || liveMatch.fixture.away === gameState.playerTeamId;

        mainContent.innerHTML = `
            <div class="bg-white h-full w-full flex flex-col classic-border-inset shadow-inner">
                <button class="secondary-button" onclick="showCpuLineup(liveMatch.fixture.home===gameState.playerTeamId?liveMatch.fixture.away:liveMatch.fixture.home)">Escalação adversária</button>
                <div class="bg-gradient-to-b from-gray-800 to-black text-[#ffff00] p-3 flex justify-between font-bold text-lg sm:text-2xl border-b border-gray-600">
                    <span class="truncate text-right flex-1">${homeTeam.name}</span>
                    <span class="text-white mx-4 font-black">${liveMatch.homeScore} x ${liveMatch.awayScore}</span>
                    <span class="truncate text-left flex-1">${awayTeam.name}</span>
                </div>
                <div class="bg-gradient-to-r from-gray-700 via-gray-600 to-gray-700 text-white text-center text-sm py-1 border-b-2 border-[#ffff00] font-mono shadow-md">
                    TEMPO: ${liveMatch.minute > (liveMatch.half === 1 ? 45 : 90) ? (liveMatch.half === 1 ? '45+' : '90+') : liveMatch.minute}' (${liveMatch.half}º T) - ${liveMatch.paused ? (liveMatch.finished ? 'FIM DE JOGO' : 'PAUSADO') : 'ROLANDO'}
                </div>
                
                ${liveMatch.fixture.penaltyHome!==undefined?`<div class="penalty-result">Pênaltis: ${liveMatch.fixture.penaltyHome} × ${liveMatch.fixture.penaltyAway}</div>`:''}
                <div class="flex-1 bg-black p-4 overflow-auto match-event-box border-b border-white text-sm sm:text-base" id="match-events-container">
                    ${liveMatch.events.map(e => `<div class="mb-1">${e}</div>`).join('')}
                </div>
                
                <div class="p-3 bg-gradient-to-b from-gray-300 to-gray-400 flex gap-4 justify-center border-t border-gray-500 h-16 shrink-0 items-center">
                    ${liveMatch.paused 
                        ? (liveMatch.finished
                            ? `<button class="pes-btn font-bold px-8 py-2 text-sm text-green-900" onclick="finishLiveMatch()">Concluir Partida</button>`
                            : `<button class="pes-btn font-bold px-8 py-2 text-sm text-green-900" onclick="resumeLiveMatch()">Continuar Jogo</button>
                               ${isMyTeam ? `<button class="pes-btn font-bold px-6 py-2 text-sm text-blue-900" onclick="switchView('lineup')">Táticas (${liveMatch.subsLeft} subs)</button>` : ''}`)
                        : `<button class="pes-btn font-bold px-8 py-2 text-sm text-red-900" onclick="pauseLiveMatch()">Pausar</button>`
                    }
                </div>
            </div>
        `;

    // TELA AGENDA
    } else if (currentMainView === 'agenda') {
        const myFixtures = gameState.fixtures.filter(f => f.home === gameState.playerTeamId || f.away === gameState.playerTeamId);
        const playedFixtures = myFixtures.filter(f => f.played).sort((a,b) => b.globalWeek - a.globalWeek).slice(0, 5);
        const upcomingFixtures = myFixtures.filter(f => !f.played && f.away !== null).sort((a,b) => a.globalWeek - b.globalWeek).slice(0, 5);
        
        let inboxHtml = (gameState.inbox && gameState.inbox.length > 0) ? gameState.inbox.map((m, messageIndex) => `
            <div class="pes-glass border border-gray-400 bg-white/80 p-2 mb-2 shadow-sm text-[11px] rounded-lg">
                <div class="font-bold text-blue-900 border-b border-gray-300 pb-1 mb-1 flex justify-between">
                    <span>${m.type === 'buy' ? 'Proposta de Compra' : (m.type === 'loan' ? 'Pedido de Empréstimo' : m.type==='contract'?'Aviso de contrato':'Mensagem da Diretoria')}</span>
                </div>
                <div class="mb-2">Assunto: <b>${escapeEditorValue(m.playerName || 'Contrato')}</b>${m.buyerName ? `<br>Clube interessado: ${escapeEditorValue(m.buyerName)}` : ''}<br>${m.type === 'contract' ? escapeEditorValue(m.text) : m.type === 'finance' ? m.offer : `Oferta: <span class="text-green-700 font-bold">$${m.offer}${m.type==='buy'?'M':''}</span>`}</div>
                ${m.type==='contract' && m.playerId ? `<button class="secondary-button" onclick="renewContractNotice(${messageIndex})">Renovar contrato</button>` : ''}
                ${['finance','contract'].includes(m.type) ? `<div class="flex gap-2"><button class="pes-btn px-2 py-0.5 text-xs text-gray-700 font-bold" onclick="rejectOffer('${m.id}')">OK, ciente</button></div>`
                : `<div class="flex gap-2">
                    <button class="pes-btn px-2 py-0.5 text-xs text-green-800 font-bold" onclick="acceptOffer('${m.id}')">Aceitar</button>
                    <button class="pes-btn px-2 py-0.5 text-xs text-red-800 font-bold" onclick="rejectOffer('${m.id}')">Recusar</button>
                </div>`}
            </div>
        `).join('') : '<div class="text-[11px] text-gray-600 font-bold italic bg-white/50 p-2 rounded border border-gray-300">Caixa de entrada vazia.</div>';

        mainContent.innerHTML = `
            <div class="bg-transparent h-full w-full flex flex-col p-1 overflow-auto">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <div class="bg-gradient-to-r from-blue-900 to-gray-800 text-white font-bold p-1 px-2 text-sm border-b-2 border-gray-500 mb-2 shadow-sm rounded-t">Caixa de Mensagens</div>
                        ${inboxHtml}
                    </div>
                    <div>
                        <div class="bg-gradient-to-r from-gray-900 to-gray-800 text-[#ffff00] font-bold p-1 px-2 text-sm border-b-2 border-gray-500 mb-2 shadow-sm rounded-t">Últimos Resultados</div>
                        <div class="space-y-1 mb-4 pes-glass p-2 rounded-b border border-gray-300 shadow-sm">
                            ${playedFixtures.length === 0 ? '<div class="text-[11px] text-gray-600 font-bold italic">Nenhum jogo disputado.</div>' : 
                              playedFixtures.map(f => {
                                  let isHome = f.home === gameState.playerTeamId;
                                let resClass = f.homeScore === f.awayScore ? 'bg-gray-200' : ((isHome && f.homeScore > f.awayScore) || (!isHome && f.awayScore > f.homeScore) ? 'bg-green-100 border-green-400' : 'bg-red-100 border-red-400');
                                let comp = gameState.compMap[f.baseCompId];
                                let compName = comp ? (comp.historyName || comp.name) : 'Oficial';
                                let hTeam = gameState.teamMap[f.home];
                                let aTeam = gameState.teamMap[f.away];
                                return `<div class="mb-1">
                                    <div class="text-[9px] text-gray-500 font-bold text-center uppercase tracking-wider mb-0.5">${compName} - Sem. ${f.globalWeek}</div>
                                    <div class="flex justify-between items-center text-[11px] p-1 border rounded shadow-sm ${resClass}">
                                        <div class="flex items-center gap-1 w-24 justify-end ${isHome ? 'font-bold':''}"><span class="truncate">${hTeam.name}</span> ${hTeam.logoUrl ? `<img src="${hTeam.logoUrl}" class="team-logo-small" onerror="this.style.display='none';">` : ''}</div>
                                        <span class="font-mono bg-white px-2 py-0.5 border border-gray-400 font-bold mx-2 rounded">${f.homeScore} x ${f.awayScore}</span>
                                        <div class="flex items-center gap-1 w-24 justify-start ${!isHome ? 'font-bold':''}">${aTeam.logoUrl ? `<img src="${aTeam.logoUrl}" class="team-logo-small" onerror="this.style.display='none';">` : ''} <span class="truncate">${aTeam.name}</span></div>
                                    </div>
                                </div>`;
                              }).join('')
                            }
                        </div>
                        <div class="bg-gradient-to-r from-gray-700 to-gray-600 text-white font-bold p-1 px-2 text-sm border-b-2 border-gray-500 mb-2 shadow-sm rounded-t">Próximos Jogos</div>
                        <div class="space-y-1 pes-glass p-2 rounded-b border border-gray-300 shadow-sm">
                            ${upcomingFixtures.length === 0 ? '<div class="text-[11px] text-gray-600 font-bold italic">Calendário vazio.</div>' : 
                              upcomingFixtures.map(f => {
                                  let isHome = f.home === gameState.playerTeamId;
                                let comp = gameState.compMap[f.baseCompId];
                                let compName = comp ? (comp.historyName || comp.name) : 'Oficial';
                                let hTeam = gameState.teamMap[f.home];
                                let aTeam = gameState.teamMap[f.away];
                                return `<div class="mb-1">
                                    <div class="text-[9px] text-gray-500 font-bold text-center uppercase tracking-wider mb-0.5">${compName} - Sem. ${f.globalWeek}</div>
                                    <div class="flex justify-between items-center text-[11px] p-1 border border-gray-300 bg-white/70 rounded shadow-sm">
                                        <div class="flex items-center gap-1 w-24 justify-end ${isHome ? 'font-bold text-black':'text-gray-700'}"><span class="truncate">${hTeam.name}</span> ${hTeam.logoUrl ? `<img src="${hTeam.logoUrl}" class="team-logo-small" onerror="this.style.display='none';">` : ''}</div>
                                        <span class="font-mono px-2 py-0.5 text-gray-500 text-[10px] font-bold">VS</span>
                                        <div class="flex items-center gap-1 w-24 justify-start ${!isHome ? 'font-bold text-black':'text-gray-700'}">${aTeam.logoUrl ? `<img src="${aTeam.logoUrl}" class="team-logo-small" onerror="this.style.display='none';">` : ''} <span class="truncate">${aTeam.name}</span></div>
                                    </div>
                                </div>`;
                              }).join('')
                            }
                        </div>
                    </div>
                </div>
            </div>
        `;

    // TELA STANDINGS (TABELAS)
    } else if (currentMainView === 'standings') {
        mainContent.innerHTML = renderCompetitionCenter();

    // TELA MARKET (MERCADO)
    } else if (currentMainView === 'market') {
        if(!marketState.countryId && db.countries.length > 0) marketState.countryId = db.countries[0].id;
        
        const compsInCountry = db.competitions.filter(c => c.countryId === marketState.countryId && (!c.parentId || c.parentId === 'NONE'));
        if (!compsInCountry.length) { marketState.compId=null; marketState.teamId=null; }
        if (compsInCountry.length > 0 && (!marketState.compId || !compsInCountry.find(c => c.id === marketState.compId))) marketState.compId = compsInCountry[0].id;
        
        const teamsInComp = [...getCompetitionTeams(marketState.compId),{id:'__free__',name:'Jogadores sem contrato'}];
        if (teamsInComp.length > 0 && (!marketState.teamId || !teamsInComp.find(t => t.id === marketState.teamId))) marketState.teamId = teamsInComp[0].id;

        let marketHTML = '';
        if(marketState.tab === 'buy') {
            if (teamsInComp.length === 0) {
                marketHTML = `<div class="p-4 text-center text-gray-700 font-bold italic bg-white/50 rounded mt-2">Nenhum clube encontrado nesta competição.</div>`;
            } else {
                const targetTeam = marketState.teamId==='__free__'?{id:'__free__',name:'Jogadores sem contrato'}:gameState.teamMap[marketState.teamId] || db.teams.find(t => t.id === marketState.teamId);
                if (!targetTeam) return;
                
                targetTeam.generatedSquad = clubSquad(targetTeam.id);
                
                // Garante fotos para os jogadores do time alvo
                targetTeam.generatedSquad = ensurePlayerPhotos(targetTeam.generatedSquad, targetTeam.id);
                
                marketHTML = `
                    <div class="bg-white p-1 rounded shadow-md border border-gray-400">
                        <table class="w-full text-left border-collapse squad-table text-xs">
                            <thead class="sticky top-0 bg-gray-200 z-10">
                                <tr><th class="w-8">Pos</th><th>Nome</th><th class="w-8">Pé</th><th class="w-8">OVR</th><th class="w-16">Idade</th><th class="w-24">Valor Est.</th><th class="w-24">Ação</th></tr>
                            </thead>
                            <tbody>
                                ${targetTeam.generatedSquad.sort((a,b) => b.ovr - a.ovr).map(p => `
                                    <tr>
                                        <td class="text-center font-bold">${p.pos.split('/')[0]}</td>
                                        <td class="flex items-center gap-2 py-1">
                                            <div class="w-6 h-6 rounded-full bg-gray-300 border border-gray-400 overflow-hidden flex items-center justify-center shrink-0">
                                                <img src="${escapeEditorValue(personPhoto(p.photoUrl))}" class="w-full h-full object-cover" onerror="this.onerror=null; this.src=GENERIC_PERSON_PHOTO;">
                                                <i class="fas fa-user text-[10px] text-gray-500 hidden"></i>
                                            </div>
                                            <button class="player-profile-link" onclick="openMarketPlayer('${p.id}', '${targetTeam.id}')">${escapeEditorValue(p.name)}</button>
                                        </td>
                                        <td class="text-center">${p.leg}</td><td class="text-center font-bold text-green-700">${p.ovr}</td>
                                        <td class="text-center">${p.age}</td>
                                        <td class="text-center font-bold text-blue-800">${p.value}M</td>
                                        <td class="text-center">
                                            ${marketState.teamId === '__free__' ? `<button class="pes-btn" onclick="signFreeAgentById('${p.id}')">Contratar</button>` : marketState.teamId === gameState.playerTeamId
                                                ? '<span class="text-gray-400 text-[10px] font-bold italic">Seu jogador</span>' 
                                                : `<button class="pes-btn px-2 py-0.5 text-[10px] font-bold text-gray-800" onclick="attemptBuyPlayer('${p.id}', '${targetTeam.id}')">Negociar</button>`}
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `;
            }
        } else if (marketState.tab === 'sell') {
            const listedPlayers = gameState.mySquad.filter(p => p.listed || p.listedForLoan);
            marketHTML = `
                <div class="bg-gradient-to-r from-blue-900 to-gray-800 text-[#ffff00] font-bold p-2 text-sm border-b-2 border-black mb-2 shadow-md rounded-t mt-2">Meus Jogadores Listados</div>
                ${listedPlayers.length === 0 ? '<div class="p-3 text-gray-600 font-bold italic bg-white/50 border border-gray-300 rounded-b shadow-md">Nenhum jogador listado para transferência ou empréstimo.</div>' : `
                <div class="bg-white p-1 rounded-b shadow-md border border-gray-400">
                    <table class="w-full text-left border-collapse squad-table text-xs">
                        <thead class="sticky top-0 bg-gray-200 z-10">
                            <tr><th>Pos</th><th>Nome</th><th>OVR</th><th>Status</th><th>Valor/Salário</th><th>Ação</th></tr>
                        </thead>
                        <tbody>
                            ${listedPlayers.map(p => `
                                <tr>
                                    <td class="text-center font-bold">${p.pos.split('/')[0]}</td>
                                    <td class="flex items-center gap-2 py-1">
                                        <div class="w-6 h-6 rounded-full bg-gray-300 border border-gray-400 overflow-hidden flex items-center justify-center shrink-0">
                                            <img src="${escapeEditorValue(personPhoto(p.photoUrl))}" class="w-full h-full object-cover" onerror="this.onerror=null; this.src=GENERIC_PERSON_PHOTO;">
                                            <i class="fas fa-user text-[10px] text-gray-500 hidden"></i>
                                        </div>
                                        <button class="player-profile-link" onclick="openMarketPlayer('${p.id}', '${gameState.playerTeamId}')">${escapeEditorValue(p.name)}</button>
                                    </td>
                                    <td class="text-center font-bold text-green-700">${p.ovr}</td>
                                    <td class="text-center">${p.listed ? '<span class="text-green-700 font-bold bg-green-100 px-1 rounded border border-green-300">À Venda</span>' : '<span class="text-orange-600 font-bold bg-orange-100 px-1 rounded border border-orange-300">Empréstimo</span>'}</td>
                                    <td class="text-center font-bold">${p.value}M / ${p.salary}</td>
                                    <td class="text-center"><button class="pes-btn px-2 py-0.5 text-[10px] font-bold text-red-800" onclick="cancelList('${p.id}')">Remover da Lista</button></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                `}
                <div class="mt-4 pes-glass border border-gray-400 p-2 text-[10px] font-bold text-gray-700 shadow-sm rounded">Dica: Os clubes geridos pela IA analisam seus jogadores listados e enviam propostas durante o avanço das semanas. Verifique sua Caixa de Entrada na aba Agenda.</div>
            `;
        }

        mainContent.innerHTML = `
            <div class="bg-transparent h-full w-full flex flex-col p-1">
                <div class="flex gap-2 p-2 pes-glass rounded-lg border border-gray-400 shadow-md">
                    <button class="pes-btn px-4 py-1.5 font-bold text-xs ${marketState.tab==='buy'?'text-blue-900 border-blue-500':'text-gray-600'}" onclick="marketState.tab='buy'; switchView('market');"><i class="fas fa-shopping-cart"></i> Comprar / Emprestar</button>
                    <button class="pes-btn px-4 py-1.5 font-bold text-xs ${marketState.tab==='sell'?'text-blue-900 border-blue-500':'text-gray-600'}" onclick="marketState.tab='sell'; switchView('market');"><i class="fas fa-hand-holding-usd"></i> Minhas Vendas</button>
                </div>
                ${marketState.tab === 'buy' ? `
                <div class="pes-glass rounded-lg border border-gray-400 p-2 flex gap-2 shadow-md text-xs items-center shrink-0 flex-wrap mt-2">
                    <span class="font-bold">Filtros:</span>
                    <select onchange="marketState.countryId=this.value; marketState.compId=null; marketState.teamId=null; switchView('market');" class="border border-gray-400 bg-white font-bold p-1 rounded shadow-inner">
                        ${db.countries.map(c => `<option value="${c.id}" ${c.id===marketState.countryId?'selected':''}>${c.name}</option>`).join('')}
                    </select>
                    <select onchange="marketState.compId=this.value; marketState.teamId=null; switchView('market');" class="border border-gray-400 bg-white flex-1 font-bold p-1 rounded shadow-inner">
                        ${compsInCountry.map(c => `<option value="${c.id}" ${c.id===marketState.compId?'selected':''}>${c.name}</option>`).join('')}
                    </select>
                    <select onchange="marketState.teamId=this.value; switchView('market');" class="border border-gray-400 bg-white flex-1 font-bold p-1 rounded shadow-inner">
                        ${teamsInComp.map(t => `<option value="${t.id}" ${t.id===marketState.teamId?'selected':''}>${t.name}</option>`).join('')}
                    </select>
                </div>` : ''}
                <div class="flex-1 overflow-auto p-1 mt-2">
                    ${marketHTML}
                </div>
            </div>
        `;

    // TELA STADIUM (CLUBE)
    } else if (currentMainView === 'stadium') {
        const cap = myTeam.stadiumCapacity || 10000;
        const recPrice = Math.floor(myTeam.rating / 3) + 5; 
        const currentPrice = myTeam.ticketPrice || recPrice;
        const stadiumName = myTeam.stadium || (myTeam.name + " Stadium");
        
        mainContent.innerHTML = `
            <div class="bg-transparent h-full w-full flex flex-col p-4 items-center justify-center relative">
                <div class="absolute inset-0 opacity-10" style="background-image: repeating-linear-gradient(45deg, #000 25%, transparent 25%, transparent 75%, #000 75%, #000); background-position: 0 0, 10px 10px; background-size: 20px 20px;"></div>
                
                <div class="pes-glass rounded-2xl border-2 border-gray-400 p-6 max-w-2xl w-full relative z-10 shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex flex-col gap-6">
                    <div class="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white font-bold p-3 text-center text-xl border-2 border-gray-500 shadow-inner rounded flex justify-between items-center">
                        <span><i class="fas fa-building text-gray-400 mr-2"></i> ${stadiumName}</span>
                        <span class="text-sm bg-gradient-to-b from-green-700 to-green-900 px-3 py-1 rounded-full border border-green-500 shadow-sm drop-shadow-md">OVR: ${myTeam.rating}</span>
                    </div>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div class="bg-white/90 border border-gray-400 rounded-lg p-4 shadow-md">
                            <div class="font-bold text-blue-900 mb-3 text-sm border-b-2 border-gray-300 pb-1 uppercase tracking-wide">Bilheteria e Capacidade</div>
                            <div class="space-y-3 text-xs font-bold text-gray-700">
                                <div class="flex justify-between bg-gray-100 p-2 rounded border border-gray-200"><span>Capacidade Atual:</span> <span class="text-black">${cap.toLocaleString('pt-BR')} lugares</span></div>
                                <div class="flex justify-between items-center bg-gray-100 p-2 rounded border border-gray-200">
                                    <span>Preço do Ingresso ($):</span> 
                                    <input type="number" id="ticket-price-input" value="${currentPrice}" min="1" max="100" class="w-16 border border-gray-400 bg-white font-bold text-center px-1 py-1 rounded shadow-inner text-blue-900" onchange="updateTicketPrice(this.value)">
                                </div>
                                <div class="text-[10px] text-gray-500 italic text-right pr-1">Preço Recomendado (Baseado no OVR): <span class="text-green-700">$${recPrice}</span></div>
                                <div class="mt-4 p-3 bg-yellow-100 border border-yellow-400 text-[10px] text-yellow-900 text-center rounded shadow-sm">
                                    O público comparece com base na força (OVR) do seu time e no preço cobrado. A renda é gerada a cada partida em Casa.
                                </div>
                            </div>
                        </div>

                        <div class="bg-white/90 border border-gray-400 rounded-lg p-4 shadow-md">
                            <div class="font-bold text-blue-900 mb-3 text-sm border-b-2 border-gray-300 pb-1 uppercase tracking-wide">Obras de Ampliação</div>
                            <div class="space-y-2">
                                <div class="flex justify-between text-xs font-bold bg-green-100 border border-green-300 p-2 rounded"><span>Caixa do Clube:</span> <span class="text-green-800">$${myTeam.budget} milhões</span></div>
                                
                                <div class="mt-4 flex flex-col gap-3">
                                    <button class="pes-btn text-xs font-bold py-2 flex justify-between px-4 items-center" onclick="expandStadium(2000, 1.5)">
                                        <span class="text-gray-800"><i class="fas fa-hammer text-gray-500 mr-1"></i> + 2.000 Cadeiras</span><span class="text-red-700 bg-red-100 px-2 rounded border border-red-200">$1.5M</span>
                                    </button>
                                    <button class="pes-btn text-xs font-bold py-2 flex justify-between px-4 items-center" onclick="expandStadium(5000, 3.5)">
                                        <span class="text-gray-800"><i class="fas fa-hammer text-gray-500 mr-1"></i> + 5.000 Cadeiras</span><span class="text-red-700 bg-red-100 px-2 rounded border border-red-200">$3.5M</span>
                                    </button>
                                    <button class="pes-btn text-xs font-bold py-2 flex justify-between px-4 items-center" onclick="expandStadium(15000, 10.0)">
                                        <span class="text-gray-800"><i class="fas fa-hammer text-gray-500 mr-1"></i> + 15.000 Cadeiras</span><span class="text-red-700 bg-red-100 px-2 rounded border border-red-200">$10.0M</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

    // TELA HISTORY (HISTÓRICO)
    } else if (currentMainView === 'scorers') {
        mainContent.innerHTML = renderScorers();
    } else if (currentMainView === 'history') {
        mainContent.innerHTML = renderClubTitleHistory();

    // TELA JOBS (EMPREGOS) - CORRIGIDA PARA EXIBIR FOTOS E NOMES DOS TÉCNICOS
    } else if (currentMainView === 'jobs') {
        const countryId = marketState.countryId || (db.countries.length > 0 ? db.countries[0].id : null);
        const comps = db.competitions.filter(c => c.countryId === countryId && (!c.parentId || c.parentId==='NONE'));
        if(!comps.some(c=>c.id===gameState.jobsCompetition))gameState.jobsCompetition=comps[0]?.id || null;
        const teamsInCountry = gameState.jobsCompetition?getCompetitionTeams(gameState.jobsCompetition).map(t=>gameState.teamMap[t.id] || t).sort((a,b)=>b.rating-a.rating):[];

        let rowsHTML = teamsInCountry.map(t => {
            const isMyTeam = t.id === gameState.playerTeamId;
            const isHumanManaged = t.isHumanManaged || false;
            const status = isMyTeam ? 'Você' : (isHumanManaged ? 'Humano' : 'IA');
            const mgrName = t.managerName || 'Interino';
            
            // CORRIGIDO: Exibe a foto do técnico ou placeholder
            const mgrPhoto = isMyTeam ? (gameState.managerPhoto || t.managerPhotoUrl) : t.managerPhotoUrl;
            const mgrPhotoHtml = personImage(mgrPhoto, 'manager-photo', 'width:32px;height:32px;border-radius:50%;border:2px solid #ccc;object-fit:cover;');

            const tLogo = t.logoUrl ? `<img src="${t.logoUrl}" class="team-logo-small" onerror="this.style.display='none';">` : '';

            return `<tr>
                <td class="flex items-center gap-2 font-bold text-sm tracking-wide" style="color: ${t.color}">${tLogo} <span>${t.name}</span></td>
                <td class="text-center font-bold text-green-700 text-sm bg-green-50 border-r border-gray-300">${t.rating}</td>
                <td class="text-center text-xs font-bold text-gray-700">
                    <div class="flex items-center gap-2 justify-center">
                        ${mgrPhotoHtml}
                        <span class="truncate w-24 text-left">${mgrName}</span>
                    </div>
                </td>
                <td class="text-center italic text-gray-500 text-xs border-l border-gray-300">${status}</td>
                <td class="text-center py-1">
                    ${isMyTeam ? '<span class="text-blue-800 font-bold bg-blue-100 border border-blue-300 px-3 py-1 rounded">Seu Clube</span>' : 
                      (isHumanManaged ? '<span class="text-gray-400 text-xs italic">Treinador Humano</span>' : 
                      `<button class="pes-btn px-3 py-1 text-[10px] font-bold text-gray-800" onclick="applyForJob('${t.id}')">Enviar Currículo</button>`)}
                </td>
            </tr>`;
        }).join('');

        mainContent.innerHTML = `
            <div class="bg-transparent h-full w-full flex flex-col p-1">
                <div class="pes-glass rounded-lg border border-gray-400 p-2 flex gap-2 shadow-md text-xs items-center mb-2">
                    <label class="font-bold ml-2">Explorar Mercado em:</label>
                    <select onchange="marketState.countryId=this.value; switchView('jobs');" class="border border-gray-400 bg-white p-1 font-bold rounded shadow-inner">
                        ${db.countries.map(c => `<option value="${c.id}" ${c.id===countryId?'selected':''}>${c.name}</option>`).join('')}
                    </select><select aria-label="Competição de empregos" onchange="gameState.jobsCompetition=this.value;switchView('jobs')">${comps.map(c=>`<option value="${escapeEditorValue(c.id)}" ${c.id===gameState.jobsCompetition?'selected':''}>${escapeEditorValue(c.name)}</option>`).join('')}</select>
                </div>
                <div class="flex-1 overflow-auto p-1">
                    <div class="bg-gradient-to-r from-blue-900 to-gray-800 text-[#ffff00] font-bold p-2 text-sm mb-1 border-b-2 border-black flex justify-between rounded-t shadow-md">
                        <span><i class="fas fa-briefcase mr-2 text-white"></i> Painel de Vagas para Treinador</span>
                        <span class="bg-black/50 px-2 py-0.5 rounded text-white text-xs">Reputação: <span class="text-green-400">${myTeam.rating + (Object.keys(gameState.titles[gameState.playerTeamId] || {}).length * 1.5)} pts</span></span>
                    </div>
                    <div class="bg-white p-1 rounded-b shadow-md border border-gray-400">
                        <table class="w-full text-left border-collapse squad-table">
                            <thead class="sticky top-0 bg-gray-200 z-10 text-xs">
                                <tr>
                                    <th>Clube</th>
                                    <th class="w-24 text-center">OVR (Exigência)</th>
                                    <th class="w-32 text-center">Treinador Atual</th>
                                    <th class="w-32 text-center">Status da Diretoria</th>
                                    <th class="w-32 text-center">Ação</th>
                                </tr>
                            </thead>
                            <tbody>${rowsHTML}</tbody>
                        </table>
                    </div>
                    <p class="text-[10px] font-bold text-gray-700 mt-3 p-3 pes-glass border border-gray-400 rounded shadow-sm">Dica: Suas chances de ser aceito dependem da força do seu elenco atual e da quantidade de troféus ganhos em sua carreira. Clubes de alto OVR ignoram técnicos inexperientes.</p>
                </div>
            </div>
        `;

    // TELA OPTIONS (SISTEMA)
    } else if (currentMainView === 'options') {
        mainContent.innerHTML = `
            <div class="bg-transparent h-full w-full flex flex-col p-4 items-center justify-center relative">
                <div class="absolute inset-0 opacity-10" style="background-image: repeating-linear-gradient(45deg, #000 25%, transparent 25%, transparent 75%, #000 75%, #000); background-position: 0 0, 10px 10px; background-size: 20px 20px;"></div>
                <div class="pes-glass rounded-2xl border-2 border-gray-400 p-8 flex flex-col items-center gap-6 w-96 shadow-[0_10px_30px_rgba(0,0,0,0.5)] relative z-10">
                    <div class="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-[#ffff00] w-full text-center font-bold p-3 border-2 border-gray-600 rounded shadow-inner tracking-widest text-lg"><i class="fas fa-cogs mr-2 text-gray-400"></i> SISTEMA</div>
                    ${renderSimulationSettings()}
                    <button class="pes-btn w-full py-3 font-bold text-sm text-gray-800 flex items-center justify-center gap-2" onclick="saveGame()"><i class="fas fa-save text-blue-700 text-lg"></i> Salvar Progresso (Download)</button>
                    <button class="pes-btn w-full py-3 font-bold text-sm text-gray-800 flex items-center justify-center gap-2" onclick="document.getElementById('load-game-input').click()"><i class="fas fa-folder-open text-yellow-600 text-lg"></i> Carregar Jogo Salvo</button>
                    <div class="border-t-2 border-dashed border-gray-500 w-full my-2"></div>
                    <button class="pes-btn w-full py-3 font-bold text-sm text-red-900 flex items-center justify-center gap-2" onclick="exitToMenu()"><i class="fas fa-sign-out-alt text-red-700 text-lg"></i> Sair para o Menu Principal</button>
                    <input type="file" id="load-game-input" class="hidden" accept=".json" onchange="loadGame(event)">
                </div>
            </div>
        `;
    }
    if(currentMainView === 'market') {
        mainContent.insertAdjacentHTML('afterbegin',renderPendingOffers()+`<details><summary>Histórico de negociações</summary>${renderTransferHistory()}</details>`);
        if(marketState.teamId && !['__free__',gameState.playerTeamId].includes(marketState.teamId))mainContent.insertAdjacentHTML('afterbegin',`<button class="secondary-button" onclick="showCpuLineup(marketState.teamId)">Ver escalação do clube</button>`);
        if(gameState.selectedPlayerId && gameState.profileTeamId){
            mainContent.insertAdjacentHTML('beforeend',`<section class="market-player-profile"><button class="secondary-button" onclick="gameState.profileTeamId=null;renderClassicHub()">Fechar perfil</button><div id="player-detail-empty" class="hidden"></div><div id="player-detail-box">${playerDetailHtml}</div></section>`);
            selectPlayer(gameState.selectedPlayerId,gameState.profileTeamId);
        }
    }

}

// Funções para tornar globais
window.renderClassicHub = renderClassicHub;
window.advanceWeekManager = advanceWeekManager;
window.switchView = switchView;
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
window.saveGame = saveGame;
window.loadGame = loadGame;
window.exitToMenu = exitToMenu;
window.openEditor = openEditor;
window.closeEditor = closeEditor;
window.switchEditorMode = switchEditorMode;
window.saveEditorChanges = saveEditorChanges;
window.importDB = importDB;
window.importTeam = importTeam;
window.exportDB = exportDB;
window.confirmManagerName = confirmManagerName;
window.generatePlayerPhoto = generatePlayerPhoto;
window.generateManagerPhoto = generateManagerPhoto;
window.ensureAllPhotos = ensureAllPhotos;

// Inicialização
window.onload = () => {
    const savedName = localStorage.getItem('super_manager_manager_name');
    if (savedName) {
        humanManagerName = savedName;
        gameState.managerName = savedName;
        isNameConfirmed = true;
    }
    renderTeamSelection();
};
