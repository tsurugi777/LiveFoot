const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const handler=require('../api/sofascore'),parse=handler.teamIdFromLink;
test('Sofascore links accept localized current and legacy team paths only',()=>{
 for(const path of ['/pt/football/team/palmeiras/1963','/football/team/palmeiras/1963','/pt/time/futebol/palmeiras/1963','/team/football/palmeiras/1963'])assert.equal(parse('https://www.sofascore.com'+path),'1963');
 for(const url of ['http://sofascore.com/football/team/a/1','https://evil.com/football/team/a/1','https://sofascore.com@evil.com/football/team/a/1','https://www.sofascore.com/football/player/a/1','https://www.sofascore.com:4433/football/team/a/1'])assert.throws(()=>parse(url));
});
test('import endpoint returns explicit upstream blocking and validates payloads',async()=>{
 const original=global.fetch;const res={status(s){this.code=s;return this},json(j){this.body=j;return this},setHeader(){}};
 try{global.fetch=async()=>({ok:false,status:403});await handler({method:'GET',query:{url:'https://www.sofascore.com/football/team/a/1'}},res);assert.equal(res.code,502);assert.match(res.body.error,/bloqueou/);
 global.fetch=async url=>({ok:true,json:async()=>url.endsWith('/players')?{players:[{player:{id:2,name:'Atleta',position:'G'}}]}:{team:{name:'Clube',sport:{slug:'football'},manager:{name:'Técnico'}}}});await handler({method:'GET',query:{url:'https://www.sofascore.com/football/team/a/1'}},res);assert.equal(res.code,200);assert.equal(res.body.players[0].name,'Atleta');assert.equal(res.body.team.managerName,'Técnico');
 }finally{global.fetch=original;}
});
function context(){const c=vm.createContext({console,Date,Number,db:{countries:[],competitions:[],teams:[]},normalizeDivisions(){},personPhoto:p=>p || 'generic'});vm.runInContext(fs.readFileSync('js/sofascore-import.js','utf8'),c);return code=>vm.runInContext(code,c);}
test('import creates a playable database entry and updates the same source team without duplication',()=>{
 const run=context();run("const data={team:{id:1,name:'Clube',country:'Brazil'},players:[{id:2,name:'Atleta',position:'G'}]};commitSofascoreTeam(data,'',70);commitSofascoreTeam(data,'',75)");assert.equal(run('db.teams.length'),1);assert.equal(run('db.competitions.length'),1);assert.equal(run('db.teams[0].importedPlayers[0].pos'),'GO');assert.equal(run('db.teams[0].rating'),75);assert.equal(run('db.competitions[0].phases[0].type'),'LEAGUE');
});
test('import validates destination and overall before modifying database',()=>{const run=context();run("const data={team:{id:1,name:'Clube'},players:[{id:2,name:'Atleta'}]}");assert.throws(()=>run("commitSofascoreTeam(data,'missing',70)"));assert.throws(()=>run("commitSofascoreTeam(data,'',150)"));assert.equal(run('db.teams.length'),0);assert.equal(run('db.countries.length'),0);});

test('frontend distinguishes local files, connection failures, missing function and upstream blocking',async()=>{
 const c=vm.createContext({location:{protocol:'file:'},navigator:{onLine:true},AbortController,setTimeout,clearTimeout,fetch:async()=>{throw TypeError('Failed to fetch')}});
 vm.runInContext(fs.readFileSync('js/sofascore-import.js','utf8'),c);
 await assert.rejects(vm.runInContext("requestSofascoreImport('https://www.sofascore.com/football/team/a/1')",c),/HTML diretamente/);
 c.location.protocol='https:';await assert.rejects(vm.runInContext("requestSofascoreImport('link')",c),/conectar à função/);
 c.fetch=async()=>({status:200,headers:{get:()=> 'text/html'}});await assert.rejects(vm.runInContext("requestSofascoreImport('link')",c),/não está disponível/);
 c.fetch=async()=>({status:502,ok:false,headers:{get:()=> 'application/json'},json:async()=>({error:'O Sofascore bloqueou a consulta.'})});await assert.rejects(vm.runInContext("requestSofascoreImport('link')",c),/Sofascore bloqueou/);
 c.fetch=async()=>({status:200,ok:true,headers:{get:()=> 'application/json'},json:async()=>({team:{name:'Clube'}})});assert.equal((await vm.runInContext("requestSofascoreImport('link')",c)).team.name,'Clube');
});
test('local server serves the app and routes import validation to JSON without exposing server files',async()=>{
 const {createServer}=require('../server.cjs'),http=require('node:http'),server=createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const get=route=>new Promise((resolve,reject)=>http.get({host:'127.0.0.1',port:server.address().port,path:route},res=>{let body='';res.on('data',d=>body+=d);res.on('end',()=>resolve({code:res.statusCode,type:res.headers['content-type'],body}));}).on('error',reject));
 try{assert.equal((await get('/')).code,200);const bad=await get('/api/sofascore?url=invalid');assert.equal(bad.code,400);assert.match(bad.type,/json/);assert(JSON.parse(bad.body).error);assert.equal((await get('/server.cjs')).code,404);assert.equal((await get('/js/%2e%2e/server.cjs')).code,404);}finally{await new Promise(resolve=>server.close(resolve));}
});
