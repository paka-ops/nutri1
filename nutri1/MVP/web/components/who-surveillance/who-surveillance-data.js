/* ══════════════════════════════════════════════════════════════
   OMS · Nutrition Surveillance — module de données
   16 pays d'Afrique de l'Ouest · générateur déterministe
   (les données changent selon le pays sélectionné, de façon
   cohérente et reproductible — seed = code ISO du pays)
   ══════════════════════════════════════════════════════════════ */
window.WHO_SURV_DATA = (function(){
"use strict";

/* ── PRNG déterministe (mulberry32 + FNV-1a) ── */
function hash(str){let h=2166136261;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function rng(seed){let a=seed;return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const r1=v=>Math.round(v*10)/10;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

/* ── Base : 16 pays CEDEAO (sources spec OMS) ──
   s=stunting% w=wasting% a=anémie femmes% v=couverture VitA% sc=score composite
   gdp=PIB/hab USD · popU5=population <5 ans (millions) · water=% accès eau potable */
const BASE=[
/*code fr            en               flag  zone     s    w     a   v   sc  gdp   popU5  water*/
["NE","Niger",       "Niger",         "🇳🇪","sahel", 47,  14.8, 72, 68, 22, 580,  4.2, 48],
["ML","Mali",        "Mali",          "🇲🇱","sahel", 38,  12.3, 65, 71, 35, 850,  3.8, 55],
["NG","Nigeria",     "Nigeria",       "🇳🇬","cote",  37,  7.2,  55, 58, 44, 2085, 28.0, 61],
["BJ","Bénin",       "Benin",         "🇧🇯","cote",  34,  5.1,  54, 76, 54, 1250, 1.7, 56],
["LR","Liberia",     "Liberia",       "🇱🇷","cote",  32,  5.3,  56, 69, 51, 640,  0.7, 46],
["GN","Guinée",      "Guinea",        "🇬🇳","cote",  31,  9.3,  63, 74, 48, 740,  1.8, 44],
["BF","Burkina Faso","Burkina Faso",  "🇧🇫","sahel", 29,  8.1,  58, 79, 52, 780,  3.5, 57],
["SL","Sierra Leone","Sierra Leone",  "🇸🇱","cote",  29,  6.4,  67, 72, 50, 510,  0.9, 48],
["MR","Mauritanie",  "Mauritania",    "🇲🇷","sahel", 28,  15.1, 60, 66, 47, 1720, 0.7, 52],
["GW","Guinée-Bissau","Guinea-Bissau","🇬🇼","cote",  28,  7.1,  61, 64, 46, 690,  0.4, 47],
["TG","Togo",        "Togo",          "🇹🇬","cote",  27,  6.3,  50, 78, 60, 970,  1.2, 54],
["CI","Côte d'Ivoire","Côte d'Ivoire","🇨🇮","cote",  21,  6.8,  51, 81, 68, 2290, 2.8, 58],
["GM","Gambie",      "The Gambia",    "🇬🇲","cote",  19,  11.2, 52, 77, 63, 760,  0.5, 59],
["GH","Ghana",       "Ghana",         "🇬🇭","cote",  18,  5.7,  42, 79, 74, 2200, 3.2, 79],
["SN","Sénégal",     "Senegal",       "🇸🇳","cote",  17,  7.2,  49, 83, 71, 1630, 2.1, 73],
["CV","Cap-Vert",    "Cabo Verde",    "🇨🇻","ile",   9,   4.2,  38, 88, 86, 3600, 0.06,82]
];

const ANJE_FIXED={NE:[42,24,71,18,44],SN:[61,38,82,34,58],NG:[32,22,68,24,41],BF:[68,41,79,29,52]};
const RADAR_FIXED={NE:[85,92,78,68,45,82],SN:[34,48,52,83,71,48],GH:[36,38,45,79,68,42]};
const MONTHS_BASE=[100,98,95,102,110,145,168,172,155,130,112,105];

/* série historique qui se termine à `end` (n points, pas croissant en remontant) */
function backSeries(end,n,minS,maxS,r,bumpAtIdx){
  const out=[end];let v=end;
  for(let i=1;i<n;i++){
    v+=minS+r()*(maxS-minS);
    if(bumpAtIdx===n-1-i)v+=0.5+r()*0.5;
    out.unshift(r1(v));
  }
  return out;
}

function build(row){
  const [code,fr,en,flag,zone,s,w,a,v,sc,gdp,popU5,water]=row;
  const r=rng(hash(code+"·who·2024"));
  const d={code,fr,en,flag,zone,s,w,a,v,sc,gdp,popU5,water};

  /* stunting 2014→2024 (11 pts) — bosse COVID en 2021 (idx 7) */
  d.stunt=backSeries(s,11,0.55,1.65,r,7);
  d.stunt5=d.stunt.slice(-5);
  d.wastTrend=backSeries(w,5,0.05,0.45,r,-1);
  d.anaeTrend=backSeries(a,5,0.2,0.9,r,-1);
  d.vitaTrend=backSeries(v,5,0.1,0.8,r,-1).map(x=>clamp(x,0,99));

  /* sparkline 12 mois (KPI1) */
  d.spark12=[];let sv=s+1.2;
  for(let m=0;m<12;m++){sv-=0.14+r()*0.22;d.spark12.push(r1(sv+Math.sin(m/1.9)*0.4))}

  /* saisonnalité CRENAS 2023/2024 */
  const f=w/8.9,shift=[-1,0,0,1][Math.floor(r()*4)];
  d.season23=MONTHS_BASE.map((x,i)=>{const j=(i+shift+12)%12;return Math.round(100+(MONTHS_BASE[j]-100)*f*(0.82+r()*0.36))});
  d.season24=d.season23.map(x=>Math.round(x*(1.02+r()*0.06)));
  d.season22=d.season23.map(x=>Math.round(x*(0.9+r()*0.06)));

  /* anémie 2017→2024 : 3 groupes */
  d.anaeKids=backSeries(a,8,0.7,1.5,r,-1);
  d.anaePreg=backSeries(clamp(a+3+r()*4,0,88),8,0.7,1.5,r,-1);
  d.anaeNon=backSeries(clamp(a-6-r()*5,0,88),8,0.6,1.3,r,-1);

  /* répartition malnutrition (MAS/MAM/risque/normal) */
  const mas=r1(w*0.62),mam=r1(w*1.10),risk=r1(clamp(16+w*0.85,8,32));
  d.malnut={mas,mam,risk,normal:r1(Math.max(20,100-mas-mam-risk))};

  /* ANJE — 8 indicateurs */
  const fx=ANJE_FIXED[code];
  d.anje={
    early:fx?fx[0]:Math.round(30+r()*38),
    ebf:  fx?fx[1]:Math.round(18+r()*26),
    intro:fx?fx[2]:Math.round(62+r()*24),
    divers:fx?fx[3]:Math.round(14+r()*24),
    freq: fx?fx[4]:Math.round(34+r()*26),
    atpe: Math.round(38+r()*36),
    bottle:Math.round(6+r()*20),
    bf2y: Math.round(20+r()*26)
  };

  /* micronutriments — 6 gauges */
  d.micro={
    vita:v,
    iron:Math.round(clamp(26+r()*28,15,70)),
    zinc:Math.round(clamp(16+r()*28,10,62)),
    iodine:Math.round(clamp(56+r()*38,40,97)),
    vitd:Math.round(clamp(22+r()*26,12,60)),
    calcium:Math.round(clamp(36+r()*26,25,70))
  };

  /* radar 6 axes (0-100, 100 = pire) */
  d.radar=RADAR_FIXED[code]?RADAR_FIXED[code].slice():[
    clamp(Math.round(s/50*100+(r()*8-4)),4,98),
    clamp(Math.round(w/16*100+(r()*8-4)),4,98),
    clamp(Math.round(a/80*100+(r()*8-4)),4,98),
    clamp(Math.round((100-v)/45*100+(r()*10-5)),4,98),
    clamp(Math.round((100-d.micro.iodine)/60*100+(r()*12-6)),4,98),
    clamp(Math.round(100-sc+(r()*10-5)),4,98)
  ];

  /* heatmap — 8 indicateurs (valeur affichée + score sévérité) */
  const obesChild=r1(2+r()*4), ebf=d.anje.ebf;
  d.heatVals=[s,w,a,r1(100-v),r1(100-d.micro.iodine),ebf,mam,obesChild];
  d.heatScores=[s*2.2,w*7,a*1.4,(100-v)*1.9,(100-d.micro.iodine)*1.1,(100-ebf)*1.15,mam*3.0,obesChild*9];

  /* double fardeau : obésité adulte proxy */
  d.obesity=r1((zone==="cote"?5:3)+r()*8);
  d.dbSev=s+d.obesity*1.5;

  /* cascades KPI : deltas vs année précédente */
  d.deltas={s:r1(-(1.1+r()*1.7)),w:r1((r()-0.42)*0.9),a:r1((r()-0.5)*1.4),v:r1(1.4+r()*3.2)};

  /* PIB vs nutrition : légère cohérence gdp↔stunting */
  d.gdpJitter=Math.round(gdp*(0.96+r()*0.08));
  return d;
}

const cache={};
BASE.forEach(row=>{cache[row[0]]=build(row)});

/* double fardeau : top 5 sévère, 6 suivant modéré, reste non concerné (5/6/5) */
(function(){
  const ranked=Object.values(cache).sort((x,y)=>y.dbSev-x.dbSev);
  ranked.forEach((d,i)=>{d.db=i<5?"sev":i<11?"mod":"non"});
})();

/* valeur ajustée selon l'année sélectionnée (ancrée sur 2024) */
function forYear(v,year,delta){return r1(v+(2024-year)*(-delta))}

function regional(){
  const all=Object.values(cache);
  const tot=all.reduce((t,d)=>t+d.popU5,0);
  const wm=k=>r1(all.reduce((t,d)=>t+d[k]*d.popU5,0)/tot);
  const meanSeries=key=>{
    const n=all[0][key].length,out=[];
    for(let i=0;i<n;i++)out.push(r1(all.reduce((t,d)=>t+d[key][i],0)/all.length));
    return out;
  };
  const region={
    code:"ALL",fr:"Afrique de l'Ouest",en:"West Africa",flag:"🌍",zone:"region",
    s:28.4,w:8.9,a:52.7,v:67.3,sc:Math.round(all.reduce((t,d)=>t+d.sc,0)/16),
    popU5:r1(tot),gdp:Math.round(all.reduce((t,d)=>t+d.gdp*d.popU5,0)/tot),
    water:Math.round(all.reduce((t,d)=>t+d.water*d.popU5,0)/tot),
    stunt:meanSeries("stunt"),anake:null,
    season23:MONTHS_BASE.slice(),season24:MONTHS_BASE.map(x=>Math.round(x*1.045)),season22:MONTHS_BASE.map(x=>Math.round(x*0.93)),
    anaeKids:[68,67,66,65,64,63,61,60],anaePreg:[72,71,70,69,68,67,65,64],anaeNon:[55,54,53,52,51,50,49,49],
    malnut:{mas:8.2,mam:14.6,risk:22.8,normal:54.4},
    deltas:{s:-2.1,w:0.3,a:0,v:4.2},
    dbSev:0,db:"region",obesity:6.1,
    heatVals:[28.4,8.9,52.7,32.7,24.0,36.0,12.4,4.1],
    heatScores:[28.4*2.2,8.9*7,52.7*1.4,32.7*1.9,24.0*1.1,(100-36)*1.15,12.4*3.0,4.1*9],
    micro:{vita:67,iron:43,zinc:28,iodine:89,vitd:31,calcium:52},
    anje:{early:51,ebf:31,intro:75,divers:26,freq:47,atpe:55,bottle:13,bf2y:32},
    radar:[56,56,65,60,40,55],obesChild:4.1
  };
  region.stunt5=region.stunt.slice(-5);
  region.spark12=[];let sv=29.6;const rr=rng(hash("REGION·spark"));
  for(let m=0;m<12;m++){sv-=0.13+rr()*0.2;region.spark12.push(r1(sv+Math.sin(m/1.9)*0.35))}
  region.wastTrend=backSeries(8.9,5,0.05,0.35,rr,-1);
  region.anaeTrend=backSeries(52.7,5,0.2,0.7,rr,-1);
  region.vitaTrend=backSeries(67.3,5,0.3,0.9,rr,-1);
  return region;
}
const REG=regional();

function heatColor(score){
  if(score>100)return{bg:"#DC2626",fg:"#FFFFFF"};
  if(score>75)return{bg:"#FECACA",fg:"#7F1D1D"};
  if(score>50)return{bg:"#FED7AA",fg:"#7C2D12"};
  if(score>25)return{bg:"#FEF3C7",fg:"#713F12"};
  return{bg:"#DCFCE7",fg:"#14532D"};
}
function statColor(score){
  if(score>100)return"#DC2626";if(score>75)return"#EF4444";
  if(score>50)return"#F59E0B";if(score>25)return"#EAB308";return"#10B981";
}

return{
  codes:BASE.map(b=>b[0]),
  list:Object.values(cache),
  REG,forYear,heatColor,statColor,clamp,
  get(code){return code==="ALL"||!code?REG:(cache[code]||REG)},
  name(d,lang){return lang==="fr"?d.fr:d.en},
  /* moyenne régionale affichée au centre du radar */
  radarCenter(){return Math.round(this.list.reduce((t,d)=>t+d.radar.reduce((a,b)=>a+b,0)/6,0)/16)}
};
})();
