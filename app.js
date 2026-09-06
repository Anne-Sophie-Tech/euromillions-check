const state={main:new Set(),chance:null,draws:[],byMain:new Map(),byFull:new Map(),deferredPrompt:null};
const $=id=>document.getElementById(id);
function key(nums){return [...nums].sort((a,b)=>a-b).join('-')}
function renderBalls(){
  const main=$('mainBalls'); main.innerHTML='';
  for(let n=1;n<=49;n++){const b=document.createElement('button');b.className='ball'+(state.main.has(n)?' selected':'');b.textContent=n;b.onclick=()=>toggleMain(n);main.appendChild(b)}
  const cb=$('chanceBalls'); cb.innerHTML='';
  for(let n=1;n<=10;n++){const b=document.createElement('button');b.className='ball'+(state.chance===n?' selected':'');b.textContent=n;b.onclick=()=>{state.chance=n;renderBalls();update()};cb.appendChild(b)}
  update();
}
function toggleMain(n){if(state.main.has(n))state.main.delete(n);else if(state.main.size<5)state.main.add(n);renderBalls()}
function update(){
  $('mainCount').textContent=`${state.main.size} / 5`;
  $('chosenMain').textContent=state.main.size?[...state.main].sort((a,b)=>a-b).map(n=>String(n).padStart(2,'0')).join(' · '):'—';
  $('chanceValue').textContent=state.chance??'—';
  const ready=state.main.size===5&&state.chance!==null;
  $('checkBtn').disabled=!ready;$('uniqueBtn').disabled=!ready;
}
function flash(){
  state.main=new Set(); while(state.main.size<5)state.main.add(1+Math.floor(Math.random()*49)); state.chance=1+Math.floor(Math.random()*10); 
  if(state.draws.length && isMainSeen(state.main)) return flash();
  renderBalls(); check(false);
}
function isMainSeen(nums){return state.byMain.has(key(nums))}
function isFullSeen(nums,chance){return state.byFull.has(`${key(nums)}|${chance}`)}
function check(show=true){
  if(state.main.size!==5||state.chance===null)return;
  const mainSeen=isMainSeen(state.main), fullSeen=isFullSeen(state.main,state.chance);
  const dates=state.byMain.get(key(state.main))||[];
  const box=$('result'); box.hidden=false;
  box.innerHTML=`<div class="result-box ${mainSeen?'warn':'ok'}"><h3>${mainSeen?'⚠️ Cette combinaison est déjà sortie':'✓ Cette combinaison de 5 numéros est inédite'}</h3><p>${mainSeen?`Elle apparaît ${dates.length} fois dans l'historique. Le numéro Chance choisi est ${fullSeen?'également déjà associé à cette combinaison.':'différent des occurrences historiques connues.'}`:'Aucun tirage historique moderne ne contient exactement ces 5 numéros.'}</p>${mainSeen?`<ul class="history-list">${dates.slice(0,8).map(d=>`<li><span>${d.date}</span><span>Chance ${d.chance??'—'}</span></li>`).join('')}</ul>`:''}</div>`;
}
function improve(){
  if(state.main.size!==5||state.chance===null)return;
  const original=[...state.main].sort((a,b)=>a-b), originalChance=state.chance;
  if(!isMainSeen(original)){check();return}
  // Minimise the edit distance: first replace one main number, then two if necessary.
  for(let changes=1;changes<=5;changes++){
    const indices=[...Array(5).keys()];
    const combos=kCombinations(indices,changes);
    for(const idxs of combos){
      const base=original.filter((_,i)=>!idxs.includes(i));
      for(let n=1;n<=49;n++){
        if(base.includes(n))continue;
        const candidate=[...base,n].sort((a,b)=>a-b);
        if(!isMainSeen(candidate)){state.main=new Set(candidate);renderBalls();check();return}
      }
    }
  }
}
function kCombinations(arr,k){if(k===0)return[[]];if(arr.length<k)return[];const out=[];for(let i=0;i<=arr.length-k;i++)for(const tail of kCombinations(arr.slice(i+1),k-1))out.push([arr[i],...tail]);return out}
async function loadData(){
  try{const r=await fetch('data/history.json',{cache:'no-cache'});if(!r.ok)throw Error();const data=await r.json();state.draws=data.draws||[];for(const d of state.draws){const k=key(d.numbers);if(!state.byMain.has(k))state.byMain.set(k,[]);state.byMain.get(k).push(d);if(d.chance!=null)state.byFull.set(`${k}|${d.chance}`,d)}$('dataStatus').textContent=`${state.draws.length.toLocaleString('fr-FR')} tirages chargés · dernière mise à jour ${data.updatedAt||'—'}.`;}
  catch(e){$('dataStatus').textContent='Historique non chargé. Le dépôt doit contenir data/history.json. Le workflow GitHub fourni le met à jour automatiquement.'}
}
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();state.deferredPrompt=e;$('installBtn').hidden=false});
$('installBtn').onclick=async()=>{if(state.deferredPrompt){state.deferredPrompt.prompt();await state.deferredPrompt.userChoice;state.deferredPrompt=null;$('installBtn').hidden=true}else alert('Sur iPhone/iPad : ouvrez le menu Partager de Safari puis « Sur l’écran d’accueil ».');};
$('flashBtn').onclick=flash;$('checkBtn').onclick=()=>check();$('uniqueBtn').onclick=improve;
renderBalls();loadData();
if(/iphone|ipad|ipod/i.test(navigator.userAgent)&&!window.matchMedia('(display-mode: standalone)').matches){$('installBtn').hidden=false;$('installBtn').textContent='Installer';}
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js'));
