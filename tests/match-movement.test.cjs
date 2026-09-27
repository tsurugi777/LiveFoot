const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
function setup(mode='none') {
 let nextTimer=0;const timers=new Set();
 const context=vm.createContext({console,Date,Number,Set,Map,setTimeout:()=>0,setInterval:()=>{timers.add(++nextTimer);return nextTimer;},clearInterval:id=>timers.delete(id),document:{getElementById:()=>null}});
 for(const file of ['database.js','gameState.js','people.js','formations.js','divisions.js','tactics.js','match-support.js','movement.js','title-playoffs.js','utils.js','managers.js','competitions.js','scorers.js','career.js','player-development.js','cpu-tactics.js','simulation-settings.js','transfers.js','matches.js','ui.js','competition-view.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../js',file),'utf8'),context);
 const run=code=>vm.runInContext(code,context);
 run(`function renderClassicHub(){};showModal=(title,message)=>{gameState.notice=message};function advanceWeekManager(){gameState.advanced=true};
 db={countries:[{id:'br',name:'Brasil',divisions:[{id:'d1',name:'Elite'},{id:'d2',name:'Acesso'}]}],competitions:[],teams:[]};
 for(const [id,divisionId] of [['upper','d1'],['lower','d2']]){
 const c={id,name:id,countryId:'br',divisionId,parentId:'NONE',startYear:2026,phases:[{id:id+'phase',type:'LEAGUE',rounds:1,name:'Liga'}]};db.competitions.push(c);gameState.compMap[id]=c;gameState.stages[id]=[{...c,yearOffset:0,startMonth:1}];gameState.seasonMaxStage[id]=0;
 for(let i=1;i<=4;i++){const t={id:id+i,name:id+i,countryId:'br',divisionId,compId:id,rating:75,budget:10};db.teams.push(t);gameState.teamMap[t.id]=t;}
 initGlobalStandings(id,2026);for(let i=1;i<=4;i++){const s=gameState.globalStandings[2026][id][id+i];s.pts=15-i*3;s.played=3;s.gf=5-i;s.gd=3-i;}
 gameState.standings[id+'phase_2026']=JSON.parse(JSON.stringify(gameState.globalStandings[2026][id]));}
 db.competitions[0].movement={enabled:true,targetCompId:'lower',table:'aggregate',direct:1,mode:${JSON.stringify(mode)},playoffTeams:2,slots:1};`);
 return {run,timers};
}
const json=v=>JSON.parse(JSON.stringify(v));
test('legacy ATA and canonical CA resolve to the same role',()=>{const {run}=setup();assert.equal(run("getPositionPenalty('ATA','CA')"),0);assert.equal(run("getPositionPenalty('CA','ATA')"),0);assert.equal(run("getPositionPenalty('MLG','CA')"),-8);});
test('direct relegation waits for both leagues, swaps clubs once and seeds the next year',()=>{
 const {run}=setup();assert.deepEqual(json(run('validateMovementRules()')),[]);
 run("advanceToNextStageOrSeason('upper',0,2026)");assert.equal(run("divisionSeasonReady('upper',2027)"),false);assert.equal(run("gameState.teamMap.upper4.divisionId"),'d1');
 run("advanceToNextStageOrSeason('lower',0,2026)");assert.equal(run("gameState.teamMap.upper4.divisionId"),'d2');assert.equal(run("gameState.teamMap.lower1.divisionId"),'d1');assert.equal(run("divisionSeasonReady('upper',2027)"),true);
 assert.deepEqual(json(run("Object.keys(gameState.globalStandings[2027].upper)")),['upper1','upper2','upper3','lower1']);
 run("advanceToNextStageOrSeason('upper',0,2026);processDivisionPlayoffs()");assert.equal(run('gameState.pendingStages.length'),2);
});
test('internal playoff is played and relegates the configured number without polluting league points',()=>{
 const {run}=setup('internal');run("advanceToNextStageOrSeason('upper',0,2026);advanceToNextStageOrSeason('lower',0,2026)");
 assert.equal(run('gameState.fixtures.filter(f=>f.movementPlayoffId).length'),1);assert.equal(run("gameState.teamMap.upper4.divisionId"),'d1');
 run(`for(const f of gameState.fixtures){f.homeScore=f.home==='upper2'?3:0;f.awayScore=f.away==='upper2'?3:0;f.played=true;applyMatchResultToTables(f)}processDivisionPlayoffs()`);
 assert.equal(run("gameState.teamMap.upper3.divisionId"),'d2');assert.equal(run("gameState.teamMap.upper4.divisionId"),'d2');assert.equal(run("gameState.teamMap.lower1.divisionId"),'d1');assert.equal(run("gameState.teamMap.lower2.divisionId"),'d1');assert.equal(run('gameState.globalStandings[2026].upper.upper2.pts'),9);
});
test('mixed playoff draws get a winner, retain division sizes and record the result only once',()=>{
 const {run}=setup('mixed');run("advanceToNextStageOrSeason('lower',0,2026);advanceToNextStageOrSeason('upper',0,2026)");
 assert.equal(run('gameState.fixtures.length'),1);run('const f=gameState.fixtures[0];f.homeScore=1;f.awayScore=1;f.played=true;applyMatchResultToTables(f);const first=f.playoffWinner;applyMatchResultToTables(f);processDivisionPlayoffs()');
 assert.equal(run('f.playoffWinner===first'),true);assert.equal(run('Math.abs(f.penaltyHome-f.penaltyAway)'),1);assert.equal(run("getCompetitionTeams('upper').length"),4);assert.equal(run("getCompetitionTeams('lower').length"),4);assert.equal(run('gameState.teamMap[f.playoffWinner].divisionId'),'d1');
});
test('standings zones reflect direct, internal/mixed and lower-division qualification',()=>{
 const {run}=setup('mixed');assert.equal(run("movementZone('upper','aggregate',3,4).kind"),'down');assert.equal(run("movementZone('upper','aggregate',2,4).kind"),'playoff');assert.equal(run("movementZone('lower','aggregate',0,4).kind"),'up');assert.equal(run("movementZone('lower','aggregate',1,4).kind"),'playoff');assert.equal(run("movementZone('upper','otherphase',3,4)"),null);
 run('db.competitions[0].movement.direct=4');assert(run('validateMovementRules().length')>0);
});
function matchSetup(){const env=setup();env.run(`validateHumanLineup=()=>true;gameState.playerTeamId='upper1';gameState.mySquad=[{id:'gk',name:'Keeper',pos:'GO',ovr:80},{id:'st',name:'Striker',pos:'CA',ovr:80},{id:'sub',name:'Substitute',pos:'CA',ovr:75},{id:'gk2',name:'Reserve keeper',pos:'GO',ovr:70}];gameState.myLineup.starters=['gk','st'];gameState.myLineup.bench=['sub','gk2'];gameState.fixtures=[{home:'upper1',away:'upper2',compId:'upperphase',baseCompId:'upper',season:2026,globalWeek:0,played:false}];startLiveMatch(gameState.fixtures[0]);liveMatch.minute=30;liveMatch.homeScore=2;liveMatch.awayScore=1;`);return env;}
test('opening tactics preserves match identity, clock, score and single interval',()=>{
 const {run,timers}=matchSetup();run("const same=liveMatch;switchView('lineup');startLiveMatch(gameState.fixtures[0]);");assert.equal(run('liveMatch===same'),true);assert.equal(run('liveMatch.minute'),30);assert.equal(run('liveMatch.homeScore'),2);assert.equal(timers.size,0);
 run('resumeLiveMatch();resumeLiveMatch()');assert.equal(timers.size,1);assert.equal(run('liveMatch.minute'),30);
});
test('paused substitutions count, update active players, cannot re-enter and formation changes preserve the lineup',()=>{
 const {run}=matchSetup();run("switchView('lineup');selectTacticsSlot(1,false);selectTacticsSlot(0,true)");assert.equal(run('liveMatch.subsLeft'),4);assert.deepEqual(json(run('liveMatch.playersOnPitch.home')),['gk','sub']);assert(run("liveMatch.events.some(e=>e.includes('Substitute'))"));
 run('selectTacticsSlot(1,false);selectTacticsSlot(0,true)');assert.equal(run('liveMatch.subsLeft'),4);assert.equal(run('gameState.myLineup.starters[1]'),'sub');run("autoLineup('4-3-3')");assert.equal(run('gameState.myLineup.starters[1]'),'sub');
});
test('goalkeepers are fixed defensively and never selected for attacking commentary',()=>{
 const {run}=matchSetup();run('moveTacticsPlayer(0,50,10)');assert.deepEqual(json(run('getTacticsPositions()[0]')),{left:'50%',top:'85%',role:'GO'});
 for(const purpose of ['goal','assist','attack'])assert.equal(run(`Array.from({length:100},()=>getLiveEventPlayer('upper1','${purpose}')).some(p=>p?.id==='gk')`),false);
 assert.equal(run("getLiveEventPlayer('upper1','keeper').id"),'gk');assert(run('validateTacticsSwap(1,true,1,false)'));
});
test('style choice affects chance creation and exposure and live saves restore paused without losing events',()=>{
 const {run,timers}=matchSetup();run("const balanced=getLiveGoalChances('upper1','upper2');setPlayingStyle('Ofensivo');const attacking=getLiveGoalChances('upper1','upper2')");assert(run('attacking.home>balanced.home && attacking.away>balanced.away'));
 run('const saved=JSON.parse(JSON.stringify(serializeLiveMatch()));restoreLiveMatch(saved)');assert.equal(timers.size,0);assert.equal(run('liveMatch.minute'),30);assert.equal(run('liveMatch.homeScore'),2);assert.equal(run('liveMatch.paused'),true);assert.equal(run('liveMatch.fixture===gameState.fixtures[0]'),true);
});
test('halftime and stoppage-time pauses do not finish or restart the game',()=>{
 const {run}=matchSetup();run('liveMatch.half=2;liveMatch.atHalfTime=true;liveMatch.minute=48;resumeLiveMatch()');assert.equal(run('liveMatch.minute'),45);
 run('liveMatch.minute=91;pauseLiveMatch();finishLiveMatch()');assert.equal(run('gameState.fixtures[0].played'),false);assert.equal(run('liveMatch.minute'),91);
});
test('three divisions commit movements together without moving a club through two levels',()=>{
 const {run}=setup();run(`db.countries[0].divisions.push({id:'d3',name:'Terceira'});const third={id:'third',name:'third',countryId:'br',divisionId:'d3',parentId:'NONE',startYear:2026,phases:[{id:'thirdphase',type:'LEAGUE',name:'Liga'}]};db.competitions.push(third);gameState.compMap.third=third;gameState.stages.third=[{...third,yearOffset:0,startMonth:1}];gameState.seasonMaxStage.third=0;for(let i=1;i<=4;i++){const t={id:'third'+i,name:'third'+i,countryId:'br',divisionId:'d3',compId:'third'};db.teams.push(t);gameState.teamMap[t.id]=t;}initGlobalStandings('third',2026);for(let i=1;i<=4;i++)gameState.globalStandings[2026].third['third'+i].pts=15-i*3;db.competitions[1].movement={enabled:true,targetCompId:'third',table:'aggregate',direct:1,mode:'none'};`);
 assert.deepEqual(json(run('validateMovementRules()')),[]);run("advanceToNextStageOrSeason('upper',0,2026);advanceToNextStageOrSeason('lower',0,2026)");assert.equal(run('gameState.teamMap.upper4.divisionId'),'d1');run("advanceToNextStageOrSeason('third',0,2026)");assert.equal(run('gameState.teamMap.upper4.divisionId'),'d2');assert.equal(run('gameState.teamMap.lower1.divisionId'),'d1');assert.equal(run('gameState.teamMap.lower4.divisionId'),'d3');assert.equal(run('gameState.teamMap.third1.divisionId'),'d2');
});
test('internal playoff ties respect initial seeding even for numeric team IDs',()=>{const {run}=setup();assert.deepEqual(json(run("rankMovementTable({'2':{pts:1,gd:0,gf:0},'100':{pts:1,gd:0,gf:0}},['100','2'])")),['100','2']);});
test('annual development and loan returns wait for the relegation playoff and run once',()=>{
 const {run}=setup('mixed');run(`gameState.playerTeamId='upper3';gameState.playerBaseCompId='upper';gameState.mySquad=[{id:'loan',name:'Loan',pos:'CA',ovr:75,age:25,isLoan:true},{id:'own',name:'Own',pos:'CA',ovr:75,age:25}];advanceToNextStageOrSeason('upper',0,2026);advanceToNextStageOrSeason('lower',0,2026);`);
 assert.equal(run('gameState.mySquad.length'),2);assert.equal(run('gameState.mySquad[1].age'),25);
 run('for(const f of gameState.fixtures){f.homeScore=1;f.awayScore=0;f.played=true;applyMatchResultToTables(f)}processDivisionPlayoffs();processDivisionPlayoffs()');assert.equal(run('gameState.mySquad.length'),1);assert.equal(run('gameState.mySquad[0].age'),26);
});

test('last division never requires a lower league, even with an old enabled rule',()=>{
 const {run}=setup();
 run("db.competitions[1].movement={enabled:true,targetCompId:'missing',direct:2,mode:'mixed',slots:1}");
 assert.deepEqual(json(run('validateMovementRules()')),[]);
 assert.equal(run('movementConfig(db.competitions[1]).enabled'),false);
 assert.equal(run('movementRules().length'),1);
 assert.match(run('renderMovementEditor(db.competitions[1])'),/última divisão/);
 assert.doesNotMatch(run('renderMovementEditor(db.competitions[1])'),/id="move-target-/);
 run("syncMovementEditor(db.competitions[1]);advanceToNextStageOrSeason('upper',0,2026);advanceToNextStageOrSeason('lower',0,2026)");
 assert.equal(run('db.competitions[1].movement.enabled'),false);
 assert.equal(run("divisionSeasonReady('lower',2027)"),true);
 assert.equal(run("gameState.teamMap.lower1.divisionId"),'d1');
});
test('promotion playoff uses only lower-division clubs and promotes the winner once',()=>{
 const {run}=setup('promotion');
 assert.deepEqual(json(run('validateMovementRules()')),[]);
 assert.equal(run("movementZone('upper','aggregate',2,4).kind"),'down');
 assert.equal(run("movementZone('lower','aggregate',0,4).kind"),'up');
 assert.equal(run("movementZone('lower','aggregate',1,4).label"),'Playoff de promoção');
 assert.equal(run("movementZone('lower','aggregate',2,4).kind"),'playoff');
 assert.equal(run("movementZone('lower','aggregate',3,4)"),null);
 run("advanceToNextStageOrSeason('lower',0,2026)");
 assert.equal(run('gameState.fixtures.length'),0);
 run("advanceToNextStageOrSeason('upper',0,2026)");
 assert.equal(run('gameState.fixtures.length'),1);
 assert.deepEqual(json(run('gameState.fixtures.flatMap(f=>[f.home,f.away]).sort()')),['lower2','lower3']);
 run("for(const f of gameState.fixtures){f.homeScore=f.home==='lower3'?2:0;f.awayScore=f.away==='lower3'?2:0;f.played=true;applyMatchResultToTables(f)}processDivisionPlayoffs();processDivisionPlayoffs()");
 assert.equal(run('gameState.teamMap.lower3.divisionId'),'d1');
 assert.equal(run('gameState.teamMap.lower2.divisionId'),'d2');
 assert.equal(run('gameState.teamMap.lower1.divisionId'),'d1');
 assert.equal(run('gameState.teamMap.upper3.divisionId'),'d2');
 assert.equal(run('gameState.teamMap.upper4.divisionId'),'d2');
 assert.equal(run("getCompetitionTeams('upper').length"),4);
 assert.equal(run("getCompetitionTeams('lower').length"),4);
 assert.equal(run('gameState.globalStandings[2026].lower.lower3.pts'),6);
 assert.equal(run("divisionSeasonReady('lower',2027)"),true);
 assert.deepEqual(json(run('Object.keys(gameState.globalStandings[2027].upper).sort()')),['lower1','lower3','upper1','upper2']);
});
test('promotion supports multiple slots with no direct promotion and tied playoff seeding',()=>{
 const {run}=setup('promotion');
 run('Object.assign(db.competitions[0].movement,{direct:0,slots:2,playoffTeams:4})');
 assert.deepEqual(json(run('validateMovementRules()')),[]);
 run("advanceToNextStageOrSeason('upper',0,2026);advanceToNextStageOrSeason('lower',0,2026)");
 assert.equal(run('gameState.fixtures.length'),6);
 assert.equal(run("gameState.fixtures.every(f=>f.home.startsWith('lower')&&f.away.startsWith('lower'))"),true);
 run('const saved=JSON.parse(JSON.stringify(gameState));Object.assign(gameState,saved);for(const f of gameState.fixtures){f.homeScore=0;f.awayScore=0;f.played=true;applyMatchResultToTables(f)}processDivisionPlayoffs()');
 assert.equal(run('gameState.teamMap.lower1.divisionId'),'d1');
 assert.equal(run('gameState.teamMap.lower2.divisionId'),'d1');
 assert.equal(run('gameState.teamMap.lower3.divisionId'),'d2');
});
test('promotion validates available participants, slots and upper relegation capacity',()=>{
 const {run}=setup('promotion');
 run('db.competitions[0].movement.playoffTeams=4');
 assert(run('validateMovementRules().length')>0);
 run('Object.assign(db.competitions[0].movement,{direct:0,playoffTeams:2,slots:2})');
 assert(run('validateMovementRules().length')>0);
 run('Object.assign(db.competitions[0].movement,{direct:4,playoffTeams:2,slots:1})');
 assert(run('validateMovementRules().length')>0);
});
test('editor persists promotion mode and offers only the immediately lower division',()=>{
 const {run}=setup('promotion');
 run("db.countries[0].divisions.push({id:'d3',name:'Terceira'});db.competitions.push({id:'third',countryId:'br',divisionId:'d3',parentId:'NONE',name:'Terceira'})");
 const html=run('renderMovementEditor(db.competitions[0])');
 assert.match(html,/value="promotion" selected/);
 assert.match(html,/value="lower" selected/);
 assert.doesNotMatch(html,/value="third"/);
 run(`document.getElementById=id=>({checked:true,value:({'enabled':'','target':'lower','table':'aggregate','direct':'0','mode':'promotion','teams':'3','slots':'1'})[id.split('-')[1]]});syncMovementEditor(db.competitions[0]);`);
 assert.equal(run('db.competitions[0].movement.mode'),'promotion');
 assert.equal(run('db.competitions[0].movement.playoffTeams'),3);
 assert.equal(run('db.competitions[0].movement.direct'),0);
});

function winnerSetup(){const env=setup('promotion');env.run(`db.competitions.push({id:'cup',name:'Copa',countryId:'br',parentId:'NONE',phases:[{id:'cupfinal',name:'Final',type:'KNOCKOUT'}]});db.competitions[0].movement.winnerSources=['competition:cup'];`);return env;}
test('cup winner outside table qualification takes a reserved playoff place; late cup delays scheduling',()=>{
 const {run}=winnerSetup();assert.deepEqual(json(run('validateMovementRules()')),[]);
 run("advanceToNextStageOrSeason('upper',0,2026);advanceToNextStageOrSeason('lower',0,2026)");
 assert.equal(run('gameState.fixtures.length'),0);assert.equal(run("divisionSeasonReady('lower',2027)"),false);
 run("recordPromotionWinner('cupfinal',2026,'lower4');processDivisionPlayoffs()");
 assert.deepEqual(json(run('gameState.fixtures.flatMap(f=>[f.home,f.away]).sort()')),['lower2','lower4']);
 assert.equal(run("movementZone('lower','aggregate',3,4,2026).label"),'Playoff de promoção · vencedor');
 assert.equal(run("movementZone('lower','aggregate',2,4,2026)"),null);
 run("for(const f of gameState.fixtures){f.homeScore=f.home==='lower4'?2:0;f.awayScore=f.away==='lower4'?2:0;f.played=true;applyMatchResultToTables(f)}processDivisionPlayoffs()");
 assert.equal(run('gameState.teamMap.lower4.divisionId'),'d1');assert.equal(run("divisionSeasonReady('lower',2027)"),true);
});
test('directly promoted, repeated or ineligible winners release places to the promotion table',()=>{
 const {run}=winnerSetup();
 for(const id of ['lower1','upper4',null]){
  run(`recordPromotionWinner('cupfinal',2026,${JSON.stringify(id)})`);
  assert.deepEqual(json(run("promotionParticipants(db.competitions[0],2026,['lower1','lower2','lower3','lower4'])")),['lower2','lower3']);
 }
 run("db.competitions[0].movement.winnerSources.push('phase:cupfinal');recordPromotionWinner('cupfinal',2026,'lower4')");
 assert.deepEqual(json(run("promotionParticipants(db.competitions[0],2026,['lower1','lower2','lower3','lower4'])")),['lower4','lower2']);
});
test('real league and knockout completions register their winners independent of title awards',()=>{
 const {run}=setup('promotion');
 run("processPhaseEnd('lower',{stageIndex:0,phaseIndex:0,season:2026})");
 assert.equal(run("gameState.promotionWinners[movementKey('lowerphase',2026)]"),'lower1');
 run(`gameState.stages.cup=[{name:'Copa',phases:[{id:'final',type:'KNOCKOUT',stopAtTeams:1}]}];gameState.standings.final_2026={lower3:{pts:0,gd:0,gf:0},lower4:{pts:0,gd:0,gf:0}};gameState.fixtures=[{compId:'final',season:2026,played:true,home:'lower3',away:'lower4',homeScore:0,awayScore:3}];advanceToNextStageOrSeason=()=>{};processPhaseEnd('cup',{stageIndex:0,phaseIndex:0,season:2026});`);
 assert.equal(run("gameState.promotionWinners[movementKey('final',2026)]"),'lower4');
});
test('winner sources persist in editor and saves, and invalid or excessive sources are rejected',()=>{
 const {run}=winnerSetup();assert.match(run('renderMovementEditor(db.competitions[0])'),/value="competition:cup" checked/);
 run(`document.getElementsByName=()=>[{checked:true,value:'phase:cupfinal'},{checked:false,value:'competition:cup'}];document.getElementById=id=>({checked:true,value:({'target':'lower','table':'aggregate','direct':'1','mode':'promotion','teams':'2','slots':'1'})[id.split('-')[1]]});syncMovementEditor(db.competitions[0]);recordPromotionWinner('cupfinal',2026,'lower4');gameState.promotionWinners=JSON.parse(JSON.stringify(gameState.promotionWinners));`);
 assert.deepEqual(json(run('db.competitions[0].movement.winnerSources')),['phase:cupfinal']);assert.equal(run('promotionSourceResults(db.competitions[0],2026)[0].teamId'),'lower4');
 run("db.competitions[0].movement.winnerSources=['phase:missing']");assert(run('validateMovementRules().length')>0);
 run("db.competitions[0].movement.winnerSources=['phase:cupfinal','competition:cup','phase:lowerphase']");assert(run('validateMovementRules().length')>0);
});

function titleSetup(automatic=true) {
 const env=setup();env.run(`db.competitions[0].movement.enabled=false;db.competitions.push({id:'cup',name:'Copa',countryId:'br',parentId:'NONE',phases:[{id:'cupfinal',name:'Final',type:'KNOCKOUT'}]});db.competitions[0].titlePlayoff={enabled:true,automatic:${automatic},sources:[{id:'phase:upperphase',passDown:false},{id:'aggregate:upper',passDown:true},{id:'competition:cup',passDown:false},{id:'aggregate:lower',passDown:false}],rounds:[{name:'Semifinal',legs:2},{name:'Final',legs:1}]};`);return env;
}
test('title bracket waits for all sources, applies individual pass-down and separate leg rules',()=>{
 const {run}=titleSetup();assert.deepEqual(json(run('validateTitleRules()')),[]);
 run("db.competitions[0].awardsGlobalTitle=true;recordTitleRanking('upperphase',2026,['upper1','upper2','upper3','upper4']);advanceToNextStageOrSeason('upper',0,2026);advanceToNextStageOrSeason('lower',0,2026);processTitlePlayoffs()");
 assert.equal(run('gameState.fixtures.length'),0);assert.equal(run('gameState.titles.upper1?.upper || 0'),0);assert.equal(run("divisionSeasonReady('upper',2027)"),false);
 run("recordTitleRanking('cupfinal',2026,['upper3','upper4']);processTitlePlayoffs()");
 assert.deepEqual(json(run('Object.values(gameState.titlePlayoffs)[0].teams')),['upper1','upper2','upper3','lower1']);
 assert.equal(run('gameState.fixtures.length'),4);
 assert.equal(run('Object.values(gameState.titlePlayoffs)[0].qualifications[1].passed'),true);
 run('const first=gameState.fixtures[0];first.homeScore=1;first.awayScore=1;first.played=true;applyMatchResultToTables(first)');
 assert.equal(run('first.penaltyHome'),undefined);
 run('for(const f of gameState.fixtures.filter(f=>!f.played)){f.homeScore=1;f.awayScore=1;f.played=true;applyMatchResultToTables(f)}processTitlePlayoffs()');
 assert.equal(run('gameState.fixtures.length'),5);assert.equal(run('gameState.fixtures.filter(f=>f.penaltyHome!==undefined).length'),2);
 assert.equal(run('Object.values(gameState.titlePlayoffs)[0].rounds[1].legs'),1);
 run('const final=gameState.fixtures[4];final.homeScore=2;final.awayScore=0;final.played=true;applyMatchResultToTables(final);processTitlePlayoffs();processTitlePlayoffs()');
 assert.equal(run('Object.values(gameState.titlePlayoffs)[0].champion===final.home'),true);
 assert.equal(run('gameState.titles[final.home].upper'),1);
 assert.equal(run('gameState.globalStandings[2026].upper.upper1.pts'),12);
 assert.equal(run("divisionSeasonReady('upper',2027)"),true);
});
test('duplicate classifications yield an automatic title only when enabled',()=>{
 for(const automatic of [true,false]){
  const {run}=titleSetup(automatic);
  run("db.competitions[0].titlePlayoff.sources=[{id:'phase:upperphase',passDown:false},{id:'aggregate:upper',passDown:false}];recordTitleRanking('upperphase',2026,['upper1','upper2']);advanceToNextStageOrSeason('upper',0,2026);processTitlePlayoffs();processTitlePlayoffs()");
  assert.equal(run('gameState.fixtures.length'),0);assert.equal(run('Object.values(gameState.titlePlayoffs)[0].complete'),true);
  assert.equal(run('Object.values(gameState.titlePlayoffs)[0].champion'),automatic?'upper1':null);
  assert.equal(run('gameState.titles.upper1?.upper || 0'),automatic?1:0);
 }
});
test('title playoffs support byes and skip early rounds when duplicate places collapse',()=>{
 const {run}=titleSetup();
 run("db.competitions[0].titlePlayoff.sources[1].passDown=false;recordTitleRanking('upperphase',2026,['upper1']);recordTitleRanking('cupfinal',2026,['upper3']);advanceToNextStageOrSeason('upper',0,2026);advanceToNextStageOrSeason('lower',0,2026);processTitlePlayoffs()");
 assert.equal(run('Object.values(gameState.titlePlayoffs)[0].teams.length'),3);
 assert.deepEqual(json(run('Object.values(gameState.titlePlayoffs)[0].rounds[0].byes')),['upper1']);
 assert.equal(run('gameState.fixtures.length'),2);
 run('for(const f of gameState.fixtures){f.homeScore=3;f.awayScore=0;f.played=true;applyMatchResultToTables(f)}processTitlePlayoffs()');
 assert.equal(run('gameState.fixtures.length'),3);
});
test('title final uses aggregate goals rather than the result of the return leg, and survives saves',()=>{
 const {run}=titleSetup();run("db.competitions[0].titlePlayoff.sources=[{id:'aggregate:upper'},{id:'aggregate:lower'}];db.competitions[0].titlePlayoff.rounds=[{name:'Final',legs:2}];advanceToNextStageOrSeason('upper',0,2026);advanceToNextStageOrSeason('lower',0,2026);processTitlePlayoffs()");
 run('let f=gameState.fixtures[0];f.homeScore=4;f.awayScore=0;f.played=true;applyMatchResultToTables(f);gameState.titlePlayoffs=JSON.parse(JSON.stringify(gameState.titlePlayoffs));f=gameState.fixtures[1];f.homeScore=1;f.awayScore=0;f.played=true;applyMatchResultToTables(f);processTitlePlayoffs()');
 assert.equal(run('Object.values(gameState.titlePlayoffs)[0].champion'),'lower1');
 assert.equal(run('gameState.fixtures[1].penaltyHome'),undefined);
});
test('title resolution holds relegation and annual roster changes until completion',()=>{
 const {run}=titleSetup();run("db.competitions[0].movement.enabled=true;db.competitions[0].titlePlayoff.sources=[{id:'aggregate:upper'},{id:'aggregate:lower'}];gameState.mySquad=[{id:'own',name:'Own',age:25,pos:'CA',ovr:75}];gameState.playerTeamId='upper1';gameState.playerBaseCompId='upper';advanceToNextStageOrSeason('upper',0,2026);advanceToNextStageOrSeason('lower',0,2026);processTitlePlayoffs();processDivisionPlayoffs()");
 assert.equal(run('gameState.teamMap.upper4.divisionId'),'d1');assert.equal(run('gameState.mySquad[0].age'),25);
 run('for(const f of gameState.fixtures){f.homeScore=2;f.awayScore=0;f.played=true;applyMatchResultToTables(f)}processTitlePlayoffs();processDivisionPlayoffs()');
 assert.equal(run('gameState.teamMap.upper4.divisionId'),'d2');assert.equal(run('gameState.mySquad[0].age'),26);
});
test('title editor persists pass-down per origin and validates rounds and origin uniqueness',()=>{
 const {run}=titleSetup();assert.match(run('renderTitleEditor(db.competitions[0])'),/title-pass-upper-1" checked/);
 run(`document.getElementById=id=>{if(id==='title-enabled-upper'||id==='title-auto-upper')return {checked:true};const i=Number(id.split('-').at(-1));if(id.startsWith('title-source'))return {value:db.competitions[0].titlePlayoff.sources[i].id};if(id.startsWith('title-pass'))return {checked:i===2};if(id.startsWith('title-round'))return {value:i===0?'Semi':'Final'};return {value:i===0?'1':'2'};};syncTitleEditor(db.competitions[0]);`);
 assert.equal(run('db.competitions[0].titlePlayoff.sources[1].passDown'),false);assert.equal(run('db.competitions[0].titlePlayoff.sources[2].passDown'),true);
 assert.deepEqual(json(run('db.competitions[0].titlePlayoff.rounds.map(r=>r.legs)')),[1,2]);
 run('db.competitions[0].titlePlayoff.rounds=[]');assert(run('validateTitleRules().length')>0);
 run("db.competitions[0].titlePlayoff.sources=[{id:'phase:missing'}]");assert(run('validateTitleRules().length')>0);
});

test('old positions migrate across imported rosters, saves and tactical slots without duplicate CA',()=>{
 const {run}=setup();
 assert.equal(run("normalizePosition('ATA/CA/ME/MD/LTD/LTE/GOL/MC/ZAG/MEI')"),'CA/MLE/MLD/LD/LE/GO/MLG/ZC/MAT');
 run("const imported={teams:[{importedPlayers:[{pos:'ATA/CA'},{pos:'GOL'}],generatedSquad:[{pos:'ME/MD'}]}],gameState:{mySquad:[{pos:'MC/MEI'}],myLineup:{positions:[{role:'ZAG'}]}}};normalizePeople(imported)");
 assert.equal(run('imported.teams[0].importedPlayers[0].pos'),'CA');
 assert.equal(run('imported.teams[0].generatedSquad[0].pos'),'MLE/MLD');
 assert.equal(run('imported.gameState.mySquad[0].pos'),'MLG/MAT');
 assert.equal(run('imported.gameState.myLineup.positions[0].role'),'ZC');
 assert.equal(run("isNaturalGoalkeeper({pos:'GOL'})"),true);
 assert.equal(run("getPositionPenalty('GOL','GO')"),0);
 assert.equal(run("Object.values(formationsDB).flat().some(p=>Object.hasOwn(POSITION_ALIASES,p.role))"),false);
});
test('missing photos and old initials use generic silhouette, while real photos are preserved',()=>{
 const {run}=setup();
 for(const value of [null,'','   '])assert.equal(run(`personPhoto(${JSON.stringify(value)})`),run('GENERIC_PERSON_PHOTO'));
 assert.equal(run(`personPhoto('data:image/svg+xml;charset=utf-8,'+encodeURIComponent('<svg><rect fill="hsl(50,60%,45%)"/><text dominant-baseline="central">AB</text></svg>'))`),run('GENERIC_PERSON_PHOTO'));
 assert.equal(run("personPhoto('https://example.test/player.jpg')"),'https://example.test/player.jpg');
 assert.equal(run("personPhoto('data:image/png;base64,REAL')"),'data:image/png;base64,REAL');
 assert.match(run('personImage(null)'),/src="data:image\/svg\+xml;base64,/);
 assert.match(run("personImage('bad.jpg')"),/onerror="this.onerror=null; this.src=GENERIC_PERSON_PHOTO/);
 assert.match(run('getManagerPhotoElement(null,true)'),/data:image\/svg\+xml;base64,/);
});

test('instant simulation records results and player stats once without opening a live timer',()=>{
 const {run,timers}=matchSetup();
 run("clearInterval(liveMatch.timer);liveMatch=null;setSimulationSetting('live',false);gameState.teamMap.upper1.budget=10;simulateInstantMatch(gameState.fixtures[0]);const score=gameState.fixtures[0].homeScore;simulateInstantMatch(gameState.fixtures[0])");
 assert.equal(timers.size,0);assert.equal(run('liveMatch'),null);assert.equal(run('gameState.fixtures[0].played'),true);
 assert.equal(run('gameState.mySquad[0].sGames'),1);assert.equal(run('gameState.mySquad[0].sGoals || 0'),0);
 assert.equal(run('gameState.fixtures[0].homeScore===score'),true);assert.equal(run('gameState.mySquad[1].sGoals || 0'),run('score'));
});
test('live speed updates preserve the match and a single timer and settings survive serialization',()=>{
 const {run,timers}=matchSetup();run("resumeLiveMatch();const sameMatch=liveMatch;setSimulationSetting('speed',4)");assert.equal(timers.size,1);assert.equal(run('liveMatch===sameMatch'),true);assert.equal(run('liveMatch.minute'),30);
 run('gameState.simulationSettings=JSON.parse(JSON.stringify(gameState.simulationSettings))');assert.equal(run('simulationSettings().speed'),4);run("setSimulationSetting('speed',-1)");assert.equal(run('simulationSettings().speed'),1);
});
function tradingSetup(){const env=setup();env.run(`gameState.playerTeamId='upper1';gameState.mySquad=[{id:'seller',name:'Atleta',pos:'CA',age:23,ovr:75,value:2,sGames:10,sGoals:4,sAssists:3,sRatings:[8,6]}];gameState.myLineup.starters=['seller'];gameState.myLineup.bench=[];gameState.teamMap.upper1.budget=10;gameState.teamMap.upper2.budget=10;gameState.teamMap.upper2.generatedSquad=[];`);return env;}
test('real purchase offer moves the same player, pays the seller, charges the buyer and preserves club history',()=>{
 const {run}=tradingSetup();run("createHumanOffer(gameState.teamMap.upper2,gameState.mySquad[0]);const offer=gameState.inbox[0];acceptOffer(offer.id)");
 assert.equal(run('gameState.mySquad.length'),0);assert.equal(run('clubSquad("upper2")[0].id'),'seller');assert.equal(run('gameState.myLineup.starters[0]'),null);
 assert.equal(run('Number(gameState.teamMap.upper1.budget)+Number(gameState.teamMap.upper2.budget)'),20);
 assert.equal(run('clubSquad("upper2")[0].careerStats[0].games'),10);assert.equal(run('clubSquad("upper2")[0].careerStats[0].teamId'),'upper1');assert.equal(run('clubSquad("upper2")[0].sGames'),0);
 run('acceptOffer(offer.id)');assert.equal(run('clubSquad("upper2").length'),1);
});
test('loans move players to a real club and return them once with both club stints intact',()=>{
 const {run}=tradingSetup();run("executeClubTransfer('seller','upper1','upper2',0.1,true);clubSquad('upper2')[0].sGames=8;clubSquad('upper2')[0].sGoals=2;advanceToNextStageOrSeason('upper',0,2026);advanceToNextStageOrSeason('lower',0,2026);finalizeCareerSeasons();finalizeCareerSeasons()");
 assert.equal(run("gameState.mySquad.filter(p=>p.id==='seller').length"),1);assert.equal(run("clubSquad('upper2').some(p=>p.id==='seller')"),false);assert.equal(run('gameState.mySquad[0].isLoan'),false);
 assert.equal(run("careerRows(gameState.mySquad[0]).find(r=>r.teamId==='upper2').games"),8);
 assert.equal(run("careerRows(gameState.mySquad[0]).find(r=>r.teamId==='upper1' && r.season===2026).games"),10);
});
test('career rows group club stints per season and clicking a club shows combined totals',()=>{
 const {run}=tradingSetup();run("const p=gameState.mySquad[0];p.careerTeamId='upper1';p.careerSeason=2026;p.careerStats=[{season:2025,teamId:'upper1',teamName:'upper1',games:20,goals:6,assists:4,rating:7}];gameState.teamMap.upper1.logoUrl='badge.png';gameState.selectedPlayerId='seller';showCareerClub(0)");
 assert.match(run('gameState.notice'),/Jogos: 30/);assert.match(run('gameState.notice'),/Gols: 10/);assert.match(run('renderPlayerCareer(gameState.mySquad[0])'),/badge.png/);assert.match(run('renderPlayerCareer(gameState.mySquad[0])'),/showCareerClub\(0\)/);
});
test('AI market initiates unlisted permanent sales and loans without duplicating players',()=>{
 for(const age of [30,22]){
  const {run}=tradingSetup();run(`for(const t of Object.values(gameState.teamMap)){if(t.id==='upper1')continue;t.generatedSquad=Array.from({length:24},(_,i)=>({id:t.id+'p'+i,name:'AI '+i,pos:i===0?'GO':'CA',age:${age},ovr:60+i,value:1}));t.budget=10;}Math.random=()=>0;simulateAIMarket();`);
  assert(run('gameState.transferHistory.length')>0);assert.equal(run('gameState.transferHistory[0].isLoan'),age===22);
  assert.equal(run('constIds=Object.values(gameState.teamMap).filter(t=>t.id!==gameState.playerTeamId).flatMap(t=>t.generatedSquad.map(p=>p.id));new Set(constIds).size===constIds.length'),true);
  assert.equal(run("gameState.inbox.some(m=>m.buyerTeamId && m.playerId==='seller')"),true);
 }
});

test('season rollover preserves earlier stats even when another competition is still pending',()=>{
 const {run}=tradingSetup();run("const p=gameState.mySquad[0];p.careerSeason=2026;p.careerTeamId='upper1';prepareCareerSeason(p,'upper1',2027);prepareCareerSeason(p,'upper1',2027)");
 assert.equal(run('p.careerStats.length'),1);assert.equal(run('p.careerStats[0].games'),10);assert.equal(run('p.sGames'),0);assert.equal(run('p.careerSeason'),2027);
});

function promotionFormatSetup(format,slots=1,legs=1){const env=setup('promotion');env.run(`Object.assign(db.competitions[0].movement,{direct:0,playoffTeams:4,slots:${slots},promotionFormat:${JSON.stringify(format)},promotionRounds:${legs},promotionGroups:2});advanceToNextStageOrSeason('upper',0,2026);advanceToNextStageOrSeason('lower',0,2026);`);return env;}
test('promotion knockout plays successive rounds, resolves aggregate ties and promotes once',()=>{
 const {run}=promotionFormatSetup('knockout',1,2);assert.equal(run('gameState.fixtures.length'),4);
 run('const firstLeg=gameState.fixtures[0];firstLeg.homeScore=1;firstLeg.awayScore=1;firstLeg.played=true;applyMatchResultToTables(firstLeg)');assert.equal(run('firstLeg.penaltyHome'),undefined);
 run('for(const f of gameState.fixtures.filter(f=>!f.played)){f.homeScore=1;f.awayScore=1;f.played=true;applyMatchResultToTables(f)}processDivisionPlayoffs()');
 assert.equal(run('gameState.fixtures.length'),6);assert.equal(run("divisionSeasonReady('lower',2027)"),false);
 run('gameState.divisionTransitions=JSON.parse(JSON.stringify(gameState.divisionTransitions));for(const f of gameState.fixtures.filter(f=>!f.played)){f.homeScore=f.home===\'lower1\'?3:0;f.awayScore=f.away===\'lower1\'?3:0;f.played=true;applyMatchResultToTables(f)}processDivisionPlayoffs();processDivisionPlayoffs()');
 assert.equal(run('Object.values(gameState.divisionTransitions)[0].playoffUp.length'),1);assert.equal(run("getCompetitionTeams('upper').length"),4);assert.equal(run('gameState.globalStandings[2026].lower.lower1.pts'),12);
 assert.equal(run("divisionSeasonReady('lower',2027)"),true);
});
test('knockout stops at the requested slots and gives seeded clubs necessary byes',()=>{
 const {run}=promotionFormatSetup('knockout',3);assert.equal(run('gameState.fixtures.length'),1);
 assert.deepEqual(json(run('Object.values(gameState.divisionTransitions)[0].promotionKnockout[0].byes')),['lower1','lower2']);
 run('const f=gameState.fixtures[0];f.homeScore=2;f.awayScore=0;f.played=true;applyMatchResultToTables(f);processDivisionPlayoffs()');
 assert.equal(run('Object.values(gameState.divisionTransitions)[0].playoffUp.length'),3);
});
test('group promotion plays only within groups and promotes equal numbers per group',()=>{
 const {run}=promotionFormatSetup('groups',2,2);assert.deepEqual(json(run('validateMovementRules()')),[]);assert.equal(run('gameState.fixtures.length'),4);
 assert.equal(run('gameState.fixtures.every(f=>Object.values(gameState.divisionTransitions)[0].promotionGroups[f.promotionGroup].includes(f.home) && Object.values(gameState.divisionTransitions)[0].promotionGroups[f.promotionGroup].includes(f.away))'),true);
 run("for(const f of gameState.fixtures){f.homeScore=['lower1','lower2'].includes(f.home)?3:0;f.awayScore=['lower1','lower2'].includes(f.away)?3:0;f.played=true;applyMatchResultToTables(f)}processDivisionPlayoffs()");
 assert.deepEqual(json(run('Object.values(gameState.divisionTransitions)[0].playoffUp')),['lower1','lower2']);assert.match(run('renderMovementPanel("lower",2026)'),/Grupo 1/);assert.match(run('renderMovementPanel("lower",2026)'),/Grupo 2/);
});
test('promotion format editor persists controls and rejects incompatible group places',()=>{
 const {run}=setup('promotion');
 run("Object.assign(db.competitions[0].movement,{promotionFormat:'groups',promotionGroups:2,playoffTeams:4,direct:0,slots:1})");assert(run('validateMovementRules().length')>0);
 run('db.competitions[0].movement.slots=2');assert.deepEqual(json(run('validateMovementRules()')),[]);
 assert.match(run('renderMovementEditor(db.competitions[0])'),/value="groups" selected/);
 run(`document.getElementById=id=>({checked:true,value:({'target':'lower','table':'aggregate','direct':'0','mode':'promotion','teams':'4','slots':'2','format':'groups','rounds':'2','groups':'2'})[id.split('-')[1]]});syncMovementEditor(db.competitions[0]);`);
 assert.equal(run('db.competitions[0].movement.promotionFormat'),'groups');assert.equal(run('db.competitions[0].movement.promotionRounds'),2);
});

test('promotion stages combine groups and a two-leg knockout without carrying points',()=>{
 const {run}=setup('promotion');run(`Object.assign(db.competitions[0].movement,{direct:0,playoffTeams:4,slots:1,promotionPhases:[{name:'Grupos',format:'groups',groups:2,rounds:1,advancing:2},{name:'Decisão',format:'knockout',rounds:2,advancing:1}]});`);
 assert.deepEqual(json(run('validateMovementRules()')),[]);
 run("advanceToNextStageOrSeason('upper',0,2026);advanceToNextStageOrSeason('lower',0,2026)");
 assert.equal(run('gameState.fixtures.length'),2);
 run("for(const f of gameState.fixtures){f.homeScore=['lower1','lower2'].includes(f.home)?2:0;f.awayScore=['lower1','lower2'].includes(f.away)?2:0;f.played=true;applyMatchResultToTables(f)}processDivisionPlayoffs()");
 assert.equal(run('gameState.fixtures.length'),4);assert.equal(run('Object.values(gameState.divisionTransitions)[0].stageRuns.length'),2);
 assert.deepEqual(json(run('Object.values(gameState.divisionTransitions)[0].stageRuns[1].lowerPlayoff')),['lower1','lower2']);
 assert.equal(run("Object.values(gameState.standings[Object.values(gameState.divisionTransitions)[0].stageRuns[1].phaseId+'_2026']).every(s=>s.pts===0)"),true);
 assert.equal(run("divisionSeasonReady('lower',2027)"),false);
 run("gameState.divisionTransitions=JSON.parse(JSON.stringify(gameState.divisionTransitions));for(const f of gameState.fixtures.filter(f=>!f.played)){f.homeScore=f.home==='lower2'?3:0;f.awayScore=f.away==='lower2'?3:0;f.played=true;applyMatchResultToTables(f)}processDivisionPlayoffs();processDivisionPlayoffs()");
 assert.equal(run('gameState.teamMap.lower2.divisionId'),'d1');assert.equal(run('gameState.teamMap.lower1.divisionId'),'d2');assert.equal(run("getCompetitionTeams('upper').length"),4);
 assert.match(run("renderMovementPanel('lower',2026)"),/Decisão/);
 assert.equal(run('gameState.globalStandings[2026].lower.lower2.pts'),9);
});
test('individual league stages reset points and only the last stage grants promotion',()=>{
 const {run}=setup('promotion');run(`Object.assign(db.competitions[0].movement,{direct:0,playoffTeams:4,slots:1,promotionPhases:[{name:'Classificatória',format:'league',rounds:1,advancing:2},{name:'Liga final',format:'league',rounds:2,advancing:1}]});advanceToNextStageOrSeason('upper',0,2026);advanceToNextStageOrSeason('lower',0,2026);`);
 assert.equal(run('gameState.fixtures.length'),6);
 run("for(const f of gameState.fixtures){f.homeScore=0;f.awayScore=0;f.played=true;applyMatchResultToTables(f)}processDivisionPlayoffs()");
 assert.equal(run('gameState.fixtures.length'),8);assert.equal(run('gameState.teamMap.lower1.divisionId'),'d2');
 run("for(const f of gameState.fixtures.filter(f=>!f.played)){f.homeScore=f.home==='lower2'?1:0;f.awayScore=f.away==='lower2'?1:0;f.played=true;applyMatchResultToTables(f)}processDivisionPlayoffs()");
 assert.equal(run('gameState.teamMap.lower2.divisionId'),'d1');
});
test('promotion phases reject incompatible progression and persist their individual editor fields',()=>{
 const {run}=setup('promotion');run(`Object.assign(db.competitions[0].movement,{direct:0,playoffTeams:4,slots:1,promotionPhases:[{name:'Semi',format:'knockout',rounds:2,advancing:2},{name:'Final',format:'league',rounds:1,advancing:1}]});`);
 assert.deepEqual(json(run('validateMovementRules()')),[]);assert.match(run('renderMovementEditor(db.competitions[0])'),/prom-rounds-upper-0/);
 run("document.getElementById=id=>id==='prom-rounds-upper-0'?{value:'1'}:id==='prom-rounds-upper-1'?{value:'2'}:null;const phases=readPromotionPhasesEditor(db.competitions[0])");
 assert.deepEqual(json(run('phases.map(p=>p.rounds)')),[1,2]);
 run('db.competitions[0].movement.promotionPhases[1].advancing=2');assert(run('validateMovementRules().length')>0);
 run('db.competitions[0].movement.promotionPhases[1].advancing=1;db.competitions[0].movement.promotionPhases[0].advancing=5');assert(run('validateMovementRules().length')>0);
});

test('competition phase list includes configured promotion stages before and after qualification',()=>{
 const {run}=setup('promotion');run(`Object.assign(db.competitions[0].movement,{direct:0,playoffTeams:4,slots:1,promotionPhases:[{name:'Grupos de acesso',format:'groups',groups:2,rounds:1,advancing:2},{name:'Final de acesso',format:'knockout',rounds:2,advancing:1}]});`);
 assert.deepEqual(json(run("competitionPhases(db.competitions[1],2026).filter(p=>p.category==='Playoff de promoção').map(p=>p.name)")),['Grupos de acesso','Final de acesso']);
 run("advanceToNextStageOrSeason('upper',0,2026);advanceToNextStageOrSeason('lower',0,2026)");
 assert.equal(run("competitionPhases(db.competitions[1],2026).find(p=>p.name==='Grupos de acesso').fixtures.length"),2);
 assert.equal(run("Object.keys(competitionPhases(db.competitions[1],2026).find(p=>p.name==='Grupos de acesso').groups).length"),2);
 assert.equal(run("phaseStatus(competitionPhases(db.competitions[1],2026).find(p=>p.name==='Final de acesso'))"),'Aguardando classificados');
});
test('relegation and title playoffs share the regular phase viewer without altering league data',()=>{
 const {run}=titleSetup();run("db.competitions[0].movement.enabled=true;db.competitions[0].movement.mode='internal';recordTitleRanking('upperphase',2026,['upper1','upper2']);recordTitleRanking('cupfinal',2026,['upper3']);advanceToNextStageOrSeason('upper',0,2026);advanceToNextStageOrSeason('lower',0,2026);processTitlePlayoffs()");
 const categories=json(run("competitionPhases(db.competitions[0],2026).map(p=>p.category)"));assert(categories.includes('Fase regular'));assert(categories.includes('Playoff de rebaixamento'));assert(categories.includes('Playoff pelo título'));
 assert.equal(run("competitionPhases(db.competitions[0],2026).find(p=>p.category==='Playoff pelo título').fixtures.length"),4);
 assert.equal(run('gameState.globalStandings[2026].upper.upper1.pts'),12);
});
test('competition view keeps historical seasons separate and displays standings and games',()=>{
 const {run}=promotionFormatSetup('groups',2);run("competitionView.country='br';competitionView.comp='lower';competitionView.season=2026;competitionView.phase='movement:upper:0'");
 const html=run('renderCompetitionCenter()');assert.match(html,/Grupo 1/);assert.match(html,/Grupo 2/);assert.match(html,/Jogos da fase/);assert.match(html,/PTS/);assert.match(html,/Semana/);
 assert.equal(run("competitionPhases(db.competitions[1],2027).find(p=>p.category==='Playoff de promoção').fixtures.length"),0);
});

test('club title counts combine editor champions with career titles without counting history twice',()=>{
 const {run}=setup();run("db.competitions[0].initialTitles={upper1:5,upper2:2,upper3:0,missing:10};gameState.titles={upper1:{upper:2},upper3:{upper:1}};gameState.history=[{teamId:'upper1',targetCompId:'upper',season:2026},{teamId:'upper1',targetCompId:'upper',season:2027}]");
 assert.deepEqual(json(run('competitionTitleCounts(db.competitions[0]).map(r=>[r.id,r.total])')),[['upper1',7],['upper2',2],['upper3',1]]);
});
test('history selector excludes competitions without champion clubs and includes initial-only titles',()=>{
 const {run}=setup();run("db.competitions[0].initialTitles={upper2:3};titleHistoryView.country='br'");const html=run('renderClubTitleHistory()');assert.match(html,/value="upper"/);assert.doesNotMatch(html,/value="lower"/);assert.match(html,/Títulos por clube/);assert.match(html,/upper2/);
});
test('empty title history gives an explicit empty state and historical records can recover missing counters',()=>{
 const {run}=setup();assert.match(run('renderClubTitleHistory()'),/Nenhum campeão registrado/);
 run("gameState.history=[{teamId:'lower1',targetCompId:'lower',season:2026}]");assert.equal(run('competitionTitleCounts(db.competitions[1])[0].total'),1);
});

test('scorer ranking separates competitions and seasons and preserves club stints without duplication',()=>{
 const {run}=setup();run(`const f={baseCompId:'upper',compId:'upperphase',season:2026};recordFixtureScorers(f,[{id:'p',name:'Atacante',teamId:'upper1',goals:2}]);recordFixtureScorers(f,[{id:'p',name:'Atacante',teamId:'upper1',goals:2}]);recordFixtureScorers({baseCompId:'upper',compId:'upperphase',season:2026},[{id:'p',name:'Atacante',teamId:'upper2',goals:1}]);recordFixtureScorers({baseCompId:'lower',compId:'lowerphase',season:2027},[{id:'p',name:'Atacante',teamId:'lower1',goals:4}]);`);
 assert.equal(run("competitionScorerRanking('upper',2026)[0].goals"),3);assert.equal(run("competitionScorerRanking('upper',2026)[0].games"),2);assert.equal(run("Object.keys(competitionScorerRanking('upper',2026)[0].clubs).length"),2);assert.equal(run("competitionScorerRanking('upper',2027).length"),0);
});
test('instant and live matches feed scorer rankings from their actual recorded scorers',()=>{
 const {run}=matchSetup();run('recordLiveScorer(gameState.mySquad[1]);recordLiveScorer(gameState.mySquad[1]);liveMatch.scorerGoals=JSON.parse(JSON.stringify(liveMatch.scorerGoals));liveMatch.finished=true;finishLiveMatch()');
 assert.equal(run("competitionScorerRanking('upper',2026).find(p=>p.id==='st').goals"),2);
 assert.equal(run("competitionScorerRanking('upper',2026).find(p=>p.id==='st').games"),1);
});
test('promotion playoff scorers appear in linked competitions and ignore shootout scores',()=>{
 const {run}=promotionFormatSetup('knockout',1);run('const f=gameState.fixtures[0];f.homeScore=1;f.awayScore=1;f.penaltyHome=5;f.penaltyAway=4;f.played=true;applyMatchResultToTables(f)');
 assert.equal(run("competitionScorerRanking('upper',2026).reduce((n,p)=>n+p.goals,0)"),2);assert.equal(run("competitionScorerRanking('lower',2026).reduce((n,p)=>n+p.goals,0)"),2);
 assert.match(run('renderScorers()'),/Artilharia|ARTILHARIA/);
});

test('instant CPU and human matches have realistic seeded goal distributions',()=>{
 const {run}=setup();
 const results=json(run(`(()=>{
 let seed=87341;Math.random=()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296);
 applyMatchResultToTables=()=>{};generateMatchRevenue=()=>{};movementMessage=()=>{};
 const results=[];
 for(const human of [false,true]){
 getMatchStyle=()=>({name:'Equilibrado',attack:1,exposure:1});gameState.playerTeamId=human?'upper1':null;getEffectiveTeamRating=()=>75;
 let total=0,high=0;
 for(let i=0;i<10000;i++){const f={home:'upper1',away:'upper2',season:2026};simulateInstantMatch(f);total+=f.homeScore+f.awayScore;if(f.homeScore+f.awayScore>9)high++;}
 results.push({mean:total/10000,high});
 }
 getEffectiveTeamRating=id=>id==='upper1'?100:1;const c=getLiveGoalChances('upper1','upper2');
 return {results,maxExpected:c.home*90,awayExpected:c.away*90};})()`));
 for(const r of results.results){assert(r.mean>2.5 && r.mean<2.9,JSON.stringify(r));assert(r.high<15);}
 assert(results.maxExpected<=3.800001);assert(results.awayExpected>=0.15);assert(results.maxExpected>results.awayExpected);
});
test('completed promotion and relegation playoffs highlight their winners only after completion',()=>{
 for(const mode of ['promotion','internal','mixed']){
 const {run}=mode==='promotion'?promotionFormatSetup('league',1):setup(mode);
 if(mode!=='promotion')run("advanceToNextStageOrSeason('upper',0,2026);advanceToNextStageOrSeason('lower',0,2026)");
 assert.equal(run('movementPhaseWinners(Object.values(gameState.divisionTransitions)[0]).length'),0);
 run('for(const f of gameState.fixtures.filter(f=>!f.played)){f.homeScore=2;f.awayScore=0;f.played=true;applyMatchResultToTables(f)}processDivisionPlayoffs()');
 assert(run('movementPhaseWinners(Object.values(gameState.divisionTransitions)[0]).length')>0);
 run("competitionView.country='br';competitionView.comp='upper';competitionView.season=2026;competitionView.phase='movement:upper:0'");
 const html=run('renderCompetitionCenter()');assert.match(html,/playoff-winner-banner/);assert.match(html,mode==='mixed'?/playoff-winner-team/:/playoff-winner-row/);
 }
});
test('completed title playoff highlights its champion in the phase viewer',()=>{
 const {run}=titleSetup();run("recordTitleRanking('upperphase',2026,['upper1','upper2']);recordTitleRanking('cupfinal',2026,['upper3']);advanceToNextStageOrSeason('upper',0,2026);advanceToNextStageOrSeason('lower',0,2026);processTitlePlayoffs()");
 assert.equal(run("competitionPhases(db.competitions[0],2026).filter(p=>p.category==='Playoff pelo título').some(p=>p.winners.length)"),false);
 run('for(let i=0;i<3;i++){for(const f of gameState.fixtures.filter(f=>!f.played)){f.homeScore=2;f.awayScore=0;f.played=true;applyMatchResultToTables(f)}processTitlePlayoffs()}');
 run("competitionView.country='br';competitionView.comp='upper';competitionView.season=2026;competitionView.phase='title:1'");
 assert.match(run('renderCompetitionCenter()'),/playoff-winner-banner/);assert.match(run('renderCompetitionCenter()'),/playoff-winner-team/);
});
test('child competitions appear as parent phases but not standalone competition options',()=>{
 const {run}=setup();run("const child={id:'child',name:'Taça filha',parentId:'upper',countryId:'br',phases:[{id:'childphase',name:'Final da taça',type:'KNOCKOUT'}]};db.competitions.push(child);gameState.compMap.child=child;competitionView.country='br';competitionView.comp='upper';competitionView.season=2026");
 const html=run('renderCompetitionCenter()');assert.doesNotMatch(html,/option value="child"/);assert.match(html,/Final da taça/);assert.match(html,/Taça filha/);
});
test('proposal counter excludes general messages and clears after acceptance or rejection',()=>{
 const {run}=tradingSetup();run(`let badge=null;const nav={querySelector:()=>badge,appendChild:b=>badge=b,setAttribute(){}};document.getElementById=id=>id==='nav-btn-market'?nav:null;document.createElement=()=>({setAttribute(){}});gameState.inbox=[{id:'news',type:'finance'}];createHumanOffer(gameState.teamMap.upper2,gameState.mySquad[0]);updateOfferNotification()`);
 assert.equal(run('badge.textContent'),'1');assert.equal(run('badge.hidden'),false);assert.match(run('renderPendingOffers()'),/Aceitar/);
 run('acceptOffer(pendingTransferOffers()[0].id);updateOfferNotification()');assert.equal(run('badge.hidden'),true);
 run("gameState.inbox.push({id:'loan',type:'loan'});updateOfferNotification()");assert.equal(run('badge.textContent'),'1');run("rejectOffer('loan');updateOfferNotification()");assert.equal(run('badge.hidden'),true);
});

test('two-minute live ticks preserve the per-minute expected goal rate',()=>{
 const {run}=setup();assert.equal(run("getLiveGoalChances('upper1','upper2',2).home*45"),run("getLiveGoalChances('upper1','upper2').home*90"));
});

test('contracts warn once per threshold, expire, clear lineup and preserve a free-agent history',()=>{
 const {run}=tradingSetup();run("gameState.currentDate=new Date(2026,0,1);gameState.currentWeek=1;gameState.mySquad[0].contractEnd='01/03/2026';gameState.mySquad[0].salary='10 mil';processPlayerWeek();processPlayerWeek()");
 assert.equal(run("gameState.inbox.filter(m=>m.type==='contract').length"),1);
 run('gameState.currentWeek++;processPlayerWeek()');assert.equal(run("gameState.inbox.filter(m=>m.type==='contract').length"),1);
 run('gameState.currentDate=new Date(2026,1,15);gameState.currentWeek++;processPlayerWeek()');assert.equal(run("gameState.inbox.filter(m=>m.type==='contract').length"),2);
 run('gameState.currentDate=new Date(2026,2,2);gameState.currentWeek++;processPlayerWeek()');assert.equal(run('gameState.mySquad.length'),0);assert.equal(run('gameState.myLineup.starters[0]'),null);assert.equal(run('gameState.freeAgents[0].careerStats[0].games'),10);
 run('signFreeAgent(0)');assert.equal(run('gameState.mySquad.length'),1);assert.equal(run('gameState.freeAgents.length'),0);assert(run('contractDate(gameState.mySquad[0])>gameState.currentDate'));
});
test('renewal extends from the current expiry and clears obsolete notices',()=>{
 const {run}=tradingSetup();run("gameState.currentDate=new Date(2026,0,1);gameState.mySquad[0].contractEnd='01/03/2026';gameState.mySquad[0].salary='10 mil';gameState.inbox.push({type:'contract',playerId:'seller'});renewPlayerContract(gameState.mySquad[0])");
 assert.equal(run('gameState.mySquad[0].contractEnd'),'01/03/2027');assert.equal(run('gameState.mySquad[0].salary'),'11 mil');assert.equal(run('gameState.inbox.length'),0);
});
test('weekly wage accrual and recovery apply only once and CPU renews its own contracts',()=>{
 const {run}=tradingSetup();run("gameState.currentDate=new Date(2026,0,1);gameState.currentWeek=1;Object.assign(gameState.mySquad[0],{energy:40,salary:'43.45 mil',contractEnd:'01/01/2028'});gameState.teamMap.upper2.generatedSquad=[{id:'cpu',ovr:70,energy:100,contractEnd:'01/01/2025'}];processPlayerWeek();processPlayerWeek()");
 assert.equal(run('Number(gameState.teamMap.upper1.budget)'),10);assert(Math.abs(run('gameState.payrollAccrued[movementKey("upper1",2026)]')-0.01)<1e-9);assert.equal(run('gameState.mySquad[0].energy'),60);assert.equal(run('gameState.teamMap.upper2.generatedSquad.length'),1);assert(run('contractDate(gameState.teamMap.upper2.generatedSquad[0])>gameState.currentDate'));
});
test('training learns the chosen weakness with escalating costs and refuses invalid or unaffordable repeats',()=>{
 const {run}=tradingSetup();run("const p=gameState.mySquad[0];p.energy=100;p.strengths=[];p.weaknesses=['Finalização'];trainPlayer(p,'Finalização')");
 assert.equal(run('p.ovr'),76);assert.equal(run("p.strengths.includes('Finalização')"),true);assert.equal(run('p.weaknesses.length'),0);assert.equal(run('trainingCost(p)'),1);assert.equal(run('Number(gameState.teamMap.upper1.budget)'),9.5);assert.equal(run("trainPlayer(p,'Finalização')"),false);
 run('gameState.teamMap.upper1.budget=0');assert.equal(run("trainPlayer(p,'Passe Curto')"),false);assert.equal(run('p.ovr'),76);
});
test('fatigue lowers effective strength, goalkeepers tire less, and reserves recover',()=>{
 const {run}=matchSetup();run('liveMatch=null;const st=gameState.mySquad.find(p=>p.id===\'st\'),gk=gameState.mySquad.find(p=>p.id===\'gk\');st.energy=100;gk.energy=100;fatiguePlayers([st,gk],90)');
 assert(run('st.energy<gk.energy'));assert(run('energyRating(st)<st.ovr'));run('const before=st.energy;processPlayerWeek()');assert(run('st.energy>before'));
});
test('instant fatigue is recorded once and CPU selection rotates exhausted players',()=>{
 const {run}=setup();run("gameState.playerTeamId=null;const players=clubSquad('upper1');players.forEach(p=>p.energy=100);const striker=players.find(p=>!isNaturalGoalkeeper(p));striker.ovr=99;striker.energy=0;players.filter(p=>!isNaturalGoalkeeper(p) && p!==striker).forEach(p=>p.ovr=95);const f={home:'upper1',away:'upper2',homeScore:0,awayScore:0,played:true,season:2026,baseCompId:'upper',compId:'upperphase'};");
 assert.equal(run("cpuMatchPlayers('upper1').includes(striker)"),false);
 run('recordSimulatedPlayerStats(f);const energy=players.reduce((n,p)=>n+p.energy,0);recordSimulatedPlayerStats(f)');assert.equal(run('players.reduce((n,p)=>n+p.energy,0)'),run('energy'));
});
test('performance evolves overall once per block and annual aging affects team overall',()=>{
 const {run}=tradingSetup();run('const p=gameState.mySquad[0];p.sRatings=[8,8,8,8,8];progressPerformance(p,"upper1");progressPerformance(p,"upper1")');assert.equal(run('p.ovr'),76);assert.equal(run('gameState.teamMap.upper1.rating'),76);
 run('p.age=34;p.sRatings=[5,5,5,5,5];applyEndSeasonProgression()');assert.equal(run('p.ovr'),73);assert.equal(run('gameState.teamMap.upper1.rating'),73);
});
test('CPU player profiles resolve career statistics from the selected club',()=>{
 const {run}=tradingSetup();run("gameState.teamMap.upper2.generatedSquad=[{id:'cpu',name:'CPU',pos:'CA',ovr:70,sGames:4,sGoals:2}];gameState.profileTeamId='upper2';gameState.selectedPlayerId='cpu'");assert.equal(run('selectedProfilePlayer().name'),'CPU');assert.match(run('renderPlayerCareer(selectedProfilePlayer())'),/G 2/);
});

test('human manager replaces the original, who can be hired by another club without duplicates',()=>{
 const {run}=setup();run("gameState.playerTeamId='upper1';gameState.managerName=humanManagerName='Meu Técnico';db.teams.find(t=>t.id==='upper1').managerName='Original';db.teams.find(t=>t.id==='upper2').managerName='Outro';initializeManagers('upper1')");
 assert.equal(run('gameState.teamMap.upper1.managerName'),'Meu Técnico');assert.equal(run('gameState.teamMap.upper1.isHumanManaged'),true);assert.equal(run('gameState.freeManagers[0].name'),'Original');
 run('simulateManagerMovements()');assert.equal(run("Object.values(gameState.teamMap).filter(t=>t.managerName==='Original').length"),1);assert.equal(run("gameState.freeManagers.some(m=>m.name==='Original')"),false);
});
test('poor CPU results can cause dismissal while human manager stays protected',()=>{
 const {run}=setup();run("gameState.playerTeamId='upper1';gameState.managerName=humanManagerName='Humano';initializeManagers('upper1');gameState.teamMap.upper2.managerName='Demitido';gameState.currentWeek=10;gameState.fixtures=Array.from({length:5},()=>({played:true,home:'upper2',away:'lower1',homeScore:0,awayScore:2}));Math.random=()=>0;simulateManagerMovements()");
 assert(run("gameState.managerHistory.some(m=>m.name==='Demitido' && m.reason==='Demitido por resultados')"));assert.equal(run('gameState.teamMap.upper1.managerName'),'Humano');assert.notEqual(run('gameState.teamMap.upper2.managerName'),'Demitido');
});
test('overall gives a measurable advantage with both home and away fixtures without inflating goals',()=>{
 const {run}=setup();const result=json(run(`(()=>{
 let seed=417;Math.random=()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296);
 gameState.playerTeamId=null;getEffectiveTeamRating=id=>id==='upper1'?90:70;applyMatchResultToTables=()=>{};
 let wins=0,losses=0,goals=0;
 for(let i=0;i<10000;i++){const f={home:i%2?'upper1':'upper2',away:i%2?'upper2':'upper1'};simulateInstantMatch(f);const a=i%2?f.homeScore:f.awayScore,b=i%2?f.awayScore:f.homeScore;if(a>b)wins++;if(a<b)losses++;goals+=a+b;}
 return {wins,losses,mean:goals/10000};})()`));
 assert(result.wins>7000,JSON.stringify(result));assert(result.losses<1500,JSON.stringify(result));assert(result.mean<4.5,JSON.stringify(result));
});
test('squad badges show contract urgency and distinguish buy and loan interest',()=>{
 const {run}=tradingSetup();run("gameState.currentDate=new Date(2026,0,1);const p=gameState.mySquad[0];p.contractEnd='20/01/2026';gameState.inbox=[{playerId:p.id,type:'buy',buyerName:'Comprador'},{playerId:p.id,type:'loan',buyerName:'Empréstimo FC'}]");
 const html=run('playerSquadNotices(p)');assert.match(html,/Contrato: 19 dias/);assert.match(html,/2 propostas/);assert.match(html,/Compra \/ Empréstimo/);
 run('gameState.inbox=[];p.contractEnd="01/01/2028"');assert.equal(run('playerSquadNotices(p)'),'');
});
test('free agents support the same profile lookup as clubs and signing by ID',()=>{
 const {run}=tradingSetup();run("gameState.freeAgents=[{id:'free',name:'Livre',pos:'CA',ovr:80}];gameState.profileTeamId='__free__';gameState.selectedPlayerId='free'");assert.equal(run('selectedProfilePlayer().name'),'Livre');run("signFreeAgentById('free')");assert.equal(run('gameState.freeAgents.length'),0);assert(run("gameState.mySquad.some(p=>p.id==='free')"));
});

test('position and strength learning each have independent permanent two-slot limits',()=>{
 const {run}=tradingSetup();run("const p=gameState.mySquad[0];p.strengths=[];p.weaknesses=[];gameState.teamMap.upper1.budget=50");
 assert(run("trainPlayer(p,'position:MAT')"));assert(run("trainPlayer(p,'position:MLG')"));assert.equal(run("trainPlayer(p,'position:VOL')"),false);
 assert(run("trainPlayer(p,'Finalização')"));assert(run("trainPlayer(p,'Passe Curto')"));assert.equal(run("trainPlayer(p,'Desarme')"),false);
 assert.equal(run("getPositionPenalty(p.pos,'MAT')"),0);run('p.trainingsThisSeason=0');assert.equal(run('trainingOptions(p).length'),0);assert.equal(run('positionTrainingOptions(p).length'),0);assert.equal(run('Number(gameState.teamMap.upper1.budget)'),45);
});
test('lineup validation rejects empty duplicate and unavailable slots but allows dismissals',()=>{
 const {run}=setup();run("gameState.playerTeamId='upper1';gameState.mySquad=Array.from({length:11},(_,i)=>({id:'p'+i,pos:i?'CA':'GO',ovr:70}));gameState.myLineup.starters=gameState.mySquad.map(p=>p.id)");assert(run('validateHumanLineup(false)'));
 run('gameState.myLineup.starters[2]=null');assert.equal(run('validateHumanLineup(false)'),false);
 run('liveMatch={sentOffSlots:[2]}');assert(run('validateHumanLineup(false)'));
 run("gameState.myLineup.starters[3]='p1'");assert.equal(run('validateHumanLineup(false)'),false);
});
test('CPU tactics adapt formation and style to players and preserve the kickoff lineup',()=>{
 const {run}=setup();run("gameState.playerTeamId='upper1';const team=gameState.teamMap.upper2;team.generatedSquad=['GO','ZC','ZC','LE','LD','VOL','MLG','MLG','PTE','PTD','CA'].map((pos,i)=>({id:'c'+i,pos,ovr:['PTE','PTD','CA'].includes(pos)?95:65,energy:100}));const plan=cpuTactics('upper2')");
 assert.equal(run('plan.formation'),'4-3-3');assert.equal(run('plan.style'),'Ofensivo');assert.equal(run('new Set(plan.starters).size'),11);
 run("const f={home:'upper1',away:'upper2'};captureCpuTactics(f);liveMatch={fixture:f};team.generatedSquad[10].ovr=30");assert.equal(run("cpuTactics('upper2').style"),'Ofensivo');
});
test('CPU lets poor performers expire while retaining good players and logs departures',()=>{
 const {run}=tradingSetup();run("gameState.currentDate=new Date(2026,0,2);gameState.teamMap.upper2.generatedSquad=[{id:'poor',name:'Ruim',pos:'CA',ovr:60,sRatings:[5,5,5,5,5],contractEnd:'01/01/2026'},{id:'good',name:'Bom',pos:'CA',ovr:70,sRatings:[8,8,8,8,8],contractEnd:'01/01/2026'}];processPlayerWeek()");assert(run("gameState.freeAgents.some(p=>p.id==='poor')"));assert(run("clubSquad('upper2').some(p=>p.id==='good')"));assert.match(run('renderTransferHistory()'),/Fim de contrato/);
});
test('playing styles affect scoring expectations for the same lineup',()=>{
 const {run}=setup();run("gameState.playerTeamId='upper1';gameState.myLineup.style='Defensivo';const d=getLiveGoalChances('upper1','upper2');gameState.myLineup.style='Ofensivo';const a=getLiveGoalChances('upper1','upper2')");assert(run('a.home>d.home && a.away>d.away'));
});

function regularCupSetup(count=4,twoLegs=false,stopAtTeams=1){const env=setup();env.run(`const teams=db.teams.slice(0,${count});const cup={id:'cup',name:'Copa',countryId:'br',parentId:'NONE',phases:[{id:'cupko',type:'KNOCKOUT',twoLegs:${twoLegs},stopAtTeams:${stopAtTeams},awardsTitle:true,injectRules:[{}]}]};gameState.compMap.cup=cup;gameState.stages.cup=[cup];resolveInjectRules=()=>teams.map(t=>t.id);advanceToNextStageOrSeason=()=>{gameState.cupFinished=(gameState.cupFinished || 0)+1};startPhase('cup',0,0,null,0,2026);`);return env;}
test('regular knockout injects teams once, advances rounds and awards exactly one title',()=>{
 const {run}=regularCupSetup(8);run(`let guard=0;while(gameState.activePhases.cupko_2026 && guard++<8){const active=gameState.activePhases.cupko_2026;for(const f of gameState.fixtures.filter(f=>!f.played)){f.homeScore=2;f.awayScore=0;f.played=true;}processPhaseEnd('cup',active);processPhaseEnd('cup',active);gameState.currentWeek++;}`);
 assert.equal(run('gameState.cupFinished'),1);assert.equal(run('gameState.fixtures.filter(f=>f.away).length'),7);assert.deepEqual(json(run('[1,2,3].map(r=>gameState.fixtures.filter(f=>f.round===r).length)')),[4,2,1]);assert.equal(run('gameState.history.length'),1);
});
test('two-leg rounds wait for all return legs and advance aggregate winners after reload',()=>{
 const {run}=regularCupSetup(4,true);run("const first=gameState.fixtures.filter(f=>f.globalWeek===0);first.forEach(f=>{f.homeScore=3;f.awayScore=0;f.played=true});processPhaseEnd('cup',gameState.activePhases.cupko_2026)");assert.equal(run('gameState.fixtures.length'),4);
 run("const expected=first.map(f=>f.home);gameState.activePhases=JSON.parse(JSON.stringify(gameState.activePhases));gameState.fixtures.filter(f=>!f.played).forEach(f=>{f.homeScore=1;f.awayScore=0;f.played=true});gameState.currentWeek=1;processPhaseEnd('cup',gameState.activePhases.cupko_2026)");
 assert.equal(run('gameState.fixtures.length'),6);assert(run('gameState.fixtures.filter(f=>!f.played).every(f=>expected.includes(f.home) && expected.includes(f.away))'));
});
test('six-team knockout with byes reaches a champion without reintroducing eliminated teams',()=>{
 const {run}=regularCupSetup(6);run("for(let i=0;i<6 && gameState.activePhases.cupko_2026;i++){gameState.fixtures.filter(f=>!f.played).forEach(f=>{f.homeScore=0;f.awayScore=0;f.played=true});processPhaseEnd('cup',gameState.activePhases.cupko_2026);gameState.currentWeek++;}");assert.equal(run('gameState.cupFinished'),1);assert.equal(run('gameState.fixtures.filter(f=>f.away).length'),5);assert(run('gameState.fixtures.filter(f=>f.away).every(f=>f.knockoutWinner && f.penaltyHome!==f.penaltyAway)'));
});
test('knockout respects a non-power-of-two qualification target without awarding a false champion',()=>{
 const {run}=regularCupSetup(6,false,3);run("for(let i=0;i<6 && gameState.activePhases.cupko_2026;i++){gameState.fixtures.filter(f=>!f.played).forEach(f=>{f.homeScore=1;f.awayScore=0;f.played=true});processPhaseEnd('cup',gameState.activePhases.cupko_2026);gameState.currentWeek++;}");assert.equal(run('gameState.cupFinished'),1);assert.equal(run('gameState.fixtures.filter(f=>f.away).length'),3);assert.equal(run('gameState.history.length'),0);
});
test('single participant knockout completes once and registers the phase winner',()=>{
 const {run}=regularCupSetup(1);run("const active=gameState.activePhases.cupko_2026;processPhaseEnd('cup',active);processPhaseEnd('cup',active)");assert.equal(run('gameState.cupFinished'),1);assert.equal(run('gameState.history.length'),1);
});

test('a completed knockout qualification phase passes only its survivors to the next phase',()=>{
 const {run}=regularCupSetup(8,false,4);run("gameState.stages.cup[0].phases.push({id:'cupfinal',type:'KNOCKOUT',twoLegs:true,awardsTitle:true});gameState.fixtures.forEach(f=>{f.homeScore=1;f.awayScore=0;f.played=true});const winners=gameState.fixtures.map(f=>f.home);processPhaseEnd('cup',gameState.activePhases.cupko_2026)");
 assert.equal(run('gameState.activePhases.cupko_2026'),undefined);assert.equal(run('gameState.fixtures.filter(f=>f.compId==="cupfinal").length'),4);assert(run('gameState.fixtures.filter(f=>f.compId==="cupfinal").every(f=>winners.includes(f.home) && winners.includes(f.away))'));
});

test('league and group phases award their configured trophy once before progressing',()=>{
 for(const type of ['LEAGUE','GROUPS']){const {run}=setup();run(`const stage=gameState.stages.upper[0];stage.phases[0].type=${JSON.stringify(type)};stage.phases[0].awardsTitle=true;advanceToNextStageOrSeason=()=>{};const active={stageIndex:0,phaseIndex:0,phaseId:'upperphase',season:2026};processPhaseEnd('upper',active);processPhaseEnd('upper',active);awardPhaseTrophy('upper',stage,stage.phases[0],2026,'upper1');`);assert.equal(run('gameState.titles.upper1.upper'),1);assert.equal(run('gameState.history.length'),1);assert.equal(run('gameState.history[0].phaseId'),'upperphase');}
});
test('knockout results include injected teams in annual standings exactly once',()=>{
 const {run}=regularCupSetup(4);run("const f=gameState.fixtures[0];f.homeScore=2;f.awayScore=1;f.played=true;applyMatchResultToTables(f);applyMatchResultToTables(f)");assert.equal(run('gameState.globalStandings[2026].cup[f.home].pts'),3);assert.equal(run('gameState.globalStandings[2026].cup[f.home].played'),1);assert.equal(run('gameState.globalStandings[2026].cup[f.away].gf'),1);
});
test('excluded knockout results stay out of the aggregate even after the phase is no longer active',()=>{
 const {run}=regularCupSetup(4);run("gameState.stages.cup[0].phases[0].countsToAggregatedTable=false;delete gameState.activePhases.cupko_2026;const f=gameState.fixtures[0];f.homeScore=3;f.awayScore=0;f.played=true;applyMatchResultToTables(f)");assert.equal(run('gameState.globalStandings[2026]?.cup'),undefined);
});
test('champion and runner-up lead the final aggregate without changing points or goals',()=>{
 const {run}=regularCupSetup(4,true);run("gameState.stages.cup[0].phases[0].name='Decisão';for(let round=0;round<2;round++){for(const f of gameState.fixtures.filter(f=>!f.played)){f.homeScore=1;f.awayScore=0;f.played=true;applyMatchResultToTables(f)}processPhaseEnd('cup',gameState.activePhases.cupko_2026);gameState.currentWeek+=2;}const table=gameState.globalStandings[2026].cup;const champion=gameState.history[0].teamId;const runner=Object.keys(table).find(id=>table[id].competitionPlace===2);const eliminated=Object.keys(table).find(id=>!table[id].competitionPlace);table[eliminated].pts=99;const points=table[champion].pts;const order=rankMovementTable(table)");assert.equal(run('order[0]'),run('champion'));assert.equal(run('order[1]'),run('runner'));assert.equal(run('table[champion].pts'),run('points'));assert.equal(run('table[eliminated].pts'),99);assert.equal(run('gameState.titles[champion].cup'),1);assert.match(run("phaseTable({table},Object.keys(table),2026)"),/Vice-campeão/);
});

test('accrued payroll is debited only at season closure, once, and survives serialization',()=>{
 const {run}=tradingSetup();run("gameState.currentDate=new Date(2026,0,1);gameState.currentWeek=1;gameState.mySquad[0].salary='43.45 mil';processPlayerWeek();gameState.currentWeek++;processPlayerWeek();gameState.payrollAccrued=JSON.parse(JSON.stringify(gameState.payrollAccrued))");assert.equal(run('Number(gameState.teamMap.upper1.budget)'),10);
 run("advanceToNextStageOrSeason('upper',0,2026);advanceToNextStageOrSeason('lower',0,2026);finalizeCareerSeasons();finalizeCareerSeasons();paySeasonPayroll('upper1',2026)");assert.equal(run('Number(gameState.teamMap.upper1.budget)'),9.98);assert.equal(run("gameState.inbox.filter(m=>m.id==='payroll-2026').length"),1);
});
test('competition seasons exclude prepared future tables and future fixtures until kickoff week',()=>{
 const {run}=setup();run("gameState.currentWeek=5;gameState.startedCompetitionSeasons={[movementKey('upper',2026)]:0,[movementKey('upper',2027)]:20};initGlobalStandings('upper',2027);gameState.fixtures=[{baseCompId:'upper',season:2027,globalWeek:20,played:false}]");assert.deepEqual(json(run("startedCompetitionSeasons('upper')")),[2026]);run('gameState.currentWeek=20');assert.deepEqual(json(run("startedCompetitionSeasons('upper')")),[2027,2026]);
});
test('not-started competition renders a disabled season selector and no future data',()=>{
 const {run}=setup();run("gameState.globalStandings={};competitionView.country='br';competitionView.comp='upper';gameState.countrySeason.upper=2030");const html=run('renderCompetitionCenter()');assert.match(html,/select disabled/);assert.match(html,/Ainda não iniciada/);assert.doesNotMatch(html,/>2030<|PTS/);
});
test('energy colors have exact red yellow green boundaries',()=>{
 const {run}=setup();assert.deepEqual(json(run('[0,39,40,69,70,100].map(energyClass)')),['energy-low','energy-low','energy-medium','energy-medium','energy-high','energy-high']);
});

test('CPU lineup displays the current manager after a managerial change',()=>{
 const {run}=setup();run("const modal={innerHTML:''};document.getElementById=()=>modal;gameState.teamMap.upper2.managerName='Novo Técnico';showCpuLineup('upper2')");assert.match(run('modal.innerHTML'),/Técnico atual: <strong>Novo Técnico/);run("gameState.teamMap.upper2.managerName='Outro Técnico';showCpuLineup('upper2')");assert.match(run('modal.innerHTML'),/Outro Técnico/);
});
