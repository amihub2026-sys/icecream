'use strict';
// Native document scrolling controls each animation; nothing intercepts wheel/touch events.
const DATA=[
 {section:'journey',canvas:'journey-canvas',count:'journey-count',title:'journey-title',desc:'journey-desc',kicker:'journey-kicker',progress:'journey-progress',names:['CHOCOLATE','STRAWBERRY','BLUEBERRY'],lines:['Rich. Deep. Unmistakable.','A little sweetness in every swirl.','A beautifully bold finish.'],colors:['#24130f','#99445c','#292342'],folder:['journey-chocolate','journey-strawberry','journey-blueberry']},
 {section:'flavors',canvas:'showcase-canvas',count:'showcase-count',title:'showcase-title',desc:'showcase-desc',kicker:'showcase-kicker',progress:'showcase-progress',names:['BLUEBERRY','STRAWBERRY','CHOCOLATE'],lines:['Wild berries. Velvet swirls.','Fresh berries. Silky sweetness.','Dark drizzle. Pure indulgence.'],colors:['#292342','#99445c','#24130f'],folder:['cone-blueberry','cone-strawberry','cone-chocolate']}
];
const TOTAL=72, MAX_CACHE=90;const cache=new Map(), loading=new Set();
const imageUrl=(folder,n)=>`assets/frames/${folder}/${String(n+1).padStart(4,'0')}.webp`;
function load(folder,n){const key=`${folder}:${n}`;if(n<0||n>=TOTAL||cache.has(key)||loading.has(key))return;loading.add(key);const im=new Image();im.onload=()=>{loading.delete(key);cache.set(key,im);if(cache.size>MAX_CACHE){for(const k of cache.keys()){if(k!==key){cache.delete(k);break}}}};im.onerror=()=>loading.delete(key);im.src=imageUrl(folder,n)}
function progressFor(section){const r=section.getBoundingClientRect();return Math.max(0,Math.min(1,-r.top/Math.max(1,section.offsetHeight-innerHeight)))}
const state=DATA.map(x=>({...x,sectionEl:document.getElementById(x.section),canvasEl:document.getElementById(x.canvas),p:0,target:0,frame:-1,index:-1,ctx:null}));
function layout(c){const dpr=Math.min(devicePixelRatio||1,1.5);const w=Math.round(c.clientWidth*dpr),h=Math.round(c.clientHeight*dpr);if(c.width!==w||c.height!==h){c.width=w;c.height=h}return {w,h}}
function draw(s,img){const {w,h}=layout(s.canvasEl),ctx=s.ctx;if(!w||!h)return;ctx.clearRect(0,0,w,h);ctx.fillStyle=s.colors[s.index]||s.colors[0];ctx.fillRect(0,0,w,h);
// Cover underneath for atmosphere; contained sharp image above preserves the full scoop/cone.
const cr=Math.max(w/img.width,h/img.height),cw=img.width*cr,ch=img.height*cr;ctx.save();ctx.filter='blur(24px) brightness(.55)';ctx.drawImage(img,(w-cw)/2,(h-ch)/2,cw,ch);ctx.restore();
const mobile=w/h<.9;const maxW=w,maxH=mobile?h*.58:h*.95;const scale=Math.min(maxW/img.width,maxH/img.height);const iw=img.width*scale,ih=img.height*scale;const cy=mobile?h*.41:h*.51;ctx.drawImage(img,(w-iw)/2,cy*h/ h-ih/2,iw,ih);
}
function animate(){for(const s of state){s.target=progressFor(s.sectionEl);s.p+=(s.target-s.p)*.18;if(Math.abs(s.target-s.p)<.0002)s.p=s.target;const raw=Math.min(3*TOTAL-1,Math.floor(s.p*(3*TOTAL-1))),idx=Math.min(2,Math.floor(raw/TOTAL)),fn=raw%TOTAL;const folder=s.folder[idx],key=`${folder}:${fn}`;s.index=idx;load(folder,fn);for(let j=1;j<=7;j++)load(folder,Math.min(TOTAL-1,fn+j));if(idx<2&&fn>TOTAL-9)for(let j=0;j<6;j++)load(s.folder[idx+1],j);
let im=cache.get(key);if(!im){for(let d=1;d<10&&!im;d++){im=cache.get(`${folder}:${Math.max(0,fn-d)}`)||cache.get(`${folder}:${Math.min(TOTAL-1,fn+d)}`)}}
if(im&&(s.frame!==raw||s.canvasEl.width===0)){draw(s,im);s.frame=raw}
if(s.displayIndex!==idx){s.displayIndex=idx;document.getElementById(s.title).innerHTML=s.names[idx]+'<span class="period">.</span>';document.getElementById(s.desc).textContent=s.lines[idx];document.getElementById(s.count).textContent=`0${idx+1} — 03`;s.sectionEl.querySelector('.sticky-stage').style.backgroundColor=s.colors[idx]}
document.getElementById(s.progress).style.width=`${Math.round(s.p*100)}%`}
requestAnimationFrame(animate)}
state.forEach(s=>{s.ctx=s.canvasEl.getContext('2d',{alpha:false});load(s.folder[0],0)});requestAnimationFrame(animate);

// Enhancements: no scroll interception or video-completion locks.
document.querySelectorAll('[data-flavor]').forEach(button=>button.addEventListener('click',()=>{const flavor=button.dataset.flavor;document.querySelectorAll('[data-flavor]').forEach(b=>{b.classList.toggle('selected',b===button);b.setAttribute('aria-pressed',String(b===button))});const visual=document.querySelector('#custom-img');visual.src=`assets/stills/cone-${flavor}.webp`;visual.alt=`${flavor} waffle cone`;document.querySelector('#custom-name').textContent=`${flavor.toUpperCase()} / YOUR SCOOP`;}));
const dlg=document.querySelector('#video-dialog'),detailVideo=document.querySelector('#detail-video');document.querySelectorAll('[data-video]').forEach(b=>b.addEventListener('click',()=>{const key=b.dataset.video;detailVideo.src=`assets/videos/${key}.mp4`;dlg.showModal();detailVideo.play().catch(()=>{})}));document.querySelector('#close-dialog').addEventListener('click',()=>dlg.close());dlg.addEventListener('close',()=>{detailVideo.pause();detailVideo.removeAttribute('src');detailVideo.load()});
