// Local static hosting and the same import endpoint deployed on Vercel.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const importTeam=require('./api/sofascore');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2','.woff':'font/woff','.ttf':'font/ttf'};
function createServer(){return http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/api/sofascore'){
  req.query=Object.fromEntries(url.searchParams);res.status=code=>{res.statusCode=code;return res};res.json=data=>{res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(data));return res};
  try{await importTeam(req,res);}catch{res.status(500).json({error:'Erro no servidor de importação.'});}return;
 }
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405).end();return;}
 let relative;try{relative=decodeURIComponent(url.pathname).replace(/^\//,'') || 'index.html';}catch{res.writeHead(400).end();return;}
 const file=path.resolve(__dirname,relative);
 if((relative!=='index.html' && !/^(js|css|assets)\//.test(relative)) || !file.startsWith(__dirname+path.sep) || relative.split('/').includes('..')){res.writeHead(404).end();return;}
 try{const stat=await fs.promises.stat(file);if(!stat.isFile())throw Error();res.setHeader('Content-Type',types[path.extname(file)] || 'application/octet-stream');if(req.method==='HEAD')res.end();else fs.createReadStream(file).pipe(res);}catch{res.writeHead(404).end();}
});}
if(require.main===module)createServer().listen(Number(process.env.PORT)||3000,'127.0.0.1',()=>console.log('LiveFoot: http://localhost:'+(process.env.PORT || 3000)));
module.exports={createServer};
