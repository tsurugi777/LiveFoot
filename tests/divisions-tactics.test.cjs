const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
function load() {
    const context = vm.createContext({console, Date, Number, Set});
    for (const file of ['gameState.js', 'people.js','formations.js', 'divisions.js', 'tactics.js', 'career.js','player-development.js','utils.js']) {
        vm.runInContext(fs.readFileSync(path.join(__dirname, '../js', file), 'utf8'), context);
    }
    vm.runInContext(`let db = {
        countries: [{id:'br'}, {id:'pt'}],
        competitions: [{id:'a', countryId:'br'}, {id:'b', countryId:'br'}, {id:'p', countryId:'pt'}],
        teams: [{id:'1',compId:'a'}, {id:'2',compId:'a'}, {id:'3',compId:'p'}]
    }; function renderClassicHub() {}`, context);
    return code => vm.runInContext(code, context);
}
const plain = result => JSON.parse(JSON.stringify(result));
test('legacy databases acquire country divisions without changing original memberships', () => {
    const run = load(); run('normalizeDivisions()');
    assert.deepEqual(plain(run("getCompetitionTeams('a').map(t=>t.id)")), ['1','2']);
    assert.deepEqual(plain(run("getCompetitionTeams('b').map(t=>t.id)")), []);
    assert.equal(run('db.teams[0].countryId'), 'br');
});
test('division participants are isolated by country, and base competition follows the club', () => {
    const run = load(); run(`normalizeDivisions(); db.countries[0].divisions.push({id:'second',name:'Série B'});
        db.teams[1].divisionId='second'; db.competitions[0].divisionId='division-1'; db.competitions[1].divisionId='second';`);
    assert.deepEqual(plain(run("getCompetitionTeams('a').map(t=>t.id)")), ['1']);
    assert.deepEqual(plain(run("getCompetitionTeams('b').map(t=>t.id)")), ['2']);
    assert.equal(run('getTeamBaseCompetition(db.teams[1])'), 'b');
    assert.equal(run('db.teams[1].compId'), 'a');
});
test('child competitions inherit a parent division, with a local override', () => {
    const run = load(); run(`normalizeDivisions(); db.competitions[0].divisionId='division-1';
      db.competitions[1].parentId='a'; db.teams[1].divisionId='second';`);
    assert.deepEqual(plain(run("getCompetitionTeams('b').map(t=>t.id)")), ['1']);
    run("db.competitions[1].divisionId='second'");
    assert.deepEqual(plain(run("getCompetitionTeams('b').map(t=>t.id)")), ['2']);
});
test('field regions distinguish goalkeeper, defensive, midfield and attacking roles', () => {
    const run=load();
    const regions=[[50,85,'GO'],[15,70,'LE'],[85,70,'LD'],[50,70,'ZC'],[50,55,'VOL'],[50,45,'MLG'],[15,45,'MLE'],[85,45,'MLD'],[50,30,'MAT'],[15,20,'PTE'],[85,20,'PTD'],[50,15,'CA']];
    for (const [x,y,role] of regions) assert.equal(run(`getRoleAtPosition(${x},${y})`),role);
});
test('moving a slot changes the effective rating but preserves the natural role and formation template', () => {
    const run=load();run(`gameState.playerTeamId='1'; gameState.teamMap['1']={rating:80};
        gameState.mySquad=[{id:'striker',pos:'CA',ovr:80}];gameState.myLineup.starters=Array(9).fill(null).concat('striker');`);
    assert.equal(run("getEffectiveTeamRating('1')"),80);
    run('moveTacticsPlayer(9,50,70)');
    assert.equal(run("getEffectiveTeamRating('1')"),65);
    assert.equal(run('gameState.mySquad[0].pos'),'CA');
    assert.equal(run("formationsDB['4-4-2'][9].top"),'20%');
    assert.equal(run('getTacticsPositions()[9].role'),'ZC');
    run('resetTacticsPositions()');assert.equal(run('getTacticsPositions()[9].role'),'CA');
});
test('custom coordinates survive JSON saves; missing or invalid coordinates recover safely', () => {
    const run=load();run('moveTacticsPlayer(3,15,20);gameState.myLineup=JSON.parse(JSON.stringify(gameState.myLineup))');
    assert.equal(run('getTacticsPositions()[3].role'),'PTE');
    run("gameState.myLineup.positions[3]={left:'invalid',top:'NaN'}");
    assert.equal(run('getTacticsPositions()[3].role'),'LE');
    run('delete gameState.myLineup.positions');assert.equal(run('getTacticsPositions().length'),11);
});
