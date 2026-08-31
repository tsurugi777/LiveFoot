// Interface do Usuário - Funções de Renderização e UI

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

function selectPlayer(playerId) {
    gameState.selectedPlayerId = playerId;
    const rows = document.querySelectorAll('#squad-tbody tr');
    rows.forEach(r => r.classList.remove('selected'));
    const selectedRow = document.getElementById(`row-${playerId}`);
    if(selectedRow) selectedRow.classList.add('selected');

    const p = gameState.mySquad.find(x => x.id === playerId);
    if(p) {
        const box = document.getElementById('player-detail-box');
        const empty = document.getElementById('player-detail-empty');
        if(box && empty) {
            box.classList.replace('hidden', 'flex');
            empty.classList.add('hidden');
            
            const primaryPos = p.pos.split('/')[0];
            let flagObj = nationalityToFlag[p.nationality] || '🌐';
            
            if (document.getElementById('pd-name')) document.getElementById('pd-name').innerText = p.name;
            if (document.getElementById('pd-pos-ovr')) document.getElementById('pd-pos-ovr').innerText = `${primaryPos}:${p.ovr}`;
            if (document.getElementById('pd-role')) document.getElementById('pd-role').innerHTML = `${flagObj} ${p.pos} - Pé ${p.leg} - ${p.age} anos${p.isYouth ? ' ⭐ Jovem da Base' : ''}`;
            if (document.getElementById('pd-contract')) document.getElementById('pd-contract').innerText = `Contrato até: ${p.contractEnd}`;
            if (document.getElementById('pd-value')) document.getElementById('pd-value').innerText = p.value + "M";
            
            const photoEl = document.getElementById('pd-photo');
            const fallbackEl = document.getElementById('pd-photo-fallback');
            if (photoEl) {
                if (p.photoUrl) {
                    photoEl.src = p.photoUrl;
                    photoEl.style.display = 'block';
                    if(fallbackEl) fallbackEl.style.display = 'none';
                } else {
                    photoEl.style.display = 'none';
                    if(fallbackEl) fallbackEl.style.display = 'block';
                }
            }
            
            let salStr = String(p.salary);
            if (!salStr.includes('mil') && !salStr.includes('M')) salStr += " mil";
            if (document.getElementById('pd-salary')) document.getElementById('pd-salary').innerText = salStr;
            
            if (document.getElementById('pd-s-jogos')) document.getElementById('pd-s-jogos').innerText = p.sGames || 0;
            if (document.getElementById('pd-c-jogos')) document.getElementById('pd-c-jogos').innerText = p.cGames || 0;
            if (document.getElementById('pd-s-gols')) document.getElementById('pd-s-gols').innerText = p.sGoals || 0;
            if (document.getElementById('pd-c-gols')) document.getElementById('pd-c-gols').innerText = p.cGoals || 0;
            if (document.getElementById('pd-s-ass')) document.getElementById('pd-s-ass').innerText = p.sAssists || 0;
            if (document.getElementById('pd-c-ass')) document.getElementById('pd-c-ass').innerText = p.cAssists || 0;
            if (document.getElementById('pd-s-yel')) document.getElementById('pd-s-yel').innerText = p.sYellows || 0;
            if (document.getElementById('pd-c-yel')) document.getElementById('pd-c-yel').innerText = p.cYellows || 0;
            if (document.getElementById('pd-s-red')) document.getElementById('pd-s-red').innerText = p.sReds || 0;
            if (document.getElementById('pd-c-red')) document.getElementById('pd-c-red').innerText = p.cReds || 0;
            
            let avg = p.sRatings && p.sRatings.length ? (p.sRatings.reduce((a,b)=>a+b,0) / p.sRatings.length).toFixed(1) : '--';
            if (document.getElementById('pd-s-nota')) document.getElementById('pd-s-nota').innerText = avg;
            if (document.getElementById('pd-c-nota')) document.getElementById('pd-c-nota').innerText = avg;
            
            const histContainer = document.getElementById('pd-career-history');
            if (histContainer) {
                if (!p.careerStats || p.careerStats.length === 0) {
                    histContainer.innerHTML = '<div class="italic text-center py-2">Nenhum registro anterior.</div>';
                } else {
                    histContainer.innerHTML = p.careerStats.slice().reverse().map(h => `
                        <div class="flex justify-between border-b border-gray-200 pb-0.5">
                            <span class="font-bold w-1/3 truncate" title="${h.teamName}">${h.season} ${h.teamName}</span>
                            <span class="w-2/3 text-right">J:${h.games} G:${h.goals} A:${h.assists} Nt:${h.rating}</span>
                        </div>
                    `).join('');
                }
            }
        }
    }
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

// Funções de Modal
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
              html += `<div class="bg-[#f8f8f8] border border-black p-2 mt-2 shadow-inner">`;
              html += `<div class="font-bold text-black mb-1 bg-[#e0e0e0] border border-gray-400 p-1 flex justify-between"><span>${idx+1}. ${p.name}</span> <span class="text-[9px] uppercase font-mono">${p.type}</span></div>`;
              
              let expectedTeamsDesc = "Todos os clubes inscritos no torneio.";
              if (p.injectRules && p.injectRules.length > 0) {
                  let count = 0;
                  p.injectRules.forEach(r => count += (r.maxRank - r.minRank + 1));
                  expectedTeamsDesc = `Regras Externas (${count} vagas).`;
              } else if (idx > 0) {
                  let prevPhase = comp.phases[idx - 1];
                  if (prevPhase.type === 'GROUPS') expectedTeamsDesc = `Avançam da ${prevPhase.name} (${(prevPhase.advancingTeams || 2) * (prevPhase.numGroups || 2)} times).`;
                  else if (prevPhase.type === 'LEAGUE' && prevPhase.advancingTeams > 0) expectedTeamsDesc = `Avançam da ${prevPhase.name} (${prevPhase.advancingTeams} times).`;
                  else if (prevPhase.type === 'KNOCKOUT') expectedTeamsDesc = `Vencedores da ${prevPhase.name}.`;
                  else expectedTeamsDesc = `Classificados da ${prevPhase.name}.`;
              }

              html += `<div class="pl-2 mb-1 border-b border-gray-300 pb-1 text-[11px]">- <span class="font-bold text-gray-700">Origem / Vagas:</span> <span class="text-blue-800">${expectedTeamsDesc}</span></div>`;

              if (p.type === 'LEAGUE') {
                  html += `<div class="pl-2">- Formato: Pontos Corridos (${p.rounds || 2} turno(s))</div>`;
                  if (p.advancingTeams > 0) html += `<div class="pl-2">- Avançam de fase: <span class="font-bold text-green-700">${p.advancingTeams}</span> equipe(s)</div>`;
              } else if (p.type === 'GROUPS') {
                  html += `<div class="pl-2">- Formato: Grupos (${p.numGroups || 2} grupo(s), ${p.rounds || 2} turno(s))</div>`;
                  html += `<div class="pl-2">- Avançam de fase: <span class="font-bold text-green-700">${p.advancingTeams || 2}</span> equipe(s) por grupo</div>`;
                  if (p.seedingByPrevPhase) {
                      html += `<div class="pl-2 text-yellow-700 font-bold">- Cabeças de chave baseados na fase anterior: Os melhores colocados são distribuídos em potes.</div>`;
                  }
              } else if (p.type === 'KNOCKOUT') {
                  html += `<div class="pl-2">- Formato: Mata-Mata (${p.twoLegs ? 'Ida e Volta' : 'Jogo Único'})</div>`;
                  if(p.singleFinal) html += `<div class="pl-2">- A Grande Final será disputada em Jogo Único</div>`;
                  if(p.stopAtTeams && p.stopAtTeams > 1) {
                      html += `<div class="pl-2">- A fase para quando restarem <span class="font-bold text-blue-700">${p.stopAtTeams}</span> equipe(s)</div>`;
                  }
              }

              let rulesText = '';
              if(p.keepPreviousPoints) {
                  rulesText += `<div class="text-blue-800"><i class="fas fa-link w-4"></i> Herda pontos da fase anterior${p.halvePreviousPoints ? ' (Divididos pela metade)' : ''}.</div>`;
              }
              if(p.countsToAggregatedTable) {
                  rulesText += `<div class="text-emerald-800"><i class="fas fa-table w-4"></i> Partidas somam na Tabela Geral Anual.</div>`;
              }
              if(p.awardsTitle) {
                  rulesText += `<div class="text-yellow-700 font-bold"><i class="fas fa-trophy w-4"></i> O vencedor desta fase fatura uma taça.</div>`;
              }
              if (rulesText !== '') html += `<div class="mt-2 pl-1 border-t border-gray-300 pt-1 space-y-0.5">${rulesText}</div>`;

              if(p.injectRules && p.injectRules.length > 0) {
                  html += `<div class="mt-2 border border-gray-300 bg-white p-1 shadow-sm"><span class="font-bold text-[10px] text-gray-700">Regras de Classificação (Vagas Externas):</span><ul class="list-disc pl-5 text-[10px] text-black">`;
                  p.injectRules.forEach(r => {
                      let srcName = r.sourceId;
                      if (r.sourceId === 'lib_champs') srcName = "Campeão Continental";
                      else {
                          let sComp = db.competitions.find(c => c.id === r.sourceId);
                          if (sComp) srcName = sComp.name;
                          else {
                              db.competitions.forEach(c => {
                                  if(c.phases) {
                                      let sPhase = c.phases.find(x => x.id === r.sourceId);
                                      if(sPhase) srcName = `${c.name} (${sPhase.name})`;
                                  }
                              });
                          }
                      }
                      
                      let typeDesc = "";
                      if(r.type === 'LIVE_GLOBAL') typeDesc = "Tabela Geral - Ano Atual";
                      else if(r.type === 'PREV_GLOBAL') typeDesc = "Tabela Geral - Ano Anterior";
                      else if(r.type === 'LIVE_PHASE') typeDesc = "Tabela da Fase - Ano Atual";
                      else if(r.type === 'PREV_PHASE') typeDesc = "Tabela da Fase - Ano Anterior";

                      html += `<li>Vaga do <span class="font-bold">${r.minRank}º ao ${r.maxRank}º</span> colocado via: <i>${srcName}</i> <span class="text-gray-500">(${typeDesc})</span>.</li>`;
                  });
                  html += `</ul></div>`;
              }
              
              html += `</div>`;
         });
    }
    html += `</div>`;

    showHtmlModal(`Regulamento: ${comp.name}`, html);
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

function buildSourceOptions(selectedId) {
    let opts = `<option value="lib_champs" ${selectedId === 'lib_champs' ? 'selected' : ''}>[Especial] Campeão Continental Anterior</option>`;
    db.competitions.forEach(c => {
        opts += `<option value="${c.id}" ${selectedId === c.id ? 'selected' : ''}>[Geral] ${c.name}</option>`;
        if (c.phases) c.phases.forEach(p => { opts += `<option value="${p.id}" ${selectedId === p.id ? 'selected' : ''}>[Fase] ${c.name} - ${p.name}</option>`; });
    });
    return opts;
}

// Funções de Editor
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

function createNewCompetition() {
    if (!currentEditorCountry) return;
    syncEditorDOMToMemory();
    const newCompId = 'c_' + Math.random().toString(36).substr(2, 9);
    const newComp = {
        id: newCompId, countryId: currentEditorCountry, name: "Nova Competição", historyName: "Novo Torneio",
        allowedDaysOfWeek: [0,1,2,3,4,5,6], calendarType: "ANNUAL", startYear: new Date().getFullYear(), startMonth: 1, endMonth: 12,
        dependsOn: "NONE", parentId: "NONE", excludeFromParent: false, awardsGlobalTitle: false, initialTitles: {},
        phases: [{ id: Math.random().toString(36).substr(2, 9), type: 'LEAGUE', name: 'Fase Regular', advancingTeams: 0, rounds: 2, awardsTitle: true, keepPreviousPoints: false }]
    };
    db.competitions.push(newComp);
    gameState.compMap[newCompId] = newComp;
    renderEditorContent();
}

function addTitleToComp(compId) {
    syncEditorDOMToMemory();
    const comp = db.competitions.find(c => c.id === compId);
    if (!comp.initialTitles) comp.initialTitles = {};
    const compIdsInCountry = db.competitions.filter(c => c.countryId === comp.countryId).map(c=>c.id);
    const teamsInCountry = db.teams.filter(t => compIdsInCountry.includes(t.compId));
    const availableTeam = teamsInCountry.find(t => comp.initialTitles[t.id] === undefined);
    if (availableTeam) comp.initialTitles[availableTeam.id] = 1;
    renderEditorContent();
}

function removeTitleFromComp(compId, teamId) {
    syncEditorDOMToMemory();
    const comp = db.competitions.find(c => c.id === compId);
    if (comp.initialTitles) delete comp.initialTitles[teamId];
    renderEditorContent();
}

function addPhaseToComp(compId) {
    syncEditorDOMToMemory();
    const comp = db.competitions.find(c => c.id === compId);
    if (!comp.phases) comp.phases = [];
    comp.phases.push({
        id: Math.random().toString(36).substr(2, 9), type: 'LEAGUE', name: 'Nova Fase', advancingTeams: 0, rounds: 2, awardsTitle: false, keepPreviousPoints: false, countsToAggregatedTable: true, seedingByPrevPhase: false
    });
    renderEditorContent();
}

function removePhaseFromComp(compId, phaseIndex) {
    syncEditorDOMToMemory();
    const comp = db.competitions.find(c => c.id === compId);
    comp.phases.splice(phaseIndex, 1);
    renderEditorContent();
}

function addRuleToPhase(compId, pIdx) {
    syncEditorDOMToMemory();
    const comp = db.competitions.find(c => c.id === compId);
    const phase = comp.phases[pIdx];
    if (!phase.injectRules) phase.injectRules = [];
    phase.injectRules.push({ type: 'LIVE_GLOBAL', sourceId: comp.id, minRank: 1, maxRank: 4 });
    renderEditorContent();
}

function removeRuleFromPhase(compId, pIdx, rIdx) {
    syncEditorDOMToMemory();
    const comp = db.competitions.find(c => c.id === compId);
    const phase = comp.phases[pIdx];
    phase.injectRules.splice(rIdx, 1);
    renderEditorContent();
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
        // Renderização de competições - similar ao código anterior
        // (mantido por questões de espaço, mas a lógica é a mesma)
        const compIdsInCountry = compsInCountry.map(c => c.id);
        const teamsInCountry = db.teams.filter(t => compIdsInCountry.includes(t.compId)).sort((a,b) => a.name.localeCompare(b.name));

        let html = `<div class="flex justify-end mb-4 border-b border-slate-700 pb-4">
            <button onclick="createNewCompetition()" class="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-xl font-bold shadow-lg transition-transform hover:scale-105 active:scale-95 flex items-center gap-2" id="btn-create-comp">
                <i class="fas fa-plus"></i> Criar Nova Competição
            </button>
        </div>`;

        html += compsInCountry.map(comp => `
            <div class="bg-slate-900/50 p-5 rounded-xl border border-slate-700/50 mb-4">
                <div class="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4">
                    <div class="md:col-span-4">
                        <label class="text-[10px] text-slate-400 uppercase font-bold mb-1 tracking-wider block">Nome do Torneio</label>
                        <input type="text" id="edit-comp-name-${comp.id}" value="${comp.name}" class="w-full bg-slate-800 border border-slate-600 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors font-bold text-lg">
                    </div>
                    <div class="md:col-span-3">
                        <label class="text-[10px] text-slate-400 uppercase font-bold mb-1 tracking-wider block">Nome Curto</label>
                        <input type="text" id="edit-comp-hist-${comp.id}" value="${comp.historyName || ''}" class="w-full bg-slate-800 border border-slate-600 rounded-lg p-2 text-sm text-white focus:border-blue-500">
                    </div>
                    <div class="md:col-span-4">
                        <label class="text-[10px] text-slate-400 uppercase font-bold mb-1 tracking-wider block" title="Define se é um torneio isolado ou faz parte de outro">Pertence a (Hierarquia)</label>
                        <select id="edit-comp-parent-${comp.id}" class="w-full bg-slate-800 border border-slate-600 rounded-lg p-2 text-sm text-white focus:border-blue-500 outline-none">
                            <option value="NONE" ${comp.parentId === 'NONE' || !comp.parentId ? 'selected' : ''}>[Torneio Base] Nenhuma</option>
                            ${compsInCountry.filter(c => c.id !== comp.id).map(c => `<option value="${c.id}" ${comp.parentId === c.id ? 'selected' : ''}>[Filha de] ${c.name}</option>`).join('')}
                        </select>
                    </div>
                    <div class="md:col-span-1 flex flex-col items-center justify-center pt-2">
                        <label class="text-[10px] text-slate-400 uppercase font-bold mb-1 tracking-wider text-center block">Dá Campeão<br>Anual?</label>
                        <input type="checkbox" id="edit-comp-global-${comp.id}" ${comp.awardsGlobalTitle ? 'checked' : ''} class="w-5 h-5 accent-emerald-500 cursor-pointer">
                    </div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4 border-b border-slate-700/50 pb-4">
                    <div class="md:col-span-4">
                        <label class="text-[10px] text-slate-400 uppercase font-bold mb-1 tracking-wider block">Ano Início</label>
                        <input type="number" id="edit-comp-start-year-${comp.id}" value="${comp.startYear || 2026}" min="1900" max="2100" class="w-full bg-slate-800 border border-slate-600 rounded-lg p-2 text-sm text-white focus:border-blue-500">
                    </div>
                    <div class="md:col-span-4">
                        <label class="text-[10px] text-slate-400 uppercase font-bold mb-1 tracking-wider block">Mês Início</label>
                        <input type="number" id="edit-comp-start-${comp.id}" value="${comp.startMonth}" min="1" max="12" class="w-full bg-slate-800 border border-slate-600 rounded-lg p-2 text-sm text-white focus:border-blue-500">
                    </div>
                    <div class="md:col-span-4">
                        <label class="text-[10px] text-slate-400 uppercase font-bold mb-1 tracking-wider block">Mês Fim</label>
                        <input type="number" id="edit-comp-end-${comp.id}" value="${comp.endMonth || 12}" min="1" max="12" class="w-full bg-slate-800 border border-slate-600 rounded-lg p-2 text-sm text-white focus:border-blue-500">
                    </div>
                </div>
                <!-- Restante da renderização do editor -->
                <div class="flex items-center justify-between border-b border-slate-700 pb-2 mb-3">
                    <h4 class="text-sm font-bold text-slate-300"><i class="fas fa-project-diagram mr-2 text-blue-400"></i> Estrutura de Fases</h4>
                    <button onclick="addPhaseToComp('${comp.id}')" class="text-xs bg-blue-600/20 text-blue-400 hover:bg-blue-600/40 px-2 py-1 rounded border border-blue-600/50 transition-colors"><i class="fas fa-plus mr-1"></i> Adicionar Fase</button>
                </div>
                <div class="space-y-3 pl-2 border-l-2 border-slate-700">
                    ${comp.phases && comp.phases.length > 0 ? comp.phases.map((phase, pIdx) => `
                        <div class="bg-slate-800 p-4 rounded-lg border border-slate-600 shadow-sm relative group">
                            <span class="absolute -left-6 top-4 bg-slate-700 text-slate-400 text-xs w-5 h-5 flex items-center justify-center rounded-full font-bold border border-slate-600">${pIdx+1}</span>
                            <button onclick="removePhaseFromComp('${comp.id}', ${pIdx})" class="absolute top-2 right-2 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity" title="Excluir Fase"><i class="fas fa-trash"></i></button>
                            <!-- Restante dos campos da fase -->
                            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div class="md:col-span-2">
                                    <label class="text-[10px] text-slate-400 uppercase font-bold mb-1 tracking-wider block">Nome da Fase</label>
                                    <input type="text" id="edit-p-name-${comp.id}-${pIdx}" value="${phase.name}" class="w-full bg-slate-900 border border-slate-600 rounded-lg p-2 text-sm text-white focus:border-blue-500">
                                </div>
                                <div>
                                    <label class="text-[10px] text-slate-400 uppercase font-bold mb-1 tracking-wider block">Formato</label>
                                    <select id="edit-p-type-${comp.id}-${pIdx}" class="w-full bg-slate-900 border border-slate-600 rounded-lg p-2 text-sm text-white focus:border-blue-500 outline-none">
                                        <option value="LEAGUE" ${phase.type==='LEAGUE'?'selected':''}>Liga (Pontos Corridos)</option>
                                        <option value="GROUPS" ${phase.type==='GROUPS'?'selected':''}>Fase de Grupos</option>
                                        <option value="KNOCKOUT" ${phase.type==='KNOCKOUT'?'selected':''}>Mata-Mata</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="text-[10px] text-slate-400 uppercase font-bold mb-1 tracking-wider block">Classificados</label>
                                    <input type="number" id="edit-p-adv-${comp.id}-${pIdx}" value="${phase.advancingTeams}" min="0" class="w-full bg-slate-900 border border-slate-600 rounded-lg p-2 text-sm text-emerald-400 font-bold focus:border-blue-500">
                                </div>
                            </div>
                            <!-- Opções avançadas -->
                            <div class="mt-4 p-3 bg-slate-900/80 rounded-lg border border-slate-700/50">
                                <div class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Opções Avançadas do Formato</div>
                                <!-- Opções específicas por tipo -->
                                <div id="opts-league-${comp.id}-${pIdx}" class="${phase.type === 'LEAGUE' ? 'block' : 'hidden'}">
                                    <div class="w-1/3">
                                        <label class="text-[10px] text-slate-400 uppercase font-bold block mb-1">Nº de Turnos</label>
                                        <input type="number" id="edit-p-rounds-l-${comp.id}-${pIdx}" value="${phase.rounds || 2}" min="1" class="w-full bg-slate-800 border border-slate-600 rounded p-1.5 text-sm text-white">
                                    </div>
                                </div>
                                <div id="opts-groups-${comp.id}-${pIdx}" class="${phase.type === 'GROUPS' ? 'flex' : 'hidden'} gap-4">
                                    <div class="flex-1">
                                        <label class="text-[10px] text-slate-400 uppercase font-bold block mb-1">Qtd. de Grupos</label>
                                        <input type="number" id="edit-p-numgroups-${comp.id}-${pIdx}" value="${phase.numGroups || 2}" min="1" class="w-full bg-slate-800 border border-slate-600 rounded p-1.5 text-sm text-white">
                                    </div>
                                    <div class="flex-1">
                                        <label class="text-[10px] text-slate-400 uppercase font-bold block mb-1">Turnos nos Grupos</label>
                                        <input type="number" id="edit-p-rounds-g-${comp.id}-${pIdx}" value="${phase.rounds || 2}" min="1" class="w-full bg-slate-800 border border-slate-600 rounded p-1.5 text-sm text-white">
                                    </div>
                                </div>
                                <div id="opts-knockout-${comp.id}-${pIdx}" class="${phase.type === 'KNOCKOUT' ? 'grid' : 'hidden'} grid-cols-2 gap-3 items-center">
                                    <label class="flex items-center gap-2 cursor-pointer text-sm text-slate-300 hover:text-white">
                                        <input type="checkbox" id="edit-p-twolegs-${comp.id}-${pIdx}" ${phase.twoLegs ? 'checked' : ''} class="w-4 h-4 accent-blue-500"> 
                                        Jogos de Ida e Volta
                                    </label>
                                    <label class="flex items-center gap-2 cursor-pointer text-sm text-slate-300 hover:text-white">
                                        <input type="checkbox" id="edit-p-singlefinal-${comp.id}-${pIdx}" ${phase.singleFinal ? 'checked' : ''} class="w-4 h-4 accent-yellow-500"> 
                                        Final Única
                                    </label>
                                    <div class="col-span-2 mt-2">
                                        <label class="text-[10px] text-slate-400 uppercase font-bold block mb-1">Pausar a Fase ao restar X Equipes</label>
                                        <input type="number" id="edit-p-stop-${comp.id}-${pIdx}" value="${phase.stopAtTeams || 1}" min="1" class="w-1/3 bg-slate-800 border border-slate-600 rounded p-1.5 text-sm text-white">
                                    </div>
                                </div>
                            </div>
                            <!-- Regras de Classificação -->
                            <div class="mt-4 p-3 bg-slate-900/40 rounded-lg border border-slate-700/50">
                                <div class="flex items-center justify-between mb-2">
                                    <div class="text-[10px] font-bold text-slate-500 uppercase tracking-wider"><i class="fas fa-filter text-emerald-500 mr-1"></i> Regras de Classificação Externas</div>
                                    <button onclick="addRuleToPhase('${comp.id}', ${pIdx})" class="text-[10px] bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/40 px-2 py-1 rounded border border-emerald-600/50 transition-colors"><i class="fas fa-plus mr-1"></i> Adicionar Regra</button>
                                </div>
                                <div class="space-y-2">
                                    ${(!phase.injectRules || phase.injectRules.length === 0) ? '<div class="text-xs text-slate-500 italic py-1">Nenhuma regra externa configurada.</div>' : phase.injectRules.map((r, rIdx) => `
                                        <div class="flex flex-col sm:flex-row items-center gap-2 bg-slate-800 p-2 rounded border border-slate-600 relative group">
                                            <button onclick="removeRuleFromPhase('${comp.id}', ${pIdx}, ${rIdx})" class="absolute -right-2 -top-2 bg-red-600 text-white w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md text-xs z-10" title="Excluir Regra"><i class="fas fa-times"></i></button>
                                            <div class="w-full sm:w-1/4">
                                                <label class="text-[9px] text-slate-400 uppercase font-bold block mb-0.5">Tipo</label>
                                                <select id="edit-r-type-${comp.id}-${pIdx}-${rIdx}" class="w-full bg-slate-900 border border-slate-600 rounded p-1 text-xs text-white outline-none focus:border-blue-500">
                                                    <option value="LIVE_GLOBAL" ${r.type === 'LIVE_GLOBAL' ? 'selected' : ''}>Tabela Geral - Ano Atual</option>
                                                    <option value="PREV_GLOBAL" ${r.type === 'PREV_GLOBAL' ? 'selected' : ''}>Tabela Geral - Ano Anterior</option>
                                                    <option value="LIVE_PHASE" ${r.type === 'LIVE_PHASE' ? 'selected' : ''}>Tabela Fase - Ano Atual</option>
                                                    <option value="PREV_PHASE" ${r.type === 'PREV_PHASE' ? 'selected' : ''}>Tabela Fase - Ano Anterior</option>
                                                </select>
                                            </div>
                                            <div class="w-full sm:flex-1">
                                                <label class="text-[9px] text-slate-400 uppercase font-bold block mb-0.5">Origem</label>
                                                <select id="edit-r-source-${comp.id}-${pIdx}-${rIdx}" class="w-full bg-slate-900 border border-slate-600 rounded p-1 text-xs text-white outline-none focus:border-blue-500">
                                                    ${buildSourceOptions(r.sourceId)}
                                                </select>
                                            </div>
                                            <div class="w-full sm:w-24 flex items-center gap-1">
                                                <div class="flex-1"><label class="text-[9px] text-slate-400 uppercase font-bold block mb-0.5 text-center">Do</label><input type="number" id="edit-r-min-${comp.id}-${pIdx}-${rIdx}" value="${r.minRank}" min="1" class="w-full bg-slate-900 border border-slate-600 rounded p-1 text-xs text-white text-center"></div>
                                                <span class="text-xs text-slate-500 mt-3">º</span>
                                                <div class="flex-1"><label class="text-[9px] text-slate-400 uppercase font-bold block mb-0.5 text-center">Ao</label><input type="number" id="edit-r-max-${comp.id}-${pIdx}-${rIdx}" value="${r.maxRank}" min="1" class="w-full bg-slate-900 border border-slate-600 rounded p-1 text-xs text-white text-center"></div>
                                            </div>
                                            <div class="w-full sm:w-auto">
                                                <label class="flex items-center gap-1.5 cursor-pointer text-[9px] text-slate-300 hover:text-white whitespace-nowrap">
                                                    <input type="checkbox" id="edit-r-realloc-${comp.id}-${pIdx}-${rIdx}" ${r.allowReallocation !== false ? 'checked' : ''} class="w-3.5 h-3.5 accent-blue-500"> 
                                                    Repasse de Vagas
                                                </label>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                            <div class="mt-4 flex gap-4 text-sm font-bold text-slate-300">
                                <label class="flex items-center gap-2 cursor-pointer hover:text-white"><input type="checkbox" id="edit-p-keep-${comp.id}-${pIdx}" ${phase.keepPreviousPoints ? 'checked' : ''} class="w-4 h-4 accent-blue-500"> Herdar Pontos da Fase Anterior</label>
                                <label class="flex items-center gap-2 cursor-pointer hover:text-white"><input type="checkbox" id="edit-p-agg-${comp.id}-${pIdx}" ${phase.countsToAggregatedTable ? 'checked' : ''} class="w-4 h-4 accent-blue-500"> Somar na Tabela Geral (Anual)</label>
                                <label class="flex items-center gap-2 cursor-pointer hover:text-white"><input type="checkbox" id="edit-p-title-${comp.id}-${pIdx}" ${phase.awardsTitle ? 'checked' : ''} class="w-4 h-4 accent-yellow-500"> Dá Troféu ao Vencedor</label>
                            </div>
                        </div>
                    `).join('') : '<div class="text-sm text-slate-500 italic py-4">Nenhuma fase configurada. O torneio funcionará como um campeonato de pontos corridos simples.</div>'}
                </div>
            </div>
        `).join('');
        container.innerHTML = html;
    }
}

function syncEditorDOMToMemory() {
    if (!currentEditorCountry) return;
    const compsInCountry = db.competitions.filter(comp => comp.countryId === currentEditorCountry);
    const compIds = compsInCountry.map(c => c.id);

    if (currentEditorMode === 'teams') {
        const teams = db.teams.filter(t => compIds.includes(t.compId));
        teams.forEach(t => {
            const nameEl = document.getElementById(`edit-name-${t.id}`);
            const ratingEl = document.getElementById(`edit-rating-${t.id}`);
            const colorEl = document.getElementById(`edit-color-${t.id}`);
            
            if (nameEl) t.name = nameEl.value;
            if (colorEl) t.color = colorEl.value;
            
            if (ratingEl) {
                const newRating = parseInt(ratingEl.value) || 50;
                if (newRating !== t.rating) {
                    adjustPlayersOvr(t, newRating);
                } else {
                    t.rating = newRating;
                }
            }
        });
    } else {
        compsInCountry.forEach(comp => {
            const nameEl = document.getElementById(`edit-comp-name-${comp.id}`);
            const histEl = document.getElementById(`edit-comp-hist-${comp.id}`);
            const parentEl = document.getElementById(`edit-comp-parent-${comp.id}`);
            const globalEl = document.getElementById(`edit-comp-global-${comp.id}`);
            const syEl = document.getElementById(`edit-comp-start-year-${comp.id}`);
            const smEl = document.getElementById(`edit-comp-start-${comp.id}`);
            const emEl = document.getElementById(`edit-comp-end-${comp.id}`);

            if (nameEl) comp.name = nameEl.value;
            if (histEl) comp.historyName = histEl.value;
            if (parentEl) comp.parentId = parentEl.value;
            if (globalEl) comp.awardsGlobalTitle = globalEl.checked;
            if (syEl) comp.startYear = parseInt(syEl.value) || 2026;
            if (smEl) comp.startMonth = parseInt(smEl.value) || 1;
            if (emEl) comp.endMonth = parseInt(emEl.value) || 12;

            if (comp.initialTitles) {
                Object.keys(comp.initialTitles).forEach((tId, tIdx) => {
                    const tTeamEl = document.getElementById(`edit-title-team-${comp.id}-${tIdx}`);
                    const tCountEl = document.getElementById(`edit-title-count-${comp.id}-${tIdx}`);
                    if (tTeamEl && tCountEl) {
                        let newTeamId = tTeamEl.value;
                        let count = parseInt(tCountEl.value) || 1;
                        if (newTeamId !== tId) {
                            delete comp.initialTitles[tId];
                        }
                        comp.initialTitles[newTeamId] = count;
                    }
                });
            }

            if (comp.phases) {
                comp.phases.forEach((phase, pIdx) => {
                    const pnEl = document.getElementById(`edit-p-name-${comp.id}-${pIdx}`);
                    const ptEl = document.getElementById(`edit-p-type-${comp.id}-${pIdx}`);
                    const paEl = document.getElementById(`edit-p-adv-${comp.id}-${pIdx}`);
                    const prlEl = document.getElementById(`edit-p-rounds-l-${comp.id}-${pIdx}`);
                    const prgEl = document.getElementById(`edit-p-rounds-g-${comp.id}-${pIdx}`);
                    const pngEl = document.getElementById(`edit-p-numgroups-${comp.id}-${pIdx}`);
                    const ptlegEl = document.getElementById(`edit-p-twolegs-${comp.id}-${pIdx}`);
                    const psfinEl = document.getElementById(`edit-p-singlefinal-${comp.id}-${pIdx}`);
                    const pstopEl = document.getElementById(`edit-p-stop-${comp.id}-${pIdx}`);
                    const pseedingEl = document.getElementById(`edit-p-seeding-${comp.id}-${pIdx}`);
                    
                    const pkEl = document.getElementById(`edit-p-keep-${comp.id}-${pIdx}`);
                    const paggEl = document.getElementById(`edit-p-agg-${comp.id}-${pIdx}`);
                    const ptitEl = document.getElementById(`edit-p-title-${comp.id}-${pIdx}`);

                    if (pnEl) phase.name = pnEl.value;
                    if (ptEl) phase.type = ptEl.value;
                    if (paEl) phase.advancingTeams = parseInt(paEl.value) || 0;
                    if (pseedingEl) phase.seedingByPrevPhase = pseedingEl.checked;
                    
                    if (phase.type === 'LEAGUE' && prlEl) phase.rounds = parseInt(prlEl.value) || 2;
                    if (phase.type === 'GROUPS' && prgEl) phase.rounds = parseInt(prgEl.value) || 2;
                    if (phase.type === 'GROUPS' && pngEl) phase.numGroups = parseInt(pngEl.value) || 2;
                    if (phase.type === 'KNOCKOUT') {
                        if (ptlegEl) phase.twoLegs = ptlegEl.checked;
                        if (psfinEl) phase.singleFinal = psfinEl.checked;
                        if (pstopEl) phase.stopAtTeams = parseInt(pstopEl.value) || 1;
                    }
                    
                    if (pkEl) phase.keepPreviousPoints = pkEl.checked;
                    if (paggEl) phase.countsToAggregatedTable = paggEl.checked;
                    if (ptitEl) phase.awardsTitle = ptitEl.checked;

                    if (phase.injectRules) {
                        phase.injectRules.forEach((rule, rIdx) => {
                            const rtEl = document.getElementById(`edit-r-type-${comp.id}-${pIdx}-${rIdx}`);
                            const rsEl = document.getElementById(`edit-r-source-${comp.id}-${pIdx}-${rIdx}`);
                            const rminEl = document.getElementById(`edit-r-min-${comp.id}-${pIdx}-${rIdx}`);
                            const rmaxEl = document.getElementById(`edit-r-max-${comp.id}-${pIdx}-${rIdx}`);
                            const reallocEl = document.getElementById(`edit-r-realloc-${comp.id}-${pIdx}-${rIdx}`);
                            
                            if (rtEl) rule.type = rtEl.value;
                            if (rsEl) rule.sourceId = rsEl.value;
                            if (rminEl) rule.minRank = parseInt(rminEl.value) || 1;
                            if (rmaxEl) rule.maxRank = parseInt(rmaxEl.value) || 4;
                            if (reallocEl) rule.allowReallocation = reallocEl.checked;
                        });
                    }
                });
            }
        });
    }
}

function saveEditorChanges() {
    syncEditorDOMToMemory();
    db.teams.forEach(t => gameState.teamMap[t.id] = t);
    db.competitions.forEach(c => gameState.compMap[c.id] = c);
    showModal("Sucesso", "Alterações salvas na memória do jogo! Lembre-se de exportar o DB se quiser mantê-las para outra sessão.");
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

            if (liveMatch && !liveMatch.paused && liveMatch.minute < 90) {
                if (p1isBench !== p2isBench) {
                    if (liveMatch.subsLeft <= 0) {
                        showModal("Aviso", "Sem substituições restantes!");
                        selectedTacticsSlot = null;
                        renderClassicHub();
                        return;
                    }
                    let idOut = p1isBench ? id2 : id1;
                    let idIn = p1isBench ? id1 : id2;
                    let pOut = gameState.mySquad.find(x => x.id === idOut);
                    let pIn = gameState.mySquad.find(x => x.id === idIn);
                    
                    liveMatch.subsLeft--;
                    const side = liveMatch.fixture.home === gameState.playerTeamId ? 'home' : 'away';
                    const indexOut = liveMatch.playersOnPitch[side].indexOf(pOut.id);
                    if (indexOut > -1) liveMatch.playersOnPitch[side].splice(indexOut, 1);
                    liveMatch.playersOnPitch[side].push(pIn.id);
                    liveMatch.playersAppeared[side].push(pIn.id);

                    let dispMin = liveMatch.minute > (liveMatch.half === 1 ? 45 : 90) ? (liveMatch.half === 1 ? '45+' : '90+') : liveMatch.minute;
                    liveMatch.events.push(`[${dispMin}'] 🔄 Substituição: Entra ${pIn.name}, sai ${pOut.name}.`);
                }
            }

            if (p1isBench) gameState.myLineup.bench[p1idx] = id2; else gameState.myLineup.starters[p1idx] = id2;
            if (p2isBench) gameState.myLineup.bench[p2idx] = id1; else gameState.myLineup.starters[p2idx] = id1;
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
        p.trainingsThisSeason = p.trainingsThisSeason || 0;
        const cost = 0.5 + (p.trainingsThisSeason * 0.5);
        let myTeam = gameState.teamMap[gameState.playerTeamId];
        let myBudget = parseFloat(myTeam.budget || 15);

        if (myBudget < cost) {
            showModal("Sem Fundos", `O caixa do clube precisa de pelo menos $${cost.toFixed(1)}M para realizar o treino intensivo de ${p.name}.\nSeu saldo: $${myBudget.toFixed(1)}M`);
            return;
        }

        showConfirmModal("Treinamento Intensivo", 
            `Custo do Treino Atual: $${cost.toFixed(1)}M\n(O valor aumenta a cada treino na mesma temporada, resetando no fim do ano).\n\nDeseja realizar um treino focado para aumentar o OVR de ${p.name}?`,
            () => { applyTraining(p, cost); }
        );
        return;
    } else if(action === 'emprestar') {
        p.listedForLoan = true;
        p.listed = false;
        showModal("Empréstimo", `${p.name} foi colocado na lista de empréstimos. Verifique as propostas de outros clubes no Mercado.`);
    } else if(action === 'vender') {
        p.listed = true;
        p.listedForLoan = false;
        showModal("Venda", `${p.name} foi colocado à venda. Verifique as propostas no Mercado (Minhas Vendas).`);
    }
    selectPlayer(p.id);
    renderClassicHub();
}

function applyTraining(player, cost, focus) {
    let myTeam = gameState.teamMap[gameState.playerTeamId];
    myTeam.budget = (parseFloat(myTeam.budget || 15) - cost).toFixed(2);
    
    player.ovr = Math.min(99, player.ovr + 1);
    player.trainingsThisSeason = (player.trainingsThisSeason || 0) + 1;
    
    let extraMsg = "";
    if (focus === 'weakness' && player.weaknesses && player.weaknesses.length > 0) {
        const removed = player.weaknesses.shift();
        extraMsg = `\nA fraqueza '${removed}' foi mitigada e não é mais um problema!`;
    } else if (focus === 'strength') {
        extraMsg = `\nSeus pontos fortes foram aprimorados no CT.`;
    }

    showModal("Treino Concluído", `Intensivo Finalizado!\n${player.name} subiu para ${player.ovr} de OVR!${extraMsg}`);
    selectPlayer(player.id);
    renderClassicHub();
}

function tickLiveMatch() {
    if(!liveMatch || liveMatch.paused) return;
    liveMatch.minute += 2; 
    
    const homeTeam = gameState.teamMap[liveMatch.fixture.home];
    const awayTeam = gameState.teamMap[liveMatch.fixture.away];
    
    const effHomeRating = getEffectiveTeamRating(liveMatch.fixture.home);
    const effAwayRating = getEffectiveTeamRating(liveMatch.fixture.away);

    const diff = effHomeRating - effAwayRating + 3;
    let baseChance = 0.035;
    let homeChance = Math.max(0.01, baseChance + (diff * 0.0015));
    let awayChance = Math.max(0.01, baseChance - (diff * 0.0015));
    
    let targetMinute = liveMatch.half === 1 ? 45 : 90;
    
    if (liveMatch.minute >= targetMinute && !liveMatch.extraTimeCalculated) {
        liveMatch.stoppageTime = Math.floor(Math.random() * 5) + 1;
        liveMatch.extraTimeCalculated = true;
        liveMatch.events.push(`[${targetMinute}'] O árbitro dá +${liveMatch.stoppageTime} min de acréscimos.`);
    }

    let currentMaxMinute = targetMinute + (liveMatch.extraTimeCalculated ? liveMatch.stoppageTime : 0);

    if (liveMatch.minute >= currentMaxMinute) {
        liveMatch.minute = currentMaxMinute;
        if (liveMatch.half === 1) {
            liveMatch.paused = true;
            clearInterval(liveMatch.timer);
            liveMatch.half = 2;
            liveMatch.extraTimeCalculated = false;
            liveMatch.events.push(`[${currentMaxMinute}'] Fim do primeiro tempo! Placar: ${liveMatch.homeScore} x ${liveMatch.awayScore}`);
            renderClassicHub();
            return;
        } else {
            liveMatch.paused = true;
            clearInterval(liveMatch.timer);
            liveMatch.events.push(`[${currentMaxMinute}'] Fim de Jogo! O árbitro encerra a partida.`);
            renderClassicHub();
            return;
        }
    }
    
    const displayMin = liveMatch.minute > targetMinute ? `${targetMinute}+${liveMatch.minute - targetMinute}` : liveMatch.minute;

    const getRandomPlayer = (teamId, isGoal, isAssist = false) => {
        if (teamId === gameState.playerTeamId) {
            const side = teamId === liveMatch.fixture.home ? 'home' : 'away';
            let onPitchIds = liveMatch.playersOnPitch[side];
            let candidates = onPitchIds.map(id => gameState.mySquad.find(p => p.id === id)).filter(p=>p);
            
            if(isGoal || isAssist) {
                let weightedCandidates = [];
                candidates.forEach(p => {
                    let weight = 1;
                    if (p.pos.includes('ATA') || p.pos.includes('CA')) weight = isGoal ? 5 : 2;
                    else if (p.pos.includes('MEI') || p.pos.includes('PT') || p.pos.includes('MC')) weight = isGoal ? 2 : 4;
                    else if (p.pos.includes('ZAG') || p.pos.includes('LT')) weight = 1;
                    else if (p.pos.includes('GOL')) weight = 0;
                    for(let i=0; i<weight; i++) weightedCandidates.push(p);
                });
                if (weightedCandidates.length > 0) return weightedCandidates[Math.floor(Math.random() * weightedCandidates.length)];
            }
            if(candidates.length === 0) return null;
            return candidates[Math.floor(Math.random() * candidates.length)];
        }
        return {name: "Camisa " + (Math.floor(Math.random()*11)+1), isGeneric: true};
    };

    if (Math.random() < homeChance) {
        liveMatch.homeScore++;
        const scorer = getRandomPlayer(liveMatch.fixture.home, true);
        const assister = Math.random() > 0.4 ? getRandomPlayer(liveMatch.fixture.home, false, true) : null;
        
        if(scorer && scorer.id && !scorer.isGeneric) {
            scorer.sGoals = (scorer.sGoals||0) + 1; scorer.cGoals = (scorer.cGoals||0) + 1;
            scorer.matchRatingBonus = (scorer.matchRatingBonus || 0) + 1.5;
        }
        if(assister && assister.id && assister.id !== (scorer?scorer.id:null) && !assister.isGeneric) {
            assister.sAssists = (assister.sAssists||0) + 1; assister.cAssists = (assister.cAssists||0) + 1;
            assister.matchRatingBonus = (assister.matchRatingBonus || 0) + 1.0;
        }
        
        let assistText = (assister && assister.name !== "Camisa undefined" && assister.id !== (scorer?scorer.id:null)) ? ` (Assistência de ${assister.name})` : '';
        liveMatch.events.push(`[${displayMin}'] ⚽ GOL do ${homeTeam.name}! ${scorer ? scorer.name : ''} manda pro fundo da rede!${assistText}`);
    } else if (Math.random() < awayChance) {
        liveMatch.awayScore++;
        const scorer = getRandomPlayer(liveMatch.fixture.away, true);
        const assister = Math.random() > 0.4 ? getRandomPlayer(liveMatch.fixture.away, false, true) : null;
        
        if(scorer && scorer.id && !scorer.isGeneric) {
            scorer.sGoals = (scorer.sGoals||0) + 1; scorer.cGoals = (scorer.cGoals||0) + 1;
            scorer.matchRatingBonus = (scorer.matchRatingBonus || 0) + 1.5;
        }
        if(assister && assister.id && assister.id !== (scorer?scorer.id:null) && !assister.isGeneric) {
            assister.sAssists = (assister.sAssists||0) + 1; assister.cAssists = (assister.cAssists||0) + 1;
            assister.matchRatingBonus = (assister.matchRatingBonus || 0) + 1.0;
        }

        let assistText = (assister && assister.name !== "Camisa undefined" && assister.id !== (scorer?scorer.id:null)) ? ` (Assistência de ${assister.name})` : '';
        liveMatch.events.push(`[${displayMin}'] ⚽ GOL do ${awayTeam.name}! ${scorer ? scorer.name : ''} cala a torcida!${assistText}`);
    } else if (Math.random() < 0.20) {
        const teamId = Math.random() > 0.5 ? liveMatch.fixture.home : liveMatch.fixture.away;
        const teamName = gameState.teamMap[teamId].name;
        const p = getRandomPlayer(teamId, false);
        
        let eventType = Math.random();
        if (eventType < 0.25) {
            if (p && p.id && !p.isGeneric) {
                p.sYellows = (p.sYellows||0) + 1; p.cYellows = (p.cYellows||0) + 1;
                p.matchRatingBonus = (p.matchRatingBonus || 0) - 0.5;
            }
            liveMatch.events.push(`[${displayMin}'] 🟨 Cartão amarelo para ${p?p.name:'o jogador'} do ${teamName}.`);
        } else if (eventType < 0.28) {
            if (p && p.id && !p.isGeneric) {
                p.sReds = (p.sReds||0) + 1; p.cReds = (p.cReds||0) + 1;
                p.matchRatingBonus = (p.matchRatingBonus || 0) - 2.5;
                const side = teamId === liveMatch.fixture.home ? 'home' : 'away';
                const index = liveMatch.playersOnPitch[side].indexOf(p.id);
                if (index > -1) liveMatch.playersOnPitch[side].splice(index, 1);
            }
            liveMatch.events.push(`[${displayMin}'] 🟥 EXPULSO! Cartão vermelho direto para ${p?p.name:'o jogador'} do ${teamName}.`);
        } else {
            const phrases = [`Lance perigoso de ${p?p.name:'alguém'} do ${teamName}... a zaga afasta!`, `Falta dura no meio campo sofrida por ${p?p.name:'um jogador'} do ${teamName}.`, `Quase! A bola de ${p?p.name:'cabeça'} do ${teamName} passa raspando a trave.`];
            liveMatch.events.push(`[${displayMin}'] ${phrases[Math.floor(Math.random() * phrases.length)]}`);
        }
    }
    
    renderClassicHub();
    setTimeout(() => {
        const consoleEl = document.getElementById('match-events-container');
        if(consoleEl) consoleEl.scrollTop = consoleEl.scrollHeight;
    }, 50);
}