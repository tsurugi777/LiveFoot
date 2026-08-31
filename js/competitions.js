// Sistema de Competições

function initGlobalStandings(rootId, season) {
    if (!gameState.globalStandings[season]) gameState.globalStandings[season] = {};
    gameState.globalStandings[season][rootId] = {};
    db.teams.filter(t => t.compId === rootId).forEach(t => {
        gameState.globalStandings[season][rootId][t.id] = { played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, pts: 0 };
    });
}

function checkPendingStages() {
    const nowYear = gameState.currentDate.getFullYear(); 
    const nowMonth = gameState.currentDate.getMonth() + 1;
    let itemsToStart = [];
    gameState.pendingStages = gameState.pendingStages.filter(p => {
        if (nowYear > p.startYear || (nowYear === p.startYear && nowMonth >= p.startMonth)) {
            itemsToStart.push(p); 
            return false;
        }
        return true;
    });
    itemsToStart.forEach(p => startPhase(p.rootId, p.stageIndex, p.phaseIndex, p.advancingTeams, gameState.currentWeek, p.season));
}

function initStanding(phaseId, teamId, groupId, season, phaseConfig = null, rootId = null, stageIndex = 0, phaseIndex = 0) {
    let stats = { groupId: groupId, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, pts: 0, keptPoints: false };
    
    if (phaseConfig && phaseConfig.keepPreviousPoints && rootId) {
        let prevStats = null;
        
        if (gameState.globalStandings[season] && gameState.globalStandings[season][rootId] && gameState.globalStandings[season][rootId][teamId]) {
            prevStats = gameState.globalStandings[season][rootId][teamId];
        }
        
        if (!prevStats && phaseIndex > 0) {
            const prevPhase = gameState.stages[rootId][stageIndex].phases[phaseIndex - 1];
            const prevPhaseKey = prevPhase.id + "_" + season;
            if (prevPhase && gameState.standings[prevPhaseKey] && gameState.standings[prevPhaseKey][teamId]) {
                prevStats = gameState.standings[prevPhaseKey][teamId];
            }
        }

        if (prevStats) {
            stats.played = prevStats.played || 0;
            stats.won = prevStats.won || 0;
            stats.drawn = prevStats.drawn || 0;
            stats.lost = prevStats.lost || 0;
            stats.gf = prevStats.gf || 0;
            stats.ga = prevStats.ga || 0;
            stats.gd = prevStats.gd || 0;
            stats.pts = phaseConfig.halvePreviousPoints ? Math.ceil((prevStats.pts || 0) / 2) : (prevStats.pts || 0);
            stats.keptPoints = true;
        }
    }

    if (!gameState.standings[phaseId + "_" + season]) gameState.standings[phaseId + "_" + season] = {};
    gameState.standings[phaseId + "_" + season][teamId] = stats;
}

function getPhaseStandingsList(phaseKey) {
    const std = gameState.standings[phaseKey] || {};
    return Object.keys(std).map(id => ({teamId: id, ...std[id]})).sort((a,b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
}

function getGlobalStandingsList(rootId, season) {
    const standings = gameState.globalStandings[season] && gameState.globalStandings[season][rootId];
    if (!standings) return [];
    return Object.keys(standings)
        .map(id => ({ teamId: id, ...standings[id] }))
        .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
}

function getSourceRankings(sourceId, ruleType, currentSeason) {
    let targetSeason = currentSeason;
    if (ruleType === 'PREV_GLOBAL' || ruleType === 'PREV_PHASE' || ruleType === 'PREV_CHAMP') {
        targetSeason = currentSeason - 1;
    }

    if (sourceId === 'lib_champs' && ruleType === 'PREV_GLOBAL') {
        let prevFinal = gameState.phaseRankings['lib_final_' + targetSeason];
        if (prevFinal && prevFinal.length > 0) return [{teamId: prevFinal[0].teamId}, {teamId: 'fallback_team'}];
        return []; 
    }

    const phaseKey = sourceId + "_" + targetSeason;
    
    if (gameState.phaseRankings[phaseKey]) return gameState.phaseRankings[phaseKey];
    if (gameState.standings[phaseKey]) return getPhaseStandingsList(phaseKey);
    if (gameState.globalStandings[targetSeason] && gameState.globalStandings[targetSeason][sourceId]) {
        return getGlobalStandingsList(sourceId, targetSeason);
    }

    if (ruleType === 'PREV_GLOBAL' || ruleType === 'PREV_PHASE') {
        let fallbackTeams = db.teams.filter(t => t.compId === sourceId);
        if (fallbackTeams.length === 0) fallbackTeams = db.teams.filter(t => db.competitions.some(c => c.id === t.compId && c.phases && c.phases.some(p => p.id === sourceId)));
        return fallbackTeams.sort((a,b) => b.rating - a.rating).map(t => ({teamId: t.id}));
    }
    return [];
}

function resolveInjectRules(rules, season) {
    let selectedTeams = [];
    rules.forEach(rule => {
        let rankings = getSourceRankings(rule.sourceId, rule.type, season);
        if (rankings && rankings.length > 0) {
             let countNeeded = rule.maxRank - rule.minRank + 1;
             let added = 0;
             let i = rule.minRank - 1; 
             let canReallocate = rule.allowReallocation !== undefined ? rule.allowReallocation : true;

             while(added < countNeeded && i < rankings.length) {
                 let t = rankings[i].teamId;
                 if (!selectedTeams.includes(t)) {
                     selectedTeams.push(t);
                     added++;
                 } else if (!canReallocate) {
                     added++;
                 }
                 i++;
             }
        }
    });
    return selectedTeams; 
}

function initGame(teamId) {
    gameState.playerTeamId = teamId;
    gameState.playerBaseCompId = gameState.teamMap[teamId].compId;
    
    const team = gameState.teamMap[teamId];
    if (!team.managerName || team.managerName === "Interino") {
        team.managerName = humanManagerName;
        team.isHumanManaged = true;
    }
    
    gameState.mySquad = generateSquad(teamId, gameState.teamMap[teamId].rating);
    
    const rootComps = db.competitions.filter(c => c.parentId === "NONE" || c.parentId === undefined);
    let earliestYear = 3000;
    rootComps.forEach(c => { if (c.startYear && c.startYear < earliestYear) earliestYear = c.startYear; });
    if (earliestYear === 3000) earliestYear = new Date().getFullYear();

    gameState.startYear = earliestYear; 
    gameState.currentWeek = 0; 
    gameState.currentDate = new Date(earliestYear, 0, 7);
    gameState.pendingStages = []; 
    gameState.globalStandings = {}; 
    gameState.phaseRankings = {};
    gameState.countrySeason = {}; 
    gameState.history = []; 
    gameState.activePhases = {}; 
    gameState.seasonMaxStage = {};
    gameState.phaseByes = {};

    rootComps.forEach(rootComp => {
        const rootId = rootComp.id;
        const children = db.competitions.filter(c => c.parentId === rootId);
        let stages = [];
        if (rootComp.phases && rootComp.phases.length > 0) {
            if (children.length > 0 && rootComp.phases[0].type === 'KNOCKOUT') rootComp.startMonth = 12;
            stages.push(rootComp);
        }
        if (children.length > 0) stages.push(...children);
        stages.sort((a,b) => (a.startYear - b.startYear) || (a.startMonth - b.startMonth));
        
        const baseYear = Math.min(...stages.map(s => s.startYear || earliestYear));
        stages.forEach(s => { s.yearOffset = (s.startYear || baseYear) - baseYear; });
        
        gameState.stages[rootId] = stages; 
        gameState.seasonMaxStage[rootId] = -1;
        initGlobalStandings(rootId, baseYear); 
        gameState.countrySeason[rootId] = baseYear;

        if(stages.length > 0) {
            let nextIndex = 0; 
            let nextStage = stages[nextIndex]; 
            let stagesToStart = [nextIndex];
            for(let i = nextIndex + 1; i < stages.length; i++) {
                let s = stages[i];
                if (s.startMonth === nextStage.startMonth && s.yearOffset === nextStage.yearOffset) stagesToStart.push(i);
                else break;
            }
            stagesToStart.forEach(idx => {
                let s = stages[idx];
                gameState.seasonMaxStage[rootId] = Math.max(gameState.seasonMaxStage[rootId], idx);
                gameState.pendingStages.push({
                    rootId: rootId, 
                    stageIndex: idx, 
                    phaseIndex: 0, 
                    advancingTeams: null,
                    season: baseYear, 
                    startYear: baseYear + s.yearOffset, 
                    startMonth: s.startMonth
                });
            });
        }
    });

    checkPendingStages();
    autoLineup('4-4-2');
    renderClassicHub();
}

function autoLineup(formationKey) {
    if (!gameState.mySquad || gameState.mySquad.length === 0) return;
    const f = formationsDB[formationKey];
    let available = [...gameState.mySquad].filter(p => !p.isLoanedOut).sort((a,b) => b.ovr - a.ovr);
    let starters = [];
    
    f.forEach(pos => {
        let bestIdx = available.findIndex(p => p.pos.includes(pos.role) || p.pos.split('/')[0] === pos.role);
        if (bestIdx === -1) bestIdx = 0;
        starters.push(available[bestIdx].id);
        available.splice(bestIdx, 1);
    });
    
    gameState.myLineup.starters = starters;
    gameState.myLineup.formation = formationKey;
    
    gameState.myLineup.bench = available.slice(0, 12).map(p => p.id);
}