const games={
  loto:{name:'LOTO',data:'data/history.json',mainMax:49,specialMax:10,specialCount:1,specialLabel:'Numéro Chance',workflow:'Update Loto history'},
  euromillions:{name:'EuroMillions',data:'data/euromillions_history.json',mainMax:50,specialMax:12,specialCount:2,specialLabel:'Étoiles',workflow:'Update EuroMillions history'}
};
const state={game:'loto',main:new Set(),special:new Set(),draws:[],byMain:new Map(),byFull:new Map(),deferredPrompt:null,dataReady:false,loadId:0};
const $=id=>document.getElementById(id);
function key(nums){return [...nums].sort((a,b)=>a-b).join('-')}
function game(){return games[state.game]}
function renderBalls(){
  const cfg=game();
  const main=$('mainBalls'); main.innerHTML='';
  for(let n=1;n<=cfg.mainMax;n++){const b=document.createElement('button');b.className='ball'+(state.main.has(n)?' selected':'');b.textContent=n;b.setAttribute('aria-pressed',state.main.has(n));b.onclick=()=>toggleMain(n);main.appendChild(b)}
  const cb=$('specialBalls'); cb.innerHTML='';
  for(let n=1;n<=cfg.specialMax;n++){const b=document.createElement('button');b.className='ball'+(state.special.has(n)?' selected':'');b.textContent=n;b.setAttribute('aria-pressed',state.special.has(n));b.onclick=()=>toggleSpecial(n);cb.appendChild(b)}
  update();
}
function toggleMain(n){if(state.main.has(n))state.main.delete(n);else if(state.main.size<5)state.main.add(n);renderBalls()}
function toggleSpecial(n){const cfg=game();if(state.special.has(n))state.special.delete(n);else if(state.special.size<cfg.specialCount)state.special.add(n);renderBalls()}
function update(){
  const cfg=game();
  $('modeText').textContent=`Choisissez 5 numéros et ${cfg.specialCount===1?'1 numéro Chance':'2 étoiles'}.`;
  $('mainBalls').setAttribute('aria-label',`Numéros ${cfg.name}`);
  $('mainCount').textContent=`${state.main.size} / 5`;
  $('chosenMain').textContent=state.main.size?[...state.main].sort((a,b)=>a-b).map(n=>String(n).padStart(2,'0')).join(' · '):'—';
  $('specialLabel').textContent=cfg.specialLabel;
  $('specialValue').textContent=state.special.size?[...state.special].sort((a,b)=>a-b).map(n=>String(n).padStart(2,'0')).join(' · '):'—';
  const ready=state.main.size===5&&state.special.size===cfg.specialCount&&state.dataReady;
  $('checkBtn').disabled=!ready;$('uniqueBtn').disabled=!ready;
}
function flash(){
  if(!state.dataReady){showError('Historique indisponible','Le Flash ne peut pas garantir une grille inédite tant que l’historique complet n’est pas chargé.');return}
  const cfg=game(), rankedMain=rankExpected('numbers',cfg.mainMax), rankedSpecial=rankExpected('special',cfg.specialMax), rank=new Map(rankedMain.map((n,i)=>[n,i]));
  let candidate=new Set(rankedMain.slice(0,5));
  for(let i=5;isMainSeen(candidate)&&i<rankedMain.length;i++){
    const nums=[...candidate].sort((a,b)=>rank.get(a)-rank.get(b));
    nums[nums.length-1]=rankedMain[i];candidate=new Set(nums);
  }
  state.main=candidate;state.special=new Set(rankedSpecial.slice(0,cfg.specialCount));renderBalls();check(false);
}
function rankExpected(field,max){const delays=new Map();for(let n=1;n<=max;n++)delays.set(n,state.draws.length);for(let i=0;i<state.draws.length;i++){const values=field==='numbers'?state.draws[i].numbers:getSpecial(state.draws[i]);for(const n of values)if(delays.get(n)===state.draws.length)delays.set(n,i)}return [...delays.entries()].sort((a,b)=>b[1]-a[1]||a[0]-b[0]).map(([n])=>n)}
function isMainSeen(nums){return state.byMain.has(key(nums))}
function isFullSeen(nums,special){return state.byFull.has(`${key(nums)}|${key(special)}`)}
function showError(title,text){const box=$('result');box.hidden=false;box.innerHTML=`<div class="result-box error"><h3>⚠️ ${title}</h3><p>${text}</p></div>`;box.scrollIntoView({behavior:'smooth',block:'nearest'})}
function check(show=true){
  const cfg=game();
  if(state.main.size!==5||state.special.size!==cfg.specialCount)return;
  if(!state.dataReady){showError('Historique indisponible','Impossible d’affirmer qu’une grille est unique avec un historique incomplet.');return}
  const mainSeen=isMainSeen(state.main), fullSeen=isFullSeen(state.main,state.special);
  const dates=state.byMain.get(key(state.main))||[];
  const box=$('result'); box.hidden=false;
  const specialText=cfg.specialCount===1
    ? (fullSeen?'Le Numéro Chance est également déjà associé à cette combinaison.':'Le Numéro Chance choisi est différent des occurrences historiques connues.')
    : (fullSeen?'Les étoiles sont également déjà associées à cette combinaison.':'Les étoiles choisies sont différentes des occurrences historiques connues.');
  box.innerHTML=`<div class="result-box ${mainSeen?'warn':'ok'}"><h3>${mainSeen?'⚠️ Cette combinaison est déjà sortie':'✓ Cette combinaison de 5 numéros est inédite'}</h3><p>${mainSeen?`Elle apparaît ${dates.length} fois dans l’historique. ${specialText}`:'Aucun tirage de la période analysée ne contient exactement ces 5 numéros.'}</p>${mainSeen?`<ul class="history-list">${dates.slice(0,8).map(d=>`<li><span>${d.date}</span><span>${formatSpecial(d)}</span></li>`).join('')}</ul>`:''}</div>`;
  if(show)box.scrollIntoView({behavior:'smooth',block:'start'});
}
function formatSpecial(draw){const cfg=game(), values=getSpecial(draw);return `${cfg.specialLabel} ${values.length?values.join(' · '):'—'}`}
function getSpecial(draw){return Array.isArray(draw.stars)?draw.stars:(draw.chance!=null?[draw.chance]:[])}
function improve(){
  if(!state.dataReady){showError('Historique indisponible','Impossible de rendre une grille unique sans l’historique complet.');return}
  if(state.main.size!==5||state.special.size!==game().specialCount)return;
  const original=[...state.main].sort((a,b)=>a-b);
  if(!isMainSeen(original)){check();return}
  for(let changes=1;changes<=5;changes++){
    for(const idxs of kCombinations([0,1,2,3,4],changes)){
      const base=original.filter((_,i)=>!idxs.includes(i));
      for(let n=1;n<=game().mainMax;n++){
        if(base.includes(n))continue;
        const candidate=[...base,n].sort((a,b)=>a-b);
        if(!isMainSeen(candidate)){state.main=new Set(candidate);renderBalls();check();return}
      }
    }
  }
  showError('Impossible de modifier la grille','Aucune combinaison inédite n’a été trouvée.');
}
function kCombinations(arr,k){if(k===0)return[[]];if(arr.length<k)return[];const out=[];for(let i=0;i<=arr.length-k;i++)for(const tail of kCombinations(arr.slice(i+1),k-1))out.push([arr[i],...tail]);return out}
async function loadData(){
  const cfg=game(), loadId=++state.loadId;
  try{
    state.dataReady=false;state.draws=[];state.byMain.clear();state.byFull.clear();update();
    const r=await fetch(cfg.data,{cache:'no-store'});if(!r.ok)throw Error(`HTTP ${r.status}`);const data=await r.json();
    if(loadId!==state.loadId)return;
    state.draws=Array.isArray(data.draws)?data.draws:[];
    if(state.draws.length<1000)throw Error(`historique incomplet (${state.draws.length} tirages)`);
    for(const d of state.draws){const k=key(d.numbers), special=getSpecial(d);if(!state.byMain.has(k))state.byMain.set(k,[]);state.byMain.get(k).push(d);if(special.length===cfg.specialCount)state.byFull.set(`${k}|${key(special)}`,d)}
    state.dataReady=true;$('dataStatus').textContent=`${state.draws.length.toLocaleString('fr-FR')} tirages chargés · dernière mise à jour ${data.updatedAt||'—'}.`;
    $('dataStatus').classList.remove('error-status');
    update();
  }catch(e){if(loadId!==state.loadId)return;state.dataReady=false;$('dataStatus').textContent=`Historique incomplet ou indisponible (${e.message||'erreur inconnue'}). Lancez le workflow « ${cfg.workflow} » pour reconstruire les données depuis les archives officielles FDJ.`;
    $('dataStatus').classList.add('error-status');update()}
}
function switchGame(value){state.game=value;state.main.clear();state.special.clear();$('result').hidden=true;renderBalls();loadData()}
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();state.deferredPrompt=e;$('installBtn').hidden=false});
$('installBtn').onclick=async()=>{if(state.deferredPrompt){state.deferredPrompt.prompt();await state.deferredPrompt.userChoice;state.deferredPrompt=null;$('installBtn').hidden=true}else alert('Sur iPhone/iPad : ouvrez le menu Partager de Safari puis « Sur l’écran d’accueil ».')};
$('flashBtn').onclick=flash;$('checkBtn').onclick=()=>check();$('uniqueBtn').onclick=improve;
$('gameSelect').onchange=e=>switchGame(e.target.value);
$('infoBtn').onclick=()=>$('infoDialog').showModal();$('closeInfo').onclick=()=>$('infoDialog').close();$('closeInfoBottom').onclick=()=>$('infoDialog').close();
renderBalls();loadData();
if(/iphone|ipad|ipod/i.test(navigator.userAgent)&&!window.matchMedia('(display-mode: standalone)').matches){$('installBtn').hidden=false;$('installBtn').textContent='Installer'}
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js'));
