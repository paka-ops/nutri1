/* ══════════════════════════════════════════════════════════════
   OMS · Nutrition Surveillance — contrôleur du composant
   Monté dans <section id="fao"> · pays par défaut : Togo (TG)
   Synchronisé avec les sélecteurs pays / langue de la plateforme
   ══════════════════════════════════════════════════════════════ */
window.WHO_SURV = (function(){
"use strict";
const DATA=window.WHO_SURV_DATA, CH=window.WHO_SURV_CH, I18N=window.WHO_SURV_I18N;
const QC=["NE","ML","BF","SN","NG"]; /* chips rapides */
const SERIES_BASE=[["NE","#0066CC"],["ML","#FF6B35"],["BF","#7C3AED"],["SN","#00A86B"],["NG","#F59E0B"]];
const PALETTE=["#0066CC","#00A86B","#FF6B35","#7C3AED","#EC4899","#0891B2"];

const state={
  country:(()=>{
    const c=(document.getElementById('country')?.value)||localStorage.getItem('nutri_country')||'TG';
    return DATA.get(c).code==='ALL'?'TG':(DATA.get(c)===DATA.REG?'TG':c);
  })(),
  year:2024, metric:'stunting',
  seriesOff:new Set(), radar:[], heatSort:{col:0,dir:-1},
  scSort:{key:'s',dir:-1}, search:'',
  lang:'fr', built:false, shown:false, dirty:true
};

/* ── i18n & formatage ── */
function detectLang(){
  const loc=((window.NUTRI_I18N&&window.NUTRI_I18N.locale)||localStorage.getItem('nutri_language')||'fr').toLowerCase();
  if(loc.indexOf('fr')===0)return'fr';
  if(loc.indexOf('en')===0)return'en';
  const c=DATA.get(state.country);
  const frZone=['NE','ML','BF','SN','GN','CI','TG','BJ','GW'].includes(state.country);
  return frZone?'fr':'en';
}
function t(key,params){
  let s=(I18N[state.lang]&&I18N[state.lang][key])||I18N.en[key]||key;
  if(params)Object.keys(params).forEach(k=>{s=s.split('{'+k+'}').join(params[k])});
  return s;
}
function fmt(n,dec){
  dec=dec||0;
  try{return new Intl.NumberFormat(state.lang==='fr'?'fr-FR':'en-US',{minimumFractionDigits:dec,maximumFractionDigits:dec}).format(n)}catch(e){return String(n)}
}
function toastMsg(s){ if(window.toast){window.toast(s)} }
function D(){return DATA.get(state.country)}
function adj(v,delta){return Math.round((v+(2024-state.year)*(-delta))*10)/10}
const cname=d=>DATA.name(d,state.lang);

/* ── icônes SVG ── */
const IC={
  logo:'<svg viewBox="0 0 24 24"><path d="M12 3v18M3 12h18" stroke="#fff" stroke-width="3.4" stroke-linecap="round"/></svg>',
  overview:'<svg viewBox="0 0 24 24"><path d="M4 20V10M10 20V4M16 20v-7M21 20H3"/></svg>',
  anthro:'<svg viewBox="0 0 24 24"><circle cx="12" cy="5" r="2.4"/><path d="M12 8v7M12 15l-4 6M12 15l4 6M7 11l5-2 5 2"/></svg>',
  micro:'<svg viewBox="0 0 24 24"><path d="M12 3s6 6.7 6 11a6 6 0 1 1-12 0c0-4.3 6-11 6-11z"/></svg>',
  anje:'<svg viewBox="0 0 24 24"><circle cx="12" cy="7" r="3"/><path d="M6 21c0-3.3 2.7-6 6-6s6 2.7 6 6M9 7.5h.01M15 7.5h.01"/></svg>',
  map:'<svg viewBox="0 0 24 24"><path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14"/></svg>',
  reports:'<svg viewBox="0 0 24 24"><path d="M7 3h8l4 4v14H7zM15 3v4h4M10 12h6M10 16h6"/></svg>',
  chart:'<svg viewBox="0 0 24 24"><path d="M4 19h16M7 15l4-5 3 3 5-7"/></svg>',
  child:'<svg viewBox="0 0 24 24"><circle cx="9" cy="5" r="2.6"/><path d="M9 8v6l-3 7M9 14l3 7M5 11l4-1.5L13 11M17 4v14M15.5 6h3M15.5 16h3"/></svg>',
  scale:'<svg viewBox="0 0 24 24"><path d="M12 3v4M6 7h12M6 7l-3 6a3.5 3.5 0 0 0 7 0L7 7M18 7l-3 6a3.5 3.5 0 0 0 7 0l-3-6M12 7v14M8 21h8"/></svg>',
  drop:'<svg viewBox="0 0 24 24"><path d="M12 3s6 6.7 6 11a6 6 0 1 1-12 0c0-4.3 6-11 6-11z"/></svg>',
  pill:'<svg viewBox="0 0 24 24"><rect x="3" y="9" width="18" height="7" rx="3.5" transform="rotate(-35 12 12)"/><path d="M9.5 8.5l5 5"/></svg>',
  balance:'<svg viewBox="0 0 24 24"><path d="M12 3v18M4 21h16M12 6l-6 2 2 5a3 3 0 0 1-4 0l2-5M12 6l6 2-2 5a3 3 0 0 0 4 0l-2-5"/></svg>'
};

/* ── squelette HTML ── */
function kpiCard(n,icon,color,bodyExtra){
  return `<div class="who-kpi" style="--kc:${color}" id="whoKpi${n}">
    <div class="who-kpi-top"><div class="who-kpi-ic">${icon}</div><div class="who-kpi-val" id="whoKv${n}">—</div></div>
    <div class="who-kpi-lb" id="whoKl${n}"></div><div class="who-kpi-sub" id="whoKs${n}"></div>
    <div id="whoKb${n}"></div>${bodyExtra}
  </div>`;
}
function chartCard(id,titleKey,subKey,hCls,tools){
  return `<article class="who-card"><div class="who-card-h">
    <div><h3>${IC.chart}<span data-wt="${titleKey}"></span></h3><p data-wt="${subKey}"></p></div>
    <div class="who-card-tools" id="${id}Tools">${tools||''}</div></div>
    <div class="who-cvh ${hCls}"><canvas id="${id}"></canvas></div>
    <div id="${id}Foot"></div></article>`;
}
function chipsHTML(){
  const chipMenu=DATA.codes.filter(c=>!QC.includes(c));
  return `
    <button class="who-chip" data-c="ALL">🌍 <span data-wt="chip.all"></span></button>
    ${QC.map(c=>{const d=DATA.get(c);return `<button class="who-chip" data-c="${c}">${d.flag} ${state.lang==='fr'?d.fr:d.en}</button>`}).join('')}
    <div class="who-chip-more">
      <button class="who-chip" id="whoMoreBtn">+ ${chipMenu.length} <span data-wt="chip.more"></span> ▾</button>
      <div class="who-chip-menu" id="whoMoreMenu">
        ${chipMenu.map(c=>{const d=DATA.get(c);return `<button data-c="${c}">${d.flag} ${state.lang==='fr'?d.fr:d.en}<small>${c}</small></button>`}).join('')}
      </div>
    </div>`;
}
function build(root){
  root.innerHTML=`
  <div class="who-shell">
    <aside class="who-side">
      <div class="who-logo-row"><div class="who-logo">${IC.logo}</div>
        <div><b data-wt="app.name"></b><span data-wt="app.sub"></span></div></div>
      <button class="who-nav on" data-wg="overview">${IC.overview}<span data-wt="nav.overview"></span></button>
      <button class="who-nav" data-wg="anthro">${IC.anthro}<span data-wt="nav.anthro"></span></button>
      <button class="who-nav" data-wg="micro">${IC.micro}<span data-wt="nav.micro"></span></button>
      <button class="who-nav" data-wg="anje">${IC.anje}<span data-wt="nav.anje"></span></button>
      <button class="who-nav" data-wg="map">${IC.map}<span data-wt="nav.map"></span></button>
      <button class="who-nav" data-wg="reports">${IC.reports}<span data-wt="nav.reports"></span></button>
      <div class="who-side-foot" data-wth="side.foot"></div>
    </aside>
    <div class="who-main">
      <header class="who-head">
        <div class="who-crumb"><b>OMS</b> / <span data-wt="misc.region"></span> / <span id="whoCrumbYear">2024</span></div>
        <div class="who-head-main">
          <div><h1 data-wt="title"></h1><p class="who-head-sub" id="whoSub"></p></div>
          <div class="who-head-tools">
            <span class="who-live"><i></i><span data-wt="live"></span></span>
            <select class="who-select" id="whoYear">
              <option>2025</option><option selected>2024</option><option>2023</option><option>2022</option>
            </select>
            <button class="who-export" id="whoExport">⇩ <span data-wt="export"></span></button>
          </div>
        </div>
        <div class="who-chips" id="whoChips">${chipsHTML()}</div>
      </header>
      <div class="who-content" id="whoContent">

        <section class="who-group" id="whoGrpOverview" data-wg="overview">
          <div class="who-group-title" data-wt="grp.overview"></div>
          <div class="who-kpis">
            ${kpiCard(1,IC.child,'#0066CC','<div class="who-kpi-cv"><canvas id="whoKpiSpark"></canvas></div>')}
            ${kpiCard(2,IC.scale,'#FF6B35','<div class="who-kpi-cv"><canvas id="whoKpiGauge"></canvas></div>')}
            ${kpiCard(3,IC.drop,'#EF4444','<div class="who-kpi-cv"><canvas id="whoKpiBars"></canvas></div>')}
            ${kpiCard(4,IC.pill,'#00A86B',`<div class="who-progress"><i id="whoKpiProgI"></i><em id="whoKpiProgT"><span>80%</span></em></div>
              <div class="who-kpi-foot"><span id="whoKpiFoot4"></span></div>`)}
            ${kpiCard(5,IC.balance,'#7C3AED',`<div class="who-kpi-donut"><div class="who-kpi-cv"><canvas id="whoKpiDonut"></canvas></div>
              <div class="who-legend-mini" id="whoKpiDbL"></div></div>`)}
          </div>
          <div class="who-grid who-g-6040">
            ${chartCard('whoC1','c1.title','c1.sub','who-h340','<div class="who-legend round" id="whoC1Chips"></div>')}
            ${chartCard('whoC2','c2.title','c2.sub','who-h420',
              `<div class="who-seg" id="whoC2Seg">
                 <button data-m="stunting" class="on" data-wt="c2.stunting"></button>
                 <button data-m="wasting" data-wt="c2.wasting"></button>
                 <button data-m="anemia" data-wt="c2.anemia"></button>
                 <button data-m="vita" data-wt="c2.vita"></button>
               </div>`)}
          </div>
          <div class="who-grid who-g-321">
            ${chartCard('whoC5','c5.title','c5.sub','who-h300')}
            ${chartCard('whoC7','c7.title','c7.sub','who-h340','<span class="who-badge down" id="whoC7Badge" style="font-size:12.5px"></span>')}
          </div>
        </section>

        <section class="who-group" id="whoGrpAnthropo" data-wg="anthro">
          <div class="who-group-title" data-wt="grp.anthro"></div>
          <div class="who-grid who-g-5050">
            ${chartCard('whoC6','c6.title','c6.sub','who-h380','<span class="who-badge flat" data-wt="c6.zoom" style="font-size:10px"></span>')}
            ${chartCard('whoC12','c12.title','c12.sub','who-h380')}
          </div>
        </section>

        <section class="who-group" id="whoGrpMicro" data-wg="micro">
          <div class="who-group-title" data-wt="grp.micro"></div>
          <div class="who-grid who-g-5050">
            ${chartCard('whoC3','c3.title','c3.sub','who-h360',
              '<div class="who-radar-sel"><select id="whoRadar0"></select><select id="whoRadar1"></select><select id="whoRadar2"></select></div>')}
            ${chartCard('whoC10','c10.title','c10.sub','who-h360')}
          </div>
          ${chartCard('whoC14','c14.title','c14.sub','who-h340')}
        </section>

        <section class="who-group" id="whoGrpAnje" data-wg="anje">
          <div class="who-group-title" data-wt="grp.anje"></div>
          <div class="who-grid who-g-6040">
            ${chartCard('whoC9','c9.title','c9.sub','who-h360')}
            ${chartCard('whoC4','c4.title','c4.sub','who-h360')}
          </div>
          <div class="who-grid who-g-321">
            ${chartCard('whoC13','c13.title','c13.sub','who-h320')}
            ${chartCard('whoC11','c11.title','c11.sub','who-h320')}
          </div>
        </section>

        <section class="who-group" id="whoGrpMap" data-wg="map">
          <div class="who-group-title" data-wt="grp.map"></div>
          ${chartCard('whoC8','c8.title','c8.sub','who-h600')}
          <article class="who-card" id="whoC15Card">
            <div class="who-card-h"><div><h3>${IC.chart}<span data-wt="c15.title"></span></h3><p data-wt="c15.sub"></p></div>
            <div class="who-card-tools"><input class="who-search" id="whoSearch" data-wtp="c15.search"></div></div>
            <div class="who-table-wrap"><table class="who-table" id="whoTable"></table></div>
          </article>
        </section>

        <section class="who-group" id="whoGrpReports" data-wg="reports">
          <div class="who-group-title" data-wt="grp.reports"></div>
          <article class="who-card"><div class="who-card-h"><div><h3>${IC.reports}<span data-wt="rep.title"></span></h3><p data-wt="rep.sub"></p></div></div>
            ${[1,2,3,4].map(i=>`<div class="who-rep-row"><div class="who-rep-ic">${IC.reports}</div>
              <div><b data-wt="rep${i}.t"></b><small data-wt="rep${i}.s"></small></div>
              <button class="who-export" data-rep="${i}">⇩ <span data-wt="rep.dl"></span></button></div>`).join('')}
          </article>
        </section>

      </div>
    </div>
  </div>
  <div class="who-tip" id="whoTip"></div>`;
  state.built=true;
}

/* ── textes statiques ── */
function fillTexts(){
  const root=document.getElementById('whoSurveillance');if(!root)return;
  root.querySelectorAll('[data-wt]').forEach(el=>{el.textContent=t(el.dataset.wt)});
  root.querySelectorAll('[data-wth]').forEach(el=>{el.innerHTML=t(el.dataset.wth)});
  root.querySelectorAll('[data-wtp]').forEach(el=>{el.placeholder=t(el.dataset.wtp)});
}

/* ── chips pays ── */
function renderChips(){
  const root=document.getElementById('whoSurveillance');if(!root)return;
  root.querySelectorAll('#whoChips .who-chip[data-c]').forEach(b=>{
    b.classList.toggle('on',b.dataset.c===state.country);
  });
  const inMore=!QC.includes(state.country)&&state.country!=='ALL';
  const moreBtn=root.querySelector('#whoMoreBtn');
  if(moreBtn)moreBtn.classList.toggle('on',inMore);
  root.querySelectorAll('#whoMoreMenu button').forEach(b=>b.classList.toggle('on',b.dataset.c===state.country));
}

/* ── KPI ── */
function badge(delta,unit,goodDown){
  const stable=Math.abs(delta)<0.05;
  if(stable)return`<span class="who-badge flat">→ ${t('badge.stable')}</span>`;
  const up=delta>0, good=goodDown?!up:up;
  return`<span class="who-badge ${good?'down':'up'}">${up?'↑':'↓'} ${up?'+':'−'}${fmt(Math.abs(delta),1)} ${unit} ${t('vs')} 2023</span>`;
}
function renderKPIs(animate){
  const d=D(), o={animate,fmt,lang:state.lang,t};
  const isAll=d.code==='ALL';
  const ctx=I18N[state.lang];
  /* 1 — stunting */
  const s=adj(d.s,d.deltas.s);
  document.getElementById('whoKv1').innerHTML=fmt(s,1)+'<small>%</small>';
  document.getElementById('whoKl1').textContent=ctx['kpi1.label'];
  document.getElementById('whoKs1').textContent=isAll?ctx['kpi1.sub']:ctx['kpi1.subC']+' · '+cname(d);
  document.getElementById('whoKb1').innerHTML=badge(d.deltas.s,ctx['pts'],true);
  CH.sparkBars(document.getElementById('whoKpiSpark'),d.spark12.map(v=>isAll?v:v+(d.s-28.4)),o);
  /* 2 — wasting */
  const w=adj(d.w,d.deltas.w);
  document.getElementById('whoKv2').innerHTML=fmt(w,1)+'<small>%</small>';
  document.getElementById('whoKl2').textContent=ctx['kpi2.label'];
  document.getElementById('whoKs2').textContent=ctx['kpi2.sub'];
  document.getElementById('whoKb2').innerHTML=badge(d.deltas.w,ctx['pts'],true);
  CH.kpiGauge(document.getElementById('whoKpiGauge'),w,10,{...o,fmt});
  /* 3 — anémie femmes */
  const a=adj(d.a,d.deltas.a);
  document.getElementById('whoKv3').innerHTML=fmt(a,1)+'<small>%</small>';
  document.getElementById('whoKl3').textContent=isAll?ctx['kpi3.label']:ctx['kpi3.subC'];
  document.getElementById('whoKs3').textContent=isAll?ctx['kpi3.sub']:cname(d);
  document.getElementById('whoKb3').innerHTML=badge(d.deltas.a,ctx['pts'],true);
  const top5=[...DATA.list].sort((x,y)=>y.a-x.a).slice(0,5)
    .map(c=>({name:state.lang==='fr'?c.fr:c.en,val:c.a}));
  if(!isAll&&!top5.some(x=>x.name===cname(d)))top5[4]={name:cname(d),val:d.a};
  CH.kpiHBars(document.getElementById('whoKpiBars'),top5,o);
  /* 4 — vitamine A */
  const v=adj(d.v,d.deltas.v);
  document.getElementById('whoKv4').innerHTML=fmt(v,1)+'<small>%</small>';
  document.getElementById('whoKl4').textContent=ctx['kpi4.label'];
  document.getElementById('whoKs4').textContent=ctx['kpi4.sub'];
  document.getElementById('whoKb4').innerHTML=badge(d.deltas.v,ctx['pts'],false);
  const pi=document.getElementById('whoKpiProgI');
  pi.style.width='0%';requestAnimationFrame(()=>{pi.style.width=Math.min(v,100)+'%'});
  const n80=DATA.list.filter(c=>c.v>=80).length;
  document.getElementById('whoKpiFoot4').textContent=n80+' '+ctx['kpi4.countries'];
  /* 5 — double fardeau */
  if(isAll){
    document.getElementById('whoKv5').innerHTML='11 <small style="font-size:13px">'+ctx['kpi5.countries']+'</small>';
  }else{
    const lbl=d.db==='sev'?ctx['kpi5.sev']:d.db==='mod'?ctx['kpi5.mod']:ctx['kpi5.non'];
    document.getElementById('whoKv5').innerHTML='<span style="font-size:22px">'+lbl+'</span>';
  }
  document.getElementById('whoKl5').textContent=ctx['kpi5.label'];
  document.getElementById('whoKs5').textContent=ctx['kpi5.sub'];
  document.getElementById('whoKb5').innerHTML=`<span class="who-badge warn">↑ +2 ${ctx['pts']} ${t('vs')} 2023</span>`;
  CH.kpiDonut(document.getElementById('whoKpiDonut'),[
    {val:5,color:'#EF4444'},{val:6,color:'#FF6B35'},{val:5,color:'#10B981'}],o);
  document.getElementById('whoKpiDbL').innerHTML=
    `<span><i style="background:#EF4444"></i>${ctx['kpi5.sev']} · 5</span>
     <span><i style="background:#FF6B35"></i>${ctx['kpi5.mod']} · 6</span>
     <span><i style="background:#10B981"></i>${ctx['kpi5.non']} · 5</span>`;
}

/* ── graphiques ── */
function seriesForC1(){
  const d=D();
  const list=SERIES_BASE.map(([code,color])=>{
    const c=DATA.get(code);
    return{code,color,name:cname(c),vals:c.stunt,on:!state.seriesOff.has(code),sel:state.country===code};
  });
  if(d.code!=='ALL'&&!list.some(s=>s.code===d.code)){
    list.push({code:d.code,color:'#EC4899',name:cname(d),vals:d.stunt,on:!state.seriesOff.has(d.code),sel:true});
  }
  return list;
}
function renderCharts(animate){
  const d=D(), o={animate,fmt,lang:state.lang,t,year:state.year};
  const vis=id=>{const el=document.getElementById(id);return el&&el.clientWidth>0?el:null};
  /* C1 */
  const c1=vis('whoC1');
  if(c1){
    const series=seriesForC1();
    CH.c1Stunting(c1,{...o,series});
    const chips=document.getElementById('whoC1Chips');
    chips.innerHTML=series.map(s=>`<span style="cursor:pointer;opacity:${s.on?1:.38}" data-tog="${s.code}" title="${t('c1.toggle')}"><i style="background:${s.color}"></i>${s.name}</span>`).join('');
    chips.querySelectorAll('[data-tog]').forEach(sp=>sp.onclick=()=>{
      const code=sp.dataset.tog;
      state.seriesOff.has(code)?state.seriesOff.delete(code):state.seriesOff.add(code);
      renderCharts(false);
    });
  }
  /* C2 */
  const c2=vis('whoC2');
  if(c2){
    const m=state.metric;
    const keyOf={stunting:'s',wasting:'w',anemia:'a',vita:'v'}[m];
    const rows=[...DATA.list].sort((x,y)=>y[keyOf]-x[keyOf]).map(c=>({
      flag:c.flag,name:cname(c),val:adj(c[keyOf],c.deltas[keyOf==='s'?'s':keyOf==='w'?'w':keyOf==='a'?'a':'v']||0),sel:state.country===c.code
    }));
    const cfg={stunting:{max:50,thr:20,lb:t('c2.threshold')},wasting:{max:17,thr:10,lb:'10%'},anemia:{max:78,thr:50,lb:'50%'},vita:{max:95,thr:80,lb:'80%'}}[m];
    document.querySelectorAll('#whoC2Seg button').forEach(b=>b.classList.toggle('on',b.dataset.m===m));
    CH.c2Rank(c2,{...o,rows,maxV:cfg.max,threshold:cfg.thr,thrLabel:cfg.lb,metric:m,metricLabel:t('c2.'+m)});
  }
  /* C3 */
  const c3=vis('whoC3');
  if(c3){
    if(!state.radar.length){
      const base=d.code!=='ALL'?[d.code]:['NE'];
      state.radar=[...new Set([...base,'SN','GH'])].slice(0,3);
      while(state.radar.length<3)state.radar.push('ML');
    }
    [0,1,2].forEach(i=>{
      const sel=document.getElementById('whoRadar'+i);
      if(sel&&!sel.options.length){
        sel.innerHTML=DATA.codes.map(code=>{const c=DATA.get(code);return `<option value="${code}">${c.flag} ${cname(c)}</option>`}).join('');
        sel.onchange=()=>{state.radar[i]=sel.value;renderCharts(true)};
      }
      if(sel)sel.value=state.radar[i];
    });
    CH.c3Radar(c3,{...o,
      axes:[t('ax.stunting'),t('ax.wasting'),t('ax.anemia'),t('ax.vita'),t('ax.iodine'),t('ax.maternal')],
      bench:[12,10,25,15,12,15],
      countries:state.radar.map((code,i)=>{const c=DATA.get(code);return{code,name:cname(c),color:PALETTE[i],vals:c.radar}}),
      centerVal:DATA.radarCenter()
    });
    const f=document.getElementById('whoC3Foot');
    if(f)f.innerHTML=`<div class="who-legend round"><span><i style="background:transparent;border:1.6px dashed #EF4444;width:12px;height:12px"></i>${t('c3.bench')}</span></div>`;
  }
  /* C4 */
  const c4=vis('whoC4');
  if(c4)CH.c4Season(c4,{...o,y23:d.season23,y24:d.season24});
  /* C5 */
  const c5=vis('whoC5');
  if(c5){
    const mn=d.malnut;
    CH.c5Donut(c5,{...o,popU5:d.popU5,total:mn.mas+mn.mam,centerSub:state.country==='ALL'?t('misc.region'):cname(d),
      parts:[
        {key:'mas',label:t('c5.mas'),val:mn.mas,color:'#EF4444'},
        {key:'mam',label:t('c5.mam'),val:mn.mam,color:'#F59E0B'},
        {key:'risk',label:t('c5.risk'),val:mn.risk,color:'#FCD34D'},
        {key:'normal',label:t('c5.normal'),val:mn.normal,color:'#10B981'}
      ]});
    const f=document.getElementById('whoC5Foot'),mn2=d.malnut;
    if(f)f.innerHTML=`<div class="who-legend-2x2">
      ${[['#EF4444','c5.mas',mn2.mas],['#F59E0B','c5.mam',mn2.mam],['#FCD34D','c5.risk',mn2.risk],['#10B981','c5.normal',mn2.normal]]
        .map(([cc,kk,vv])=>`<span><i style="background:${cc}"></i>${t(kk)} · ${fmt(vv,1)}%<small>${fmt(d.popU5*vv/100*1e6,0)} ${t('c5.children')}</small></span>`).join('')}
    </div>`;
  }
  /* C6 */
  const c6=vis('whoC6');
  if(c6)CH.c6Bubble(c6,{...o,pts:DATA.list.map(c=>({code:c.code,flag:c.flag,name:cname(c),zone:c.zone,gdp:c.gdpJitter,s:c.s,popU5:c.popU5,sel:state.country===c.code}))});
  /* C7 */
  const c7=vis('whoC7');
  if(c7){
    const start=Math.round(d.stunt[1]*10)/10, end=d.s;
    const spec=[2.1,1.8,1.4,2.3,1.2], k=(start-end)/8.8;
    const items=[{label:t('c7.start'),type:'start',val:start,from:0,to:start}];
    let level=start;
    spec.forEach((sv,i)=>{
      const cut=Math.round(sv*k*10)/10;
      items.push({label:t('c7.i'+(i+1)),type:'cut',val:cut,from:level,to:level-cut});
      level-=cut;
    });
    items.push({label:t('c7.result'),type:'end',val:end,from:0,to:end});
    const bd=document.getElementById('whoC7Badge');
    if(bd)bd.textContent='↓ −'+fmt(start-end,1)+' pts · '+t('c7.total');
    CH.c7Waterfall(c7,{...o,items,maxV:start});
  }
  /* C8 */
  const c8=vis('whoC8');
  if(c8){
    const headers=[t('ind.stunting'),t('ind.wasting'),t('ind.anemia'),t('ind.vita'),t('ind.iodine'),t('ind.ebf'),t('ind.mam'),t('ind.overweight')];
    let rows=[...DATA.list].map(c=>({code:c.code,flag:c.flag,name:cname(c),sel:state.country===c.code,scores:c.heatScores,vals:c.heatVals}));
    const{col,dir}=state.heatSort;
    rows.sort((x,y)=>(x.scores[col]-y.scores[col])*dir);
    CH.c8Heatmap(c8,{...o,rows,headers,avgLabel:t('c8.avg'),
      avgRow:{scores:DATA.REG.heatScores,vals:DATA.REG.heatVals},
      metricLabels:headers,sortCol:col,sortDir:dir,
      onSort:ci=>{
        if(state.heatSort.col===ci)state.heatSort.dir*=-1;
        else state.heatSort={col:ci,dir:-1};
        renderCharts(false);
      }});
  }
  /* C9 */
  const c9=vis('whoC9');
  if(c9){
    let codes=d.code!=='ALL'?[d.code,'SN','NG','BF']:['NE','SN','NG','BF'];
    codes=[...new Set(codes)].slice(0,4);
    while(codes.length<4)codes.push('ML');
    const metrics=[t('c9.m1'),t('c9.m2'),t('c9.m3'),t('c9.m4'),t('c9.m5'),t('c9.m6'),t('c9.m7'),t('c9.m8')];
    const anjeVals=c=>[c.anje.early,c.anje.ebf,c.anje.intro,c.anje.divers,c.anje.freq,c.anje.atpe,100-c.anje.bottle,c.anje.bf2y];
    CH.c9ANJE(c9,{...o,metrics,
      series:codes.map((code,i)=>{const c=DATA.get(code);return{name:cname(c),color:PALETTE[i],vals:anjeVals(c)}})});
    const f=document.getElementById('whoC9Foot');
    if(f)f.innerHTML=`<div class="who-legend round">${codes.map((code,i)=>{const c=DATA.get(code);return `<span><i style="background:${PALETTE[i]}"></i>${c.flag} ${cname(c)}</span>`}).join('')}</div>`;
  }
  /* C10 */
  const c10=vis('whoC10');
  if(c10)CH.c10Anaemia(c10,{...o,groups:[
    {name:t('c10.preg'),color:'#F97316',vals:d.anaePreg},
    {name:t('c10.kids'),color:'#EF4444',vals:d.anaeKids},
    {name:t('c10.nonpreg'),color:'#FB7185',vals:d.anaeNon}
  ]});
  /* C11 */
  const c11=vis('whoC11');
  if(c11)CH.c11Polar(c11,{...o,y22:d.season22,y23:d.season23,y24:d.season24});
  /* C12 */
  const c12=vis('whoC12');
  if(c12)CH.c12Wash(c12,{...o,pts:DATA.list.map(c=>({code:c.code,flag:c.flag,name:cname(c),zone:c.zone,water:c.water,s:c.s,popU5:c.popU5,sel:state.country===c.code}))});
  /* C13 */
  const c13=vis('whoC13');
  if(c13){
    const impacts=[22,20,18,16,19,17,21,18];
    const impact=state.country==='ALL'?20:impacts[DATA.codes.indexOf(d.code)%impacts.length];
    CH.c13Timeline(c13,{...o,impact,
      milestones:[
        {day:0,label:t('c13.d0'),icon:'🤰',color:'#7C3AED'},
        {day:270,label:t('c13.birth'),icon:'👶',color:'#0066CC'},
        {day:450,label:t('c13.m6'),icon:'🤱',color:'#00A86B'},
        {day:635,label:t('c13.m12'),icon:'🥣',color:'#F59E0B'},
        {day:1000,label:t('c13.m24'),icon:'🎂',color:'#10B981'}
      ],
      ints:[
        {d0:0,d1:270,color:'#EF4444'},
        {d0:270,d1:450,color:'#0066CC'},
        {d0:450,d1:1000,color:'#00A86B'},
        {d0:450,d1:900,color:'#FF6B35'}
      ],
      intDesc:[t('c13.int1'),t('c13.int2'),t('c13.int3'),t('c13.int4'),t('c13.window')]});
    const f=document.getElementById('whoC13Foot');
    if(f)f.innerHTML=`<div class="who-legend round">
      <span><i style="background:#EF4444"></i>${t('c13.int1')}</span>
      <span><i style="background:#0066CC"></i>${t('c13.int2')}</span>
      <span><i style="background:#00A86B"></i>${t('c13.int3')}</span>
      <span><i style="background:#FF6B35"></i>${t('c13.int4')}</span></div>`;
  }
  /* C14 */
  const c14=vis('whoC14');
  if(c14){
    const m=d.micro;
    CH.c14Gauges(c14,{...o,items:[
      {label:t('micro.vita'),val:m.vita},{label:t('micro.iron'),val:m.iron},
      {label:t('micro.zinc'),val:m.zinc},{label:t('micro.iodine'),val:m.iodine},
      {label:t('micro.vitd'),val:m.vitd},{label:t('micro.calcium'),val:m.calcium}
    ]});
  }
  /* C15 — scorecard */
  renderTable();
}

/* ── tableau scorecard ── */
function statusOf(sc){
  const x=state.lang==='fr';
  if(sc<35)return{cls:'crit',lb:t('st.crit')};
  if(sc<55)return{cls:'alert',lb:t('st.alert')};
  if(sc<70)return{cls:'watch',lb:t('st.watch')};
  return{cls:'good',lb:t('st.good')};
}
function valCls(kind,v){
  if(kind==='s')return v>35?'#EF4444':v>=20?'#F59E0B':'#10B981';
  if(kind==='w')return v>10?'#EF4444':v>=5?'#F59E0B':'#10B981';
  if(kind==='a')return v>=60?'#EF4444':v>=45?'#F59E0B':'#10B981';
  return v>=80?'#10B981':v>=60?'#F59E0B':'#EF4444';
}
function renderTable(){
  const tbl=document.getElementById('whoTable');if(!tbl)return;
  let rows=[...DATA.list];
  if(state.search){
    const q=state.search.toLowerCase();
    rows=rows.filter(c=>c.fr.toLowerCase().includes(q)||c.en.toLowerCase().includes(q)||c.code.toLowerCase().includes(q));
  }
  const{key,dir}=state.scSort;
  if(key!=='name')rows.sort((x,y)=>(x[key]-y[key])*dir);
  else rows.sort((x,y)=>x.fr.localeCompare(y.fr)*dir);
  const arrow=k=>state.scSort.key===k?(dir>0?'▲':'▼'):'↕';
  const REG=DATA.REG,stAvg=statusOf(REG.sc);
  tbl.innerHTML=`
    <thead><tr>
      <th data-k="name">${t('c15.country')}<span class="who-s">${arrow('name')}</span></th>
      <th data-k="s">Stunting<span class="who-s">${arrow('s')}</span></th>
      <th data-k="w">Wasting<span class="who-s">${arrow('w')}</span></th>
      <th data-k="a">${t('c2.anemia')}<span class="who-s">${arrow('a')}</span></th>
      <th data-k="v">Vit. A<span class="who-s">${arrow('v')}</span></th>
      <th data-k="sc">${t('c15.score')}<span class="who-s">${arrow('sc')}</span></th>
      <th>${t('c15.trend')}</th><th>${t('c15.status')}</th><th>${t('c15.action')}</th>
    </tr></thead>
    <tbody>
    ${rows.length?rows.map(c=>{
      const st=statusOf(c.sc),down=c.stunt5[4]<c.stunt5[0];
      return`<tr data-v57wired="1" class="${state.country===c.code?'who-sel':''}">
        <td><span class="who-flag">${c.flag}</span><b>${cname(c)}</b></td>
        <td class="who-val" style="color:${valCls('s',c.s)}">${fmt(c.s,0)}%</td>
        <td class="who-val" style="color:${valCls('w',c.w)}">${fmt(c.w,1)}%</td>
        <td class="who-val" style="color:${valCls('a',c.a)}">${fmt(c.a,0)}%</td>
        <td class="who-val" style="color:${valCls('v',c.v)}">${fmt(c.v,0)}%</td>
        <td><div class="who-bullet"><i style="width:${c.sc}%;background:${st.cls==='crit'?'#EF4444':st.cls==='alert'?'#F59E0B':st.cls==='watch'?'#EAB308':'#10B981'}"></i><em style="left:80%"></em></div></td>
        <td><canvas class="who-spark" data-spark="${c.code}"></canvas></td>
        <td><span class="who-pill ${st.cls}">${st.cls==='crit'?'🔴':st.cls==='alert'?'🟠':st.cls==='watch'?'🟡':'🟢'} ${st.lb}</span></td>
        <td><a class="who-link" data-rep="${c.code}">${t('c15.report')} →</a></td>
      </tr>`;}).join(''):`<tr data-v57wired="1"><td colspan="9" style="text-align:center;color:#5B7391;padding:18px">${t('c15.empty')}</td></tr>`}
    </tbody>
    <tfoot><tr data-v57wired="1">
      <td>🌍 ${t('c15.avg')}</td>
      <td class="who-val">${fmt(REG.s,1)}%</td><td class="who-val">${fmt(REG.w,1)}%</td>
      <td class="who-val">${fmt(REG.a,1)}%</td><td class="who-val">${fmt(REG.v,1)}%</td>
      <td><div class="who-bullet"><i style="width:${REG.sc}%;background:#0066CC"></i><em style="left:80%"></em></div></td>
      <td></td><td><span class="who-pill ${stAvg.cls}">${stAvg.lb}</span></td><td></td>
    </tr></tfoot>`;
  tbl.querySelectorAll('th[data-k]').forEach(th=>th.onclick=()=>{
    const k=th.dataset.k;
    if(state.scSort.key===k)state.scSort.dir*=-1;else state.scSort={key:k,dir:-1};
    renderTable();
  });
  tbl.querySelectorAll('[data-spark]').forEach(cv=>{
    const c=DATA.get(cv.dataset.spark);
    CH.rowSpark(cv,c.stunt5,c.stunt5[4]<c.stunt5[0]);
  });
  tbl.querySelectorAll('[data-rep]').forEach(a=>a.onclick=()=>{
    const c=DATA.get(a.dataset.rep);
    toastMsg(t('toast.export',{name:(state.lang==='fr'?c.fr:c.en)+' · '+t('rep2.t')}));
  });
}

/* ── rafraîchissement global ── */
function refresh(animate){
  if(!state.built)return;
  document.getElementById('whoCrumbYear').textContent=state.year;
  document.getElementById('whoSub').textContent=
    t('subtitle')+' '+state.year+(state.country!=='ALL'?' · '+(state.lang==='fr'?D().fr:D().en):'');
  const chipsEl=document.getElementById('whoChips');
  if(chipsEl){
    chipsEl.innerHTML=chipsHTML();
    chipsEl.querySelectorAll('[data-wt]').forEach(el=>{el.textContent=t(el.dataset.wt)});
  }
  renderChips();
  renderKPIs(animate);
  renderCharts(animate);
  state.dirty=false;
}
function setCountry(code,fromPlatform){
  if(!DATA.get(code))code='ALL';
  state.country=code;
  state.radar=[];
  if(!fromPlatform)toastMsg(t('toast.country',{name:code==='ALL'?t('misc.all'):cname(D())}));
  if(state.built)refresh(false);
}
function activate(){
  if(!state.built){
    const root=document.getElementById('whoSurveillance');
    if(!root)return;
    build(root);
    CH.bindTip(document.getElementById('whoTip'),root);
    wire();
    fillTexts();
  }
  const sec=document.getElementById('fao');
  if(!sec||!sec.classList.contains('on'))return; /* section cachée : on attend go('fao') */
  const first=!state.shown;
  state.shown=true;
  refresh(first); /* animations uniquement à la 1re ouverture */
}

/* ── événements internes ── */
function wire(){
  const root=document.getElementById('whoSurveillance');
  /* navigation sidebar */
  root.querySelectorAll('.who-nav').forEach(btn=>btn.onclick=()=>{
    root.querySelectorAll('.who-nav').forEach(b=>b.classList.remove('on'));
    btn.classList.add('on');
    const g=document.querySelector('.who-group[data-wg="'+btn.dataset.wg+'"]')||
              document.getElementById({overview:'whoGrpOverview',anthro:'whoGrpAnthropo',micro:'whoGrpMicro',anje:'whoGrpAnje',map:'whoGrpMap',reports:'whoGrpReports'}[btn.dataset.wg]);
    if(g)g.scrollIntoView({behavior:'smooth',block:'start'});
  });
  /* scrollspy */
  const obs=new IntersectionObserver(entries=>{
    entries.forEach(en=>{
      if(en.isIntersecting){
        const wg=en.target.dataset.wg;
        root.querySelectorAll('.who-nav').forEach(b=>b.classList.toggle('on',b.dataset.wg===wg));
      }
    });
  },{rootMargin:'-25% 0px -65% 0px'});
  root.querySelectorAll('.who-group[data-wg]').forEach(g=>obs.observe(g));
  /* chips pays (délégation : les chips sont re-rendues à chaque refresh) */
  const chipsEl=root.querySelector?root.querySelector('#whoChips'):null;
  if(chipsEl)chipsEl.addEventListener('click',e=>{
    const el=e.target&&e.target.closest?e.target.closest('#whoMoreBtn'):null;
    if(el){e.stopPropagation();const m=document.getElementById('whoMoreMenu');if(m)m.classList.toggle('open');return}
    const c=e.target&&e.target.closest?e.target.closest('[data-c]'):null;
    if(c){const m=document.getElementById('whoMoreMenu');if(m)m.classList.remove('open');setCountry(c.dataset.c)}
  });
  document.addEventListener('click',e=>{
    const m=document.getElementById('whoMoreMenu');
    if(m&&(!e.target||!e.target.closest||!e.target.closest('#whoMoreBtn')))m.classList.remove('open');
  });
  /* année */
  root.querySelector('#whoYear').onchange=e=>{state.year=+e.target.value;refresh(false)};
  /* export */
  root.querySelector('#whoExport').onclick=()=>toastMsg(t('toast.export',{name:t('rep1.t')}));
  root.querySelectorAll('.who-rep-row [data-rep]').forEach(b=>b.onclick=()=>toastMsg(t('toast.export',{name:t('rep'+b.dataset.rep+'.t')})));
  /* métrique chart 2 */
  root.querySelectorAll('#whoC2Seg button').forEach(b=>b.onclick=()=>{state.metric=b.dataset.m;renderCharts(true)});
  /* recherche scorecard */
  root.querySelector('#whoSearch').oninput=e=>{state.search=e.target.value;renderTable()};
}

/* ── intégration plateforme ── */
function init(){
  state.lang=detectLang();
  /* pays : sélecteur global ou Togo par défaut */
  const g=document.getElementById('country');
  const plat=g?g.value:(localStorage.getItem('nutri_country')||'TG');
  if(DATA.get(plat)!==DATA.REG)state.country=plat;
  activate();
  /* pays changé dans la plateforme */
  document.addEventListener('nutri:countryChanged',e=>{
    const c=e.detail&&e.detail.country;
    if(c&&DATA.get(c)!==DATA.REG)setCountry(c,true);
  });
  /* langue changée */
  document.addEventListener('nutri:i18nChanged',()=>{
    state.lang=detectLang();
    fillTexts();
    if(state.built)refresh(false);
  });
  /* ouverture de la vue fao → dimensionnement des canvas */
  ['NUTRI_V39_REFRESH','NUTRI_V40_REFRESH','NUTRI_V41_REFRESH'].forEach(k=>{
    const old=window[k];
    window[k]=function(id){
      if(old){try{old.apply(this,arguments)}catch(e){}}
      if(id==='fao')activate();
    };
  });
  /* redimensionnement */
  let rt=null;
  window.addEventListener('resize',()=>{
    clearTimeout(rt);
    rt=setTimeout(()=>{
      const sec=document.getElementById('fao');
      if(sec&&sec.classList.contains('on')&&state.shown)refresh(false);
    },220);
  });
  /* si la section est déjà visible (hash direct) */
  const sec=document.getElementById('fao');
  if(sec&&sec.classList.contains('on'))activate();
}

return{init,activate,setCountry,refresh:()=>refresh(false),get state(){return state}};
})();

if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',()=>setTimeout(window.WHO_SURV.init,180));
}else{
  setTimeout(window.WHO_SURV.init,180);
}
