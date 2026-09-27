function teamIdFromLink(value){
 let url;try{url=new URL(value);}catch{throw Error('Cole um link válido do time no Sofascore.');}
 if(url.protocol!=='https:' || !['www.sofascore.com','sofascore.com'].includes(url.hostname) || url.port || url.username || url.password)throw Error('Use um link HTTPS de time do Sofascore.');
 const match=url.pathname.match(/\/(?:football\/team|team\/football|time\/futebol)\/[^/]+\/(\d+)\/?$/);
 if(!match || !Number.isSafeInteger(Number(match[1])))throw Error('O link deve ser de um time de futebol, não de uma partida ou jogador.');return match[1];
}
async function readSofa(path){
 const response=await fetch('https://www.sofascore.com/api/v1/'+path,{headers:{Accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(12000)});
 if(!response.ok){const error=Error([403,429].includes(response.status)?'O Sofascore bloqueou ou limitou a consulta. Tente novamente mais tarde.':'Não foi possível consultar esse time no Sofascore.');error.code=response.status===403?'UPSTREAM_BLOCKED':response.status===429?'UPSTREAM_RATE_LIMIT':'UPSTREAM_ERROR';throw error;}
 return response.json();
}
async function handler(req,res){
 if(req.method!=='GET')return res.status(405).json({error:'Método não permitido.'});
 let id;try{id=teamIdFromLink(req.query.url);}catch(e){return res.status(400).json({error:e.message});}
 try{
  const [info,roster]=await Promise.all([readSofa('team/'+id),readSofa('team/'+id+'/players')]);
  if(!info.team?.name || (info.team.sport?.slug && info.team.sport.slug!=='football'))return res.status(422).json({error:'Time de futebol não encontrado.'});
  if(!Array.isArray(roster.players))throw Error('O Sofascore não disponibilizou o elenco deste time.');
  const t=info.team;
  const team={id:Number(id),name:t.name,country:t.country?.name || '',managerName:t.manager?.name || '',stadium:t.venue?.stadium?.name || t.venue?.name || '',stadiumCapacity:t.venue?.stadium?.capacity || t.venue?.capacity || null,logoUrl:`https://www.sofascore.com/api/v1/team/${id}/image`};
  const players=roster.players.slice(0,100).map(entry=>entry.player).filter(p=>p?.name && Number.isSafeInteger(p.id)).map(p=>({id:p.id,name:p.name,position:p.position,country:p.country?.name,dateOfBirthTimestamp:p.dateOfBirthTimestamp,contractUntilTimestamp:p.contractUntilTimestamp,preferredFoot:p.preferredFoot,photoUrl:`https://www.sofascore.com/api/v1/player/${p.id}/image`}));
  if(!players.length)return res.status(422).json({error:'Nenhum jogador disponível para importar.'});
  res.setHeader('Cache-Control','private, max-age=60');return res.status(200).json({team,players});
 }catch(e){return res.status(502).json({code:e.code || (e.name==='TimeoutError'?'UPSTREAM_TIMEOUT':'UPSTREAM_NETWORK'),error:e.message?.includes('Sofascore')?e.message:e.name==='TimeoutError'?'O Sofascore demorou para responder. Tente novamente.':'O servidor do jogo não conseguiu se conectar ao Sofascore. Tente novamente mais tarde.'});}
}
module.exports=handler;module.exports.teamIdFromLink=teamIdFromLink;
