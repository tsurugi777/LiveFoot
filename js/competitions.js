function initGlobalStandings(rootId, season) {
    if (!gameState.globalStandings[season]) gameState.globalStandings[season] = {};
    gameState.globalStandings[season][rootId] = {};
    getCompetitionTeams(rootId).forEach(t => {
        gameState.globalStandings[season][rootId][t.id] = { played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, pts: 0 };
    });
}

function checkPendingStages() {
    const nowYear = gameState.currentDate.getFullYear(); 
    const nowMonth = gameState.currentDate.getMonth() + 1;
    let itemsToStart = [];
    gameState.pendingStages = gameState.pendingStages.filter(p => {
        if ((nowYear > p.startYear || (nowYear === p.startYear && nowMonth >= p.startMonth)) && divisionSeasonReady(p.rootId,p.season)) {
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
        let fallbackTeams = getCompetitionTeams(sourceId);
        if (fallbackTeams.length === 0) {
            const sourceComp = db.competitions.find(c => c.phases?.some(p => p.id === sourceId));
            if (sourceComp) fallbackTeams = getCompetitionTeams(sourceComp.id);
        }
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
    normalizeDivisions();
    const errors=[...validateMovementRules(),...validateTitleRules()];
    if(errors.length) {
        document.getElementById('screen-hub').classList.replace('flex','hidden');
        document.getElementById('screen-select').classList.remove('hidden');
        showModal('Revise as regras no editor',errors.join('\n')); return;
    }
    if(liveMatch?.timer) clearInterval(liveMatch.timer);
    liveMatch=null;currentMainView='home';
    gameState.startedCompetitionSeasons={};gameState.payrollAccrued={};gameState.payrollPaid={};gameState.closedCareerSeasons={};gameState.transferHistory=[];gameState.fixtures=[];gameState.standings={};gameState.completedDivisionSeasons={};gameState.promotionWinners={};gameState.titlePlayoffs={};gameState.titleRankings={};gameState.titleEliminated={};gameState.divisionTransitions={};gameState.pendingSquadProgression={};gameState.squadProgressedSeasons={};
    gameState.teamMap=Object.fromEntries(db.teams.map(t=>[t.id,JSON.parse(JSON.stringify(t))]));
    gameState.compMap=Object.fromEntries(db.competitions.map(c=>[c.id,JSON.parse(JSON.stringify(c))]));
    gameState.playerTeamId = teamId;
    gameState.playerBaseCompId = getTeamBaseCompetition(gameState.teamMap[teamId]);
    
    const team = gameState.teamMap[teamId];
    initializeManagers(teamId);
    
    gameState.mySquad = generateSquad(teamId, gameState.teamMap[teamId].rating);
    
    const rootComps = db.competitions.filter(c => c.parentId === "NONE" || c.parentId === undefined);
    let earliestYear = 3000;
    rootComps.forEach(c => { if (c.startYear && c.startYear < earliestYear) earliestYear = c.startYear; });
    if (earliestYear === 3000) earliestYear = new Date().getFullYear();

    gameState.startYear = earliestYear; 
    gameState.currentWeek = 0; 
    gameState.currentDate = new Date(earliestYear, 0, 7);
    delete gameState.lastPlayerLifecycleWeek;gameState.freeAgents=[];gameState.profileTeamId=null;
    if(!gameState.teamMap[teamId].importedPlayers?.length)gameState.mySquad.forEach(p=>setContract(p,2+Math.floor(Math.random()*2)));
    gameState.pendingStages = []; 
    gameState.globalStandings = {}; 
    gameState.phaseRankings = {};
    gameState.countrySeason = {}; 
    gameState.history = [];
    gameState.titles = {};
    gameState.competitionScorers = {};
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
    if (!formationsDB[formationKey]) return;
    gameState.myLineup.formation = formationKey;
    delete gameState.myLineup.positions;
    selectedTacticsSlot = null;
    if (liveMatch && !liveMatch.finished) return;
    const f = getTacticsPositions();
    let available = [...gameState.mySquad].filter(p => !p.isLoanedOut).sort((a,b) => b.ovr - a.ovr);
    let starters = [];
    
    f.forEach(pos => {
        let bestIdx = available.findIndex(p => getPositionPenalty(p.pos,pos.role) === 0 && (pos.role === 'GO' ? isNaturalGoalkeeper(p) : !isNaturalGoalkeeper(p)));
        if (bestIdx === -1) bestIdx = available.findIndex(p => pos.role === 'GO' ? isNaturalGoalkeeper(p) : !isNaturalGoalkeeper(p));
        if (bestIdx === -1) { starters.push(null); return; }
        if (!available.length) { starters.push(null); return; }
        starters.push(available[bestIdx].id);
        available.splice(bestIdx, 1);
    });
    
    gameState.myLineup.starters = starters;
    gameState.myLineup.formation = formationKey;
    
    gameState.myLineup.bench = available.slice(0, 12).map(p => p.id);
}

function startPhase(rootId, stageIndex, phaseIndex, advancingTeams = null, startWeek = gameState.currentWeek, season, knockoutRound = 0) {
    if (!gameState.countrySeason[rootId] || gameState.countrySeason[rootId] < season) gameState.countrySeason[rootId] = season;
    const stage = gameState.stages[rootId][stageIndex];
    if(!stage.phases || stage.phases.length === 0) stage.phases = [{id: stage.id+'_p', type: 'LEAGUE', rounds: 2, name: 'Fase Regular'}];
    let phase = stage.phases[phaseIndex];
    gameState.startedCompetitionSeasons ||= {};
    const startedKey=movementKey(rootId,season);
    gameState.startedCompetitionSeasons[startedKey]=Math.min(gameState.startedCompetitionSeasons[startedKey] ?? Infinity,startWeek);
    const phaseKey = phase.id + "_" + season;
    gameState.activePhases[phaseKey] = { rootId, stageIndex, phaseIndex, phaseId: phase.id, season: season, knockoutRound };
    gameState.standings[phaseKey] = {};
    
    let teamsToPlay = [];
    
    if (phase.injectRules && phase.injectRules.length > 0 && !(phase.type === 'KNOCKOUT' && knockoutRound > 0)) {
        const injectedTeams = resolveInjectRules(phase.injectRules, season).map(id => gameState.teamMap[id]).filter(t => t);
        
        if (advancingTeams && advancingTeams.length > 0) {
            const existingIds = new Set(injectedTeams.map(t => t.id));
            advancingTeams.forEach(t => {
                if (t && t.id && !existingIds.has(t.id)) {
                    injectedTeams.push(t);
                    existingIds.add(t.id);
                }
            });
        }
        
        if (injectedTeams.length > 0) {
            teamsToPlay = injectedTeams;
        } else {
            if (advancingTeams && advancingTeams.length > 0) {
                teamsToPlay = advancingTeams.filter(t => t);
            } else {
                teamsToPlay = getCompetitionTeams(stage.id, rootId);
            }
        }
    } else if (advancingTeams && advancingTeams.length > 0) {
        teamsToPlay = advancingTeams.filter(t => t);
    } else {
        teamsToPlay = getCompetitionTeams(stage.id, rootId);
    }
    
    teamsToPlay = teamsToPlay.filter((v, i, a) => v && v.id && a.findIndex(t => t.id === v.id) === i);

    if (teamsToPlay.length === 0) {
        recordPromotionWinner(phase.id, season, null);
        console.warn(`Nenhum time disponível para a fase ${phase.name} (${phaseKey})`);
        if (phaseIndex + 1 < stage.phases.length) {
            delete gameState.activePhases[phaseKey];
            startPhase(rootId, stageIndex, phaseIndex + 1, [], startWeek, season);
        } else {
            delete gameState.activePhases[phaseKey];
            advanceToNextStageOrSeason(rootId, stageIndex, season);
        }
        return;
    }

    if (teamsToPlay.length <= 1) {
        recordTitleRanking(phase.id, season, teamsToPlay.map(t=>t.id));
        recordPromotionWinner(phase.id, season, teamsToPlay[0]?.id);
        awardPhaseTrophy(rootId,stage,phase,season,teamsToPlay[0]?.id);
        if(phase.type==='KNOCKOUT' && phase.countsToAggregatedTable!==false && phaseIndex===stage.phases.length-1 && stageIndex===gameState.stages[rootId].length-1)
            setCompetitionFinalists(rootId,season,teamsToPlay[0]?.id,null);

        if(phaseIndex + 1 < stage.phases.length) {
            delete gameState.activePhases[phaseKey];
            startPhase(rootId, stageIndex, phaseIndex + 1, teamsToPlay, startWeek, season);
        } else {
            delete gameState.activePhases[phaseKey];
            advanceToNextStageOrSeason(rootId, stageIndex, season);
        }
        return; 
    }

    let newFixtures = [];
    if (phase.type === 'LEAGUE') {
        teamsToPlay.forEach(t => initStanding(phase.id, t.id, 'Unico', season, phase, rootId, stageIndex, phaseIndex));
        newFixtures = generateRoundRobin(teamsToPlay.map(t=>t.id), phase.rounds || 2, startWeek, phase.id, rootId, season);
    } else if (phase.type === 'GROUPS') {
        const numGroups = phase.numGroups || 2;
        
        let prevPhaseRanking = null;
        if (phase.seedingByPrevPhase && phaseIndex > 0) {
            const prevPhase = stage.phases[phaseIndex - 1];
            const prevPhaseKey = prevPhase.id + "_" + season;
            if (gameState.phaseRankings[prevPhaseKey]) {
                prevPhaseRanking = gameState.phaseRankings[prevPhaseKey];
            } else if (gameState.standings[prevPhaseKey]) {
                prevPhaseRanking = getPhaseStandingsList(prevPhaseKey);
            }
        }

        let distributedTeams;
        if (phase.seedingByPrevPhase && prevPhaseRanking) {
            distributedTeams = distributeTeamsInPots(teamsToPlay, numGroups, prevPhaseRanking);
        } else {
            distributedTeams = shuffleArray(teamsToPlay);
        }

        let groups = Array.from({length: numGroups}, () => []);
        const groupSize = Math.ceil(distributedTeams.length / numGroups);
        
        for (let i = 0; i < distributedTeams.length; i++) {
            const groupIdx = i % numGroups;
            groups[groupIdx].push(distributedTeams[i]);
        }

        for (let i = 0; i < numGroups; i++) {
            const fullGroups = groups.filter(g => g.length > 0);
            
            if (groups[i].length === 0 && fullGroups.length > 0) {
                const sourceGroup = fullGroups.find(g => g.length > groupSize + 1);
                if (sourceGroup) {
                    const moved = sourceGroup.pop();
                    groups[i].push(moved);
                } else if (groups[0].length > 1) {
                    const moved = groups[0].pop();
                    groups[i].push(moved);
                }
            }
        }

        let nonEmptyGroups = groups.filter(g => g.length > 0);
        while (nonEmptyGroups.length < numGroups && nonEmptyGroups.length > 0) {
            const smallestGroup = nonEmptyGroups.reduce((a, b) => a.length <= b.length ? a : b);
            if (smallestGroup.length > 1) {
                const moved = smallestGroup.pop();
                const newGroup = [moved];
                nonEmptyGroups.push(newGroup);
            } else {
                break;
            }
        }
        groups = nonEmptyGroups;
        
        for(let i = 0; i < groups.length; i++) {
            groups[i].forEach(t => initStanding(phase.id, t.id, `G${i+1}`, season, phase, rootId, stageIndex, phaseIndex));
            newFixtures.push(...generateRoundRobin(groups[i].map(t=>t.id), phase.rounds || 2, startWeek, phase.id, rootId, season));
        }
    } else if (phase.type === 'KNOCKOUT') {
        let prevPhaseRanking = null;
        if (phaseIndex > 0) {
            const prevPhase = stage.phases[phaseIndex - 1];
            const prevPhaseKey = prevPhase.id + "_" + season;
            if (gameState.phaseRankings[prevPhaseKey]) {
                prevPhaseRanking = gameState.phaseRankings[prevPhaseKey];
            } else if (gameState.standings[prevPhaseKey]) {
                prevPhaseRanking = getPhaseStandingsList(prevPhaseKey);
            }
        }
        
        let sortedTeams = [...teamsToPlay];
        if (prevPhaseRanking) {
            const rankingMap = {};
            prevPhaseRanking.forEach((entry, idx) => {
                rankingMap[entry.teamId] = idx + 1;
            });
            sortedTeams.sort((a, b) => {
                const rankA = rankingMap[a.id] || 999;
                const rankB = rankingMap[b.id] || 999;
                return rankA - rankB;
            });
        } else {
            sortedTeams.sort((a, b) => b.rating - a.rating);
        }
        
        const totalTeams = sortedTeams.length;
        
        let targetPowerOfTwo = 1;
        while (targetPowerOfTwo < totalTeams) {
            targetPowerOfTwo *= 2;
        }
        
        const survivors = Math.min(totalTeams, Math.max(Number(phase.stopAtTeams) || 1, targetPowerOfTwo / 2));
        const numByes = 2 * survivors - totalTeams;
        
        const teamsWithByes = sortedTeams.slice(0, numByes);
        const teamsWithoutByes = sortedTeams.slice(numByes);
        
        teamsToPlay.forEach(t => initStanding(phase.id, t.id, 'Mata-Mata', season, phase, rootId, stageIndex, phaseIndex));
        
        const orderedTeamsWithoutByes = [...teamsWithoutByes];
        const numMatchups = Math.floor(orderedTeamsWithoutByes.length / 2);
        
        let matchupPairs = [];
        for (let i = 0; i < numMatchups; i++) {
            const first = orderedTeamsWithoutByes[i];
            const last = orderedTeamsWithoutByes[orderedTeamsWithoutByes.length - 1 - i];
            matchupPairs.push({ team1: first, team2: last });
        }
        
        matchupPairs.forEach((pair, idx) => {
            let home = pair.team1.id;
            let away = pair.team2.id;
            if (Math.random() > 0.5) {
                home = pair.team2.id;
                away = pair.team1.id;
            }
            newFixtures.push({ 
                home, away, 
                homeScore: null, awayScore: null, 
                played: false, 
                globalWeek: startWeek, 
                compId: phase.id, 
                baseCompId: rootId, 
                season,
                isBye: false,
                matchupIndex: idx,
                round: knockoutRound + 1
            });
            if(phase.twoLegs) {
                newFixtures.push({ 
                    home: away, away: home, 
                    homeScore: null, awayScore: null, 
                    played: false, 
                    globalWeek: startWeek + 1, 
                    compId: phase.id, 
                    baseCompId: rootId, 
                    season,
                    isBye: false,
                    matchupIndex: idx,
                    round: knockoutRound + 1
                });
            }
        });
        
        if (teamsWithByes.length > 0) {
            gameState.phaseByes[phaseKey] = teamsWithByes.map(t => t.id);
            
            teamsWithByes.forEach(team => {
                newFixtures.push({
                    home: team.id,
                    away: null,
                    homeScore: null,
                    awayScore: null,
                    played: false,
                    globalWeek: startWeek,
                    compId: phase.id,
                    baseCompId: rootId,
                    season,
                    isBye: true,
                    byePosition: teamsWithByes.indexOf(team) + 1
                });
            });
            

        }
    }
    
    newFixtures = newFixtures.filter((f, index, self) => 
        index === self.findIndex(t => t.home === f.home && t.away === f.away && t.globalWeek === f.globalWeek && t.compId === f.compId)
    );
    
    if(phase.type==='KNOCKOUT')newFixtures.forEach(f=>f.knockoutRound=knockoutRound);
    gameState.fixtures.push(...newFixtures);
}

function distributeTeamsInPots(teams, numGroups, prevPhaseRanking) {
    if (!prevPhaseRanking || prevPhaseRanking.length === 0) {
        return shuffleArray([...teams]);
    }

    const rankingMap = {};
    prevPhaseRanking.forEach((entry, idx) => {
        rankingMap[entry.teamId] = idx + 1;
    });

    const sortedTeams = [...teams].sort((a, b) => {
        const rankA = rankingMap[a.id] || 999;
        const rankB = rankingMap[b.id] || 999;
        return rankA - rankB;
    });

    const totalTeams = sortedTeams.length;
    const teamsPerPot = Math.ceil(totalTeams / numGroups);
    const numPots = Math.ceil(totalTeams / teamsPerPot);

    const pots = [];
    for (let i = 0; i < numPots; i++) {
        const start = i * teamsPerPot;
        const end = Math.min(start + teamsPerPot, totalTeams);
        if (start < totalTeams) {
            pots.push(sortedTeams.slice(start, end));
        }
    }

    const result = [];
    const maxPotSize = Math.max(...pots.map(p => p.length));
    
    for (let i = 0; i < maxPotSize; i++) {
        for (let potIdx = 0; potIdx < pots.length; potIdx++) {
            if (i < pots[potIdx].length) {
                result.push(pots[potIdx][i]);
            }
        }
    }

    return result;
}