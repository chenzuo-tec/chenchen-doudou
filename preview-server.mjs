import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
const root = process.cwd();
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8'};
const allowed = new Set(['/index.html','/anniversaries.html','/wishes.html','/cupid.html','/style.css','/app.js','/core.js']);
http.createServer(async(req,res) => {
  const path = new URL(req.url,'http://localhost').pathname;
  const file = path === '/' ? '/index.html' : path;
  if(!allowed.has(file)) { res.writeHead(404); res.end('Not found'); return; }
  try {const body = await readFile(resolve(root,file.slice(1))); res.writeHead(200,{'Content-Type':types[extname(file)]});res.end(body);} catch {res.writeHead(500);res.end('Unable to serve file');}
}).listen(Number(process.env.PORT || 8000),'127.0.0.1',()=>console.log(`Preview: http://127.0.0.1:${process.env.PORT || 8000}`));
