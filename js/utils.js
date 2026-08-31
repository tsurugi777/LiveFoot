// Funções Utilitárias

function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function getPositionPenalty(playerPositions, slotRole) {
    if (!playerPositions || !slotRole) return 0;
    const pPosList = playerPositions.split('/');
    if (pPosList.includes(slotRole)) return 0; 
    
    const groups = {
        'GOL': ['GOL'],
        'DEF': ['ZAG', 'LTE', 'LTD'],
        'MID': ['VOL', 'MC', 'MEI'],
        'ATT': ['PTE', 'PTD', 'ATA', 'CA']
    };

    let pGroup = null; let sGroup = null;
    for (const [g, roles] of Object.entries(groups)) {
        if (roles.includes(slotRole)) sGroup = g;
        if (roles.some(r => pPosList.includes(r))) pGroup = g;
    }

    if (sGroup === 'GOL' && pGroup !== 'GOL') return -40;
    if (pGroup === 'GOL' && sGroup !== 'GOL') return -40;
    if (pGroup === sGroup) return -4;
    
    const groupDistance = { 'DEF': 1, 'MID': 2, 'ATT': 3 };
    let dist = Math.abs(groupDistance[pGroup] - groupDistance[sGroup]);
    if (dist === 1) return -8;
    if (dist === 2) return -15;
    
    return -10;
}

function getEffectiveTeamRating(teamId) {
    const team = gameState.teamMap[teamId];
    if (teamId === gameState.playerTeamId) {
        let totalOvr = 0; let count = 0;
        const fm = formationsDB[gameState.myLineup.formation];
        gameState.myLineup.starters.forEach((pId, idx) => {
            let p = gameState.mySquad.find(x => x.id === pId);
            if (p) {
                let pen = getPositionPenalty(p.pos, fm[idx].role);
                totalOvr += Math.max(1, p.ovr + pen);
                count++;
            }
        });
        return count > 0 ? Math.round(totalOvr / count) : team.rating;
    }
    return team.rating;
}

function generateSquad(teamId, teamRating) {
    const currentTeam = gameState.teamMap[teamId] || db.teams.find(t => t.id === teamId);
    if (currentTeam && currentTeam.importedPlayers && currentTeam.importedPlayers.length > 0) {
        return JSON.parse(JSON.stringify(currentTeam.importedPlayers)).map(p => ({
            ...p, sGames: 0, sGoals: 0, sAssists: 0, sRatings: [], cGames: p.stats?.games||0, cGoals: p.stats?.goals||0, cAssists: p.stats?.assists||0, energy: 100
        }));
    }

    const firstNames = ["Alberto", "Thomas", "Georgios", "Cican", "Moses", "Ehsan", "Stavros", "Milad", "Domagoj", "Alexander", "Ziga", "Damian", "Jens", "Mijat", "Roberto", "Steven", "Giannis", "Tom", "Erik", "Levi"];
    const lastNames = ["Brignoli", "Strakosha", "Tsintotas", "Odubajo", "Hajsafi", "Pilios", "Bakakis", "Mohammadi", "Sidibé", "Mitoglou", "Vida", "Callens", "Laci", "Szymanski", "Jönsson", "Gacinovic", "Pereyra", "Zuber", "Botos", "García"];
    const posPool = ['GOL', 'LTD', 'LTE', 'ZAG', 'VOL', 'MC', 'MEI', 'PTE', 'PTD', 'ATA', 'CA'];
    const legs = ['D', 'E'];
    const possStr = {'GOL': ['Reflexos', 'Liderança', 'Posicionamento'], 'DEF': ['Desarme', 'Força Física', 'Cabeceio'], 'MID': ['Visão de Jogo', 'Passe Curto', 'Controle de Bola'], 'ATT': ['Finalização', 'Velocidade', 'Drible']};
    const possWeak = {'GOL': ['Saída de Bola', 'Um contra Um'], 'DEF': ['Velocidade', 'Agilidade', 'Apoio Ofensivo'], 'MID': ['Finalização', 'Marcação', 'Força Física'], 'ATT': ['Desarme', 'Marcação', 'Passe Longo']};
    const squad = [];
    const squadSize = Math.floor(Math.random() * 6) + 25;
    
    for(let i=0; i<squadSize; i++) {
        let pos = i < 3 ? 'GOL' : i < 9 ? (Math.random()>0.5?'ZAG':(Math.random()>0.5?'LTD':'LTE')) : i < 18 ? (Math.random()>0.5?'MC':(Math.random()>0.5?'VOL':'MEI')) : 'ATA';
        let age = Math.floor(Math.random() * 18) + 18;
        let ovr = Math.max(30, Math.min(99, teamRating - 20 + Math.floor(Math.random() * 25)));
        
        let gType = pos === 'GOL' ? 'GOL' : (['ZAG','LTD','LTE'].includes(pos) ? 'DEF' : (['VOL','MC','MEI'].includes(pos) ? 'MID' : 'ATT'));
        let sArr = [...possStr[gType]].sort(() => 0.5 - Math.random()).slice(0, 1 + Math.floor(Math.random() * 2));
        let wArr = [...possWeak[gType]].sort(() => 0.5 - Math.random()).slice(0, 1 + Math.floor(Math.random() * 2));

        squad.push({
            id: 'p_' + Math.random().toString(36).substr(2, 9),
            name: firstNames[Math.floor(Math.random()*firstNames.length)] + " " + lastNames[Math.floor(Math.random()*lastNames.length)],
            pos: pos, leg: legs[Math.floor(Math.random()*legs.length)], ovr: ovr, energy: 100,
            salary: (Math.floor(Math.random() * 100) + 20) + " mil", value: (Math.floor(Math.random() * 10) + 1),
            sGames: 0, sGoals: 0, sAssists: 0, sRatings: [], cGames: 0, cGoals: 0, cAssists: 0,
            age: age, contractEnd: '24/08/20' + (26 + Math.floor(Math.random()*4)),
            strengths: sArr, weaknesses: wArr,
            isYouth: false,
            nationality: currentTeam ? currentTeam.country : "Brazil"
        });
    }
    return squad;
}

function generateYouthPlayer(team, position, ovr) {
    const country = team.country || "Brazil";
    const youthName = getYouthName(country);
    const pos = position || ['GOL', 'LTD', 'LTE', 'ZAG', 'VOL', 'MC', 'MEI', 'PTE', 'PTD', 'ATA'][Math.floor(Math.random() * 10)];
    const leg = Math.random() > 0.5 ? 'D' : 'E';
    const age = 16 + Math.floor(Math.random() * 5);
    const baseOvr = ovr || Math.max(45, Math.min(70, team.rating - 15 + Math.floor(Math.random() * 15)));
    
    const gType = pos === 'GOL' ? 'GOL' : (['ZAG','LTD','LTE'].includes(pos) ? 'DEF' : (['VOL','MC','MEI'].includes(pos) ? 'MID' : 'ATT'));
    const possStr = {'GOL': ['Reflexos', 'Liderança', 'Posicionamento'], 'DEF': ['Desarme', 'Força Física', 'Cabeceio'], 'MID': ['Visão de Jogo', 'Passe Curto', 'Controle de Bola'], 'ATT': ['Finalização', 'Velocidade', 'Drible']};
    const possWeak = {'GOL': ['Saída de Bola', 'Um contra Um'], 'DEF': ['Velocidade', 'Agilidade', 'Apoio Ofensivo'], 'MID': ['Finalização', 'Marcação', 'Força Física'], 'ATT': ['Desarme', 'Marcação', 'Passe Longo']};
    
    const sArr = [...possStr[gType]].sort(() => 0.5 - Math.random()).slice(0, 1 + Math.floor(Math.random() * 2));
    const wArr = [...possWeak[gType]].sort(() => 0.5 - Math.random()).slice(0, 1 + Math.floor(Math.random() * 2));

    return {
        id: 'p_' + Math.random().toString(36).substr(2, 9),
        name: youthName,
        pos: pos,
        leg: leg,
        ovr: baseOvr,
        energy: 100,
        salary: (Math.floor(Math.random() * 30) + 10) + " mil",
        value: (Math.floor(Math.random() * 3) + 0.5).toFixed(1),
        sGames: 0, sGoals: 0, sAssists: 0, sRatings: [], 
        cGames: 0, cGoals: 0, cAssists: 0,
        age: age,
        contractEnd: '24/08/20' + (26 + Math.floor(Math.random()*3)),
        strengths: sArr,
        weaknesses: wArr,
        isYouth: true,
        nationality: country
    };
}

function getManagerPhotoElement(manager, isHuman = false) {
    if (isHuman) {
        return `<div class="manager-photo-placeholder" style="background: #4ade80; color: #000; font-weight: bold; font-size: 16px;"><i class="fas fa-user-tie"></i></div>`;
    }
    if (manager && manager.photoUrl) {
        return `<img src="${manager.photoUrl}" class="manager-photo" onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\\'manager-photo-placeholder\\'><i class=\\'fas fa-user-tie\\'></i></div>';">`;
    }
    return `<div class="manager-photo-placeholder"><i class="fas fa-user-tie"></i></div>`;
}

function adjustPlayersOvr(team, newRating) {
    if (!team.generatedSquad && !team.importedPlayers) return;
    
    const squad = team.generatedSquad || team.importedPlayers;
    if (!squad || squad.length === 0) return;
    
    const oldRating = team.rating || 50;
    const diff = newRating - oldRating;
    
    squad.forEach(player => {
        const deviation = player.ovr - oldRating;
        let newOvr = newRating + deviation + (Math.random() * 2 - 1);
        newOvr = Math.max(30, Math.min(99, Math.round(newOvr)));
        player.ovr = newOvr;
    });
    
    team.rating = newRating;
}

function generateRoundRobin(teams, numRounds, startWeek, phaseId, baseCompId, season) {
     let fixtures = []; let n = teams.length; let dummy = n % 2 !== 0; 
     if (dummy) { teams.push(null); n++; }
     let weekOffset = 0;
     for (let r = 0; r < numRounds; r++) {
         for (let round = 0; round < n - 1; round++) {
             let hasMatch = false;
             for (let i = 0; i < n / 2; i++) {
                 let home = teams[i]; let away = teams[n - 1 - i];
                 if (home !== null && away !== null) {
                     if (r % 2 === 1) { let temp = home; home = away; away = temp; }
                     fixtures.push({ home, away, homeScore: null, awayScore: null, played: false, globalWeek: startWeek + weekOffset, compId: phaseId, baseCompId, season });
                     hasMatch = true;
                 }
             }
             if(hasMatch) weekOffset++;
             teams.splice(1, 0, teams.pop());
         }
     }
     if (dummy) teams.pop(); 
     return fixtures;
}