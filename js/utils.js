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
    const pPosList = normalizePosition(playerPositions).split('/');
    slotRole = normalizePosition(slotRole);
    if (pPosList.includes(slotRole)) return 0;
    
    const groups = {
        'GO': ['GO'],
        'DEF': ['ZC', 'LE', 'LD'],
        'MID': ['VOL', 'MLG', 'MAT', 'MLE', 'MLD'],
        'ATT': ['PTE', 'PTD', 'CA']
    };

    let pGroup = null; let sGroup = null;
    for (const [g, roles] of Object.entries(groups)) {
        if (roles.includes(slotRole)) sGroup = g;
        if (roles.some(r => pPosList.includes(r))) pGroup = g;
    }

    if (sGroup === 'GO' && pGroup !== 'GO') return -40;
    if (pGroup === 'GO' && sGroup !== 'GO') return -40;
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
        const fm = getTacticsPositions();
        gameState.myLineup.starters.forEach((pId, idx) => {
            let p = gameState.mySquad.find(x => x.id === pId);
            if (p) {
                let pen = getPositionPenalty(p.pos, fm[idx].role);
                totalOvr += Math.max(1, energyRating(p) + pen);
                count++;
            }
        });
        return count > 0 ? Math.round(totalOvr / count) : team.rating;
    }
    const players=cpuMatchPlayers(teamId);refreshTeamRating(teamId);
    return players.length?Math.round(players.reduce((n,p)=>n+Math.max(1,energyRating(p)+getPositionPenalty(p.pos,cpuTactics(teamId).slots[cpuTactics(teamId).starters.indexOf(p.id)].role)),0)/players.length):team.rating;
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
    const posPool = ['GO', 'LD', 'LE', 'ZC', 'VOL', 'MLG', 'MAT', 'PTE', 'PTD', 'CA'];
    const legs = ['D', 'E'];
    const possStr = {'GO': ['Reflexos', 'Liderança', 'Posicionamento'], 'DEF': ['Desarme', 'Força Física', 'Cabeceio'], 'MID': ['Visão de Jogo', 'Passe Curto', 'Controle de Bola'], 'ATT': ['Finalização', 'Velocidade', 'Drible']};
    const possWeak = {'GO': ['Saída de Bola', 'Um contra Um'], 'DEF': ['Velocidade', 'Agilidade', 'Apoio Ofensivo'], 'MID': ['Finalização', 'Marcação', 'Força Física'], 'ATT': ['Desarme', 'Marcação', 'Passe Longo']};
    const squad = [];
    const squadSize = Math.floor(Math.random() * 6) + 25;
    
    for(let i=0; i<squadSize; i++) {
        let pos = i < 3 ? 'GO' : i < 9 ? (Math.random()>0.5?'ZC':(Math.random()>0.5?'LD':'LE')) : i < 18 ? (Math.random()>0.5?'MLG':(Math.random()>0.5?'VOL':'MAT')) : 'CA';
        let age = Math.floor(Math.random() * 18) + 18;
        let ovr = Math.max(30, Math.min(99, teamRating - 20 + Math.floor(Math.random() * 25)));
        
        let gType = pos === 'GO' ? 'GO' : (['ZC','LD','LE'].includes(pos) ? 'DEF' : (['VOL','MLG','MAT'].includes(pos) ? 'MID' : 'ATT'));
        let sArr = [...possStr[gType]].sort(() => 0.5 - Math.random()).slice(0, 1 + Math.floor(Math.random() * 2));
        let wArr = [...possWeak[gType]].sort(() => 0.5 - Math.random()).slice(0, 1 + Math.floor(Math.random() * 2));

        squad.push({
            id: 'p_' + Math.random().toString(36).substr(2, 9),
            name: firstNames[Math.floor(Math.random()*firstNames.length)] + " " + lastNames[Math.floor(Math.random()*lastNames.length)],
            pos: pos, leg: legs[Math.floor(Math.random()*legs.length)], ovr: ovr, energy: 100,
            salary: (Math.floor(Math.random() * 100) + 20) + " mil", value: (Math.floor(Math.random() * 10) + 1),
            sGames: 0, sGoals: 0, sAssists: 0, sRatings: [], cGames: 0, cGoals: 0, cAssists: 0,
            age: age, contractEnd: '31/12/' + (new Date(gameState.currentDate).getFullYear() + 1 + Math.floor(Math.random()*3)),
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
    const pos = normalizePosition(position) || ['GO', 'LD', 'LE', 'ZC', 'VOL', 'MLG', 'MAT', 'PTE', 'PTD', 'CA'][Math.floor(Math.random() * 10)];
    const leg = Math.random() > 0.5 ? 'D' : 'E';
    const age = 16 + Math.floor(Math.random() * 5);
    const baseOvr = ovr || Math.max(45, Math.min(70, team.rating - 15 + Math.floor(Math.random() * 15)));
    
    const gType = pos === 'GO' ? 'GO' : (['ZC','LD','LE'].includes(pos) ? 'DEF' : (['VOL','MLG','MAT'].includes(pos) ? 'MID' : 'ATT'));
    const possStr = {'GO': ['Reflexos', 'Liderança', 'Posicionamento'], 'DEF': ['Desarme', 'Força Física', 'Cabeceio'], 'MID': ['Visão de Jogo', 'Passe Curto', 'Controle de Bola'], 'ATT': ['Finalização', 'Velocidade', 'Drible']};
    const possWeak = {'GO': ['Saída de Bola', 'Um contra Um'], 'DEF': ['Velocidade', 'Agilidade', 'Apoio Ofensivo'], 'MID': ['Finalização', 'Marcação', 'Força Física'], 'ATT': ['Desarme', 'Marcação', 'Passe Longo']};
    
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
        contractEnd: '31/12/' + (new Date(gameState.currentDate).getFullYear() + 2),
        strengths: sArr,
        weaknesses: wArr,
        isYouth: true,
        nationality: country
    };
}

function getManagerPhotoElement(manager, isHuman = false) {
    return personImage(isHuman ? (gameState.managerPhoto || manager?.photoUrl) : manager?.photoUrl, 'manager-photo');
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
