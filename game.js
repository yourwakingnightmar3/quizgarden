// ---- Settings ----
// Paste your Cloudflare Worker URL here (see worker.js). Leave empty to use sample questions only.
const API_URL = "";

const SAMPLE = [
  {q:"Which pigment captures light energy in plants?",a:"Chlorophyll"},
  {q:"Which gas do plants take in for photosynthesis?",a:"Carbon dioxide"},
  {q:"Which gas do plants release during photosynthesis?",a:"Oxygen"},
  {q:"Where in the cell does photosynthesis happen?",a:"Chloroplast"},
  {q:"What sugar do plants make from light?",a:"Glucose"},
  {q:"What tiny leaf openings let gases move in and out?",a:"Stomata"},
  {q:"What do roots mainly absorb from soil?",a:"Water"},
  {q:"What kind of energy powers photosynthesis?",a:"Sunlight"}];

// ---- Pixel art made from text (8x8) ----
const pix=(rows,pal)=>{let r="";rows.forEach((row,y)=>[...row].forEach((c,x)=>{if(pal[c])r+=`<rect x="${x}" y="${y}" width="1" height="1" fill="${pal[c]}"/>`}));
  return "data:image/svg+xml,"+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8" shape-rendering="crispEdges">${r}</svg>`)};
const PAL={g:"#5cc46a",G:"#2f8f4e",b:"#7a5238",p:"#ff8fb8",y:"#ffd84d"};
const SPROUT=pix(["..gg.gg.","..gGggG.",".gGG.GGg","..gGGg..","...GG...","...GG...","..bbbb..",".bbbbbb."],PAL);
const FLOWER=pix(["..pppp..",".ppyypp.",".ppyypp.","..pppp..","...GG...","..GGG...","...GG...","..bbbb.."],PAL);

// ---- State ----
const $=s=>document.querySelector(s);
const character=$(".character"), map=$(".map");
let x=64,y=100,speed=1,held_directions=[];
const LET=["A","B","C","D"], POT_X=[8,44,80,116], POT_Y=6, PLANT_X=[10,48,86,124];
let game=null,pool=[],used=0,score=0,round=0;
const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const setStatus=t=>$("#status").textContent=t;
const u=n=>`calc(var(--pixel-size) * ${n})`;

// ---- Game rounds ----
function startGame(pairs){pool=shuffle(pairs);used=0;score=0;round=0;newRound()}

function newRound(){
  document.querySelectorAll(".mpot,.plant,.carry").forEach(e=>e.remove());
  if(used+4>pool.length){pool=shuffle(pool);used=0}
  const pairs=pool.slice(used,used+4);used+=4;round++;
  const slots=shuffle([0,1,2,3]);
  game={pairs,solved:[],carry:null,carryEl:null,
    pots:pairs.map((p,i)=>({i,x:POT_X[i],y:POT_Y})),
    plants:pairs.map((p,i)=>{const s=slots.indexOf(i);return {id:i,a:p.a,x:PLANT_X[s],y:62+(s%2)*26,gone:false}})};
  game.pots.forEach(p=>{const e=document.createElement("div");e.className="mpot";e.style.left=u(p.x);e.style.top=u(p.y);e.innerHTML=`<b>${LET[p.i]}</b>`;map.appendChild(e);p.el=e});
  game.plants.forEach(p=>{const e=document.createElement("div");e.className="plant";e.style.left=u(p.x);e.style.top=u(p.y);e.innerHTML=`<img src="${SPROUT}" alt=""><span class="tag">${esc(p.a)}</span>`;map.appendChild(e);p.el=e});
  x=64;y=100;$("#next").hidden=true;renderPanel();
  setStatus("Walk into a plant to pick it up.");
}

function renderPanel(){
  $("#qs").innerHTML=game.pairs.map((p,i)=>`<li class="${game.solved.includes(i)?"done":""}"><span class="b">${LET[i]}</span><span>${esc(p.q)}<span class="ans">${esc(p.a)}</span></span></li>`).join("");
  $("#round").textContent="Round "+round;$("#score").textContent="Plants grown: "+score;
}

function checkHits(){
  const cx=x+16,cy=y+22;
  if(!game.carry){
    for(const p of game.plants){
      if(p.gone)continue;
      if(Math.hypot(cx-(p.x+8),cy-(p.y+8))<14){
        p.gone=true;p.el.style.display="none";game.carry=p;
        const c=document.createElement("img");c.className="carry";c.src=SPROUT;c.alt="";map.appendChild(c);game.carryEl=c;
        setStatus("Carrying: "+p.a+". Which pot does it answer?");break;
      }
    }
  }else{
    for(const pot of game.pots){
      if(game.solved.includes(pot.i))continue;
      if(Math.hypot(cx-(pot.x+12),cy-(pot.y+14))<16){
        const p=game.carry;game.carry=null;game.carryEl.remove();game.carryEl=null;
        if(p.id===pot.i){
          game.solved.push(pot.i);score++;
          pot.el.insertAdjacentHTML("beforeend",`<img src="${FLOWER}" alt="">`);
          setStatus("Yes! "+p.a+" fits pot "+LET[pot.i]+".");
          if(game.solved.length===4){setStatus("Round complete! Your garden is blooming.");$("#next").hidden=false}
        }else{
          p.gone=false;p.el.style.display="";
          setStatus("Not pot "+LET[pot.i]+". The plant went back. Try another pot.");
        }
        renderPanel();break;
      }
    }
  }
}

// ---- Movement (your original loop, plus game checks) ----
const directions={up:"up",down:"down",left:"left",right:"right"};
const keys={ArrowUp:"up",w:"up",ArrowLeft:"left",a:"left",ArrowRight:"right",d:"right",ArrowDown:"down",s:"down"};

const placeCharacter=()=>{
  const pixelSize=parseInt(getComputedStyle(document.documentElement).getPropertyValue("--pixel-size"));
  const held=held_directions[0];
  if(held){
    if(held===directions.right)x+=speed;
    if(held===directions.left)x-=speed;
    if(held===directions.down)y+=speed;
    if(held===directions.up)y-=speed;
    character.setAttribute("facing",held);
  }
  character.setAttribute("walking",held?"true":"false");
  const leftLimit=-8,rightLimit=16*8+8,topLimit=-7,bottomLimit=16*7;
  if(x<leftLimit)x=leftLimit;if(x>rightLimit)x=rightLimit;
  if(y<topLimit)y=topLimit;if(y>bottomLimit)y=bottomLimit;
  character.style.transform=`translate3d(${x*pixelSize}px,${y*pixelSize}px,0)`;
  if(game){
    checkHits();
    if(game.carryEl){game.carryEl.style.left=u(x+10);game.carryEl.style.top=u(y-2)}
  }
};
const step=()=>{placeCharacter();requestAnimationFrame(step)};
step();

document.addEventListener("keydown",e=>{
  if(e.target.tagName==="TEXTAREA")return;
  const dir=keys[e.key];
  if(dir){e.preventDefault();if(held_directions.indexOf(dir)===-1)held_directions.unshift(dir)}
});
document.addEventListener("keyup",e=>{
  const i=held_directions.indexOf(keys[e.key]);
  if(i>-1)held_directions.splice(i,1);
});

// ---- Question generation ----
async function generate(){
  const notes=$("#notes").value.trim();
  if(notes.length<80){setStatus("Add a few more sentences of notes first (at least 80 characters).");return}
  if(!API_URL){setStatus("No AI connection set up yet, so these are the sample questions.");startGame(SAMPLE);return}
  $("#gen").disabled=true;setStatus("Making your questions...");
  try{
    const r=await fetch(API_URL,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({notes})});
    const data=await r.json();
    const pairs=(data.pairs||[]).filter(p=>p&&p.q&&p.a);
    if(!r.ok||pairs.length<4)throw new Error("bad response");
    startGame(pairs.slice(0,8));
  }catch(err){setStatus("Couldn't make questions this time. Try again or use the sample notes.")}
  finally{$("#gen").disabled=false}
}
$("#gen").addEventListener("click",generate);
$("#demo").addEventListener("click",()=>startGame(SAMPLE));
$("#next").addEventListener("click",newRound);

/* BONUS! Dpad functionality for mouse and touch */
var isPressed = false;
const removePressedAll = () => {
   document.querySelectorAll(".dpad-button").forEach(d => {
      d.classList.remove("pressed")
   })
}
document.body.addEventListener("mousedown", () => {
   console.log('mouse is down')
   isPressed = true;
})
document.body.addEventListener("mouseup", () => {
   console.log('mouse is up')
   isPressed = false;
   held_directions = [];
   removePressedAll();
})
const handleDpadPress = (direction, click) => {   
   if (click) {
      isPressed = true;
   }
   held_directions = (isPressed) ? [direction] : []
   
   if (isPressed) {
      removePressedAll();
      document.querySelector(".dpad-"+direction).classList.add("pressed");
   }
}
//Bind a ton of events for the dpad
document.querySelector(".dpad-left").addEventListener("touchstart", (e) => handleDpadPress(directions.left, true));
document.querySelector(".dpad-up").addEventListener("touchstart", (e) => handleDpadPress(directions.up, true));
document.querySelector(".dpad-right").addEventListener("touchstart", (e) => handleDpadPress(directions.right, true));
document.querySelector(".dpad-down").addEventListener("touchstart", (e) => handleDpadPress(directions.down, true));

document.querySelector(".dpad-left").addEventListener("mousedown", (e) => handleDpadPress(directions.left, true));
document.querySelector(".dpad-up").addEventListener("mousedown", (e) => handleDpadPress(directions.up, true));
document.querySelector(".dpad-right").addEventListener("mousedown", (e) => handleDpadPress(directions.right, true));
document.querySelector(".dpad-down").addEventListener("mousedown", (e) => handleDpadPress(directions.down, true));

document.querySelector(".dpad-left").addEventListener("mouseover", (e) => handleDpadPress(directions.left));
document.querySelector(".dpad-up").addEventListener("mouseover", (e) => handleDpadPress(directions.up));
document.querySelector(".dpad-right").addEventListener("mouseover", (e) => handleDpadPress(directions.right));
document.querySelector(".dpad-down").addEventListener("mouseover", (e) => handleDpadPress(directions.down));