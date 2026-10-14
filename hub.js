const pix=(rows,pal)=>{const h=rows.length,w=rows[0].length;let r="";rows.forEach((row,y)=>[...row].forEach((c,x)=>{if(pal[c])r+=`<rect x="${x}" y="${y}" width="1" height="1" fill="${pal[c]}"/>`}));
  return "data:image/svg+xml,"+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges">${r}</svg>`)};

  const P={g:"#5cc46a",G:"#2f8f4e",b:"#7a5238",p:"#ff8fb8",y:"#ffd84d",n:"#6b6fd6",w:"#ffffff",l:"#9fa7e4",c:"#434343",k:"#e8465a"};

  const S={
 sprout:pix(["..gg.gg.","..gGggG.",".gGG.GGg","..gGGg..","...GG...","...GG...","..bbbb..",".bbbbbb."],P),
 flower:pix(["..pppp..",".ppyypp.",".ppyypp.","..pppp..","...GG...","..GGG...","...GG...","..bbbb.."],P),
 mound:pix(["........","........","........","........","...gg...","..gGGg..","..bbbb..",".bbbbbb."],P),
 leaf:pix(["........","....gg..","..gggGg.",".ggggGgg","gggGGgg.",".gGGgg..","GGgg....","G......."],P),
 notebook:pix([".nnnnnn.","nwwwwwwn","nwllllwn","nwwwwwwn","nwllllwn","nwwwwwwn","nwllwwwn",".nnnnnn."],P),
 pot:pix([
    ".cccccccc.",
    "cbbbbbbbbc",
    "cbbccccbbc",
    ".cbbbbbbc.",
    ".cbbbbbbc.",
    ".cbbbbbbc.",
    "..cbbbbc..",
    "..cbbbbc..",
    "...cccc..."
], P),
 clock:pix(["..cccc..",".cwwwwc.","cwwwkwwc","cwwwkwwc","cwwkkwwc","cwwwwwwc",".cwwwwc.","..cccc.."],P),
 cloud:pix(["...wwww.....",".wwwwwwwww..","wwwwwwwwwwww","wwwwwwwwwwww",".wwwwwwwwww."],P)};
document.querySelectorAll("img[data-s]").forEach(i=>i.src=S[i.dataset.s]);

// Title letters pop in one by one
const t=document.getElementById("title"),word=t.textContent;t.innerHTML="";
[...word].forEach((ch,n)=>{const s=document.createElement("span");s.textContent=ch;s.style.setProperty("--n",n);s.setAttribute("aria-hidden","true");t.appendChild(s)});

// Plants on the ground: seed mound, sprout, flower
const g=document.getElementById("ground");
[["flower",4,84],["sprout",13,64],["mound",22,56],["flower",31,70],["sprout",39,92],["flower",64,88],["mound",72,60],["sprout",80,72],["flower",89,96],["sprout",96,56]].forEach(([k,l,w],i)=>{
  const e=document.createElement("img");e.className="plant";e.src=S[k];e.alt="";e.style.left=l+"%";e.style.width=w+"px";e.style.animationDelay=(-i*0.5)+"s";g.appendChild(e)});

const calm=matchMedia("(prefers-reduced-motion: reduce)").matches;
if(!calm){
  // Falling leaves
  for(let i=0;i<12;i++){const p=document.createElement("img");p.className="petal";p.src=S.leaf;p.alt="";
    p.style.left=Math.random()*100+"vw";p.style.width=(14+Math.random()*16)+"px";
    p.style.animationDuration=(12+Math.random()*14)+"s";p.style.animationDelay=(-Math.random()*20)+"s";document.body.appendChild(p)}
  // Gentle parallax on sun and clouds
  const layers=[...document.querySelectorAll(".layer")];
  addEventListener("mousemove",e=>{const mx=e.clientX/innerWidth-.5,my=e.clientY/innerHeight-.5;
    layers.forEach(l=>{const d=+l.dataset.depth;l.style.translate=`${mx*d}px ${my*d}px`})});
}
