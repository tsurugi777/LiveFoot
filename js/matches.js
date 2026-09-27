function advanceToNextStageOrSeason(rootId, stageIndex, season) {
    const wasPlayerLeague = rootId === gameState.playerBaseCompId;
    const stillActive = Object.values(gameState.activePhases).some(v => v && v.rootId === rootId);
    if (stillActive) return;
    let nextIndex = gameState.seasonMaxStage[rootId] + 1;

    if (nextIndex < gameState.stages[rootId].length) {
        let nextStage = gameState.stages[rootId][nextIndex];
        gameState.seasonMaxStage[rootId] = Math.max(gameState.seasonMaxStage[rootId], nextIndex);
        gameState.pendingStages.push({
            rootId: rootId, stageIndex: nextIndex, phaseIndex: 0, advancingTeams: null,
            season: season, startYear: season + nextStage.yearOffset, startMonth: nextStage.startMonth
        });
    } else {
        movementState();
        if(gameState.completedDivisionSeasons[movementKey(rootId,season)]) return;
        markDivisionSeasonFinished(rootId,season);
        const rootComp = gameState.compMap[rootId];
        if (rootComp && rootComp.awardsGlobalTitle && !titleConfig(rootComp).enabled) {
            let gStandings = gameState.globalStandings[season] && gameState.globalStandings[season][rootId];
            if (gStandings && Object.keys(gStandings).length > 0) {
                let sortedGlobal = Object.keys(gStandings)
                    .map(id => ({ id, ...gStandings[id] }))
                    .sort((a, b) => (a.competitionPlace || 99)-(b.competitionPlace || 99) || b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
                
                if (sortedGlobal.length > 0) {
                    const globalChamp = gameState.teamMap[sortedGlobal[0].id];
                    if (globalChamp) {
                        if (!gameState.titles[globalChamp.id]) gameState.titles[globalChamp.id] = {};
                        gameState.titles[globalChamp.id][rootId] = (gameState.titles[globalChamp.id][rootId] || 0) + 1;
                        gameState.history.push({ season: season, teamId: globalChamp.id, targetCompId: rootId, originName: "Tabela Geral Anual" });
                        
                        if (rootId === gameState.playerBaseCompId || globalChamp.id === gameState.playerTeamId) {
                            setTimeout(() => showModal(`Fim da Temporada ${season}!`, `🏆 Campeão Geral Anual: ${globalChamp.name}!`), 800);
                        }
                    }
                }
            }
        }

        initGlobalStandings(rootId, season + 1);
        gameState.seasonMaxStage[rootId] = 0;
        let nextStage = gameState.stages[rootId][0];
        gameState.pendingStages.push({
            rootId: rootId, stageIndex: 0, phaseIndex: 0, advancingTeams: null,
            season: season + 1, startYear: season + 1 + nextStage.yearOffset, startMonth: nextStage.startMonth
        });

        if(wasPlayerLeague) queuePlayerSeasonProgression(season, gameState.compMap[rootId]?.countryId);
    }
}

function applyEndSeasonProgression() {
    Object.values(gameState.teamMap).forEach(team => {
        let squad = team.id === gameState.playerTeamId ? gameState.mySquad : team.generatedSquad;
        if (!squad) return;

        squad.forEach(p => {
            p.age += 1;
            p.trainingsThisSeason = 0;
            
            const ratings=p.sRatings || [];
            const performance=ratings.length?ratings.reduce((n,v)=>n+v,0)/ratings.length:(p.careerStats?.at(-1)?.rating ?? 6.5);
            const ageChange=p.age<24?1:p.age>=34?-2:p.age>=30?-1:0;
            const change=ageChange+(performance>=7.5?1:performance<5.8?-1:0);
            p.lastDevelopmentGames=0;
            p.ovr += change;
            p.ovr = Math.max(30, Math.min(99, p.ovr)); 
            
            if (p.age > 38 && Math.random() > 0.5) {
                const youthPlayer = generateYouthPlayer(team, p.pos.split('/')[0], Math.max(45, p.ovr - 15 + Math.floor(Math.random() * 10)));
                squad.push(youthPlayer);
                const idx = squad.indexOf(p);
                if (idx > -1) squad.splice(idx, 1);
            }
        });
        refreshTeamRating(team.id);
    });
}

function applyMatchResultToTables(fixture) {
    recordSimulatedPlayerStats(fixture);
    if(fixture.titlePlayoffId) { resolveTitleFixture(fixture); return; }
    if(fixture.movementPlayoffId) { recordMovementPlayoffResult(fixture); return; }
    if(!fixture.played || !fixture.away || fixture.tablesRecorded)return;
    const rootId = fixture.baseCompId; const season = fixture.season;
    const phaseKey = fixture.compId + "_" + season;
    
    const updateStd = (standingsObj, h, a, hG, aG) => {
        if(standingsObj && standingsObj[h] && standingsObj[a]) {
            standingsObj[h].played++; standingsObj[a].played++;
            standingsObj[h].gf += hG; standingsObj[a].gf += aG;
            standingsObj[h].ga += aG; standingsObj[a].ga += hG;
            standingsObj[h].gd = standingsObj[h].gf - standingsObj[h].ga;
            standingsObj[a].gd = standingsObj[a].gf - standingsObj[a].ga;
            if (hG > aG) { standingsObj[h].won++; standingsObj[h].pts += 3; standingsObj[a].lost++; }
            else if (hG < aG) { standingsObj[a].won++; standingsObj[a].pts += 3; standingsObj[h].lost++; }
            else { standingsObj[h].drawn++; standingsObj[a].drawn++; standingsObj[h].pts++; standingsObj[a].pts++; }
        }
    };
    
    updateStd(gameState.standings[phaseKey], fixture.home, fixture.away, fixture.homeScore, fixture.awayScore);
    
    const phase=(gameState.stages[rootId] || []).flatMap(stage=>stage.phases || []).find(p=>p.id===fixture.compId)
        || db.competitions.flatMap(c=>c.phases || []).find(p=>p.id===fixture.compId);
    const countsToGlobal=phase?.countsToAggregatedTable !== false;
    if(countsToGlobal){
        const table=((gameState.globalStandings[season] ||= {})[rootId] ||= {});
        for(const id of [fixture.home,fixture.away])table[id] ||= emptyCompetitionStats();
        updateStd(table,fixture.home,fixture.away,fixture.homeScore,fixture.awayScore);
    }
    fixture.tablesRecorded=true;
}

function startLiveMatch(fixture) {
    if (liveMatch) { switchView('match'); return; }
    if (!fixture || fixture.played) return;
    captureCpuTactics(fixture);
    gameState.mySquad.forEach(p=>prepareCareerSeason(p,gameState.playerTeamId,fixture.season));
    const homeTeam = gameState.teamMap[fixture.home];
    const stadium = homeTeam.stadium || (homeTeam.name + " Stadium");
    
    liveMatch = {
        fixture: fixture, minute: 0, homeScore: 0, awayScore: 0, subsLeft: 5,
        events: [`[0'] Apita o árbitro! Começa o jogo no ${stadium}!`],
        finished:false, atHalfTime:false, substitutedOut:[], sentOff:[], sentOffSlots:[],
        paused: false, timer: null, homeGoalsList: [], awayGoalsList: [],
        half: 1, stoppageTime: 0, extraTimeCalculated: false,
        playersOnPitch: {
            home: fixture.home === gameState.playerTeamId ? [...gameState.myLineup.starters] : [],
            away: fixture.away === gameState.playerTeamId ? [...gameState.myLineup.starters] : []
        },
        playersAppeared: {
            home: fixture.home === gameState.playerTeamId ? [...gameState.myLineup.starters] : [],
            away: fixture.away === gameState.playerTeamId ? [...gameState.myLineup.starters] : []
        }
    };
    switchView('match');
    resumeLiveMatch();
}

function resumeLiveMatch() { 
    if(liveMatch && !liveMatch.finished) {
        if(!validateHumanLineup())return;
        clearInterval(liveMatch.timer);
        if (liveMatch.atHalfTime) { liveMatch.minute=45; liveMatch.atHalfTime=false; }
        currentMainView = 'match';
        liveMatch.paused = false; 
        liveMatch.timer = setInterval(tickLiveMatch, 250 / simulationSettings().speed);
        renderClassicHub(); 
    } 
}

function pauseLiveMatch() { 
    if(liveMatch) { 
        liveMatch.paused = true; 
        clearInterval(liveMatch.timer); 
        renderClassicHub(); 
    } 
}

function finishLiveMatch() {
    if(!liveMatch || !liveMatch.finished || liveMatch.fixture.played) return;
    clearInterval(liveMatch.timer);
    
    const side = liveMatch.fixture.home === gameState.playerTeamId ? 'home' : 'away';
    const uniquePlayers = [...new Set(liveMatch.playersAppeared[side])];

    uniquePlayers.forEach(id => {
        const p = gameState.mySquad.find(x => x.id === id);
        if (p) {
            p.careerTeamId=gameState.playerTeamId;p.careerSeason=liveMatch.fixture.season;
            p.sGames = (p.sGames || 0) + 1;
            p.cGames = (p.cGames || 0) + 1;
            
            let baseRating = 5.5 + (Math.random() * 1.5); 
            let finalRating = baseRating + (p.matchRatingBonus || 0);
            finalRating = Math.max(3.0, Math.min(10.0, finalRating)); 
            
            p.sRatings = p.sRatings || [];
            p.sRatings.push(finalRating);
            progressPerformance(p,gameState.playerTeamId);
            p.matchRatingBonus = 0; 
        }
    });

    if (liveMatch.fixture.home === gameState.playerTeamId) {
        generateMatchRevenue();
    }

    liveMatch.fixture.homeScore = liveMatch.homeScore;
    liveMatch.fixture.awayScore = liveMatch.awayScore;
    liveMatch.fixture.played = true;
    
    liveMatch.fixture.liveScorerPlayers=uniquePlayers.map(id=>gameState.mySquad.find(p=>p.id===id)).filter(Boolean).map(p=>scoringSnapshot(p,gameState.playerTeamId,liveMatch.scorerGoals?.[p.id] || 0));
    liveMatch.fixture.humanStatsRecorded=true;
    applyMatchResultToTables(liveMatch.fixture);
    liveMatch = null;
    switchView('agenda');
    advanceWeekManager(); 
}

function generateMatchRevenue() {
    const myTeam = gameState.teamMap[gameState.playerTeamId];
    const cap = myTeam.stadiumCapacity || 10000;
    
    const recPrice = Math.floor(myTeam.rating / 3) + 5;
    const price = myTeam.ticketPrice || recPrice;
    
    let attendancePercent = myTeam.rating / 100;
    
    if (price > recPrice) {
        attendancePercent -= (price - recPrice) * 0.05;
    } else if (price < recPrice) {
        attendancePercent += (recPrice - price) * 0.02;
    }
    
    attendancePercent = Math.max(0.05, Math.min(1.0, attendancePercent));
    
    const attendance = Math.floor(cap * attendancePercent * (0.8 + Math.random()*0.4)); 
    const finalAttendance = Math.min(cap, attendance);
    
    const rev = (finalAttendance * price) / 1000000;
    myTeam.budget = (parseFloat(myTeam.budget || 15) + rev).toFixed(2);
    
    if (!gameState.inbox) gameState.inbox = [];
    gameState.inbox.push({
        id: 'msg_'+Math.random().toString(36).substr(2, 9),
        playerId: 'relatorio', playerName: 'Relatório de Bilheteria',
        type: 'finance', offer: `Renda: $${rev.toFixed(2)}M. Público Pagante: ${finalAttendance.toLocaleString('pt-BR')}`
    });
}

function processPhaseEnd(rootId, activeState) {
    if(!activeState || activeState.completed)return;
    const pending=gameState.fixtures.some(f=>f.compId===(activeState.phaseId || gameState.stages[rootId]?.[activeState.stageIndex]?.phases[activeState.phaseIndex]?.id) && f.season===activeState.season && f.away && !f.played);
    if(pending)return;
    activeState.completed=true;
    const stage = gameState.stages[rootId][activeState.stageIndex];
    const phase = stage.phases[activeState.phaseIndex];
    const phaseKey = phase.id + "_" + activeState.season;
    const standings = gameState.standings[phaseKey];
    
    let sortedRankings = Object.keys(standings).map(id => ({teamId: id, ...standings[id]})).sort((a,b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
    gameState.phaseRankings[phaseKey] = sortedRankings;

    let advancingTeamsList = [];
    if (phase.type === 'LEAGUE') {
         let count = phase.advancingTeams || sortedRankings.length;
         advancingTeamsList = sortedRankings.slice(0, count).map(r => gameState.teamMap[r.teamId]);
    } else if (phase.type === 'GROUPS') {
         let groups = {};
         Object.keys(standings).forEach(id => {
             let g = standings[id].groupId;
             if(!groups[g]) groups[g] = [];
             groups[g].push({id, ...standings[id]});
         });
         let advancingPerGroup = phase.advancingTeams || 2;
         Object.keys(groups).sort().forEach(g => {
             let sorted = groups[g].sort((a,b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
             advancingTeamsList.push(...sorted.slice(0, advancingPerGroup).map(t => gameState.teamMap[t.id]));
         });
    } else if (phase.type === 'KNOCKOUT') {
        let processed = new Set();
        let phaseFixtures = gameState.fixtures.filter(f => f.compId === phase.id && f.season === activeState.season && f.played && !f.knockoutProcessed);
        
        if (gameState.phaseByes && gameState.phaseByes[phaseKey]) {
            const byeTeamIds = gameState.phaseByes[phaseKey];
            byeTeamIds.forEach(id => {
                const team = gameState.teamMap[id];
                if (team && !processed.has(id)) {
                    advancingTeamsList.push(team);
                    processed.add(id);
                }
            });
        }
        
        if (phaseFixtures.length > 0) {
            let matchupsMap = {};
            phaseFixtures.forEach(f => {
                if (f.away !== null) {
                    const key = f.matchupIndex !== undefined ? f.matchupIndex : [f.home,f.away].sort().join('_');
                    if (!matchupsMap[key]) {
                        matchupsMap[key] = { fixtures: [], team1: f.home, team2: f.away };
                    }
                    matchupsMap[key].fixtures.push(f);
                }
            });
            
            Object.values(matchupsMap).forEach(m => {
                let tStats = { gf: 0 }; let oStats = { gf: 0 };
                m.fixtures.forEach(f => {
                    f.knockoutProcessed = true;
                    if (f.home === m.team1) { tStats.gf += f.homeScore; oStats.gf += f.awayScore; }
                    else { tStats.gf += f.awayScore; oStats.gf += f.homeScore; }
                });
                
                let winnerId = null;
                if(tStats.gf > oStats.gf) {
                    winnerId = m.team1;
                } else if (oStats.gf > tStats.gf) {
                    winnerId = m.team2;
                } else {
                    const last=m.fixtures[m.fixtures.length-1];
                    if(last.penaltyHome===undefined){const base=3+Math.floor(Math.random()*3);last.penaltyHome=base+(Math.random()<0.5?1:0);last.penaltyAway=base+(last.penaltyHome===base?1:0);}
                    winnerId=last.penaltyHome>last.penaltyAway?last.home:last.away;
                }
                
                m.fixtures.forEach(f=>f.knockoutWinner=winnerId);
                const winner = gameState.teamMap[winnerId];
                if (winner && !processed.has(winnerId)) {
                    advancingTeamsList.push(winner);
                    processed.add(winnerId);
                }
            });
        } else {
            if (standings) {
                Object.keys(standings).forEach(id => {
                    const team = gameState.teamMap[id];
                    if (team && !processed.has(id)) {
                        advancingTeamsList.push(team);
                        processed.add(id);
                    }
                });
            }
        }
    }

    advancingTeamsList = advancingTeamsList.filter((v, i, a) => v && v.id && a.findIndex(t => t.id === v.id) === i);

    if(phase.type!=='KNOCKOUT')awardPhaseTrophy(rootId,stage,phase,activeState.season,sortedRankings[0]?.teamId);
    if (phase.type === 'LEAGUE') {
        recordTitleRanking(phase.id, activeState.season, sortedRankings.map(r=>r.teamId));
        recordPromotionWinner(phase.id, activeState.season, sortedRankings[0]?.teamId);
        if (activeState.phaseIndex + 1 < stage.phases.length) {
            delete gameState.activePhases[phaseKey];
            startPhase(rootId, activeState.stageIndex, activeState.phaseIndex + 1, advancingTeamsList, gameState.currentWeek + 1, activeState.season);
        } else {
            delete gameState.activePhases[phaseKey];
            advanceToNextStageOrSeason(rootId, activeState.stageIndex, activeState.season);
        }
        return;
    }

    let stopCount = phase.stopAtTeams || 1;
    let isFinalRound = false;
    
    if (phase.type === 'KNOCKOUT' && phase.stopAtTeams && phase.stopAtTeams > 1) {
        if (advancingTeamsList.length <= phase.stopAtTeams) {
            isFinalRound = true;
        } else {
            isFinalRound = false;
        }
    } else if (phase.type === 'KNOCKOUT') {
        isFinalRound = (advancingTeamsList.length <= stopCount);
    } else {
        isFinalRound = (advancingTeamsList.length <= stopCount);
    }

    if (phase.type === 'KNOCKOUT') {
        gameState.titleEliminated ||= {};
        const eliminated = sortedRankings.map(r=>r.teamId).filter(id=>!advancingTeamsList.some(t=>t.id===id));
        gameState.titleEliminated[phaseKey] = [...new Set([...eliminated,...(gameState.titleEliminated[phaseKey] || [])])];
        if(isFinalRound && advancingTeamsList.length <= 1) recordTitleRanking(phase.id, activeState.season, [...advancingTeamsList.map(t=>t.id),...gameState.titleEliminated[phaseKey]]);
    }
    if (isFinalRound && advancingTeamsList.length <= 1) recordPromotionWinner(phase.id, activeState.season, advancingTeamsList[0]?.id);

    if (gameState.phaseByes && gameState.phaseByes[phaseKey]) {
        delete gameState.phaseByes[phaseKey];
    }

    if(phase.type==='KNOCKOUT' && isFinalRound && advancingTeamsList.length===1){
        const champion=advancingTeamsList[0].id;
        awardPhaseTrophy(rootId,stage,phase,activeState.season,champion);
        const finalists=Object.keys(standings).filter(id=>id!==champion);
        if(activeState.phaseIndex===stage.phases.length-1 && activeState.stageIndex===gameState.stages[rootId].length-1 && phase.countsToAggregatedTable!==false)
            setCompetitionFinalists(rootId,activeState.season,champion,finalists.length===1?finalists[0]:null);
    }

    const nextWeek = gameState.currentWeek + 1;
    
    if (!isFinalRound && phase.type === 'KNOCKOUT' && advancingTeamsList.length > 0) {
        delete gameState.activePhases[phaseKey];
        startPhase(rootId, activeState.stageIndex, activeState.phaseIndex, advancingTeamsList, nextWeek, activeState.season, (activeState.knockoutRound || 0)+1);
    } else if (activeState.phaseIndex + 1 < stage.phases.length) {
        delete gameState.activePhases[phaseKey];
        startPhase(rootId, activeState.stageIndex, activeState.phaseIndex + 1, advancingTeamsList, nextWeek, activeState.season);
    } else {
        delete gameState.activePhases[phaseKey];
        advanceToNextStageOrSeason(rootId, activeState.stageIndex, activeState.season);
    }
}
function emptyCompetitionStats(){return {played:0,won:0,drawn:0,lost:0,gf:0,ga:0,gd:0,pts:0};}
function awardPhaseTrophy(rootId,stage,phase,season,championId){
    if(!phase.awardsTitle || !championId || !gameState.teamMap[championId])return;
    if((gameState.history || []).some(h=>h.targetCompId===rootId && h.season===season && h.phaseId===phase.id))return;
    gameState.titles[championId] ||= {};
    gameState.titles[championId][rootId]=(gameState.titles[championId][rootId] || 0)+1;
    gameState.history.push({season,teamId:championId,targetCompId:rootId,phaseId:phase.id,originName:`${stage.name} · ${phase.name || 'Fase'}`});
    if(rootId===gameState.playerBaseCompId || championId===gameState.playerTeamId)setTimeout(()=>showModal('Campeão!',`${gameState.teamMap[championId].name} venceu ${phase.name || stage.name}!`),400);
}
function setCompetitionFinalists(rootId,season,champion,runnerUp){
    if(!champion)return;
    const table=((gameState.globalStandings[season] ||= {})[rootId] ||= {});
    Object.values(table).forEach(row=>delete row.competitionPlace);
    [champion,runnerUp].forEach((id,i)=>{if(id){table[id] ||= emptyCompetitionStats();table[id].competitionPlace=i+1;}});
}
