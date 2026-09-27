import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express(); app.use(cors());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
const PORT = process.env.PORT || 3001;

const questions = [
 {q:'Which planet is known as the Red Planet?',a:['Venus','Mars','Jupiter','Mercury'],correct:1},
 {q:'What does SQL stand for?',a:['Structured Query Language','Simple Question Language','System Query Logic','Sequential Query List'],correct:0},
 {q:'Which data structure uses FIFO order?',a:['Stack','Tree','Queue','Graph'],correct:2},
 {q:'What is 15 × 6?',a:['80','90','96','105'],correct:1},
 {q:'Which language is primarily used to style web pages?',a:['HTML','Python','CSS','SQL'],correct:2},
 {q:'Which ocean is the largest?',a:['Atlantic','Indian','Arctic','Pacific'],correct:3},
 {q:'What is the capital of Japan?',a:['Seoul','Tokyo','Kyoto','Osaka'],correct:1},
 {q:'Which company created Android?',a:['Microsoft','Apple','Google','IBM'],correct:2},
 {q:'How many bits are in one byte?',a:['4','8','16','32'],correct:1},
 {q:'Which tool is commonly used for data visualization?',a:['Power BI','Git','npm','Docker'],correct:0}
];
const rooms = new Map();
const code = () => Math.random().toString(36).slice(2,8).toUpperCase().padEnd(6,'0');
function publicRoom(r){ return {code:r.code,players:[...r.players.values()].map(p=>({id:p.id,name:p.name,score:p.score})),started:r.started,round:r.round,total:r.total}; }
function broadcast(r){ io.to(r.code).emit('state', publicRoom(r)); }
function startRound(r){
 r.answered.clear(); r.roundStarted=Date.now();
 const q=questions[r.questionIndexes[r.round]];
 io.to(r.code).emit('question',{round:r.round,total:r.total,q:q.q,answers:q.a,time:15});
 clearTimeout(r.timer); r.timer=setTimeout(()=>endRound(r),15000);
}
function endRound(r){
 if(!rooms.has(r.code)) return;
 clearTimeout(r.timer); r.players.forEach(p=>{ if(!r.answered.has(p.id)) p.last='No answer'; });
 io.to(r.code).emit('roundEnd',{scores:[...r.players.values()].map(p=>({name:p.name,score:p.score}))});
 setTimeout(()=>{ if(!rooms.has(r.code)) return; if(r.round+1>=r.total){r.started=false;io.to(r.code).emit('gameOver',{scores:[...r.players.values()].sort((a,b)=>b.score-a.score).map(p=>({name:p.name,score:p.score}))});broadcast(r);} else {r.round++;startRound(r);broadcast(r);} },2500);
}
io.on('connection', socket=>{
 socket.on('create',({name})=>{ let c=code(); while(rooms.has(c)) c=code(); const r={code:c,players:new Map(),started:false,round:0,total:5,questionIndexes:[...Array(questions.length).keys()].sort(()=>Math.random()-.5).slice(0,5),answered:new Map(),timer:null}; rooms.set(c,r); r.players.set(socket.id,{id:socket.id,name:(name||'Player').slice(0,20),score:0}); socket.join(c); socket.data.room=c; socket.emit('joined',{code:c,host:true}); broadcast(r); });
 socket.on('join',({code,name})=>{const r=rooms.get((code||'').toUpperCase()); if(!r)return socket.emit('errorMsg','Room not found.'); if(r.started)return socket.emit('errorMsg','Game already started.'); if(r.players.size>=8)return socket.emit('errorMsg','Room is full.'); r.players.set(socket.id,{id:socket.id,name:(name||'Player').slice(0,20),score:0});socket.join(r.code);socket.data.room=r.code;socket.emit('joined',{code:r.code,host:false});broadcast(r);});
 socket.on('start',()=>{const r=rooms.get(socket.data.room);if(!r||r.started)return;if([...r.players.keys()][0]!==socket.id)return socket.emit('errorMsg','Only the host can start.');if(r.players.size<2)return socket.emit('errorMsg','At least 2 players are required.');r.started=true;r.round=0;r.players.forEach(p=>p.score=0);broadcast(r);startRound(r);});
 socket.on('answer',({index})=>{const r=rooms.get(socket.data.room);if(!r||!r.started||r.answered.has(socket.id))return;const p=r.players.get(socket.id);const q=questions[r.questionIndexes[r.round]];const elapsed=(Date.now()-r.roundStarted)/1000;if(Number(index)===q.correct){p.score+=Math.max(100,1000-Math.floor(elapsed*60));p.last='Correct';}else p.last='Wrong';r.answered.set(socket.id,true);socket.emit('answerResult',{correct:Number(index)===q.correct});if(r.answered.size===r.players.size)endRound(r);broadcast(r);});
 socket.on('disconnect',()=>{const c=socket.data.room,r=rooms.get(c);if(!r)return;r.players.delete(socket.id);r.answered.delete(socket.id);if(r.players.size===0){clearTimeout(r.timer);rooms.delete(c);}else broadcast(r);});
});
app.get('/health',(_,res)=>res.json({ok:true}));
const dist=path.resolve(__dirname,'../client/dist'); app.use(express.static(dist)); app.get('*',(req,res)=>{if(req.path.startsWith('/socket.io'))return;res.sendFile(path.join(dist,'index.html'));});
server.listen(PORT,()=>console.log(`Battle Quiz server on ${PORT}`));
