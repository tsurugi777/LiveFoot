// app.js - Arquivo Principal com UI Completa (Corrigido com Sistema de Fotos e Verificações)

// ==========================================
// SISTEMA DE GERAÇÃO DE AVATARES E FOTOS (VERSÃO CANVAS)
// ==========================================

const avatarCache = {};

// Função interna que realmente gera o avatar usando Canvas
function _generateAvatar(name, seed = null, size = 60) {
    if (!name) name = 'Jogador';
    
    const seedStr = seed || name;
    
    let hash = 0;
    for (let i = 0; i < seedStr.length; i++) {
        hash = seedStr.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const hue = Math.abs(hash % 360);
    const saturation = 60 + (Math.abs(hash % 20));
    const lightness = 45 + (Math.abs(hash % 30));
    const bgColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    const textColor = lightness > 50 ? '#000000' : '#FFFFFF';
    
    const parts = name.trim().split(' ');
    let initials = parts[0].charAt(0).toUpperCase();
    if (parts.length > 1) {
        initials += parts[parts.length - 1].charAt(0).toUpperCase();
    }
    
    // Usa Canvas para gerar imagem PNG (melhor compatibilidade)
    try {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        
        // Desenha fundo arredondado
        const radius = size / 4;
        ctx.beginPath();
        ctx.moveTo(radius, 0);
        ctx.lineTo(size - radius, 0);
        ctx.quadraticCurveTo(size, 0, size, radius);
        ctx.lineTo(size, size - radius);
        ctx.quadraticCurveTo(size, size, size - radius, size);
        ctx.lineTo(radius, size);
        ctx.quadraticCurveTo(0, size, 0, size - radius);
        ctx.lineTo(0, radius);
        ctx.quadraticCurveTo(0, 0, radius, 0);
        ctx.closePath();
        ctx.fillStyle = bgColor;
        ctx.fill();
        
        // Desenha texto
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `bold ${size * 0.45}px Arial, sans-serif`;
        ctx.fillStyle = textColor;
        ctx.fillText(initials, size/2, size/2 + size*0.08);
        
        return canvas.toDataURL('image/png');
    } catch (e) {
        // Fallback para SVG se canvas falhar
        console.warn('Canvas falhou, usando SVG fallback para', name);
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
            <rect width="${size}" height="${size}" rx="${Math.round(size/4)}" fill="${bgColor}" />
            <text x="${size/2}" y="${size/2 + Math.round(size*0.08)}" font-family="Arial, sans-serif" 
                  font-size="${Math.round(size * 0.45)}" font-weight="bold" 
                  fill="${textColor}" text-anchor="middle" dominant-baseline="central">
                ${initials}
            </text>
        </svg>`;
        
        const encoded = svg
            .replace(/%/g, '%25')
            .replace(/</g, '%3C')
            .replace(/>/g, '%3E')
            .replace(/"/g, '%22')
            .replace(/#/g, '%23')
            .replace(/&/g, '%26');
        
        return `data:image/svg+xml;charset=utf-8,${encoded}`;
    }
}

function getCachedAvatar(key, generator, ...args) {
    if (!avatarCache[key]) {
        avatarCache[key] = generator(...args);
    }
    return avatarCache[key];
}

// Gera um avatar baseado no nome e cor
function generateAvatar(name, seed = null, size = 60) {
    const cacheKey = `${name}_${seed || ''}_${size}`;
    return getCachedAvatar(cacheKey, _generateAvatar, name, seed, size);
}

// Gera foto de jogador com base em nome, posição e time
function generatePlayerPhoto(playerName, position = 'MC', seed = null) {
    const seedStr = seed || `${playerName}_${position}`;
    try {
        return generateAvatar(playerName, seedStr, 80);
    } catch (e) {
        console.warn('Erro ao gerar foto para', playerName);
        return 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2280%22 height=%2280%22%3E%3Crect width=%22100%25%22 height=%22100%25%22 fill=%22%23ccc%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 font-size=%2232%22 fill=%22%23999%22%3E?%3C/text%3E%3C/svg%3E';
    }
}

// Gera foto de técnico
function generateManagerPhoto(managerName, teamName = null, seed = null) {
    const seedStr = seed || `${managerName}_${teamName || 'manager'}`;
    return generateAvatar(managerName, seedStr, 70);
}

// Função para garantir que todos os jogadores tenham foto
function ensurePlayerPhotos(players, teamId = null) {
    if (!players || !Array.isArray(players)) return players;
    
    return players.map(player => {
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
    // Verifica se os elementos principais existem
    const dashboard = document.getElementById('pes-dashboard');
    const overlay = document.getElementById('pes-main-content-overlay');
    const mainContent = document.getElementById('main-content');
    
    if (!dashboard || !overlay || !mainContent) {
        console.error('Elementos principais do hub não encontrados');
        return;
    }
    
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

    document.getElementById('pes-dashboard').classList.add('hidden');
    document.getElementById('pes-main-content-overlay').classList.replace('hidden', 'flex');
    
    const activeNav = navItems.find(i => i.id === currentMainView);
    document.getElementById('pes-content-title').innerText = activeNav ? activeNav.label : (currentMainView === 'match' ? 'Transmissão Ao Vivo' : 'Menu');
    
    const mainContentEl = document.getElementById('main-content');

    // Detalhes do jogador (COM FOTOS GERADAS)
    const playerDetailHtml = `
        <div class="flex flex-col bg-white h-full border border-gray-400 shadow-md">
            <div class="flex bg-black text-[#ffff00] p-2 gap-2 h-32 shrink-0">
                <div class="w-[90px] h-[110px] bg-gray-200 border-2 border-gray-500 flex items-center justify-center shrink-0 -mb-4 z-10 shadow-[2px_2px_5px_rgba(0,0,0,0.5)]">
                     <img id="pd-photo" src="" class="w-full h-full object-cover" style="display: none;" onerror="this.style.display='none'; document.getElementById('pd-photo-fallback').style.display='block';">
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
                <div id="pd-contract">Contrato até: 24/08/2026</div>
                <div class="flex justify-between border-t border-gray-300 pt-1 mt-1">
                    <span>Salário: <span id="pd-salary" class="text-red-700"></span></span>
                    <span>Passe: <span id="pd-value" class="text-blue-700"></span></span>
                </div>
            </div>
            
            <div class="flex gap-1 px-2 mt-2 justify-center border-b border-gray-300 pb-2">
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
            <div class="px-2 mt-1 pb-2">
                <div class="text-[10px] font-bold text-gray-600 border-b border-gray-300 mb-1">Histórico de Carreira</div>
                <div id="pd-career-history" class="text-[9px] max-h-16 overflow-auto"></div>
            </div>
        </div>
    `;

    // TELA SQUAD (ELENCO) - CORRIGIDA
    if (currentMainView === 'squad') {
        mainContentEl.innerHTML = `
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
        if (!tbody) {
            console.error('Elemento squad-tbody não encontrado');
            return;
        }
        
        // Verifica se mySquad existe e é um array
        if (!gameState.mySquad || !Array.isArray(gameState.mySquad)) {
            tbody.innerHTML = '<tr><td colspan="12" class="text-center text-gray-500 py-4">Nenhum jogador no elenco.</td></tr>';
            return;
        }
        
        let sortedSquad = [...gameState.mySquad].sort((a, b) => {
            const w = (p) => { 
                if (!p || !p.pos) return 4;
                let pos = p.pos.split('/')[0]; 
                return pos==='GOL'?1:['ZAG','LTD','LTE'].includes(pos)?2:['VOL','MC','MEI'].includes(pos)?3:4; 
            };
            return (w(a) - w(b)) || (b.ovr - a.ovr);
        });
        
        sortedSquad.forEach(p => {
            // Garante que o jogador tenha foto
            if (!p.photoUrl) {
                const seed = `${p.name}_${p.pos}_${gameState.playerTeamId}`;
                p.photoUrl = generatePlayerPhoto(p.name, p.pos, seed);
            }
            
            const tr = document.createElement('tr');
            tr.id = `row-${p.id}`; 
            tr.onclick = () => selectPlayer(p.id);
            tr.className = 'cursor-pointer hover:bg-gray-100 transition-colors';
            
            let avg = p.sRatings && p.sRatings.length ? (p.sRatings.reduce((a,b)=>a+b,0) / p.sRatings.length).toFixed(1) : '--';
            
            let badges = '';
            if (p.listed) badges += '<i class="fas fa-comment-dollar text-green-600 ml-1" title="À venda"></i>';
            if (p.listedForLoan) badges += '<i class="fas fa-paper-plane text-orange-500 ml-1" title="Disponível para Empréstimo"></i>';
            if (p.isLoan) badges += '<span class="text-[9px] bg-blue-200 text-blue-900 border border-blue-800 px-1 ml-1 rounded font-bold" title="Emprestado ao seu time">EMP</span>';
            if (p.isLoanedOut) badges += '<span class="text-[9px] bg-orange-200 text-orange-900 border border-orange-800 px-1 ml-1 rounded font-bold" title="Emprestado para outro clube">FORA</span>';
            if (p.isYouth) badges += '<span class="text-[9px] bg-yellow-200 text-yellow-800 border border-yellow-600 px-1 ml-1 rounded font-bold" title="Jovem da Base">⭐ BASE</span>';

            // Garantir que valores undefined não quebrem a renderização
            const pos = p.pos ? p.pos.split('/')[0] : '?';
            const leg = p.leg || 'D';
            const ovr = p.ovr || 50;
            const energy = p.energy || 100;
            const salary = p.salary || '0';
            const value = p.value || 0;
            const sGoals = p.sGoals || 0;
            const age = p.age || 20;
            const sGames = p.sGames || 0;
            const sAssists = p.sAssists || 0;

            tr.innerHTML = `
                <td class="text-center font-bold">${pos}</td>
                <td class="flex items-center gap-2 py-1">
                    <div class="w-6 h-6 rounded-full bg-gray-300 border border-gray-400 overflow-hidden flex items-center justify-center shrink-0">
                        <img src="${p.photoUrl}" class="w-full h-full object-cover" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                        <i class="fas fa-user text-[10px] text-gray-500 hidden"></i>
                    </div>
                    <span class="truncate max-w-[120px]">${p.name || 'Jogador'} ${badges}</span>
                </td>
                <td class="text-center">${leg}</td>
                <td class="text-center font-bold">${ovr}</td>
                <td class="text-center"><span class="bg-[#ffff00] px-1 font-bold inline-block border border-black">${energy}%</span></td>
                <td class="text-right pr-2">${salary}</td>
                <td class="text-right pr-2">${value}M</td>
                <td class="text-center">${sGoals}</td>
                <td class="text-center text-blue-600 font-bold">${age}</td>
                <td class="text-center">${sGames}</td>
                <td class="text-center">${sAssists}</td>
                <td class="text-center">${avg}</td>
            `;
            tbody.appendChild(tr);
        });
        
        // Restaura a seleção anterior se existir
        if(gameState.selectedPlayerId) {
            setTimeout(() => selectPlayer(gameState.selectedPlayerId), 50);
        }

    // TELA LINEUP (TÁTICAS) - CORRIGIDA
    } else if (currentMainView === 'lineup') {
        // Verifica se formationsDB existe
        if (typeof formationsDB === 'undefined' || !formationsDB) {
            mainContentEl.innerHTML = `
                <div class="bg-white h-full w-full flex flex-col items-center justify-center classic-border-inset shadow-inner p-4">
                    <div class="text-red-600 font-bold text-lg">Erro: Banco de dados de formações não encontrado.</div>
                    <button class="pes-btn mt-4 px-6 py-2" onclick="switchView('home')">Voltar</button>
                </div>
            `;
            return;
        }
        
        // Verifica se myLineup existe
        if (!gameState.myLineup) {
            gameState.myLineup = {
                formation: '4-4-2',
                starters: [],
                bench: []
            };
        }
        
        const fm = gameState.myLineup.formation || '4-4-2';
        const positions = formationsDB[fm];
        
        if (!positions) {
            mainContentEl.innerHTML = `
                <div class="bg-white h-full w-full flex flex-col items-center justify-center classic-border-inset shadow-inner p-4">
                    <div class="text-red-600 font-bold text-lg">Erro: Formação ${fm} não encontrada.</div>
                    <button class="pes-btn mt-4 px-6 py-2" onclick="switchView('home')">Voltar</button>
                </div>
            `;
            return;
        }
        
        // Garante que starters e bench existam
        if (!gameState.myLineup.starters) {
            gameState.myLineup.starters = [];
        }
        if (!gameState.myLineup.bench) {
            gameState.myLineup.bench = [];
        }
        
        let pitchHtml = positions.map((pos, idx) => {
            let pId = gameState.myLineup.starters[idx];
            let p = pId ? gameState.mySquad.find(x => x.id === pId) : null;
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
                
                let pen = 0;
                if (typeof getPositionPenalty === 'function') {
                    pen = getPositionPenalty(p.pos, pos.role);
                }
                let displayOvr = Math.max(1, (p.ovr || 50) + pen);
                ovrHtml = pen < 0 ? `<span class="text-red-500 font-black">${displayOvr}</span>` : (p.ovr || 50);
                playerName = p.name ? p.name.split(' ').pop() : 'Jogador';
                
                avatarHtml = `<img src="${p.photoUrl}" class="w-full h-full object-cover" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"><i class="fas fa-user text-xs text-gray-500 hidden"></i>`;
            }

            return `
                <div style="position: absolute; top: ${pos.top || '50%'}; left: ${pos.left || '50%'}; width: 0; height: 0; pointer-events: none;">
                    <div class="pitch-player-avatar ${isSelected}" onclick="selectTacticsSlot(${idx}, false)" style="pointer-events: auto;">
                        ${avatarHtml}
                    </div>
                    <div class="pitch-player-ovr">${ovrHtml}</div>
                    <div class="pitch-player-name">${playerName}</div>
                </div>
            `;
        }).join('');

        let benchHtml = '';
        if (gameState.myLineup.bench && gameState.myLineup.bench.length > 0) {
            benchHtml = gameState.myLineup.bench.map((pId, idx) => {
                let p = pId ? gameState.mySquad.find(x => x.id === pId) : null;
                if(!p) return '';
                
                // Garante que o jogador tenha foto
                if (!p.photoUrl) {
                    const seed = `${p.name}_${p.pos}_${gameState.playerTeamId}`;
                    p.photoUrl = generatePlayerPhoto(p.name, p.pos, seed);
                }
                
                let isSelected = selectedTacticsSlot === `bench-${idx}` ? 'bg-blue-900 text-white' : 'hover:bg-gray-200';
                return `
                    <div class="border-b border-gray-300 p-1 flex justify-between cursor-pointer text-[11px] ${isSelected}" onclick="selectTacticsSlot(${idx}, true)">
                        <div class="flex items-center gap-1">
                            <div class="w-5 h-5 rounded-full bg-gray-300 border border-gray-400 overflow-hidden flex items-center justify-center shrink-0">
                                <img src="${p.photoUrl}" class="w-full h-full object-cover" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                                <i class="fas fa-user text-[8px] text-gray-500 hidden"></i>
                            </div>
                            <span class="font-bold w-6 text-center">${p.pos ? p.pos.split('/')[0] : '?'}</span> <span>${p.name || 'Jogador'}</span>
                        </div>
                        <span class="font-bold text-green-700">${p.ovr || 50}</span>
                    </div>
                `;
            }).join('');
        } else {
            benchHtml = '<div class="text-center text-gray-500 text-xs p-2">Banco vazio</div>';
        }

        mainContentEl.innerHTML = `
            <div class="bg-white h-full w-full flex flex-col classic-border-inset overflow-hidden shadow-inner">
                <div class="p-1 bg-[#c0c0c0] border-b border-black flex gap-2 items-center shrink-0 flex-wrap">
                    <label class="font-bold text-[11px]">Formação:</label>
                    <select onchange="autoLineup(this.value); renderClassicHub();" class="border border-gray-500 bg-white font-bold text-[11px]">
                        ${Object.keys(formationsDB).map(f => `<option value="${f}" ${f === fm ? 'selected' : ''}>${f}</option>`).join('')}
                    </select>
                    <span class="text-[10px] ml-2 italic text-gray-700 hidden sm:inline">Improvisações sofrem punições (<span class="text-red-600 font-bold">Vermelho</span>).</span>
                </div>
                <div class="flex-1 flex flex-col sm:flex-row overflow-hidden">
                    <div class="flex-1 p-2 bg-[#2e7d32] relative">
                        <div class="pitch-container w-full h-full border-2 border-white/50 shadow-inner">
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

        mainContentEl.innerHTML = `
            <div class="bg-white h-full w-full flex flex-col classic-border-inset shadow-inner">
                <div class="bg-gradient-to-b from-gray-800 to-black text-[#ffff00] p-3 flex justify-between font-bold text-lg sm:text-2xl border-b border-gray-600">
                    <span class="truncate text-right flex-1">${homeTeam.name}</span>
                    <span class="text-white mx-4 font-black">${liveMatch.homeScore} x ${liveMatch.awayScore}</span>
                    <span class="truncate text-left flex-1">${awayTeam.name}</span>
                </div>
                <div class="bg-gradient-to-r from-gray-700 via-gray-600 to-gray-700 text-white text-center text-sm py-1 border-b-2 border-[#ffff00] font-mono shadow-md">
                    TEMPO: ${liveMatch.minute > (liveMatch.half === 1 ? 45 : 90) ? (liveMatch.half === 1 ? '45+' : '90+') : liveMatch.minute}' (${liveMatch.half}º T) - ${liveMatch.paused ? (liveMatch.minute >= 90 ? 'FIM DE JOGO' : 'PAUSADO') : 'ROLANDO'}
                </div>
                
                <div class="flex-1 bg-black p-4 overflow-auto match-event-box border-b border-white text-sm sm:text-base" id="match-events-container">
                    ${liveMatch.events.map(e => `<div class="mb-1">${e}</div>`).join('')}
                </div>
                
                <div class="p-3 bg-gradient-to-b from-gray-300 to-gray-400 flex gap-4 justify-center border-t border-gray-500 h-16 shrink-0 items-center">
                    ${liveMatch.paused 
                        ? (liveMatch.minute >= 90 
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
        
        let inboxHtml = (gameState.inbox && gameState.inbox.length > 0) ? gameState.inbox.map(m => `
            <div class="pes-glass border border-gray-400 bg-white/80 p-2 mb-2 shadow-sm text-[11px] rounded-lg">
                <div class="font-bold text-blue-900 border-b border-gray-300 pb-1 mb-1 flex justify-between">
                    <span>${m.type === 'buy' ? 'Proposta de Compra' : (m.type === 'loan' ? 'Pedido de Empréstimo' : 'Mensagem da Diretoria')}</span>
                </div>
                <div class="mb-2">Assunto: <b>${m.playerName}</b><br>${m.type === 'finance' ? m.offer : `Oferta: <span class="text-green-700 font-bold">$${m.offer}${m.type==='buy'?'M':''}</span>`}</div>
                ${m.type === 'finance' ? `<div class="flex gap-2"><button class="pes-btn px-2 py-0.5 text-xs text-gray-700 font-bold" onclick="rejectOffer('${m.id}')">OK, ciente</button></div>` 
                : `<div class="flex gap-2">
                    <button class="pes-btn px-2 py-0.5 text-xs text-green-800 font-bold" onclick="acceptOffer('${m.id}')">Aceitar</button>
                    <button class="pes-btn px-2 py-0.5 text-xs text-red-800 font-bold" onclick="rejectOffer('${m.id}')">Recusar</button>
                </div>`}
            </div>
        `).join('') : '<div class="text-[11px] text-gray-600 font-bold italic bg-white/50 p-2 rounded border border-gray-300">Caixa de entrada vazia.</div>';

        mainContentEl.innerHTML = `
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
        if(!marketState.countryId && db.countries.length > 0) marketState.countryId = db.countries[0].id;
        const compsInCountry = db.competitions.filter(c => c.countryId === marketState.countryId);
        
        if (compsInCountry.length > 0 && !marketState.compId) marketState.compId = compsInCountry[0].id;

        let contentHTML = '';
        if (!marketState.compId) {
            contentHTML = `<div class="p-4 text-center text-gray-700 font-bold italic bg-white/50 rounded mt-2">Nenhuma competição encontrada neste país.</div>`;
        } else {
            const comp = gameState.compMap[marketState.compId];
            if (!comp) {
                contentHTML = `<div class="p-4 text-center text-red-600 font-bold">Erro: Competição não encontrada na memória.</div>`;
            } else {
                const isRoot = comp.parentId === 'NONE' || !comp.parentId;
                const currentSeason = gameState.countrySeason[isRoot ? comp.id : comp.parentId] || gameState.currentDate.getFullYear();
                
                if (isRoot) {
                    let gStandings = gameState.globalStandings[currentSeason] && gameState.globalStandings[currentSeason][comp.id];
                    if (!gStandings || Object.keys(gStandings).length === 0) {
                        contentHTML += `<div class="p-4 text-center text-gray-600 font-bold italic bg-white/50 rounded mt-2">Nenhum dado agregado disponível.</div>`;
                    } else {
                        let sorted = Object.keys(gStandings).map(id => ({id, ...gStandings[id]})).sort((a,b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
                        contentHTML += `
                            <div class="mb-4">
                                <div class="bg-gradient-to-r from-blue-900 to-gray-800 text-white font-bold p-2 border-b-2 border-black mb-1 flex justify-between shadow-md rounded-t">
                                    <span>Tabela Anual Agregada (Geral) - ${currentSeason}</span>
                                    <span class="text-xs font-normal opacity-80">Soma de todas as fases</span>
                                </div>
                                <div class="bg-white p-1 rounded-b shadow-md border border-gray-400">
                                    <table class="w-full text-left border-collapse squad-table text-xs">
                                        <thead class="sticky top-0 bg-gray-200">
                                            <tr><th class="w-8">Pos</th><th>Clube</th><th class="w-8">Pts</th><th class="w-8">J</th><th class="w-8">V</th><th class="w-8">E</th><th class="w-8">D</th><th class="w-8">SG</th></tr>
                                        </thead>
                                        <tbody>
                                            ${sorted.map((t, idx) => {
                                                let teamObj = gameState.teamMap[t.id];
                                                return `<tr class="${t.id === gameState.playerTeamId ? 'bg-yellow-100 font-bold' : ''}">
                                                    <td class="text-center font-bold text-gray-600">${idx+1}º</td>
                                                    <td class="flex items-center gap-1"><span class="truncate max-w-[120px]">${teamObj ? teamObj.name : t.id}</span> ${teamObj && teamObj.logoUrl ? `<img src="${teamObj.logoUrl}" class="w-4 h-4 object-contain" onerror="this.style.display='none';">` : ''}</td>
                                                    <td class="text-center font-bold text-blue-800">${t.pts}</td><td class="text-center">${t.played}</td>
                                                    <td class="text-center">${t.won}</td><td class="text-center">${t.drawn}</td><td class="text-center">${t.lost}</td><td class="text-center">${t.gd > 0 ? '+'+t.gd : t.gd}</td>
                                                </tr>`;
                                            }).join('')}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        `;
                    }
                }

                if (comp.phases && comp.phases.length > 0) {
                    comp.phases.forEach((phase, phaseIdx) => {
                        const phaseKey = phase.id + "_" + currentSeason;
                        const standings = gameState.standings[phaseKey];
                        
                        contentHTML += `<div class="bg-gradient-to-r from-gray-900 to-gray-700 text-[#ffff00] font-bold p-2 text-sm border-b-2 border-black mt-4 mb-1 uppercase shadow-md rounded-t flex justify-between items-center">
                            <span>${phaseIdx+1}. ${phase.name}</span>
                            <span class="text-xs text-white opacity-80">${phase.type === 'KNOCKOUT' ? 'Mata-Mata' : 'Tabela'}</span>
                        </div>`;
                        
                        if (!standings || Object.keys(standings).length === 0) {
                             contentHTML += `<div class="p-3 text-sm text-gray-600 font-bold italic bg-white/50 border border-gray-300 rounded-b shadow-md">Fase não iniciada ou sem times alocados.</div>`;
                        } else if (phase.type === 'KNOCKOUT') {
                            const phaseFixtures = gameState.fixtures.filter(f => f.compId === phase.id && f.season === currentSeason);
                            if(phaseFixtures.length === 0) contentHTML += `<div class="p-3 text-sm text-gray-600 font-bold italic bg-white/50 border border-gray-300 rounded-b shadow-md">Confrontos em definição...</div>`;
                            else contentHTML += renderKnockoutBracketsHTML(phaseFixtures, phase);
                        } else if (phase.type === 'GROUPS') {
                            let groups = {};
                            Object.keys(standings).forEach(id => {
                                let g = standings[id].groupId;
                                if(!groups[g]) groups[g] = [];
                                groups[g].push({id, ...standings[id]});
                            });
                            contentHTML += `<div class="grid grid-cols-1 lg:grid-cols-2 gap-4 bg-white p-2 rounded-b shadow-md border border-gray-400">`;
                            Object.keys(groups).sort().forEach(g => {
                                let sorted = groups[g].sort((a,b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
                                contentHTML += `<div><div class="font-bold text-xs bg-gray-300 border-t border-l border-r border-gray-400 p-1 mt-1 rounded-t">Grupo ${g}</div>`;
                                contentHTML += `<table class="w-full text-left border-collapse squad-table text-xs border-b border-l border-r border-gray-400"><thead class="sticky top-0 bg-gray-200"><tr><th class="w-6">Pos</th><th>Clube</th><th class="w-8">Pts</th><th class="w-6">J</th><th class="w-8">SG</th></tr></thead><tbody>`;
                                contentHTML += sorted.map((t, idx) => {
                                    let teamObj = gameState.teamMap[t.id];
                                    let seedLabel = '';
                                    if (phase.seedingByPrevPhase && idx === 0) seedLabel = ' 🏅';
                                    return `<tr class="${t.id === gameState.playerTeamId ? 'bg-yellow-100 font-bold' : ''}"><td class="text-center font-bold text-gray-600">${idx+1}º${seedLabel}</td><td class="flex items-center gap-1"><span class="truncate max-w-[100px]">${teamObj ? teamObj.name : t.id}</span> ${teamObj && teamObj.logoUrl ? `<img src="${teamObj.logoUrl}" class="w-4 h-4 object-contain" onerror="this.style.display='none';">` : ''}</td><td class="text-center font-bold text-blue-800">${t.pts}</td><td class="text-center">${t.played}</td><td class="text-center">${t.gd > 0 ? '+'+t.gd : t.gd}</td></tr>`;
                                }).join('');
                                contentHTML += `</tbody></table></div>`;
                            });
                            contentHTML += `</div>`;
                        } else {
                            let sorted = Object.keys(standings).map(id => ({id, ...standings[id]})).sort((a,b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
                            contentHTML += `
                                <div class="bg-white p-1 rounded-b shadow-md border border-gray-400">
                                    <table class="w-full text-left border-collapse squad-table text-xs">
                                        <thead class="sticky top-0 bg-gray-200">
                                            <tr><th class="w-8">Pos</th><th>Clube</th><th class="w-8">Pts</th><th class="w-8">J</th><th class="w-8">V</th><th class="w-8">E</th><th class="w-8">D</th><th class="w-8">SG</th></tr>
                                        </thead>
                                        <tbody>
                                            ${sorted.map((t, idx) => {
                                                let teamObj = gameState.teamMap[t.id];
                                                return `<tr class="${t.id === gameState.playerTeamId ? 'bg-yellow-100 font-bold' : ''}">
                                                    <td class="text-center font-bold text-gray-600">${idx+1}º</td>
                                                    <td class="flex items-center gap-1"><span class="truncate max-w-[120px]">${teamObj ? teamObj.name : t.id}</span> ${teamObj && teamObj.logoUrl ? `<img src="${teamObj.logoUrl}" class="w-4 h-4 object-contain" onerror="this.style.display='none';">` : ''}</td>
                                                    <td class="text-center font-bold text-blue-800">${t.pts}</td><td class="text-center">${t.played}</td>
                                                    <td class="text-center">${t.won}</td><td class="text-center">${t.drawn}</td><td class="text-center">${t.lost}</td><td class="text-center">${t.gd > 0 ? '+'+t.gd : t.gd}</td>
                                                </tr>`;
                                            }).join('')}
                                        </tbody>
                                    </table>
                                </div>
                            `;
                        }
                    });
                }
            }
        }

        mainContentEl.innerHTML = `
            <div class="bg-transparent h-full w-full flex flex-col p-1">
                <div class="pes-glass rounded-lg border border-gray-400 p-2 flex gap-2 shadow-md text-xs items-center shrink-0 flex-wrap">
                    <span class="font-bold">Filtros:</span>
                    <select onchange="marketState.countryId=this.value; marketState.compId=null; switchView('standings');" class="border border-gray-400 bg-white font-bold p-1 rounded shadow-inner">
                        ${db.countries.map(c => `<option value="${c.id}" ${c.id===marketState.countryId?'selected':''}>${c.name}</option>`).join('')}
                    </select>
                    <select onchange="marketState.compId=this.value; switchView('standings');" class="border border-gray-400 bg-white flex-1 font-bold p-1 rounded shadow-inner">
                        ${compsInCountry.map(c => `<option value="${c.id}" ${c.id===marketState.compId?'selected':''}>${c.parentId && c.parentId !== 'NONE' ? '&nbsp;&nbsp;↳ ' : ''}${c.name}</option>`).join('')}
                    </select>
                    <button class="pes-btn px-3 py-1 text-[10px] font-bold shrink-0 flex items-center gap-1 text-blue-900" onclick="showCompetitionRules('${marketState.compId}')">
                        <i class="fas fa-info-circle"></i> Regulamento
                    </button>
                </div>
                <div class="flex-1 overflow-auto p-1 mt-2">
                    ${contentHTML}
                </div>
            </div>
        `;

    // TELA MARKET (MERCADO)
    } else if (currentMainView === 'market') {
        if(!marketState.countryId && db.countries.length > 0) marketState.countryId = db.countries[0].id;
        
        const compsInCountry = db.competitions.filter(c => c.countryId === marketState.countryId);
        if (compsInCountry.length > 0 && (!marketState.compId || !compsInCountry.find(c => c.id === marketState.compId))) marketState.compId = compsInCountry[0].id;
        
        const teamsInComp = db.teams.filter(t => t.compId === marketState.compId);
        if (teamsInComp.length > 0 && (!marketState.teamId || !teamsInComp.find(t => t.id === marketState.teamId))) marketState.teamId = teamsInComp[0].id;

        let marketHTML = '';
        if(marketState.tab === 'buy') {
            if (teamsInComp.length === 0) {
                marketHTML = `<div class="p-4 text-center text-gray-700 font-bold italic bg-white/50 rounded mt-2">Nenhum clube encontrado nesta competição.</div>`;
            } else {
                const targetTeam = gameState.teamMap[marketState.teamId] || db.teams.find(t => t.id === marketState.teamId);
                if (!targetTeam) return;
                
                if(!targetTeam.generatedSquad) targetTeam.generatedSquad = generateSquad(targetTeam.id, targetTeam.rating);
                
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
                                                <img src="${p.photoUrl}" class="w-full h-full object-cover" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                                                <i class="fas fa-user text-[10px] text-gray-500 hidden"></i>
                                            </div>
                                            <span class="truncate max-w-[120px]">${p.name}</span>
                                        </td>
                                        <td class="text-center">${p.leg}</td><td class="text-center font-bold text-green-700">${p.ovr}</td>
                                        <td class="text-center">${p.age}</td>
                                        <td class="text-center font-bold text-blue-800">${p.value}M</td>
                                        <td class="text-center">
                                            ${marketState.teamId === gameState.playerTeamId 
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
                                            <img src="${p.photoUrl}" class="w-full h-full object-cover" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                                            <i class="fas fa-user text-[10px] text-gray-500 hidden"></i>
                                        </div>
                                        <span class="truncate max-w-[120px]">${p.name}</span>
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

        mainContentEl.innerHTML = `
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
        
        mainContentEl.innerHTML = `
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
    } else if (currentMainView === 'history') {
        if(!marketState.countryId && db.countries.length > 0) marketState.countryId = db.countries[0].id;
        
        let historyHTML = '';
        let myTitles = gameState.titles[gameState.playerTeamId] || {};
        
        historyHTML += `<div class="p-3 border border-gray-400 bg-white/90 rounded-lg shadow-md mb-4"><div class="font-bold text-sm text-blue-900 border-b border-gray-300 pb-1 mb-2 uppercase tracking-wide">Troféus Conquistados (${myTeam.name}):</div><div class="flex flex-wrap gap-2">`;
        if (Object.keys(myTitles).length === 0) {
            historyHTML += `<span class="text-xs text-gray-500 font-bold italic">Nenhum título conquistado pelo clube.</span>`;
        } else {
            Object.keys(myTitles).forEach(compId => {
                let comp = gameState.compMap[compId];
                historyHTML += `<div class="bg-gradient-to-r from-yellow-200 to-yellow-100 border border-yellow-500 px-3 py-1.5 text-xs font-bold shadow-sm rounded-md flex items-center gap-2"><i class="fas fa-trophy text-yellow-600 text-lg drop-shadow"></i> <span>${myTitles[compId]}x ${comp ? comp.name : 'Torneio'}</span></div>`;
            });
        }
        historyHTML += `</div></div>`;
        
        let countryObj = db.countries.find(c=>c.id===marketState.countryId);
        const countryHistory = (gameState.history || []).filter(h => {
             let c = gameState.compMap[h.targetCompId];
             return c && c.countryId === marketState.countryId;
        });
        
        historyHTML += `<div class="p-2 font-bold text-sm bg-gradient-to-r from-gray-900 to-gray-700 text-[#ffff00] border-b-2 border-black flex justify-between items-center shadow-md rounded-t uppercase tracking-wide">
            <span><i class="fas fa-book-open mr-2 text-white"></i> Histórico da Simulação - ${countryObj ? countryObj.name : ''}</span>
        </div>`;
        
        if (countryHistory.length === 0) {
            historyHTML += `<div class="p-4 text-center text-xs font-bold text-gray-600 bg-white/50 border border-gray-300 rounded-b shadow-md italic">Nenhum registro de campeão nesta simulação ainda.</div>`;
        } else {
            let sortedHist = [...countryHistory].sort((a,b) => b.season - a.season);
            historyHTML += `<div class="bg-white p-1 rounded-b shadow-md border border-gray-400"><table class="w-full text-left border-collapse squad-table text-xs">
                <thead class="sticky top-0 bg-gray-200"><tr><th class="w-16">Ano</th><th>Torneio</th><th>Campeão</th></tr></thead>
                <tbody>
                ${sortedHist.map(h => `
                    <tr><td class="text-center font-bold text-gray-600">${h.season}</td><td class="font-bold text-gray-800">${h.originName}</td><td class="font-bold tracking-wide" style="color: ${gameState.teamMap[h.teamId] ? gameState.teamMap[h.teamId].color : '#000'}">${gameState.teamMap[h.teamId] ? gameState.teamMap[h.teamId].name : 'Desconhecido'}</td></tr>
                `).join('')}
                </tbody>
            </table></div>`;
        }
        
        mainContentEl.innerHTML = `
            <div class="bg-transparent h-full w-full flex flex-col p-1">
                <div class="pes-glass rounded-lg border border-gray-400 p-2 flex gap-2 shadow-md text-xs items-center mb-2">
                    <label class="font-bold p-0.5">Filtrar Histórico do País:</label>
                    <select onchange="marketState.countryId=this.value; switchView('history');" class="border border-gray-400 bg-white font-bold p-1 rounded shadow-inner">
                        ${db.countries.map(c => `<option value="${c.id}" ${c.id===marketState.countryId?'selected':''}>${c.name}</option>`).join('')}
                    </select>
                </div>
                <div class="flex-1 overflow-auto flex flex-col">
                    ${historyHTML}
                </div>
            </div>
        `;

    // TELA JOBS (EMPREGOS)
    } else if (currentMainView === 'jobs') {
        const countryId = marketState.countryId || (db.countries.length > 0 ? db.countries[0].id : null);
        const comps = db.competitions.filter(c => c.countryId === countryId);
        const compIds = comps.map(c => c.id);
        const teamsInCountry = db.teams.filter(t => compIds.includes(t.compId)).sort((a,b) => b.rating - a.rating);

        let rowsHTML = teamsInCountry.map(t => {
            const isMyTeam = t.id === gameState.playerTeamId;
            const isHumanManaged = t.isHumanManaged || false;
            const status = isMyTeam ? 'Você' : (isHumanManaged ? 'Humano' : 'IA');
            const mgrName = t.managerName || 'Interino';
            
            let mgrPhotoHtml = '';
            if (isMyTeam || isHumanManaged) {
                const mgrPhoto = generateManagerPhoto(mgrName, t.name, t.id);
                mgrPhotoHtml = `<img src="${mgrPhoto}" class="manager-photo" style="width:32px;height:32px;border-radius:50%;border:2px solid #4ade80;object-fit:cover;">`;
            } else if (t.managerPhotoUrl) {
                mgrPhotoHtml = `<img src="${t.managerPhotoUrl}" class="manager-photo" style="width:32px;height:32px;border-radius:50%;border:2px solid #ccc;object-fit:cover;" onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\\'manager-photo-placeholder\\' style=\\'width:32px;height:32px;border-radius:50%;background:#ddd;display:flex;align-items:center;justify-content:center;\\'><i class=\\'fas fa-user-tie\\'></i></div>';">`;
            } else {
                t.managerPhotoUrl = generateManagerPhoto(mgrName, t.name, t.id);
                mgrPhotoHtml = `<img src="${t.managerPhotoUrl}" class="manager-photo" style="width:32px;height:32px;border-radius:50%;border:2px solid #ccc;object-fit:cover;">`;
            }
            
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

        mainContentEl.innerHTML = `
            <div class="bg-transparent h-full w-full flex flex-col p-1">
                <div class="pes-glass rounded-lg border border-gray-400 p-2 flex gap-2 shadow-md text-xs items-center mb-2">
                    <label class="font-bold ml-2">Explorar Mercado em:</label>
                    <select onchange="marketState.countryId=this.value; switchView('jobs');" class="border border-gray-400 bg-white p-1 font-bold rounded shadow-inner">
                        ${db.countries.map(c => `<option value="${c.id}" ${c.id===countryId?'selected':''}>${c.name}</option>`).join('')}
                    </select>
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
        mainContentEl.innerHTML = `
            <div class="bg-transparent h-full w-full flex flex-col p-4 items-center justify-center relative">
                <div class="absolute inset-0 opacity-10" style="background-image: repeating-linear-gradient(45deg, #000 25%, transparent 25%, transparent 75%, #000 75%, #000); background-position: 0 0, 10px 10px; background-size: 20px 20px;"></div>
                <div class="pes-glass rounded-2xl border-2 border-gray-400 p-8 flex flex-col items-center gap-6 w-96 shadow-[0_10px_30px_rgba(0,0,0,0.5)] relative z-10">
                    <div class="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-[#ffff00] w-full text-center font-bold p-3 border-2 border-gray-600 rounded shadow-inner tracking-widest text-lg"><i class="fas fa-cogs mr-2 text-gray-400"></i> SYSTEM SETTINGS</div>
                    <button class="pes-btn w-full py-3 font-bold text-sm text-gray-800 flex items-center justify-center gap-2" onclick="saveGame()"><i class="fas fa-save text-blue-700 text-lg"></i> Salvar Progresso (Download)</button>
                    <button class="pes-btn w-full py-3 font-bold text-sm text-gray-800 flex items-center justify-center gap-2" onclick="document.getElementById('load-game-input').click()"><i class="fas fa-folder-open text-yellow-600 text-lg"></i> Carregar Jogo Salvo</button>
                    <div class="border-t-2 border-dashed border-gray-500 w-full my-2"></div>
                    <button class="pes-btn w-full py-3 font-bold text-sm text-red-900 flex items-center justify-center gap-2" onclick="exitToMenu()"><i class="fas fa-sign-out-alt text-red-700 text-lg"></i> Sair para o Menu Principal</button>
                    <input type="file" id="load-game-input" class="hidden" accept=".json" onchange="loadGame(event)">
                </div>
            </div>
        `;
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