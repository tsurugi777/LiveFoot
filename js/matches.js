// Sistema de Partidas

function advanceToNextStageOrSeason(rootId, stageIndex, season) {
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
        const rootComp = gameState.compMap[rootId];
        if (rootComp && rootComp.awardsGlobalTitle) {
            let gStandings = gameState.globalStandings[season] && gameState.globalStandings[season][rootId];
            if (gStandings && Object.keys(gStandings).length > 0) {
                let sortedGlobal = Object.keys(gStandings)
                    .map(id => ({ id, ...gStandings[id] }))
                    .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
                
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

        if(rootId === gameState.playerBaseCompId) {
            gameState.mySquad = gameState.mySquad.filter(p => !p.isLoan);
            gameState.mySquad.forEach(p => { p.isLoanedOut = false; });
            applyEndSeasonProgression();
        }
    }
}

function applyEndSeasonProgression() {
    Object.values(gameState.teamMap).forEach(team => {
        let squad = team.id === gameState.playerTeamId ? gameState.mySquad : team.generatedSquad;
        if (!squad) return;

        squad.forEach(p => {
            p.age += 1;
            p.trainingsThisSeason = 0;
            
            let change = 0;
            if (p.age < 23) {
                change = Math.floor(Math.random() * 3) + 1;
            } else if (p.age >= 23 && p.age <= 29) {
                change = Math.random() > 0.6 ? 1 : 0;
            } else if (p.age >= 30 && p.age < 34) {
                change = Math.random() > 0.5 ? -1 : 0;
            } else if (p.age >= 34) {
                change = -(Math.floor(Math.random() * 3) + 1);
            }

            p.ovr += change;
            p.ovr = Math.max(30, Math.min(99, p.ovr)); 
            
            if (p.age > 38 && Math.random() > 0.5) {
                const youthPlayer = generateYouthPlayer(team, p.pos.split('/')[0], Math.max(45, p.ovr - 15 + Math.floor(Math.random() * 10)));
                squad.push(youthPlayer);
                const idx = squad.indexOf(p);
                if (idx > -1) squad.splice(idx, 1);
            }
        });
    });
}

function applyMatchResultToTables(fixture) {
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
    
    const activeState = gameState.activePhases[phaseKey];
    let countsToGlobal = true;
    if (activeState) {
        const phase = gameState.stages[activeState.rootId][activeState.stageIndex].phases[activeState.phaseIndex];
        if (phase.countsToAggregatedTable !== undefined) {
            countsToGlobal = phase.countsToAggregatedTable;
        }
    }

    if(countsToGlobal && gameState.globalStandings[season] && gameState.globalStandings[season][rootId]) {
        updateStd(gameState.globalStandings[season][rootId], fixture.home, fixture.away, fixture.homeScore, fixture.awayScore);
    }
}

function startLiveMatch(fixture) {
    const homeTeam = gameState.teamMap[fixture.home];
    const stadium = homeTeam.stadium || (homeTeam.name + " Stadium");
    
    liveMatch = {
        fixture: fixture, minute: 0, homeScore: 0, awayScore: 0, subsLeft: 5,
        events: [`[0'] Apita o árbitro! Começa o jogo no ${stadium}!`],
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
    if(liveMatch) { 
        liveMatch.paused = false; 
        liveMatch.timer = setInterval(tickLiveMatch, 250); 
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
    if(!liveMatch) return;
    
    const side = liveMatch.fixture.home === gameState.playerTeamId ? 'home' : 'away';
    const uniquePlayers = [...new Set(liveMatch.playersAppeared[side])];

    uniquePlayers.forEach(id => {
        const p = gameState.mySquad.find(x => x.id === id);
        if (p) {
            p.sGames = (p.sGames || 0) + 1;
            p.cGames = (p.cGames || 0) + 1;
            
            let baseRating = 5.5 + (Math.random() * 1.5); 
            let finalRating = baseRating + (p.matchRatingBonus || 0);
            finalRating = Math.max(3.0, Math.min(10.0, finalRating)); 
            
            p.sRatings = p.sRatings || [];
            p.sRatings.push(finalRating);
            p.matchRatingBonus = 0; 
        }
    });

    if (liveMatch.fixture.home === gameState.playerTeamId) {
        generateMatchRevenue();
    }

    liveMatch.fixture.homeScore = liveMatch.homeScore;
    liveMatch.fixture.awayScore = liveMatch.awayScore;
    liveMatch.fixture.played = true;
    
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