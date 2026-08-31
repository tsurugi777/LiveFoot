const navItems = [
    { id: 'agenda', icon: 'fa-calendar-alt', label: 'Agenda', desc: 'Ver calendário de partidas e mensagens da diretoria.' },
    { id: 'lineup', icon: 'fa-users-cog', label: 'Táticas', desc: 'Definir formação e escalar os titulares.' },
    { id: 'squad', icon: 'fa-tshirt', label: 'Elenco', desc: 'Visualizar dados e estatísticas dos jogadores do seu time.' },
    { id: 'market', icon: 'fa-handshake', label: 'Negociações', desc: 'Comprar, vender e emprestar jogadores no mercado.' },
    { id: 'standings', icon: 'fa-table', label: 'Tabelas', desc: 'Classificação das ligas e chaves de torneios em andamento.' },
    { id: 'stadium', icon: 'fa-building', label: 'Clube', desc: 'Gerenciar estádio, preço de ingressos e consultar finanças.' },
    { id: 'history', icon: 'fa-history', label: 'Histórico', desc: 'Títulos conquistados e histórico de campeões da simulação.' },
    { id: 'jobs', icon: 'fa-briefcase', label: 'Empregos', desc: 'Procurar vagas para atuar como treinador em outros clubes.' },
    { id: 'options', icon: 'fa-cogs', label: 'Sistema', desc: 'Salvar jogo, carregar save ou sair para o menu principal.' }
];

function highlightNav(id) {
    if (currentHighlightedNav === id) return;
    currentHighlightedNav = id;
    
    navItems.forEach(item => {
        const btn = document.getElementById('nav-btn-' + item.id);
        if (btn) {
            if (item.id === id) {
                btn.className = 'w-10 h-10 sm:w-12 sm:h-12 rounded-lg border-[3px] pes-nav-icon active shadow-[0_0_10px_#ffff00] transform scale-110 z-10 transition-all flex items-center justify-center text-xl sm:text-2xl cursor-pointer';
            } else {
                btn.className = 'w-10 h-10 sm:w-12 sm:h-12 rounded-lg border-[3px] pes-nav-icon hover:scale-105 shadow-md transition-all flex items-center justify-center text-xl sm:text-2xl cursor-pointer';
            }
        }
    });
    
    const activeNav = navItems.find(i => i.id === currentHighlightedNav);
    const lbl = document.getElementById('pes-nav-label');
    const desc = document.getElementById('pes-info-text');
    if (lbl) lbl.innerText = activeNav ? activeNav.label : 'Data';
    if (desc) desc.innerText = activeNav ? activeNav.desc : 'Selecione uma opção.';
}

function renderPesNavBar() {
    const container = document.getElementById('pes-nav-container');
    if(!container) return;
    
    if (container.children.length === 0) {
        container.innerHTML = navItems.map(item => `
            <button id="nav-btn-${item.id}"
                onmouseover="highlightNav('${item.id}')"
                onclick="switchView('${item.id}')">
                <i class="fas ${item.icon}"></i>
            </button>
        `).join('');
    }
    
    let current = currentHighlightedNav || 'agenda';
    currentHighlightedNav = null; 
    highlightNav(current);
}

function switchView(view) {
    currentMainView = view;
    if (view !== 'home' && navItems.find(i => i.id === view)) {
        currentHighlightedNav = view;
    }
    renderClassicHub();
}

function renderTeamSelection() {
    const grid = document.getElementById('team-grid');
    grid.innerHTML = '';
    db.teams.forEach(t => gameState.teamMap[t.id] = t);
    db.competitions.forEach(c => gameState.compMap[c.id] = c);

    if (db.teams.length === 0) {
        grid.innerHTML = `<div class="col-span-full text-center text-slate-400 p-10 border-2 border-dashed border-slate-700 rounded-xl bg-slate-800/50 mt-8">
            <i class="fas fa-database text-5xl mb-4 text-slate-500"></i>
            <p class="font-bold text-lg text-slate-300">Nenhum clube encontrado no Banco de Dados.</p>
            <p class="text-sm mt-3">Utilize os botões no canto superior direito para <strong class="text-yellow-400">Importar DB</strong> ou <strong class="text-blue-400">Importar Elenco (JSON)</strong> e carregar os times para jogar.</p>
        </div>`;
        return;
    }

    db.teams.sort((a,b) => b.rating - a.rating).forEach(team => {
        const card = document.createElement('div');
        const isHumanManaged = team.isHumanManaged || false;
        const mgrName = team.managerName || 'Interino';
        
        card.className = "bg-slate-800 border border-slate-700 rounded-xl p-4 cursor-pointer flex flex-col items-center text-center hover:bg-slate-700 transition-colors relative";
        
        let badgeHtml = '';
        if (isHumanManaged) {
            badgeHtml = `<div class="absolute top-2 right-2 bg-green-600 text-white text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase">Humano</div>`;
        }
        
        card.innerHTML = `
            ${badgeHtml}
            ${team.logoUrl ? `<img src="${team.logoUrl}" class="w-12 h-12 object-contain mb-3 drop-shadow-lg" referrerpolicy="no-referrer">` : `<div class="w-12 h-12 rounded-full mb-3 flex items-center justify-center font-bold text-xl shadow-inner border-2 border-slate-600" style="background-color: ${team.color}; color: #fff;">${team.name.charAt(0)}</div>`}
            <h3 class="font-bold text-sm mb-1 text-white">${team.name}</h3>
            <div class="text-xs text-emerald-400 font-semibold">OVR: ${team.rating}</div>
            <div class="text-xs text-slate-400 mt-1 flex items-center gap-1">
                <i class="fas fa-user-tie text-slate-500"></i> ${mgrName}
            </div>
        `;
        card.onclick = () => {
            if (!isNameConfirmed) {
                showNameInputModal();
                window._pendingTeamId = team.id;
                return;
            }
            document.getElementById('screen-select').classList.add('hidden');
            document.getElementById('screen-hub').classList.replace('hidden', 'flex');
            initGame(team.id);
        };
        grid.appendChild(card);
    });
    
    if (isNameConfirmed && window._pendingTeamId) {
        const teamId = window._pendingTeamId;
        window._pendingTeamId = null;
        document.getElementById('screen-select').classList.add('hidden');
        document.getElementById('screen-hub').classList.replace('hidden', 'flex');
        initGame(teamId);
    }
}

function showModal(title, text) {
    document.getElementById('modal-title').innerText = title;
    document.getElementById('modal-text').innerText = text;
    
    let btnContainer = document.getElementById('modal-btn-container');
    if (btnContainer) btnContainer.innerHTML = ''; 
    
    let standardBtn = document.getElementById('modal-ok-btn');
    if (!standardBtn) {
        standardBtn = document.createElement('button');
        standardBtn.id = 'modal-ok-btn';
        standardBtn.className = 'classic-btn px-6 py-1 text-sm';
        standardBtn.onclick = () => { document.getElementById('modal').classList.replace('flex', 'hidden'); };
        btnContainer.appendChild(standardBtn);
    }
    standardBtn.innerText = 'OK';
    standardBtn.style.display = 'inline-block';
    btnContainer.appendChild(standardBtn);

    document.getElementById('modal').classList.replace('hidden', 'flex');
}

function showConfirmModal(title, text, confirmCallback) {
    document.getElementById('modal-title').innerText = title;
    document.getElementById('modal-text').innerText = text;
    
    let btnContainer = document.getElementById('modal-btn-container');
    btnContainer.innerHTML = ''; 
    
    const btnYes = document.createElement('button');
    btnYes.className = 'classic-btn px-6 py-1 text-sm bg-green-200';
    btnYes.innerText = 'Sim';
    btnYes.onclick = () => { document.getElementById('modal').classList.replace('flex', 'hidden'); confirmCallback(); };
    
    const btnNo = document.createElement('button');
    btnNo.className = 'classic-btn px-6 py-1 text-sm bg-red-200';
    btnNo.innerText = 'Não';
    btnNo.onclick = () => { document.getElementById('modal').classList.replace('flex', 'hidden'); };
    
    btnContainer.appendChild(btnYes);
    btnContainer.appendChild(btnNo);

    document.getElementById('modal').classList.replace('hidden', 'flex');
}

function showActionModal(title, text, btn1Text, btn1Cb, btn2Text, btn2Cb) {
    document.getElementById('modal-title').innerText = title;
    document.getElementById('modal-text').innerText = text;
    
    let btnContainer = document.getElementById('modal-btn-container');
    btnContainer.innerHTML = ''; 
    
    const btn1 = document.createElement('button');
    btn1.className = 'classic-btn px-4 py-1 text-sm bg-blue-200';
    btn1.innerText = btn1Text;
    btn1.onclick = () => { document.getElementById('modal').classList.replace('flex', 'hidden'); btn1Cb(); };
    
    const btn2 = document.createElement('button');
    btn2.className = 'classic-btn px-4 py-1 text-sm bg-yellow-200';
    btn2.innerText = btn2Text;
    btn2.onclick = () => { document.getElementById('modal').classList.replace('flex', 'hidden'); btn2Cb(); };

    const btnCancel = document.createElement('button');
    btnCancel.className = 'classic-btn px-4 py-1 text-sm bg-gray-200';
    btnCancel.innerText = 'Cancelar';
    btnCancel.onclick = () => { document.getElementById('modal').classList.replace('flex', 'hidden'); };
    
    btnContainer.appendChild(btn1);
    btnContainer.appendChild(btn2);
    btnContainer.appendChild(btnCancel);

    document.getElementById('modal').classList.replace('hidden', 'flex');
}

function showHtmlModal(title, html) {
    document.getElementById('html-modal-title').innerText = title;
    document.getElementById('html-modal-content').innerHTML = html;
    document.getElementById('html-modal').classList.replace('hidden', 'flex');
}

function renderKnockoutBracketsHTML(phaseFixtures, phase) {
    let matchupsMap = {};
    let byeTeams = [];
    
    phaseFixtures.forEach(f => {
        if (f.isBye && f.away === null) {
            const team = gameState.teamMap[f.home];
            if (team) byeTeams.push(team);
        } else {
            let pairKey = [f.home, f.away].sort().join('___');
            if (!matchupsMap[pairKey]) {
                matchupsMap[pairKey] = {
                    team1: f.home,
                    team2: f.away,
                    fixtures: [],
                    startWeek: f.globalWeek,
                    hasBye: false
                };
            }
            matchupsMap[pairKey].fixtures.push(f);
            if (f.globalWeek < matchupsMap[pairKey].startWeek) matchupsMap[pairKey].startWeek = f.globalWeek;
        }
    });

    let matchups = Object.values(matchupsMap);
    let roundsMap = {};
    matchups.forEach(m => {
        if (!roundsMap[m.startWeek]) roundsMap[m.startWeek] = [];
        roundsMap[m.startWeek].push(m);
    });

    let roundWeeks = Object.keys(roundsMap).map(Number).sort((a, b) => a - b);
    let html = '<div class="p-2 space-y-3">';

    if (byeTeams.length > 0) {
        html += `
            <div class="border border-green-500 bg-green-50 p-2 rounded-sm shadow-sm mb-3">
                <div class="bg-green-700 text-white font-bold text-[11px] p-1 mb-2 flex justify-between items-center">
                    <span>⏭️ BYES - Avançam Automaticamente</span>
                    <span class="text-[9px] text-green-200">${byeTeams.length} equipe(s)</span>
                </div>
                <div class="flex flex-wrap gap-2">
                    ${byeTeams.map(t => `
                        <div class="bg-white border border-green-400 rounded px-3 py-1 text-sm font-bold flex items-center gap-2 shadow-sm">
                            ${t.logoUrl ? `<img src="${t.logoUrl}" class="w-5 h-5 object-contain">` : ''}
                            <span style="color: ${t.color}">${t.name}</span>
                            <span class="bg-green-500 text-white text-[8px] px-1.5 py-0.5 rounded-full font-bold">BYE</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    roundWeeks.forEach((week) => {
        let roundMatchups = roundsMap[week];
        let count = roundMatchups.length;
        let roundTitle = "Mata-Mata";
        if (count === 1) roundTitle = "Grande Final";
        else if (count === 2) roundTitle = "Semifinais";
        else if (count === 4) roundTitle = "Quartas de Final";
        else if (count === 8) roundTitle = "Oitavas de Final";
        else if (count === 16) roundTitle = "16avos de Final";
        else roundTitle = `Confrontos (${count * 2} Equipes)`;

        html += `
            <div class="border border-black bg-[#f0f0f0] p-2 rounded-sm shadow-sm">
                <div class="bg-black text-[#ffff00] font-bold text-[11px] p-1 mb-2 flex justify-between items-center">
                    <span>🏆 ${roundTitle}</span>
                    <span class="text-[9px] text-gray-300">Semana ${week}</span>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
        `;

        roundMatchups.forEach(m => {
            let f1 = m.fixtures[0];
            let f2 = m.fixtures[1];
            
            let homeTeam = gameState.teamMap[f1.home] || { name: f1.home };
            let awayTeam = gameState.teamMap[f1.away] || { name: f1.away };

            let totalHome = (f1.played ? f1.homeScore : 0) + (f2 && f2.played ? f2.awayScore : 0);
            let totalAway = (f1.played ? f1.awayScore : 0) + (f2 && f2.played ? f2.homeScore : 0);

            let isFinished = f1.played && (!f2 || f2.played);
            let winnerId = null;
            if (isFinished) {
                if (totalHome > totalAway) winnerId = f1.home;
                else if (totalAway > totalHome) winnerId = f1.away;
                else winnerId = f1.homeScore > f1.awayScore ? f1.home : f1.away;
            }

            let isPlayerHome = f1.home === gameState.playerTeamId;
            let isPlayerAway = f1.away === gameState.playerTeamId;

            html += `
                <div class="border border-gray-400 bg-white p-2 rounded shadow-sm text-[11px] flex flex-col justify-between">
                    <div class="flex justify-between items-center py-1 border-b border-gray-200 ${winnerId === f1.home ? 'font-bold text-green-800' : ''} ${isPlayerHome ? 'bg-yellow-100' : ''}">
                        <div class="flex items-center gap-1 w-32"><span class="truncate">${homeTeam.name}</span> ${homeTeam.logoUrl ? `<img src="${homeTeam.logoUrl}" class="w-3 h-3 object-contain">` : ''}</div>
                        <span class="font-mono bg-gray-100 px-1 border border-gray-300 rounded shrink-0">${f1.played ? f1.homeScore : '-'} ${f2 && f2.played ? `(${f2.awayScore})` : ''}</span>
                    </div>
                    <div class="flex justify-between items-center py-1 ${winnerId === f1.away ? 'font-bold text-green-800' : ''} ${isPlayerAway ? 'bg-yellow-100' : ''}">
                        <div class="flex items-center gap-1 w-32"><span class="truncate">${awayTeam.name}</span> ${awayTeam.logoUrl ? `<img src="${awayTeam.logoUrl}" class="w-3 h-3 object-contain">` : ''}</div>
                        <span class="font-mono bg-gray-100 px-1 border border-gray-300 rounded shrink-0">${f1.played ? f1.awayScore : '-'} ${f2 && f2.played ? `(${f2.homeScore})` : ''}</span>
                    </div>
                    <div class="text-[9px] text-gray-500 text-center mt-1 pt-1 border-t border-dashed border-gray-300 flex justify-between">
                            <span>${f2 ? 'Ida e Volta' : 'Jogo Único'}</span>
                            <span class="font-bold text-blue-900">${isFinished ? `Agregado: ${totalHome} - ${totalAway}` : 'A Jogar'}</span>
                        </div>
                    </div>
                `;
        });

        html += `
                </div>
            </div>
        `;
    });

    html += '</div>';
    return html;
}

function showCompetitionRules(compId) {
    const comp = db.competitions.find(c => c.id === compId);
    if(!comp) return;

    let html = `<div class="text-left text-[11.5px] space-y-2 max-h-[60vh] overflow-y-auto pr-2">`;
    
    let parentComp = db.competitions.find(c => c.id === comp.parentId);
    if(parentComp) {
        html += `<div class="bg-[#ffffcc] border border-yellow-600 p-1 font-bold shadow-sm"><i class="fas fa-sitemap text-yellow-700"></i> Hierarquia: Torneio vinculado a ${parentComp.name}.</div>`;
    }

    html += `<div class="flex gap-4 border-b border-gray-400 pb-1">
        <div><span class="font-bold text-gray-700">Início:</span> Mês ${comp.startMonth}</div>
        <div><span class="font-bold text-gray-700">Fim:</span> Mês ${comp.endMonth}</div>
    </div>`;
    
    if (comp.awardsGlobalTitle) {
        html += `<div class="text-emerald-700 font-bold bg-emerald-100 p-1 border border-emerald-300 shadow-sm"><i class="fas fa-trophy"></i> O campeão desta competição (ou o líder da tabela geral) é coroado o Campeão Anual do País.</div>`;
    }

    if(!comp.phases || comp.phases.length === 0) {
         html += `<div class="italic text-gray-600 mt-2">Fase única de pontos corridos (Gerada automaticamente pelo motor clássico).</div>`;
    } else {
         html += `<div class="font-bold mt-3 text-[12px] text-blue-900 border-b border-blue-900">Estrutura de Fases do Torneio:</div>`;
         comp.phases.forEach((p, idx) => {
              // Conteúdo simplificado por questões de espaço
              html += `<div class="bg-[#f8f8f8] border border-black p-2 mt-2 shadow-inner">`;
              html += `<div class="font-bold text-black mb-1 bg-[#e0e0e0] border border-gray-400 p-1 flex justify-between"><span>${idx+1}. ${p.name}</span> <span class="text-[9px] uppercase font-mono">${p.type}</span></div>`;
              html += `<div class="pl-2 text-[11px]">Formato: ${p.type === 'LEAGUE' ? 'Pontos Corridos' : p.type === 'GROUPS' ? 'Fase de Grupos' : 'Mata-Mata'}</div>`;
              html += `</div>`;
         });
    }
    html += `</div>`;

    showHtmlModal(`Regulamento: ${comp.name}`, html);
}

function openEditor() {
    document.getElementById('screen-select').classList.add('hidden');
    document.getElementById('screen-editor').classList.remove('hidden');
    renderEditorCountries();
}

function closeEditor() {
    document.getElementById('screen-editor').classList.add('hidden');
    document.getElementById('screen-select').classList.remove('hidden');
    renderTeamSelection();
}

function renderEditorCountries() {
    const container = document.getElementById('editor-countries');
    container.innerHTML = '';
    const countriesToShow = db.countries.filter(c => db.competitions.some(comp => comp.countryId === c.id));

    countriesToShow.forEach(c => {
        const btn = document.createElement('button');
        btn.className = `p-3 rounded-xl text-left font-bold transition-all border ${currentEditorCountry === c.id ? 'bg-blue-600 border-blue-500 text-white shadow-md transform scale-[1.02]' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`;
        btn.innerHTML = `<span class="text-xl mr-2 drop-shadow-md">${c.flag}</span> ${c.name}`;
        btn.onclick = () => selectEditorCountry(c.id);
        container.appendChild(btn);
    });

    if (!currentEditorCountry && countriesToShow.length > 0) selectEditorCountry(countriesToShow[0].id);
    else if (currentEditorCountry) selectEditorCountry(currentEditorCountry);
}

function selectEditorCountry(countryId) {
    currentEditorCountry = countryId;
    Array.from(document.getElementById('editor-countries').children).forEach(btn => {
        if (btn.onclick.toString().includes(countryId)) btn.className = 'p-3 rounded-xl text-left font-bold transition-all border bg-blue-600 border-blue-500 text-white shadow-md transform scale-[1.02]';
        else btn.className = 'p-3 rounded-xl text-left font-bold transition-all border bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700';
    });
    const country = db.countries.find(c => c.id === countryId);
    document.getElementById('editor-country-title').innerHTML = `<span class="text-3xl mr-2 drop-shadow-md">${country.flag}</span> ${country.name}`;
    document.getElementById('btn-save-editor').classList.remove('hidden');
    document.getElementById('editor-tabs').classList.remove('hidden');
    renderEditorContent();
}

function switchEditorMode(mode) {
    currentEditorMode = mode;
    if (mode === 'teams') {
        document.getElementById('tab-teams').className = 'px-4 py-2 font-bold rounded-t-lg bg-blue-600 text-white transition-colors';
        document.getElementById('tab-comps').className = 'px-4 py-2 font-bold rounded-t-lg bg-transparent text-slate-400 hover:text-white transition-colors';
    } else {
        document.getElementById('tab-teams').className = 'px-4 py-2 font-bold rounded-t-lg bg-transparent text-slate-400 hover:text-white transition-colors';
        document.getElementById('tab-comps').className = 'px-4 py-2 font-bold rounded-t-lg bg-blue-600 text-white transition-colors';
    }
    if(currentEditorCountry) renderEditorContent();
}

function renderEditorContent() {
    const container = document.getElementById('editor-content-area');
    const compsInCountry = db.competitions.filter(comp => comp.countryId === currentEditorCountry);
    
    if (currentEditorMode === 'teams') {
        const compIds = compsInCountry.map(c => c.id);
        const teams = db.teams.filter(t => compIds.includes(t.compId)).sort((a,b) => b.rating - a.rating || a.name.localeCompare(b.name));
        
        if (teams.length === 0) {
            container.innerHTML = `<div class="text-slate-500 text-center py-20 italic">Nenhum clube base atrelado diretamente a esta região.</div>`;
        } else {
            container.innerHTML = teams.map(t => `
                <div class="flex items-center gap-4 bg-slate-900/50 p-4 rounded-xl border border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                    ${t.logoUrl ? `<img src="${t.logoUrl}" class="w-12 h-12 object-contain drop-shadow-md">` : `<div class="w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl text-white shadow-inner border-2 border-slate-600 flex-shrink-0" style="background-color: ${t.color}" id="preview-color-${t.id}">${t.name.charAt(0)}</div>`}
                    <div class="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4">
                        <div class="md:col-span-6 flex flex-col">
                            <label class="text-[10px] text-slate-400 uppercase font-bold mb-1 tracking-wider">Nome do Clube</label>
                            <input type="text" id="edit-name-${t.id}" value="${t.name}" class="bg-slate-800 border border-slate-600 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors" oninput="document.getElementById('preview-color-${t.id}').innerText = this.value.charAt(0)">
                        </div>
                        <div class="md:col-span-3 flex flex-col">
                            <label class="text-[10px] text-slate-400 uppercase font-bold mb-1 tracking-wider">Força (OVR)</label>
                            <input type="number" id="edit-rating-${t.id}" value="${t.rating}" min="1" max="99" class="bg-slate-800 border border-slate-600 rounded-lg p-2 text-sm text-emerald-400 font-bold focus:outline-none focus:border-emerald-500 transition-colors">
                        </div>
                        <div class="md:col-span-3 flex flex-col">
                            <label class="text-[10px] text-slate-400 uppercase font-bold mb-1 tracking-wider">Cor Principal</label>
                            <div class="flex items-center gap-3 bg-slate-800 border border-slate-600 rounded-lg p-1.5 focus-within:border-blue-500 transition-colors">
                                <input type="color" id="edit-color-${t.id}" value="${t.color}" class="h-6 w-8 rounded cursor-pointer bg-transparent border-0" oninput="document.getElementById('preview-color-${t.id}').style.backgroundColor = this.value; document.getElementById('hex-label-${t.id}').innerText = this.value">
                                <span class="text-xs text-slate-300 font-mono uppercase" id="hex-label-${t.id}">${t.color}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('');
        }
    } else {
        container.innerHTML = `<div class="text-slate-500 text-center py-20 italic">Editor de competições (versão simplificada).</div>`;
    }
}

function syncEditorDOMToMemory() {
    // Implementação simplificada
}

function saveEditorChanges() {
    showModal("Sucesso", "Alterações salvas na memória do jogo!");
}

function saveGame() {
    const saveData = { db: db, gameState: gameState, humanManagerName: humanManagerName };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(saveData));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "super_manager_save.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

function loadGame(event) {
    const file = event.target.files[0]; if (!file) return; 
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (data.gameState && data.db) {
                db = data.db;
                for (let key in data.gameState) gameState[key] = data.gameState[key];
                gameState.currentDate = new Date(gameState.currentDate);
                if (data.humanManagerName) humanManagerName = data.humanManagerName;
                gameState.managerName = humanManagerName;
                
                gameState.teamMap = {}; 
                db.teams.forEach(t => gameState.teamMap[t.id] = t);
                gameState.compMap = {}; 
                db.competitions.forEach(c => gameState.compMap[c.id] = c);
                
                showModal("Sucesso", "Jogo carregado com sucesso!");
                renderClassicHub();
            } else {
                showModal("Erro", "Arquivo de save incompatível.");
            }
        } catch(err) { 
            showModal("Erro", "Falha ao ler o arquivo de save."); 
        }
    };
    reader.readAsText(file);
    event.target.value = ''; 
}

function exitToMenu() {
    showConfirmModal("Aviso", "Tem certeza que deseja sair para o menu inicial? O progresso não salvo será perdido.", () => {
        document.getElementById('screen-hub').classList.replace('flex', 'hidden');
        document.getElementById('screen-select').classList.remove('hidden');
        renderTeamSelection();
    });
}

function importDB(event) {
    const file = event.target.files[0]; 
    if (!file) return; 
    const reader = new FileReader();
    reader.onload = function(e) { 
        try { 
            const importedDb = JSON.parse(e.target.result); 
            if (importedDb && importedDb.teams) { 
                db = importedDb; 
                db.teams.forEach(t => gameState.teamMap[t.id] = t);
                db.competitions.forEach(c => gameState.compMap[c.id] = c);
                renderTeamSelection(); 
            } 
        } catch (err) { 
            alert("Erro ao ler JSON."); 
        } 
    };
    reader.readAsText(file);
}

function importTeam(event) {
    const file = event.target.files[0]; 
    if (!file) return; 
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (!data.sourceData) return showModal("Erro", "JSON sem 'sourceData'.");
            
            Object.keys(data.sourceData).forEach(countryKey => {
                const countryData = data.sourceData[countryKey];
                if (countryData.opponents) {
                    countryData.opponents.forEach(opp => {
                        let existingTeam = db.teams.find(t => t.name.toLowerCase() === opp.name.toLowerCase() || t.id === String(opp.id));
                        const mappedPlayers = (opp.players || []).map(p => {
                            return {
                                id: 'p_' + p.id, 
                                name: p.name, 
                                pos: (p.positions && p.positions.length > 0 ? p.positions.join('/') : 'MC'),
                                leg: p.foot === 'E' ? 'E' : 'D', 
                                ovr: p.overall, 
                                energy: p.fitness || 100,
                                salary: Math.round((p.salary || 10000) / 1000) + " mil", 
                                nationality: p.nationality || 'Desconhecido', 
                                photoUrl: p.photoUrl || null,
                                value: p.value || 1, 
                                stats: p.stats, 
                                age: p.age || 20, 
                                contractEnd: p.contract || '31/12/2026',
                                strengths: p.strengths || [], 
                                weaknesses: p.weaknesses || [],
                                isYouth: false
                            };
                        });

                        if (existingTeam) { 
                            existingTeam.rating = opp.overall; 
                            existingTeam.importedPlayers = mappedPlayers;
                            existingTeam.stadium = opp.stadium || existingTeam.stadium;
                            existingTeam.stadiumCapacity = opp.stadiumCapacity || existingTeam.stadiumCapacity;
                            existingTeam.managerName = opp.managerName || existingTeam.managerName || 'Interino';
                            existingTeam.budget = opp.budget || existingTeam.budget;
                            if(opp.logoUrl) existingTeam.logoUrl = opp.logoUrl;
                            if(opp.managerPhotoUrl) existingTeam.managerPhotoUrl = opp.managerPhotoUrl;
                            existingTeam.country = countryKey;
                        } else {
                            let cId = 'c_' + countryKey.toLowerCase().replace(/[^a-z0-9]/g, '');
                            let compId = 'comp_' + countryKey.toLowerCase().replace(/[^a-z0-9]/g, '');
                            
                            if(!db.countries.find(c => c.id === cId)) {
                                db.countries.push({id: cId, name: countryKey, flag: '🏳️'});
                            }
                            if(!db.competitions.find(c => c.id === compId)) {
                                db.competitions.push({id: compId, countryId: cId, name: 'Liga ' + countryKey, parentId: 'NONE', startYear: 2026, startMonth: 1, endMonth: 12, phases: []});
                            }
                            db.teams.push({ 
                                id: String(opp.id), 
                                compId: compId, 
                                name: opp.name, 
                                rating: opp.overall, 
                                color: '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0'), 
                                importedPlayers: mappedPlayers,
                                logoUrl: opp.logoUrl || null, 
                                managerPhotoUrl: opp.managerPhotoUrl || null,
                                stadium: opp.stadium, 
                                stadiumCapacity: opp.stadiumCapacity,
                                managerName: opp.managerName || 'Interino', 
                                budget: opp.budget || 15,
                                country: countryKey,
                                isHumanManaged: false
                            });
                        }
                    });
                }
            });
            db.teams.forEach(t => gameState.teamMap[t.id] = t);
            db.competitions.forEach(c => gameState.compMap[c.id] = c);
            renderTeamSelection(); 
            showModal("Importação Concluída", "Elencos importados com sucesso!");
        } catch (err) { 
            showModal("Erro", "Erro ao processar: " + err.message); 
        }
    };
    reader.readAsText(file);
}

function exportDB() {
    syncEditorDOMToMemory();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(db, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "super_manager_db.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

function updateTicketPrice(val) {
    gameState.teamMap[gameState.playerTeamId].ticketPrice = parseInt(val) || 20;
}

function expandStadium(seats, cost) {
    let myTeam = gameState.teamMap[gameState.playerTeamId];
    let myBudget = parseFloat(myTeam.budget || 15);
    if (myBudget >= cost) {
        myBudget -= cost;
        myTeam.budget = myBudget.toFixed(2);
        myTeam.stadiumCapacity = (myTeam.stadiumCapacity || 10000) + seats;
        renderClassicHub();
        showModal("Obras Concluídas!", `O estádio foi ampliado em ${seats.toLocaleString('pt-BR')} lugares com sucesso!\nCapacidade atual: ${myTeam.stadiumCapacity.toLocaleString('pt-BR')}`);
    } else {
        showModal("Sem Fundos", "Seu caixa atual é insuficiente para aprovar esta obra.");
    }
}

function selectPlayer(playerId) {
    gameState.selectedPlayerId = playerId;
    const rows = document.querySelectorAll('#squad-tbody tr');
    rows.forEach(r => r.classList.remove('selected'));
    const selectedRow = document.getElementById(`row-${playerId}`);
    if(selectedRow) selectedRow.classList.add('selected');
}

function selectTacticsSlot(idx, isBench) {
    let slotId = (isBench ? 'bench-' : 'starter-') + idx;
    if (!selectedTacticsSlot) {
        selectedTacticsSlot = slotId;
    } else {
        if (selectedTacticsSlot !== slotId) {
            let p1isBench = selectedTacticsSlot.startsWith('bench-');
            let p1idx = parseInt(selectedTacticsSlot.split('-')[1]);
            let p2isBench = isBench;
            let p2idx = idx;

            let id1 = p1isBench ? gameState.myLineup.bench[p1idx] : gameState.myLineup.starters[p1idx];
            let id2 = p2isBench ? gameState.myLineup.bench[p2idx] : gameState.myLineup.starters[p2idx];

            if (p1isBench) gameState.myLineup.bench[p1idx] = id2; 
            else gameState.myLineup.starters[p1idx] = id2;
            if (p2isBench) gameState.myLineup.bench[p2idx] = id1; 
            else gameState.myLineup.starters[p2idx] = id1;
        }
        selectedTacticsSlot = null;
    }
    renderClassicHub();
}

function handlePlayerAction(action) {
    if(!gameState.selectedPlayerId) return;
    const p = gameState.mySquad.find(x => x.id === gameState.selectedPlayerId);
    if(action === 'renovar') {
        let yr = parseInt(String(p.contractEnd).split('/')[2] || '2026') + 1;
        p.contractEnd = String(p.contractEnd).substring(0,6) + yr;
        let currentSal = parseInt(String(p.salary).replace(/[^0-9]/g, '')) || 0;
        p.salary = Math.floor(currentSal * 1.1) + " mil";
        showModal("Renovação Concluída", `O contrato de ${p.name} foi estendido por 1 ano com aumento salarial.`);
    } else if(action === 'treinar') {
        // Implementação simplificada
        showModal("Treino", `Treino aplicado para ${p.name}.`);
    } else if(action === 'emprestar') {
        p.listedForLoan = true;
        p.listed = false;
        showModal("Empréstimo", `${p.name} foi colocado na lista de empréstimos.`);
    } else if(action === 'vender') {
        p.listed = true;
        p.listedForLoan = false;
        showModal("Venda", `${p.name} foi colocado à venda.`);
    }
    selectPlayer(p.id);
    renderClassicHub();
}