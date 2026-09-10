/* ==========================================================
   POKEDEX NEO LAB · js/pokedex.js
   PokeAPI + GSAP + Anime.js + Filtros + Infinite + Comparador + Tema
   ========================================================== */
(function(){
  // ---- DOM ----
  const $grid = document.getElementById('pokedexGrid');
  const $status = document.getElementById('statusContainer');
  const $loader = document.getElementById('loaderContainer');
  const $loaderText = document.getElementById('loaderText');
  const $searchInput = document.getElementById('searchInput');
  const $searchBtn = document.getElementById('searchBtn');
  const $typeFilters = document.getElementById('typeFilters');
  const $counter = document.getElementById('counter');
  const $sortSelect = document.getElementById('sortSelect');
  const $genSelect = document.getElementById('genSelect');
  const $loadMore = document.getElementById('loadMore');
  const $favToggle = document.getElementById('favToggle');
  const $themeToggle = document.getElementById('themeToggle');
  const $infiniteToggle = document.getElementById('infiniteToggle');
  const $sentinel = document.getElementById('sentinel');
  const $modalBackdrop = document.getElementById('modalBackdrop');
  const $modal = document.getElementById('pokemonModal');
  const $compareBar = document.getElementById('compareBar');
  const $slot0 = document.getElementById('slot0');
  const $slot1 = document.getElementById('slot1');
  const $doCompare = document.getElementById('doCompare');
  const $clearCompare = document.getElementById('clearCompare');
  const $compareBackdrop = document.getElementById('compareBackdrop');
  const $compareModal = document.getElementById('compareModal');
  const $tabExplorar = document.getElementById('tabExplorar');
  const $tabFavoritos = document.getElementById('tabFavoritos');
  const $favSection = document.getElementById('favSection');
  const $favGrid = document.getElementById('favGrid');
  const $favEmpty = document.getElementById('favEmpty');
  const $favCount = document.getElementById('favCount');
  const $favCountTop = document.getElementById('favCountTop');
  const $favTotalBadge = document.getElementById('favTotalBadge');
  const $tabCountAll = document.getElementById('tabCountAll');
  const $clearFavsBtn = document.getElementById('clearFavsBtn');
  const $exportFavsBtn = document.getElementById('exportFavsBtn');
  const $goFavSection = document.getElementById('goFavSection');

  // ---- Config PokeAPI ----
  const GEN_RANGES = {
    '1':[1,151], '2':[152,251], '3':[252,386], '4':[387,493],
    '5':[494,649], '6':[650,721], '7':[722,809], '8':[810,898], '9':[899,1010], 'all':[1,1025]
  };
  const CACHE_KEY = 'pokedex_cache_neo_v1';
  const FAV_KEY = 'pokedex_favs';
  const THEME_KEY = 'pokedex_theme';
  const COMPARE_KEY = 'pokedex_compare';
  const PAGE_SIZE = 24;
  const CONCURRENCY = 20;
  const ALL_TYPES = ['all','normal','fire','water','grass','electric','ice','fighting','poison','ground','flying','psychic','bug','rock','ghost','dragon','dark','steel','fairy'];

  // ---- State ----
  let allPokemon = [];
  let filtered = [];
  let visibleCount = PAGE_SIZE;
  let activeType = 'all';
  let showFavsOnly = false;
  let searchTerm = '';
  let sortBy = 'id-asc';
  let favs = new Set(JSON.parse(localStorage.getItem(FAV_KEY) || '[]'));
  let compare = JSON.parse(localStorage.getItem(COMPARE_KEY) || '[]'); // ids
  let currentGen = '1';
  let isLoading = false;
  let observer = null;

  const pad3 = n => String(n).padStart(3,'0');
  const debounce = (fn,ms)=>{let t;return(...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),ms)}};
  const saveFavs = ()=> {
    localStorage.setItem(FAV_KEY, JSON.stringify([...favs]));
    updateFavCounts();
    renderFavSection();
  };
  const saveCompare = ()=> localStorage.setItem(COMPARE_KEY, JSON.stringify(compare));
  const totalCP = p => (p.stats||[]).reduce((s,x)=>s+x.base_stat,0);
  let currentView = 'explorar'; // explorar | favoritos

  // ---- Tema ----
  function applyTheme(th){
    document.documentElement.setAttribute('data-theme', th);
    document.body.setAttribute('data-theme', th);
    localStorage.setItem(THEME_KEY, th);
    $themeToggle.textContent = th==='light' ? '☀️' : '🌙';
    $themeToggle.title = th==='light' ? 'Cambiar a oscuro' : 'Cambiar a claro';
    document.querySelector('meta[name="theme-color"]').setAttribute('content', th==='light' ? '#eef2fb' : '#090d1b');
  }
  (function initTheme(){
    const saved = localStorage.getItem(THEME_KEY);
    const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
    applyTheme(saved || (prefersLight ? 'light' : 'dark'));
  })();
  $themeToggle.addEventListener('click', ()=>{
    const cur = document.documentElement.getAttribute('data-theme') || 'dark';
    const nxt = cur==='dark' ? 'light' : 'dark';
    applyTheme(nxt);
    if(window.gsap) gsap.fromTo($themeToggle, {rotation:-20, scale:.85},{rotation:0, scale:1, duration:.35, ease:'back.out(1.6)'});
  });

  // ---- Status / Loader ----
  function showStatus(msg, isError=false){
    $status.textContent = msg;
    $status.style.display='block';
    $status.classList.toggle('error', isError);
    if(isError && window.anime) try{ anime({targets:$status, translateX:[0,-6,6,-4,4,0], duration:420, easing:'easeInOutQuad'});}catch{}
  }
  function hideStatus(){ $status.style.display='none'; }
  function showLoader(text='Conectando a PokeAPI…'){
    $loader.style.display='flex';
    if($loaderText) $loaderText.textContent = text;
    $grid.innerHTML='';
    $loadMore.style.display='none';
    const frag=document.createDocumentFragment();
    for(let i=0;i<12;i++){ const s=document.createElement('div'); s.className='skeleton'; frag.appendChild(s); }
    $grid.appendChild(frag);
  }
  function hideLoader(){ $loader.style.display='none'; }

  // ---- GSAP ----
  function animateHeader(){
    if(!window.gsap) return;
    const tl=gsap.timeline({defaults:{ease:'back.out(1.2)'}});
    tl.from('.brand-badge',{scale:0, rotation:-90, duration:.55})
      .from('.brand h1',{y:14, opacity:0, duration:.4},'-=.25')
      .from('.pill',{x:12, opacity:0, duration:.4},'-=.28')
      .from('.select-dark, .icon-mini, .theme-toggle',{y:10, opacity:0, stagger:.06, duration:.35},'-=.2')
      .from('.filters-row',{y:10, opacity:0, duration:.35},'-=.2');
  }
  function animateCards(){
    if(!window.gsap) return;
    const cards=$grid.querySelectorAll('.card');
    if(!cards.length) return;
    gsap.set(cards,{opacity:0, y:16, scale:.96});
    gsap.to(cards,{opacity:1, y:0, scale:1, duration:.48, ease:'back.out(1.3)', stagger:{each:.028, grid:'auto', from:'start'}, overwrite:true});
    if(window.anime) try{ anime({targets:'.card .badge', scale:[0,1], duration:320, delay:anime.stagger(28), easing:'easeOutBack'});}catch{}
  }
  function cardHover(card){
    if(!window.gsap) return;
    card.addEventListener('mouseenter', ()=>{
      gsap.to(card,{y:-5, scale:1.015, duration:.24, ease:'power2.out', overwrite:true});
      const img=card.querySelector('img');
      if(img) gsap.to(img,{y:-3, scale:1.06, duration:.28, ease:'power2.out'});
    });
    card.addEventListener('mouseleave', ()=>{
      gsap.to(card,{y:0, scale:1, duration:.3, ease:'power2.out'});
      const img=card.querySelector('img');
      if(img) gsap.to(img,{y:0, scale:1, duration:.28});
    });
  }
  function animateModal($back,$mod){
    if(!window.gsap) return;
    const tl=gsap.timeline();
    tl.fromTo($back,{opacity:0},{opacity:1,duration:.2})
      .fromTo($mod,{scale:.92,y:12,opacity:0},{scale:1,y:0,opacity:1,duration:.38,ease:'back.out(1.4)'},'-=.08')
      .from('.modal-art img',{scale:.78, rotation:-4, duration:.45, ease:'back.out(1.5)'},'-=.18');
    setTimeout(animateBars,120);
  }
  function animateBars(){
    if(window.anime) try{
      anime({targets:'.fill', width: el=> el.dataset.w+'%', duration:860, delay:anime.stagger(60), easing:'easeOutElastic(1,.6)'});
    }catch{ document.querySelectorAll('.fill').forEach(el=> el.style.width=el.dataset.w+'%'); }
    else document.querySelectorAll('.fill').forEach(el=> el.style.width=el.dataset.w+'%');
  }

  // ---- Cache ----
  function getCache(){
    try{
      const raw=localStorage.getItem(CACHE_KEY);
      if(!raw) return null;
      const {ts,gen,data}=JSON.parse(raw);
      if(gen!==currentGen) return null;
      if(Date.now()-ts>1000*60*60*24) return null;
      return data;
    }catch{ return null; }
  }
  function setCache(data){ try{ localStorage.setItem(CACHE_KEY, JSON.stringify({ts:Date.now(), gen:currentGen, data})); }catch{} }

  // ---- Fetch concurrency ----
  async function fetchWithConcurrency(urls, limit){
    const res=new Array(urls.length);
    let idx=0;
    async function worker(){
      while(idx<urls.length){
        const c=idx++;
        const url=urls[c];
        try{
          const r=await fetch(url);
          if(!r.ok) throw new Error(r.status);
          res[c]=await r.json();
        }catch(e){
          console.warn('pokeapi fail',url,e);
          const id=parseInt(url.split('/').filter(Boolean).pop())||c+1;
          res[c]={id, name:'unknown', sprites:{front_default:''}, types:[{type:{name:'unknown'}}], stats:[], height:0, weight:0, abilities:[], base_experience:0};
        }
        if($loaderText && c%12===0) $loaderText.textContent=`Cargando ${Math.min(c+limit, urls.length)}/${urls.length}…`;
      }
    }
    const workers=Array.from({length:Math.min(limit,urls.length)},()=>worker());
    await Promise.all(workers);
    return res;
  }

  // ---- Favoritos: contadores y sección ----
  function updateFavCounts(){
    const n = favs.size;
    if($favCount) $favCount.textContent = n;
    if($favCountTop) $favCountTop.textContent = n;
    if($favTotalBadge) $favTotalBadge.innerHTML = `<b>${n}</b> guardados`;
    if($tabCountAll) $tabCountAll.textContent = filtered.length ? `· ${filtered.length}` : '';
    // badge pulse
    if(n>0 && window.anime) try{ anime({targets:'#favCount,#favCountTop', scale:[1,1.18,1], duration:320, easing:'easeOutBack'});}catch{}
  }
  function renderFavSection(){
    if(!$favGrid) return;
    const favList = allPokemon.filter(p=> favs.has(p.id));
    // también buscar en filtrados si aún no cargó gen, pero prioriza allPokemon
    $favGrid.innerHTML='';
    if(favList.length===0){
      $favGrid.style.display='none';
      if($favEmpty) $favEmpty.style.display='block';
      return;
    }
    if($favEmpty) $favEmpty.style.display='none';
    $favGrid.style.display='grid';
    // ordenar por ID
    favList.sort((a,b)=> a.id-b.id);
    const frag=document.createDocumentFragment();
    favList.forEach(p=>{
      const card=createCard(p);
      // añade botón quitar rápido en fav grid (ya tiene corazón, pero reforzamos)
      frag.appendChild(card);
    });
    $favGrid.appendChild(frag);
    if(window.gsap) gsap.fromTo('#favGrid .card',{y:10,opacity:0},{y:0,opacity:1,duration:.4,stagger:.04,ease:'back.out(1.2)',overwrite:true});
  }
  function switchView(view){
    currentView = view;
    const isFav = view==='favoritos';
    if($tabExplorar) $tabExplorar.classList.toggle('active', !isFav);
    if($tabFavoritos) $tabFavoritos.classList.toggle('active', isFav);
    if($tabExplorar) $tabExplorar.setAttribute('aria-selected', String(!isFav));
    if($tabFavoritos) $tabFavoritos.setAttribute('aria-selected', String(isFav));
    // mostrar/ocultar secciones
    const explorerEls = [$grid, $sentinel, $loadMore].filter(Boolean);
    const filtersEl = document.querySelector('.filters');
    if(isFav){
      explorerEls.forEach(el=> el.classList.add('view-hidden'));
      if(filtersEl) filtersEl.classList.add('view-hidden');
      if($favSection) $favSection.classList.remove('hidden');
      if($favSection) $favSection.style.display='block';
      renderFavSection();
      // scroll a favoritos
      setTimeout(()=> $favSection.scrollIntoView({behavior:'smooth', block:'start'}), 80);
      showStatus(`♥ ${favs.size} favoritos · toca ♥ para quitar`);
      setTimeout(hideStatus,1400);
    } else {
      explorerEls.forEach(el=> el.classList.remove('view-hidden'));
      if(filtersEl) filtersEl.classList.remove('view-hidden');
      if($favSection) $favSection.style.display='none';
      hideStatus();
    }
    if(window.gsap) gsap.fromTo(isFav? '#favSection' : '#pokedexGrid',{opacity:0,y:8},{opacity:1,y:0,duration:.35,ease:'power2.out'});
  }

  // ---- Filtros UI ----
  function buildTypeFilters(){
    $typeFilters.innerHTML='';
    ALL_TYPES.forEach(t=>{
      const b=document.createElement('button');
      b.className='chip'+(t===activeType?' active':'')+(t!=='all'?' type-'+t:'');
      b.dataset.type=t;
      b.textContent=t==='all'?'Todos':t;
      b.addEventListener('click', ()=>{
        activeType=t;
        document.querySelectorAll('.chip').forEach(x=> x.classList.toggle('active', x.dataset.type===t));
        visibleCount=PAGE_SIZE;
        applyFilters();
        if(window.gsap) gsap.fromTo(b,{scale:.9},{scale:1,duration:.3,ease:'back.out(1.7)'});
      });
      $typeFilters.appendChild(b);
    });
    const clear=document.createElement('button');
    clear.className='chip'; clear.style.background='transparent'; clear.style.borderStyle='dashed';
    clear.textContent='Limpiar filtros';
    clear.addEventListener('click', clearAll);
    $typeFilters.appendChild(clear);
  }

  // ---- Comparador ----
  function updateCompareBar(){
    const slots=[$slot0,$slot1];
    compare.slice(0,2).forEach((id,i)=>{
      const mon=allPokemon.find(p=>p.id===id) || filtered.find(p=>p.id===id);
      const s=slots[i];
      if(mon){
        const spr=mon.sprites?.other?.['official-artwork']?.front_default || mon.sprites?.front_default || '';
        s.classList.remove('empty');
        s.innerHTML=`<img src="${spr}" alt="${mon.name}"><b>#${pad3(mon.id)}</b>`;
      }
    });
    for(let i=compare.length;i<2;i++){
      slots[i].classList.add('empty');
      slots[i].innerHTML=`<span>${i+1}</span>`;
    }
    $doCompare.disabled = compare.length!==2;
    if(compare.length>0) $compareBar.classList.add('show');
    else $compareBar.classList.remove('show');
    saveCompare();
    // update card selected states
    document.querySelectorAll('.card').forEach(c=>{
      const id=parseInt(c.dataset.id);
      c.classList.toggle('selected', compare.includes(id));
      const btn=c.querySelector('.compare');
      if(btn) btn.classList.toggle('on', compare.includes(id));
    });
  }
  function toggleCompare(id){
    const idx=compare.indexOf(id);
    if(idx>-1) compare.splice(idx,1);
    else {
      if(compare.length>=2){ showStatus('Solo puedes comparar 2 Pokémon. Quita uno primero.', true); setTimeout(hideStatus,1800); return; }
      compare.push(id);
    }
    updateCompareBar();
    if(window.anime) try{ anime({targets:'#compareBar', scale:[.98,1], duration:220, easing:'easeOutQuad'});}catch{}
  }
  $clearCompare.addEventListener('click', ()=>{ compare=[]; updateCompareBar(); });
  $doCompare.addEventListener('click', ()=>{
    if(compare.length!==2) return;
    openCompare(compare[0], compare[1]);
  });

  function openCompare(idA,idB){
    const a=allPokemon.find(p=>p.id===idA);
    const b=allPokemon.find(p=>p.id===idB);
    if(!a||!b) return;
    $compareBackdrop.classList.add('open');
    $compareBackdrop.setAttribute('aria-hidden','false');
    document.body.style.overflow='hidden';
    const sprA=a.sprites?.other?.['official-artwork']?.front_default || a.sprites?.front_default || '';
    const sprB=b.sprites?.other?.['official-artwork']?.front_default || b.sprites?.front_default || '';
    const totalA=totalCP(a), totalB=totalCP(b);
    const mkCol=(p,spr,total)=>{
      const types=p.types.map(t=>`<span class="badge type-${t.type.name}">${t.type.name}</span>`).join('');
      return `
        <div class="compare-col">
          <div class="compare-head">
            <img src="${spr}" alt="${p.name}">
            <div><h3>${p.name}</h3><small>#${pad3(p.id)} · ${total} pts · ${(p.weight/10).toFixed(1)}kg · ${(p.height/10).toFixed(1)}m</small><div style="margin-top:.3rem;display:flex;gap:4px;flex-wrap:wrap">${types}</div></div>
          </div>
          <div class="compare-stats">
            ${p.stats.map(s=>`<div class="stat"><span>${s.stat.name.replace('special-','s.')}</span><div class="bar"><div class="fill" data-w="${Math.min(100,Math.round(s.base_stat/1.55))}" style="width:0;background:linear-gradient(90deg,#E3350D,#FFCB05)"></div></div><b>${s.base_stat}</b></div>`).join('')}
            <div class="stat" style="margin-top:.4rem;border-top:1px solid var(--line);padding-top:.5rem"><span>TOTAL</span><div class="bar"><div class="fill" data-w="${Math.min(100,Math.round(total/7))}" style="width:0;background:linear-gradient(90deg,#E3350D,#3564AE)"></div></div><b>${total}</b></div>
          </div>
        </div>`;
    };
    $compareModal.innerHTML=`
      <button class="modal-close" id="closeCompareBtn" aria-label="Cerrar">✕</button>
      <div style="padding:1rem 1rem .2rem"><div class="section-title">⚖️ Comparador · <span style="color:var(--accent)">${a.name}</span> vs <span style="color:var(--accent-3)">${b.name}</span></div><p style="color:var(--muted);font-weight:600;font-size:.78rem">API: <code>pokeapi.co/api/v2/pokemon/${a.id}</code> vs <code>${b.id}</code> · Ganador por stats: <b style="color:${totalA>totalB?'var(--ok)': totalB>totalA?'var(--accent-3)':'var(--muted)'}">${totalA===totalB?'Empate': totalA>totalB? a.name : b.name}</b></p></div>
      <div style="position:relative">
        <div class="compare-grid">
          ${mkCol(a,sprA,totalA)}
          ${mkCol(b,sprB,totalB)}
        </div>
        <div class="vs">VS</div>
      </div>
      <div style="padding:0 1rem 1rem;display:flex;gap:.5rem"><button class="btn-primary" onclick="document.getElementById('compareBackdrop').classList.remove('open');document.body.style.overflow=''">Cerrar</button><button class="btn-secondary" id="swapCompare">⇄ Intercambiar</button></div>
    `;
    document.getElementById('closeCompareBtn').addEventListener('click', closeCompare);
    document.getElementById('swapCompare').addEventListener('click', ()=>{
      compare.reverse(); saveCompare(); updateCompareBar(); openCompare(compare[0],compare[1]);
    });
    $compareBackdrop.addEventListener('click', onCompareBackdrop);
    animateModal($compareBackdrop,$compareModal);
  }
  function onCompareBackdrop(e){ if(e.target=== $compareBackdrop) closeCompare(); }
  function closeCompare(){
    if(window.gsap){
      gsap.to($compareModal,{scale:.92,y:10,opacity:0,duration:.2,ease:'power2.in'});
      gsap.to($compareBackdrop,{opacity:0,duration:.2,delay:.06,onComplete:()=>{
        $compareBackdrop.classList.remove('open'); $compareBackdrop.setAttribute('aria-hidden','true');
        document.body.style.overflow=''; $compareBackdrop.removeEventListener('click',onCompareBackdrop);
      }});
    } else {
      $compareBackdrop.classList.remove('open'); document.body.style.overflow=''; $compareBackdrop.removeEventListener('click',onCompareBackdrop);
    }
  }

  // ---- Render ----
  function createCard(p){
    const card=document.createElement('div');
    card.className='card';
    if(compare.includes(p.id)) card.classList.add('selected');
    if(favs.has(p.id)) card.dataset.fav='1';
    card.dataset.id=p.id;
    card.tabIndex=0;
    card.setAttribute('role','button');
    card.setAttribute('aria-label', `${p.name} número ${p.id}, tipos ${p.types.map(t=>t.type.name).join(', ')}`);

    const spr=p.sprites?.other?.['official-artwork']?.front_default || p.sprites?.front_default || '';
    const shinySpr=p.sprites?.other?.['official-artwork']?.front_shiny || p.sprites?.front_shiny || spr;
    const types=p.types.map(t=>t.type.name);
    const badges=types.map(t=>`<span class="badge type-${t}">${t}</span>`).join('');
    const isFav=favs.has(p.id);
    const isCmp=compare.includes(p.id);
    const cp=totalCP(p);
    const hp=p.stats.find(s=>s.stat.name==='hp')?.base_stat ?? '—';
    const atk=p.stats.find(s=>s.stat.name==='attack')?.base_stat ?? '—';
    const def=p.stats.find(s=>s.stat.name==='defense')?.base_stat ?? '—';

    card.innerHTML=`
      <div class="card-top">
        <div class="card-media">
          <img src="${spr}" data-normal="${spr}" data-shiny="${shinySpr}" alt="${p.name}" loading="lazy" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E%3Crect width=%22100%22 height=%22100%22 rx=%2216%22 fill=%22%23121a2e%22/%3E%3Ctext x=%2250%22 y=%2255%22 text-anchor=%22middle%22 font-size=%2228%22 fill=%22%238b93b8%22%3E?%3C/text%3E%3C/svg%3E'">
          <span class="card-id">#${pad3(p.id)}</span>
          <div class="card-actions">
            <button class="mini-btn liked-toggle ${isFav?'liked':''}" aria-label="Favorito" data-fav="${p.id}">${isFav?'♥':'♡'}</button>
            <button class="mini-btn compare ${isCmp?'on':''}" aria-label="Comparar" data-cmp="${p.id}">${isCmp?'✓':'⚖️'}</button>
          </div>
        </div>
      </div>
      <div class="card-body">
        <div class="card-name">${p.name}</div>
        <div class="card-sub"><span>CP ${cp}</span><span>${(p.height/10).toFixed(1)}m</span><span>${(p.weight/10).toFixed(1)}kg</span></div>
        <div class="types">${badges}</div>
        <div class="mini-stats">
          <div class="mini-stat"><b>${hp}</b><i>PS</i></div>
          <div class="mini-stat"><b>${atk}</b><i>ATK</i></div>
          <div class="mini-stat"><b>${def}</b><i>DEF</i></div>
        </div>
      </div>
    `;

    const favBtn=card.querySelector('.liked-toggle');
    favBtn.addEventListener('click', e=>{
      e.stopPropagation(); toggleFav(p.id, favBtn, card);
    });
    const cmpBtn=card.querySelector('.compare');
    cmpBtn.addEventListener('click', e=>{
      e.stopPropagation(); toggleCompare(p.id);
    });

    card.addEventListener('click', ()=> openModal(p));
    card.addEventListener('keydown', e=>{
      if(e.key==='Enter' || e.key===' '){ e.preventDefault(); openModal(p); }
    });

    cardHover(card);
    return card;
  }

  function renderGrid(list){
    let flipState=null;
    if(window.Flip && window.gsap) try{ flipState=Flip.getState('.card'); }catch{}

    $grid.innerHTML='';
    if(!list.length){
      $grid.innerHTML=`<div class="empty"><h3>Sin resultados 🔍</h3><p>Ningún Pokémon coincide con tu filtro. Prueba limpiando tipos o búsqueda.</p><button class="btn-secondary" style="margin-top:.7rem" onclick="document.getElementById('typeFilters').querySelector('.chip').click()">Limpiar filtros</button></div>`;
      $counter.innerHTML=`<b>0</b> resultados`;
      $loadMore.style.display='none';
      hideLoader();
      return;
    }
    const slice=list.slice(0, visibleCount);
    const frag=document.createDocumentFragment();
    slice.forEach(p=> frag.appendChild(createCard(p)));
    $grid.appendChild(frag);

    $counter.innerHTML=`<b>${slice.length}</b> de <b>${list.length}</b> · Gen ${currentGen==='all'?'1-9':currentGen} · <span style="color:var(--accent)">${filtered.length} filtrados</span>`;
    const more = slice.length < list.length;
    $loadMore.style.display = more ? 'inline-block' : 'none';
    $loadMore.disabled=false;
    $loadMore.textContent=`Cargar más +${Math.min(PAGE_SIZE, list.length - slice.length)}`;
    // sentinel visibility
    $sentinel.style.display = more && $infiniteToggle.checked ? 'block' : 'none';

    hideLoader(); hideStatus();
    if(flipState && window.Flip) try{ Flip.from(flipState,{duration:.4,ease:'power2.inOut',stagger:.02,absolute:true}); }catch{}
    animateCards();
    updateCompareBar();
    updateFavCounts();
  }

  // ---- Filtros pipeline ----
  function applyFilters(){
    let out=[...allPokemon];
    // búsqueda: nombre, número, tipo (por si escribe "fire")
    if(searchTerm){
      const term=searchTerm.toLowerCase();
      out=out.filter(p=>{
        const name=p.name.toLowerCase().includes(term);
        const id=String(p.id)===term || pad3(p.id).includes(term);
        const typeHit=p.types.some(t=> t.type.name.includes(term));
        return name||id||typeHit;
      });
    }
    if(activeType!=='all'){
      out=out.filter(p=> p.types.some(t=> t.type.name===activeType));
    }
    if(showFavsOnly) out=out.filter(p=> favs.has(p.id));
    switch(sortBy){
      case 'id-asc': out.sort((a,b)=> a.id-b.id); break;
      case 'id-desc': out.sort((a,b)=> b.id-a.id); break;
      case 'name-asc': out.sort((a,b)=> a.name.localeCompare(b.name)); break;
      case 'name-desc': out.sort((a,b)=> b.name.localeCompare(a.name)); break;
      case 'cp-desc': out.sort((a,b)=> totalCP(b)-totalCP(a)); break;
    }
    filtered=out;
    renderGrid(filtered);
  }

  function clearAll(){
    searchTerm=''; $searchInput.value='';
    activeType='all'; showFavsOnly=false; sortBy='id-asc';
    $sortSelect.value='id-asc';
    $favToggle.classList.remove('active');
    $favToggle.setAttribute('aria-pressed','false');
    document.querySelectorAll('.chip').forEach(b=> b.classList.toggle('active', b.dataset.type==='all'));
    visibleCount=PAGE_SIZE;
    applyFilters();
    showStatus('Filtros limpiados ✓'); setTimeout(hideStatus,1100);
  }

  function toggleFav(id, btn, card){
    const wasFav = favs.has(id);
    if(wasFav){ favs.delete(id); btn.classList.remove('liked'); btn.textContent='♡'; if(card) card.classList.remove('fav'); }
    else { favs.add(id); btn.classList.add('liked'); btn.textContent='♥'; if(card) card.classList.add('fav'); if(window.anime) try{ anime({targets:btn, scale:[1,1.35,1], duration:320, easing:'easeOutBack'});}catch{} }
    saveFavs();
    // feedback
    if(!wasFav) showStatus(`♥ ${allPokemon.find(p=>p.id===id)?.name || id} añadido a favoritos`); else showStatus(`♡ Quitado de favoritos`);
    setTimeout(hideStatus,1200);
    if(showFavsOnly) applyFilters();
    else {
      if(window.gsap) gsap.fromTo(btn,{scale:1.25},{scale:1,duration:.3,ease:'back.out(1.5)'});
      // si estamos en vista favoritos, re-renderiza para quitar
      if(currentView==='favoritos') renderFavSection();
    }
    updateFavCounts();
  }

  // ---- Cargar PokeAPI ----
  async function loadAllPokemon(){
    if(isLoading) return;
    isLoading=true;
    showLoader('Conectando a PokeAPI…');
    const [start,end]=GEN_RANGES[currentGen]||GEN_RANGES['1'];
    const count=end-start+1;

    const cached=getCache();
    if(cached && cached.length===count){
      allPokemon=cached; allPokemon.sort((a,b)=>a.id-b.id);
      visibleCount=PAGE_SIZE; filtered=[...allPokemon];
      hideLoader(); applyFilters(); isLoading=false;
      updateFavCounts(); renderFavSection();
      showStatus(`Cache · ${count} Pokémon cargados ✓`); setTimeout(hideStatus,1400);
      return;
    }
    try{
      const urls=Array.from({length:count},(_,i)=>`https://pokeapi.co/api/v2/pokemon/${start+i}`);
      const data=await fetchWithConcurrency(urls, CONCURRENCY);
      data.sort((a,b)=>a.id-b.id);
      allPokemon=data; setCache(allPokemon);
      visibleCount=PAGE_SIZE; filtered=[...allPokemon];
      renderGrid(filtered); isLoading=false;
      updateFavCounts(); renderFavSection();
      showStatus(`¡${count} Pokémon de PokeAPI! · Gen ${currentGen}`); setTimeout(hideStatus,1600);
    }catch(err){
      console.error(err); isLoading=false; hideLoader();
      showStatus('Error PokeAPI. Revisa tu conexión.',true);
      $grid.innerHTML=`<div class="empty"><h3>Error de red</h3><p>No se pudo conectar a https://pokeapi.co</p><button class="btn-primary" style="margin-top:.7rem" onclick="location.reload()">Reintentar</button></div>`;
    }
  }

  // ---- Infinite scroll ----
  function setupInfinite(){
    if(observer) observer.disconnect();
    observer=new IntersectionObserver((entries)=>{
      if(entries[0].isIntersecting && $infiniteToggle.checked && filtered.length>visibleCount && !isLoading){
        // debounce
        visibleCount+=PAGE_SIZE;
        renderGrid(filtered);
      }
    },{rootMargin:'420px 0px'});
    observer.observe($sentinel);
  }
  $infiniteToggle.addEventListener('change', ()=>{
    $sentinel.style.display = ($infiniteToggle.checked && filtered.length>visibleCount) ? 'block' : 'none';
    $loadMore.style.display = $infiniteToggle.checked ? 'none' : (filtered.length>visibleCount ? 'inline-block':'none');
    if($infiniteToggle.checked) showStatus('Infinite scroll activado · baja para cargar más'); else showStatus(' Infinite desactivado · usa “Cargar más”');
    setTimeout(hideStatus,1300);
  });

  // ---- Modal detalle ----
  let shinyOn=false;
  async function openModal(p){
    shinyOn=false;
    $modalBackdrop.classList.add('open');
    $modalBackdrop.setAttribute('aria-hidden','false');
    document.body.style.overflow='hidden';
    const spr=p.sprites?.other?.['official-artwork']?.front_default || p.sprites?.front_default || '';
    const shiny=p.sprites?.other?.['official-artwork']?.front_shiny || p.sprites?.front_shiny || spr;
    const types=p.types.map(t=>`<span class="badge type-${t.type.name}">${t.type.name}</span>`).join('');
    const idPad=pad3(p.id);
    const cp=totalCP(p);
    $modal.innerHTML=`
      <button class="modal-close" aria-label="Cerrar">✕</button>
      <div class="modal-hero">
        <div class="modal-hero-bg">#${idPad}</div>
        <div class="modal-art" id="modalArt">
          <span id="shinyBadge" class="shiny-badge">✨ SHINY</span>
          <img id="modalImg" src="${spr}" data-normal="${spr}" data-shiny="${shiny}" alt="${p.name}">
          <div class="shiny-switch" role="group" aria-label="Forma del Pokémon">
            <button class="shiny-opt active" data-mode="normal" id="btnNormal" aria-pressed="true">Normal</button>
            <button class="shiny-opt" data-mode="shiny" id="btnShiny" aria-pressed="false">✨ Shiny</button>
          </div>
        </div>
        <div class="modal-info">
          <div class="modal-kicker">PokeAPI · pokemon/${p.id}</div>
          <div class="modal-title">${p.name}</div>
          <div class="modal-types">${types}</div>
          <div class="modal-desc" id="modalDesc">Cargando desde <code>pokemon-species/${p.id}</code>…</div>
          <div class="meta-row">
            <span class="meta">⚖️ ${(p.weight/10).toFixed(1)} kg</span>
            <span class="meta">📏 ${(p.height/10).toFixed(1)} m</span>
            <span class="meta">⚡ CP ${cp}</span>
            <span class="meta">⭐ Exp ${p.base_experience??'—'}</span>
            <button class="meta" id="cryBtn" style="cursor:pointer">🔊 Grito</button>
          </div>
        </div>
      </div>
      <div class="modal-body">
        <div class="section-title">📊 Estadísticas base</div>
        <div class="stats">
          ${p.stats.map(s=>`<div class="stat"><span>${s.stat.name.replace('special-','s.').replace('hp','ps')}</span><div class="bar"><div class="fill" data-w="${Math.min(100,Math.round(s.base_stat/1.55))}" style="width:0"></div></div><b>${s.base_stat}</b></div>`).join('') || '<p>Sin datos</p>'}
        </div>
        <div style="margin-top:1rem"><div class="section-title">✨ Habilidades</div><div class="chips">${p.abilities.map(a=>`<span class="chip-sm ${a.is_hidden?'ghost':''}">${a.ability.name}${a.is_hidden?' (oculta)':''}</span>`).join('')}</div></div>
        <div class="actions">
          <button class="btn-primary" id="favModalBtn">${favs.has(p.id)?'♥ Quitar de favoritos':'♡ Añadir a favoritos'}</button>
          <button class="btn-secondary" id="cmpModalBtn">${compare.includes(p.id)?'✓ Quitar de comparador':'⚖️ Añadir a comparador'}</button>
          <button class="btn-secondary" id="closeModalBtn">Cerrar</button>
        </div>
      </div>
    `;
    $modal.querySelector('.modal-close').addEventListener('click', closeModal);
    $modal.querySelector('#closeModalBtn').addEventListener('click', closeModal);
    $modal.querySelector('#btnNormal').addEventListener('click', ()=> setShinyMode(false));
    $modal.querySelector('#btnShiny').addEventListener('click', ()=> setShinyMode(true));
    $modal.querySelector('#cryBtn').addEventListener('click', ()=> playCry(p.id));
    $modal.querySelector('#favModalBtn').addEventListener('click', ()=>{
      const b=$modal.querySelector('#favModalBtn');
      if(favs.has(p.id)){ favs.delete(p.id); b.textContent='♡ Añadir a favoritos'; } else { favs.add(p.id); b.textContent='♥ Quitar de favoritos'; }
      saveFavs(); applyFilters();
    });
    $modal.querySelector('#cmpModalBtn').addEventListener('click', ()=>{
      toggleCompare(p.id);
      const b=$modal.querySelector('#cmpModalBtn');
      b.textContent= compare.includes(p.id)?'✓ Quitar de comparador':'⚖️ Añadir a comparador';
    });
    $modalBackdrop.addEventListener('click', onBackdrop);
    fetchSpecies(p.id);
    animateModal($modalBackdrop,$modal);
    $modal.querySelector('.modal-close').focus();
  }
  function onBackdrop(e){ if(e.target=== $modalBackdrop) closeModal(); }
  function closeModal(){
    if(window.gsap){
      gsap.to($modal,{scale:.92,y:10,opacity:0,duration:.2,ease:'power2.in'});
      gsap.to($modalBackdrop,{opacity:0,duration:.2,delay:.06,onComplete:()=>{
        $modalBackdrop.classList.remove('open'); $modalBackdrop.setAttribute('aria-hidden','true');
        document.body.style.overflow=''; $modalBackdrop.removeEventListener('click',onBackdrop);
      }});
    } else { $modalBackdrop.classList.remove('open'); document.body.style.overflow=''; $modalBackdrop.removeEventListener('click',onBackdrop); }
  }
  function setShinyMode(isShiny){
    const img=document.getElementById('modalImg');
    const art=document.getElementById('modalArt');
    const badge=document.getElementById('shinyBadge');
    const btnN=document.getElementById('btnNormal');
    const btnS=document.getElementById('btnShiny');
    if(!img || !art) return;
    if(isShiny===shinyOn) return;
    shinyOn=isShiny;
    const nxt= shinyOn? img.dataset.shiny : img.dataset.normal;
    // UI estado
    if(btnN) { btnN.classList.toggle('active', !shinyOn); btnN.setAttribute('aria-pressed', String(!shinyOn)); }
    if(btnS) { btnS.classList.toggle('active', shinyOn); btnS.setAttribute('aria-pressed', String(shinyOn)); }
    if(badge) badge.classList.toggle('show', shinyOn);
    if(art) art.classList.toggle('is-shiny', shinyOn);
    // animación flip
    if(window.gsap){
      gsap.to(img,{rotationY:90,duration:.2,ease:'power2.in',onComplete:()=>{
        img.src=nxt;
        gsap.fromTo(img,{rotationY:-90},{rotationY:0,duration:.3,ease:'back.out(1.4)'});
        if(shinyOn && window.anime) try{ anime({targets:badge, scale:[.8,1], duration:320, easing:'easeOutBack'});}catch{}
      }});
    } else {
      img.src=nxt;
    }
  }
  // compat: mantiene función antigua por si se llama
  function toggleShiny(){ setShinyMode(!shinyOn); }
  async function fetchSpecies(id){
    const el=document.getElementById('modalDesc'); if(!el) return;
    try{
      const r=await fetch(`https://pokeapi.co/api/v2/pokemon-species/${id}`);
      if(!r.ok) throw new Error();
      const s=await r.json();
      let e=s.flavor_text_entries.find(x=> x.language.name==='es');
      if(!e) e=s.flavor_text_entries.find(x=> x.language.name==='en');
      let text=e? e.flavor_text.replace(/\f/g,' ').replace(/\n/g,' ') : 'Sin descripción.';
      const genus=(s.genera.find(g=>g.language.name==='es')||s.genera.find(g=>g.language.name==='en'))?.genus || '';
      const hab=s.habitat?.name || 'desconocido';
      el.innerHTML=`<strong>${genus}</strong><br>${text}<br><small style="opacity:.7">Hábitat: ${hab} · Color: ${s.color?.name||'—'} · Felicidad: ${s.base_happiness} · </small><code style="font-size:.7rem;background:rgba(255,255,255,.08);padding:.1rem .3rem;border-radius:4px">species/${id}</code>`;
      if(window.anime) try{ anime({targets:el, opacity:[0,1], translateY:[6,0], duration:380, easing:'easeOutQuad'});}catch{}
    }catch{ el.textContent='No se pudo cargar la descripción de PokeAPI.'; }
  }
  function playCry(id){
    const a=new Audio(`https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/${id}.ogg`);
    a.volume=.6; a.play().catch(()=>{
      const b=new Audio(`https://play.pokemonshowdown.com/audio/cries/${String(id).padStart(3,'0')}.mp3`);
      b.volume=.6; b.play().catch(()=> showStatus('No se pudo reproducir el grito',true));
    });
    const btn=document.getElementById('cryBtn'); if(btn&&window.anime) try{ anime({targets:btn, scale:[1,1.12,1], duration:260});}catch{}
  }

  // ---- Search & Events ----
  const handleSearch=debounce(()=>{
    searchTerm=$searchInput.value.trim();
    visibleCount=PAGE_SIZE; applyFilters();
    if(searchTerm && filtered.length===0) showStatus(`Sin resultados para “${searchTerm}”`,true);
    else hideStatus();
  },280);
  function searchNow(){
    searchTerm=$searchInput.value.trim();
    visibleCount=PAGE_SIZE; applyFilters();
    if(searchTerm && filtered.length===0) showStatus(`Sin resultados para “${searchTerm}”`,true);
  }

  function bindEvents(){
    $searchInput.addEventListener('input', handleSearch);
    $searchInput.addEventListener('keydown', e=>{
      if(e.key==='Enter'){ e.preventDefault(); searchNow(); }
      if(e.key==='Escape'){ $searchInput.value=''; searchTerm=''; applyFilters(); }
    });
    $searchBtn.addEventListener('click', searchNow);
    $sortSelect.addEventListener('change', e=>{ sortBy=e.target.value; visibleCount=PAGE_SIZE; applyFilters(); });
    $genSelect.addEventListener('change', e=>{ currentGen=e.target.value; visibleCount=PAGE_SIZE; loadAllPokemon(); });
    $favToggle.addEventListener('click', ()=>{
      showFavsOnly=!showFavsOnly;
      $favToggle.classList.toggle('active', showFavsOnly);
      $favToggle.setAttribute('aria-pressed', String(showFavsOnly));
      visibleCount=PAGE_SIZE; applyFilters();
      if(showFavsOnly && filtered.length===0) showStatus('Aún no tienes favoritos ♥',true);
      // también cambia a vista explorar si filtra
      if(showFavsOnly) switchView('explorar');
    });
    if($tabExplorar) $tabExplorar.addEventListener('click', ()=> switchView('explorar'));
    if($tabFavoritos) $tabFavoritos.addEventListener('click', ()=> switchView('favoritos'));
    if($goFavSection) $goFavSection.addEventListener('click', (e)=>{ e.preventDefault(); switchView('favoritos'); });
    if($clearFavsBtn) $clearFavsBtn.addEventListener('click', ()=>{
      if(favs.size===0) return;
      if(confirm(`¿Vaciar ${favs.size} favoritos?`)){
        favs.clear(); saveFavs(); applyFilters(); renderFavSection();
        showStatus('Favoritos vaciados ♡'); setTimeout(hideStatus,1200);
      }
    });
    if($exportFavsBtn) $exportFavsBtn.addEventListener('click', ()=>{
      if(favs.size===0){ showStatus('Nada que exportar. Añade favoritos ♥',true); return; }
      const list=[...favs].sort((a,b)=>a-b);
      const favMons=list.map(id=> allPokemon.find(p=>p.id===id)).filter(Boolean);
      const txt=favMons.map(p=>`#${pad3(p.id)} ${p.name} - ${p.types.map(t=>t.type.name).join('/')} - CP ${totalCP(p)}`).join('\n');
      const blob=new Blob([`Favoritos Pokédex NEO LAB - ${new Date().toLocaleString()}\nTotal: ${list.length}\n\n${txt}\n`],{type:'text/plain'});
      const url=URL.createObjectURL(blob);
      const a=document.createElement('a'); a.href=url; a.download=`favoritos-pokedex-${Date.now()}.txt`; a.click(); URL.revokeObjectURL(url);
      showStatus(`Exportados ${list.length} favoritos ✓`); setTimeout(hideStatus,1400);
    });
    $loadMore.addEventListener('click', ()=>{
      $loadMore.disabled=true; $loadMore.textContent='Cargando…';
      setTimeout(()=>{ visibleCount+=PAGE_SIZE; renderGrid(filtered); if(window.gsap) gsap.to(window,{duration:.4, scrollTo:{y:window.scrollY+220}, ease:'power2.out'}); },180);
    });
    document.addEventListener('keydown', e=>{
      if(e.key==='Escape'){
        if($compareBackdrop.classList.contains('open')) closeCompare();
        else if($modalBackdrop.classList.contains('open')) closeModal();
      }
      if(e.key==='/' && document.activeElement!==$searchInput && !$modalBackdrop.classList.contains('open') && !$compareBackdrop.classList.contains('open')){
        e.preventDefault(); $searchInput.focus();
      }
    });
    document.addEventListener('click', e=>{
      if(e.target && e.target.textContent==='Limpiar filtros') clearAll();
    });
  }

  function init(){
    buildTypeFilters();
    bindEvents();
    setupInfinite();
    animateHeader();
    updateCompareBar();
    updateFavCounts();
    renderFavSection();
    // inicia ocultando favSection (vista explorar)
    if($favSection) $favSection.style.display='none';
    loadAllPokemon();
    if(window.gsap && window.ScrollTrigger) try{ gsap.registerPlugin(ScrollTrigger, Flip);}catch{}
    // si hay hash #favoritos abre esa vista
    if(location.hash==='#favoritos' || location.hash==='#favSection') switchView('favoritos');
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
