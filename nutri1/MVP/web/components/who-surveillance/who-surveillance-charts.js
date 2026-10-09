/* ══════════════════════════════════════════════════════════════
   OMS · Nutrition Surveillance — moteur graphique Canvas pur
   15 graphiques + mini-KPI · 60fps · tooltips · animations
   ══════════════════════════════════════════════════════════════ */
window.WHO_SURV_CH = (function(){
"use strict";

const FONT='Inter,system-ui,Arial';
const C={blue:'#0066CC',blue2:'#0099FF',green:'#00A86B',orange:'#FF6B35',violet:'#7C3AED',red:'#EF4444',ok:'#10B981',amber:'#F59E0B',gray:'#94A3B8',ink:'#0F2440',muted:'#5B7391',line:'#E0EEFF',grid:'#E7F0FB'};
const MONTHS={fr:["Jan","Fév","Mar","Avr","Mai","Juin","Juil","Août","Sep","Oct","Nov","Déc"],en:["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]};

/* ── easing ── */
const easeOut=t=>1-Math.pow(1-t,3);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function bounce(t){const n1=7.5625,d1=2.75;if(t<1/d1)return n1*t*t;if(t<2/d1)return n1*(t-=1.5/d1)*t+.75;if(t<2.5/d1)return n1*(t-=2.25/d1)*t+.9375;return n1*(t-=2.625/d1)*t+.984375}

/* ── préparation canvas (DPR) ── */
function prep(cv){
  const w=cv.clientWidth,h=cv.clientHeight;
  if(!w||!h)return null;
  const dpr=Math.min(2.5,window.devicePixelRatio||1);
  const W=Math.round(w*dpr),H=Math.round(h*dpr);
  if(cv.width!==W||cv.height!==H){cv.width=W;cv.height=H}
  const x=cv.getContext('2d');
  x.setTransform(dpr,0,0,dpr,0,0);x.clearRect(0,0,w,h);
  return{x,w,h};
}
/* ── animation (annule la précédente) ── */
function run(cv,animate,dur,draw){
  if(cv._whoRAF){cancelAnimationFrame(cv._whoRAF);cv._whoRAF=0}
  if(!animate){draw(1);return}
  const t0=performance.now();
  const step=now=>{
    const p=clamp((now-t0)/dur,0,1);
    draw(easeOut(p));
    if(p<1)cv._whoRAF=requestAnimationFrame(step);else cv._whoRAF=0;
  };
  cv._whoRAF=requestAnimationFrame(step);
}
function smooth(x,pts){
  x.moveTo(pts[0].x,pts[0].y);
  for(let i=1;i<pts.length;i++){
    const p0=pts[i-1],p1=pts[i],mx=(p0.x+p1.x)/2,my=(p0.y+p1.y)/2;
    if(i===1)x.lineTo(mx,my);else x.quadraticCurveTo(p0.x,p0.y,mx,my);
  }
  x.lineTo(pts[pts.length-1].x,pts[pts.length-1].y);
}
function partial(pts,frac){
  if(frac>=1)return pts.slice();
  const cut=frac*(pts.length-1),k=Math.floor(cut),f=cut-k;
  const out=pts.slice(0,k+1);
  if(k<pts.length-1){out.push({x:pts[k].x+(pts[k+1].x-pts[k].x)*f,y:pts[k].y+(pts[k].y-pts[k].y)*f})}
  return out;
}
function rr(x,px,py,w,h,r){
  r=Math.min(r,w/2,h/2);
  x.beginPath();
  x.moveTo(px+r,py);x.arcTo(px+w,py,px+w,py+h,r);x.arcTo(px+w,py+h,px,py+h,r);
  x.arcTo(px,py+h,px,py,r);x.arcTo(px,py,px+w,py,r);x.closePath();
}
/* régression linéaire */
function linreg(pts){
  const n=pts.length;let sx=0,sy=0,sxy=0,sxx=0,syy=0;
  pts.forEach(p=>{sx+=p.x;sy+=p.y;sxy+=p.x*p.y;sxx+=p.x*p.x;syy+=p.y*p.y});
  const a=(n*sxy-sx*sy)/(n*sxx-sx*sx||1),b=(sy-a*sx)/n;
  const my=sy/n;let ssr=0,sst=0;
  pts.forEach(p=>{const f=a*p.x+b;ssr+=(p.y-f)*(p.y-f);sst+=(p.y-my)*(p.y-my)});
  return{a,b,r2:sst?1-ssr/sst:0};
}

/* ── Tooltip singleton (fourni par le contrôleur) ── */
let TIP=null;
function bindTip(el,root){TIP={el,root}}
function tipShow(html,cx,cy){
  if(!TIP)return;
  const r=TIP.root.getBoundingClientRect(),el=TIP.el;
  el.innerHTML=html;el.classList.add('show');
  let x=cx-r.left+14,y=cy-r.top+14;
  const ew=el.offsetWidth,eh=el.offsetHeight;
  if(x+ew>r.width-8)x=cx-r.left-ew-14;
  if(y+eh>r.height-8)y=cy-r.top-eh-14;
  el.style.left=Math.max(6,x)+'px';el.style.top=Math.max(6,y)+'px';
}
function tipHide(){if(TIP)TIP.el.classList.remove('show')}
function mpos(cv,e){const r=cv.getBoundingClientRect();return{mx:e.clientX-r.left,my:e.clientY-r.top}}

/* ════════════════ MINI-KPI ════════════════ */
function sparkBars(cv,vals,o){
  const P=prep(cv);if(!P)return;const{x,w,h}=P;
  run(cv,o.animate,700,p=>{
    x.clearRect(0,0,w,h);
    const n=vals.length,bw=(w-2)/n*0.62,gap=(w-2)/n;
    const mx=Math.max(...vals),mn=Math.min(...vals);
    vals.forEach((v,i)=>{
      const t=clamp(p*1.6-i*0.05,0,1);
      const bh=((v-mn)/(mx-mn||1)*0.75+0.25)*(h-6)*t;
      const last=i===n-1;
      const g=x.createLinearGradient(0,h-bh,0,h);
      g.addColorStop(0,last?'#0066CC':'#7CB8F0');g.addColorStop(1,last?'#0099FF':'#D6E9FF');
      x.fillStyle=g;
      rr(x,3+i*gap+(gap-bw)/2,h-bh,bw,bh,2);x.fill();
    });
  });
}
function kpiGauge(cv,val,max,o){
  const P=prep(cv);if(!P)return;const{x,w,h}=P;
  const cx=w/2,cy=h/2+6,R=Math.min(w,h)/2-7;
  const a0=Math.PI*0.75,a1=Math.PI*2.25;
  run(cv,o.animate,900,p=>{
    x.clearRect(0,0,w,h);
    x.lineCap='round';
    x.beginPath();x.arc(cx,cy,R,a0,a1);x.strokeStyle='#E7EEF7';x.lineWidth=8;x.stroke();
    const av=a0+(a1-a0)*clamp(val/max,0,1)*p;
    x.beginPath();x.arc(cx,cy,R,a0,av);x.strokeStyle=C.orange;x.lineWidth=8;x.stroke();
    /* trait rouge : seuil */
    x.beginPath();x.arc(cx,cy,R,a1-0.02,a1+0.02);x.strokeStyle=C.red;x.lineWidth=10;x.stroke();
    x.fillStyle=C.ink;x.font='800 13px '+FONT;x.textAlign='center';
    x.fillText(o.fmt(val,1)+'/'+max,cx,cy+4);
  });
}
function kpiHBars(cv,items,o){
  const P=prep(cv);if(!P)return;const{x,w,h}=P;
  const rows=items.length,rh=h/rows;
  run(cv,o.animate,800,p=>{
    x.clearRect(0,0,w,h);
    items.forEach((it,i)=>{
      const y=i*rh+rh/2;
      x.fillStyle=C.muted;x.font='700 9.5px '+FONT;x.textAlign='left';x.textBaseline='middle';
      x.fillText(it.name.slice(0,8),1,y);
      const bx=44,bw=w-bx-32;
      x.fillStyle='#F0F4FA';rr(x,bx,y-3.5,bw,7,3.5);x.fill();
      const t=clamp(p*1.5-i*0.12,0,1);
      const g=x.createLinearGradient(bx,0,bx+bw,0);
      g.addColorStop(0,'#F87171');g.addColorStop(1,'#DC2626');
      x.fillStyle=g;rr(x,bx,y-3.5,bw*it.val/100*t,7,3.5);x.fill();
      x.fillStyle=C.ink;x.font='800 9.5px '+FONT;x.textAlign='right';
      x.fillText(Math.round(it.val)+'%',w-1,y);
    });
    x.textBaseline='alphabetic';
  });
}
function kpiDonut(cv,parts,o){
  const P=prep(cv);if(!P)return;const{x,w,h}=P;
  const cx=w/2,cy=h/2,R=Math.min(w,h)/2-4;
  run(cv,o.animate,900,p=>{
    x.clearRect(0,0,w,h);
    let a=-Math.PI/2;const tot=parts.reduce((t,q)=>t+q.val,0);
    parts.forEach(q=>{
      const sw=q.val/tot*Math.PI*2*p;
      x.beginPath();x.arc(cx,cy,R,a,a+sw);
      x.strokeStyle=q.color;x.lineWidth=9;x.lineCap='butt';x.stroke();
      a+=sw;
    });
  });
}

/* ════════════════ GRAPHIQUE 1 — courbes stunting ════════════════ */
function c1Stunting(cv,o){
  const P=prep(cv);if(!P)return;const{x,w,h}=P;
  const padL=40,padR=14,padT=26,padB=26;
  const iw=w-padL-padR,ih=h-padT-padB;
  const years=o.series[0].vals.map((_,i)=>2014+i);
  const X=i=>padL+iw*i/10, Y=v=>padT+ih*(1-v/55);
  const on=o.series.filter(s=>s.on);
  cv.onmousemove=e=>{
    const{mx}=mpos(cv,e);
    const idx=clamp(Math.round((mx-padL)/iw*10),0,10);
    let rows=on.map(s=>`<div class="who-tip-row"><i style="background:${s.color}"></i>${s.name} · <b>${o.fmt(s.vals[idx],0)}%</b></div>`).join('');
    tipShow(`<div class="who-tip-t">${years[idx]}</div>${rows}`,e.clientX,e.clientY);
    draw(cv._whoP||1,idx);
  };
  cv.onmouseleave=()=>{tipHide();draw(cv._whoP||1,-1)};
  function draw(p,hoverIdx){
    x.clearRect(0,0,w,h);
    /* grille + axe Y */
    x.font='600 10px '+FONT;x.textAlign='right';x.textBaseline='middle';
    for(let g=0;g<=55;g+=10){
      x.strokeStyle=g===20?'rgba(239,68,68,.0)':C.grid;x.lineWidth=1;
      x.beginPath();x.moveTo(padL,Y(g));x.lineTo(w-padR,Y(g));x.stroke();
      x.fillStyle=C.muted;x.fillText(g+'%',padL-7,Y(g));
    }
    /* années */
    x.textAlign='center';x.textBaseline='alphabetic';
    years.forEach((yr,i)=>{x.fillStyle=C.muted;x.font='600 10px '+FONT;x.fillText(yr,X(i),h-8)});
    /* zone COVID 2020-2021 */
    x.fillStyle='rgba(148,163,184,.14)';
    x.fillRect(X(6),padT,X(7)-X(6),ih);
    x.fillStyle='#64748B';x.font='700 9.5px '+FONT;x.textAlign='center';
    x.fillText(o.t('c1.covid'),X(6.5),padT+11);
    /* seuil OMS 20% */
    x.strokeStyle=C.red;x.setLineDash([5,4]);x.lineWidth=1.4;
    x.beginPath();x.moveTo(padL,Y(20));x.lineTo(w-padR,Y(20));x.stroke();x.setLineDash([]);
    x.fillStyle=C.red;x.font='700 9.5px '+FONT;x.textAlign='right';
    x.fillText(o.t('c1.threshold'),w-padR-4,Y(20)-5);
    /* courbes */
    on.forEach((s,si)=>{
      const sp=clamp((p-si*0.13)/0.55,0,1);
      if(sp<=0)return;
      const pts=s.vals.map((v,i)=>({x:X(i),y:Y(v)}));
      const vis=partial(pts,sp);
      /* aire */
      const grad=x.createLinearGradient(0,padT,0,padT+ih);
      grad.addColorStop(0,s.color+'26');grad.addColorStop(1,s.color+'05');
      x.beginPath();smooth(x,vis);
      x.lineTo(vis[vis.length-1].x,padT+ih);x.lineTo(vis[0].x,padT+ih);x.closePath();
      x.fillStyle=grad;x.fill();
      /* ligne */
      x.beginPath();smooth(x,vis);
      x.strokeStyle=s.color;x.lineWidth=s.sel?3.2:2.2;x.lineJoin='round';x.stroke();
      /* dernier point */
      if(sp>=1){
        const lp=pts[pts.length-1];
        x.beginPath();x.arc(lp.x,lp.y,3.4,0,7);x.fillStyle=s.color;x.fill();
        x.strokeStyle='#fff';x.lineWidth=1.6;x.stroke();
      }
    });
    /* hover */
    if(hoverIdx>=0){
      x.strokeStyle='#B9CCE4';x.lineWidth=1;
      x.beginPath();x.moveTo(X(hoverIdx),padT);x.lineTo(X(hoverIdx),padT+ih);x.stroke();
      on.forEach(s=>{
        x.beginPath();x.arc(X(hoverIdx),Y(s.vals[hoverIdx]),4.6,0,7);
        x.fillStyle=s.color;x.fill();
        x.beginPath();x.arc(X(hoverIdx),Y(s.vals[hoverIdx]),8.5,0,7);
        x.strokeStyle=s.color+'55';x.lineWidth=3;x.stroke();
      });
    }
  }
  cv._whoDraw=draw;
  run(cv,o.animate,1500,p=>{cv._whoP=p;draw(p,-1)});
}

/* ════════════════ GRAPHIQUE 2 — classement barres ════════════════ */
function c2Rank(cv,o){
  const P=prep(cv);if(!P)return;const{x,w,h}=P;
  const rows=o.rows,padL=118,padR=44,padT=8,padB=14;
  const iw=w-padL-padR,ih=h-padT-padB;
  const bh=Math.min(22,ih/rows.length-6),gap=ih/rows.length;
  const maxV=o.maxV,thr=o.threshold;
  const XT=v=>padL+iw*v/maxV;
  function colorFor(v){
    if(o.metric==='vita')return v>=80?C.ok:v>=60?C.amber:C.red;
    if(o.metric==='wasting')return v>10?C.red:v>=5?C.amber:C.ok;
    if(o.metric==='anemia')return v>=60?C.red:v>=45?C.amber:C.ok;
    return v>35?C.red:v>=20?C.amber:v>=10?C.ok:C.blue;
  }
  function draw(p,hover){
    x.clearRect(0,0,w,h);
    rows.forEach((r0,i)=>{
      const y=padT+i*gap+(gap-bh)/2;
      const t=clamp((p*1100-i*50)/520,0,1);
      const bw=iw*r0.val/maxV*t;
      const hov=hover===i;
      /* label pays */
      x.fillStyle=r0.sel?C.blue:C.ink;x.font=(r0.sel?'800 ':'600 ')+'11px '+FONT;
      x.textAlign='right';x.textBaseline='middle';
      x.fillText(r0.flag+' '+r0.name,padL-10,y+bh/2);
      /* barre */
      x.globalAlpha=hov?1:0.92;
      x.fillStyle=colorFor(r0.val);
      if(bw>1){x.beginPath();x.moveTo(padL,y);x.lineTo(padL+bw-4,y);x.arcTo(padL+bw,y,padL+bw,y+bh,4);x.arcTo(padL+bw,y+bh,padL,y+bh,4);x.lineTo(padL,y+bh);x.closePath();x.fill();}
      x.globalAlpha=1;
      if(r0.sel){x.strokeStyle=C.blue;x.lineWidth=1.6;x.strokeRect(padL-1,y-1,Math.max(bw,2)+2,bh+2)}
      if(hov){x.fillStyle='rgba(255,255,255,.28)';if(bw>1){x.beginPath();x.moveTo(padL,y);x.lineTo(padL+bw-4,y);x.arcTo(padL+bw,y,padL+bw,y+bh,4);x.arcTo(padL+bw,y+bh,padL,y+bh,4);x.lineTo(padL,y+bh);x.closePath();x.fill();}}
      /* valeur */
      x.fillStyle=C.ink;x.font='800 11px '+FONT;x.textAlign='left';
      if(t>0.55)x.fillText(o.fmt(r0.val,o.metric==='stunting'||o.metric==='wasting'?1:0)+'%',padL+bw+7,y+bh/2);
    });
    /* seuil */
    const tx=XT(thr);
    x.strokeStyle=C.red;x.setLineDash([5,4]);x.lineWidth=1.4;
    x.beginPath();x.moveTo(tx,padT-4);x.lineTo(tx,h-padB+4);x.stroke();x.setLineDash([]);
    x.fillStyle=C.red;x.font='700 9.5px '+FONT;x.textAlign='center';
    x.fillText(o.thrLabel,tx,padT-1>10?padT+2:10);
    x.textBaseline='alphabetic';
  }
  cv.onmousemove=e=>{
    const{my}=mpos(cv,e);
    const i=Math.floor((my-padT)/gap);
    if(i<0||i>=rows.length){tipHide();draw(cv._whoP||1,-1);return}
    const r0=rows[i];
    tipShow(`<div class="who-tip-t">${r0.flag} ${r0.name}</div>
      <div class="who-tip-row">${o.metricLabel} · <b>${o.fmt(r0.val,1)}%</b></div>
      <div class="who-tip-row">${o.t('c2.rank')} : <b>${i+1}/${rows.length}</b></div>`,e.clientX,e.clientY);
    draw(cv._whoP||1,i);
  };
  cv.onmouseleave=()=>{tipHide();draw(cv._whoP||1,-1)};
  run(cv,o.animate,1400,p=>{cv._whoP=p;draw(p,-1)});
}

/* ════════════════ GRAPHIQUE 3 — radar ════════════════ */
function c3Radar(cv,o){
  const P=prep(cv);if(!P)return;const{x,w,h}=P;
  const cx=w/2,cy=h/2+6,R=Math.min(w,h)/2-44;
  const AX=o.axes;
  const pt=(ai,val,scale)=>{
    const a=-Math.PI/2+ai*Math.PI*2/6;
    return{x:cx+Math.cos(a)*R*val/100*scale,y:cy+Math.sin(a)*R*val/100*scale};
  };
  function poly(vals,scale,close=true){
    x.beginPath();
    vals.forEach((v,i)=>{const p=pt(i,v,scale);i?x.lineTo(p.x,p.y):x.moveTo(p.x,p.y)});
    if(close)x.closePath();
  }
  function draw(p){
    x.clearRect(0,0,w,h);
    /* grille 5 niveaux */
    for(let lv=1;lv<=5;lv++){
      x.beginPath();
      for(let i=0;i<=6;i++){const q=pt(i%6,lv*20,1);i?x.lineTo(q.x,q.y):x.moveTo(q.x,q.y)}
      x.strokeStyle=lv===5?'#CBD9EC':C.grid;x.lineWidth=1;x.stroke();
    }
    for(let i=0;i<6;i++){
      const q=pt(i,100,1);
      x.strokeStyle='#D9E4F2';x.beginPath();x.moveTo(cx,cy);x.lineTo(q.x,q.y);x.stroke();
    }
    /* benchmark OMS (hexagone rouge pointillé) */
    x.setLineDash([4,4]);x.strokeStyle=C.red;x.lineWidth=1.4;
    poly(o.bench,1);x.stroke();x.setLineDash([]);
    /* pays */
    o.countries.forEach((cn,ci)=>{
      const sp=clamp((p-ci*0.18)/0.6,0,1);
      if(sp<=0)return;
      x.globalAlpha=0.18;poly(cn.vals,sp);x.fillStyle=cn.color;x.fill();
      x.globalAlpha=1;x.strokeStyle=cn.color;x.lineWidth=2.5;
      poly(cn.vals,sp);x.stroke();
      if(sp>=1)cn.vals.forEach((v,i)=>{
        const q=pt(i,v,1);
        x.beginPath();x.arc(q.x,q.y,3.2,0,7);x.fillStyle=cn.color;x.fill();
        x.strokeStyle='#fff';x.lineWidth=1.4;x.stroke();
      });
    });
    /* labels axes */
    x.font='700 11.5px '+FONT;x.fillStyle='#33507A';
    AX.forEach((lb,i)=>{
      const q=pt(i,124,1);
      x.textAlign=Math.abs(q.x-cx)<8?'center':q.x>cx?'left':'right';
      x.textBaseline=Math.abs(q.y-cy)<8?'middle':q.y>cy?'top':'bottom';
      x.fillText(lb,q.x,q.y);
    });
    /* centre : score régional */
    x.textAlign='center';x.textBaseline='middle';
    x.fillStyle='rgba(255,255,255,.92)';x.beginPath();x.arc(cx,cy,21,0,7);x.fill();
    x.strokeStyle=C.line;x.stroke();
    x.fillStyle=C.blue;x.font='800 14px '+FONT;x.fillText(o.centerVal,cx,cy-4);
    x.fillStyle=C.muted;x.font='700 6.8px '+FONT;
    x.fillText(o.t('c3.center').toUpperCase().slice(0,26),cx,cy+9);
    x.textBaseline='alphabetic';
  }
  cv.onmousemove=e=>{
    const{mx,my}=mpos(cv,e);
    for(const cn of o.countries){
      for(let i=0;i<6;i++){
        const q=pt(i,cn.vals[i],1);
        if(Math.hypot(mx-q.x,my-q.y)<9){
          tipShow(`<div class="who-tip-t"><i style="background:${cn.color}"></i>${cn.name}</div>
            <div class="who-tip-row">${AX[i]} · <b>${cn.vals[i]}/100</b></div>`,e.clientX,e.clientY);
          return;
        }
      }
    }
    tipHide();
  };
  cv.onmouseleave=tipHide;
  run(cv,o.animate,1200,draw);
}

/* ════════════════ GRAPHIQUE 4 — saisonnalité double ════════════════ */
function c4Season(cv,o){
  const P=prep(cv);if(!P)return;const{x,w,h}=P;
  const padL=36,padR=12,padT=26,padB=24,iw=w-padL-padR,ih=h-padT-padB;
  const M=MONTHS[o.lang]||MONTHS.fr;
  const all=o.y24.concat(o.y23),mx=Math.max(...all)*1.08,mn=Math.min(...all)*0.9;
  const X=i=>padL+iw*i/11, Y=v=>padT+ih*(1-(v-mn)/(mx-mn));
  function area(vals,color,alpha,widthP){
    const pts=vals.map((v,i)=>({x:X(i),y:Y(v)}));
    const vis=partial(pts,widthP);
    const g=x.createLinearGradient(0,padT,0,padT+ih);
    g.addColorStop(0,color+(alpha==='08'?'14':'26'));g.addColorStop(1,color+'03');
    x.beginPath();smooth(x,vis);
    x.lineTo(vis[vis.length-1].x,padT+ih);x.lineTo(vis[0].x,padT+ih);x.closePath();
    x.fillStyle=g;x.fill();
    x.beginPath();smooth(x,vis);x.strokeStyle=color;x.lineWidth=2.2;x.stroke();
    return pts;
  }
  function draw(p,hover){
    x.clearRect(0,0,w,h);
    /* zone soudure juin-août */
    x.fillStyle='#FFF7ED';x.fillRect(X(5),padT,X(7)-X(5),ih);
    x.strokeStyle=C.amber;x.setLineDash([4,3]);x.lineWidth=1.4;
    x.beginPath();x.moveTo(X(5),padT);x.lineTo(X(7),padT);x.stroke();x.setLineDash([]);
    x.fillStyle='#B45309';x.font='700 9.5px '+FONT;x.textAlign='center';
    x.fillText(o.t('c4.lean'),X(6),padT-8>10?padT-8:10);
    /* grille */
    x.textAlign='right';x.textBaseline='middle';x.font='600 9.5px '+FONT;
    for(let g2=Math.ceil(mn/50)*50;g2<mx;g2+=50){
      x.strokeStyle=C.grid;x.beginPath();x.moveTo(padL,Y(g2));x.lineTo(w-padR,Y(g2));x.stroke();
      x.fillStyle=C.muted;x.fillText(g2,padL-6,Y(g2));
    }
    x.textAlign='center';x.textBaseline='alphabetic';
    M.forEach((m0,i)=>{if(i%2===0||w>560){x.fillStyle=C.muted;x.font='600 9.5px '+FONT;x.fillText(m0,X(i),h-7)}});
    area(o.y23,C.gray,'08',p);
    const pts24=area(o.y24,C.blue,'15',p);
    /* pic */
    if(p>0.85){
      const mi=o.y24.indexOf(Math.max(...o.y24));
      const px=X(mi),py=Y(o.y24[mi]);
      const lbl=o.t('c4.peak')+' : +'+Math.round((Math.max(...o.y24)-Math.min(...o.y24))/Math.min(...o.y24)*100)+'%';
      x.font='800 10px '+FONT;
      const tw=x.measureText(lbl).width+16;
      x.fillStyle=C.blue;rr(x,px-tw/2,py-28,tw,18,9);x.fill();
      x.fillStyle='#fff';x.textAlign='center';x.textBaseline='middle';
      x.fillText(lbl,px,py-19);x.textBaseline='alphabetic';
    }
    if(hover>=0){
      x.strokeStyle='#B9CCE4';x.beginPath();x.moveTo(X(hover),padT);x.lineTo(X(hover),padT+ih);x.stroke();
      [[o.y23,C.gray],[o.y24,C.blue]].forEach(([vals,col])=>{
        x.beginPath();x.arc(X(hover),Y(vals[hover]),4.4,0,7);x.fillStyle=col;x.fill();
        x.strokeStyle='#fff';x.lineWidth=1.5;x.stroke();
      });
    }
  }
  cv.onmousemove=e=>{
    const{mx}=mpos(cv,e);
    const i=clamp(Math.round((mx-padL)/iw*11),0,11);
    const d23=o.y23[i],d24=o.y24[i],v=d23?Math.round((d24-d23)/d23*100):0;
    tipShow(`<div class="who-tip-t">${M[i]} ${o.year}</div>
      <div class="who-tip-row"><i style="background:${C.blue}"></i>2024 · <b>${d24}</b></div>
      <div class="who-tip-row"><i style="background:${C.gray}"></i>2023 · <b>${d23}</b></div>
      <div class="who-tip-row">${o.t('c4.var')} : <b style="color:${v>=0?C.red:C.ok}">${v>=0?'+':''}${v}%</b></div>`,e.clientX,e.clientY);
    draw(cv._whoP||1,i);
  };
  cv.onmouseleave=()=>{tipHide();draw(cv._whoP||1,-1)};
  run(cv,o.animate,1300,p=>{cv._whoP=p;draw(p,-1)});
}

/* ════════════════ GRAPHIQUE 5 — donut ════════════════ */
function c5Donut(cv,o){
  const P=prep(cv);if(!P)return;const{x,w,h}=P;
  const cx=w/2,cy=h/2,R=Math.min(w,h)/2-14,ring=32;
  const tot=o.parts.reduce((t,q)=>t+q.val,0);
  let angles=[];
  function segs(p){
    angles=[];let a=-Math.PI/2;
    o.parts.forEach(q=>{
      const sw=q.val/tot*Math.PI*2*p;
      angles.push({a0:a,a1:a+sw,q});a+=sw;
    });
  }
  function draw(p,hover){
    x.clearRect(0,0,w,h);segs(p);
    angles.forEach((sg,i)=>{
      const expand=hover===i?6:0;
      x.beginPath();x.arc(cx,cy,R+expand,sg.a0,sg.a1);
      x.strokeStyle=sg.q.color;x.lineWidth=ring;x.stroke();
    });
    /* centre */
    x.textAlign='center';
    x.fillStyle=C.muted;x.font='600 10px '+FONT;x.fillText(o.t('c5.center1'),cx,cy-15);
    x.fillStyle=C.blue;x.font='800 24px '+FONT;x.fillText(o.fmt(o.total,1)+'%',cx,cy+8);
    x.fillStyle=C.muted;x.font='600 10px '+FONT;x.fillText(o.centerSub,cx,cy+25);
  }
  cv.onmousemove=e=>{
    const{mx,my}=mpos(cv,e);
    const dx=mx-cx,dy=my-cy,dist=Math.hypot(dx,dy);
    if(dist<R-ring/2-4||dist>R+ring/2+8){tipHide();draw(cv._whoP||1,-1);return}
    let a=Math.atan2(dy,dx);if(a<-Math.PI/2)a+=Math.PI*2;
    const hit=angles.findIndex(sg=>a>=sg.a0&&a<sg.a1);
    if(hit<0){tipHide();return}
    const q=angles[hit].q;
    tipShow(`<div class="who-tip-t"><i style="background:${q.color}"></i>${q.label}</div>
      <div class="who-tip-row"><b>${o.fmt(q.val,1)}%</b> · ${o.fmt(o.popU5*q.val/100*1e6,0)} ${o.t('c5.children')}</div>`,e.clientX,e.clientY);
    draw(cv._whoP||1,hit);
  };
  cv.onmouseleave=()=>{tipHide();draw(cv._whoP||1,-1)};
  run(cv,o.animate,1100,p=>{cv._whoP=p;draw(p,-1)});
}

/* ════════════════ GRAPHIQUE 6 — bulles PIB ════════════════ */
function c6Bubble(cv,o){
  const P=prep(cv);if(!P)return;const{x,w,h}=P;
  if(!cv._whoView)cv._whoView={x0:300,x1:2450,y0:4,y1:52};
  const V=cv._whoView;
  const padL=42,padR=16,padT=14,padB=30,iw=w-padL-padR,ih=h-padT-padB;
  const X=v=>padL+iw*(v-V.x0)/(V.x1-V.x0), Y=v=>padT+ih*(1-(v-V.y0)/(V.y1-V.y0));
  const rOf=p=>5.5+Math.sqrt(p.popU5)*3.1;
  const zoneColor=z=>z==='sahel'?C.red:z==='ile'?C.ok:'#3B82F6';
  const reg=linreg(o.pts.map(p=>({x:p.gdp,y:p.s})));
  function draw(p,hover){
    x.clearRect(0,0,w,h);
    /* quadrant vulnérable */
    const vx=X(1000),vy=Y(30);
    x.fillStyle='rgba(239,68,68,.05)';
    x.fillRect(padL,padT,clamp(vx,padL,w)-padL,clamp(vy,padT,h)-padT);
    x.fillStyle='rgba(239,68,68,.5)';x.font='700 9.5px '+FONT;x.textAlign='left';
    x.fillText(o.t('c6.vuln'),padL+8,padT+13);
    /* axes + grille */
    x.font='600 9.5px '+FONT;x.fillStyle=C.muted;
    for(let g3=Math.ceil(V.x0/400)*400;g3<=V.x1;g3+=400){
      x.strokeStyle=C.grid;x.beginPath();x.moveTo(X(g3),padT);x.lineTo(X(g3),h-padB);x.stroke();
      x.textAlign='center';x.fillText(g3,X(g3),h-16);
    }
    for(let g4=Math.ceil(V.y0/10)*10;g4<=V.y1;g4+=10){
      x.strokeStyle=C.grid;x.beginPath();x.moveTo(padL,Y(g4));x.lineTo(w-padR,Y(g4));x.stroke();
      x.textAlign='right';x.fillText(g4+'%',padL-6,Y(g4)+3);
    }
    x.textAlign='center';x.fillStyle='#33507A';x.font='700 10px '+FONT;
    x.fillText(o.t('c6.gdp'),padL+iw/2,h-3);
    /* régression (après bulles) */
    const rp=clamp((p-0.72)/0.28,0,1);
    if(rp>0){
      const x1=V.x0,x2=V.x0+(V.x1-V.x0)*rp;
      x.strokeStyle='rgba(124,58,237,.65)';x.lineWidth=2;x.setLineDash([6,4]);
      x.beginPath();x.moveTo(X(x1),Y(reg.a*x1+reg.b));x.lineTo(X(x2),Y(reg.a*x2+reg.b));x.stroke();x.setLineDash([]);
      if(rp>=1){
        x.fillStyle=C.violet;x.font='800 10px '+FONT;x.textAlign='right';
        x.fillText(o.t('c6.r2')+' · R² = '+reg.r2.toFixed(2),w-padR-4,padT+13);
      }
    }
    /* bulles */
    o.pts.forEach((pt0,i)=>{
      const bp=clamp((p-i*0.045)/0.4,0,1);
      if(bp<=0)return;
      const rb=rOf(pt0)*bounce(bp)*(hover===i?1.2:1);
      const px=X(pt0.gdp),py=Y(pt0.s);
      if(px<padL-30||px>w||py<padT-30||py>h)return;
      x.globalAlpha=0.82;
      x.beginPath();x.arc(px,py,rb,0,7);
      x.fillStyle=zoneColor(pt0.zone);x.fill();
      x.globalAlpha=1;
      x.strokeStyle=pt0.sel?'#0F2440':'rgba(255,255,255,.85)';
      x.lineWidth=pt0.sel?2.4:1.4;x.stroke();
      if(rb>9||hover===i){
        x.fillStyle='#0F2440';x.font='800 8.6px '+FONT;x.textAlign='center';
        x.fillText(pt0.code,px,py+3);
      }
    });
  }
  cv.onmousemove=e=>{
    const{mx,my}=mpos(cv,e);
    let hit=-1;
    o.pts.forEach((pt0,i)=>{
      if(Math.hypot(mx-X(pt0.gdp),my-Y(pt0.s))<=rOf(pt0)+3)hit=i;
    });
    if(hit>=0){
      const pt0=o.pts[hit];
      tipShow(`<div class="who-tip-t">${pt0.flag} ${pt0.name}</div>
        <div class="who-tip-row">${o.t('c6.gdp')} · <b>${pt0.gdp.toLocaleString()} $</b></div>
        <div class="who-tip-row">Stunting · <b>${o.fmt(pt0.s,0)}%</b></div>
        <div class="who-tip-row">${o.t('c6.pop')} · <b>${o.fmt(pt0.popU5,2)} M</b></div>`,e.clientX,e.clientY);
    }else tipHide();
    draw(cv._whoP||1,hit);
  };
  cv.onmouseleave=()=>{tipHide();draw(cv._whoP||1,-1)};
  cv.onwheel=e=>{
    e.preventDefault();
    const{mx,my}=mpos(cv,e);
    const fx=(mx-padL)/iw,fy=1-(my-padT)/ih;
    const k=e.deltaY>0?1.14:0.88;
    const nx=(V.x0+(V.x1-V.x0)*fx),ny=(V.y0+(V.y1-V.y0)*fy);
    V.x0=nx-(nx-V.x0)*k;V.x1=nx+(V.x1-nx)*k;
    V.y0=ny-(ny-V.y0)*k;V.y1=ny+(V.y1-ny)*k;
    V.x0=clamp(V.x0,100,2000);V.x1=clamp(V.x1,800,4000);
    V.y0=clamp(V.y0,0,30);V.y1=clamp(V.y1,40,80);
    draw(1,-1);
  };
  cv.onmousedown=e=>{
    cv._whoDrag={x:e.clientX,y:e.clientY,v:{...V}};
    const move=ev=>{
      const d=cv._whoDrag;if(!d)return;
      const dx=(ev.clientX-d.x)/iw*(d.v.x1-d.v.x0),dy=(ev.clientY-d.y)/ih*(d.v.y1-d.v.y0);
      V.x0=d.v.x0-dx;V.x1=d.v.x1-dx;V.y0=d.v.y0+dy;V.y1=d.v.y1+dy;
      draw(1,-1);
    };
    const up=()=>{cv._whoDrag=null;window.removeEventListener('mousemove',move);window.removeEventListener('mouseup',up)};
    window.addEventListener('mousemove',move);window.addEventListener('mouseup',up);
  };
  cv.ondblclick=()=>{cv._whoView={x0:300,x1:2450,y0:4,y1:52};Object.assign(V,cv._whoView);draw(1,-1)};
  run(cv,o.animate,1600,p=>{cv._whoP=p;draw(p,-1)});
}

/* ════════════════ GRAPHIQUE 7 — waterfall ════════════════ */
function c7Waterfall(cv,o){
  const P=prep(cv);if(!P)return;const{x,w,h}=P;
  const padL=38,padR=14,padT=18,padB=42,iw=w-padL-padR,ih=h-padT-padB;
  const items=o.items; /* [{label,val,type:start|cut|end,from,to}] */
  const maxV=o.maxV*1.12;
  const Y=v=>padT+ih*(1-v/maxV);
  const slot=iw/items.length, bw=Math.min(64,slot*0.6);
  function draw(p){
    x.clearRect(0,0,w,h);
    /* grille */
    x.font='600 9.5px '+FONT;x.textAlign='right';x.textBaseline='middle';
    for(let g5=0;g5<=maxV;g5+=10){
      x.strokeStyle=C.grid;x.beginPath();x.moveTo(padL,Y(g5));x.lineTo(w-padR,Y(g5));x.stroke();
      x.fillStyle=C.muted;x.fillText(g5,padL-6,Y(g5));
    }
    x.textBaseline='alphabetic';
    items.forEach((it,i)=>{
      const t=clamp((p*1400-i*140)/520,0,1);
      if(t<=0)return;
      const cxp=padL+slot*i+slot/2;
      const drop=(1-bounce(t))*-46;
      const top=Math.min(it.from,it.to),bot=Math.max(it.from,it.to);
      const col=it.type==='start'?C.red:it.type==='end'?C.blue:'#10B981';
      x.globalAlpha=t;
      x.fillStyle=col;
      rr(x,cxp-bw/2,Y(bot)+drop,bw,Math.max(4,Y(top)-Y(bot)),5);x.fill();
      x.globalAlpha=1;
      /* valeur */
      x.fillStyle=it.type==='cut'?'#0B7A4B':col;x.font='800 11px '+FONT;x.textAlign='center';
      const vtxt=it.type==='cut'?'−'+o.fmt(it.val,1):(it.type==='start'?'+':'')+o.fmt(it.to,0)+'%';
      x.fillText(vtxt,cxp,Y(bot)+drop-6);
      /* label */
      x.fillStyle='#33507A';x.font='600 9.3px '+FONT;
      const words=it.label.split(' ');let line='',ly=h-26;
      words.forEach(wd=>{
        if(x.measureText(line+wd).width>slot-6){x.fillText(line.trim(),cxp,ly);ly+=11;line=''}
        line+=wd+' ';
      });
      x.fillText(line.trim(),cxp,ly);
      /* connecteur */
      if(i<items.length-1){
        x.strokeStyle='#9FB4CE';x.setLineDash([3,3]);x.lineWidth=1.2;
        x.beginPath();x.moveTo(cxp+bw/2,Y(it.to));x.lineTo(padL+slot*(i+1)+slot/2-bw/2,Y(it.to));x.stroke();x.setLineDash([]);
      }
    });
  }
  cv.onmousemove=e=>{
    const{mx}=mpos(cv,e);
    const i=Math.floor((mx-padL)/slot);
    if(i<0||i>=items.length){tipHide();return}
    const it=items[i];
    tipShow(`<div class="who-tip-t">${it.label}</div><div class="who-tip-row"><b>${it.type==='cut'?'−':'+'}${o.fmt(it.val,1)} pts</b></div>`,e.clientX,e.clientY);
  };
  cv.onmouseleave=tipHide;
  run(cv,o.animate,1900,draw);
}

/* ════════════════ GRAPHIQUE 8 — heatmap ════════════════ */
function c8Heatmap(cv,o){
  const P=prep(cv);if(!P)return;const{x,w,h}=P;
  const rows=o.rows; /* {flag,name,sel,scores[8],vals[8]} + o.avgRow */
  const padL=Math.min(140,w*0.2),padT=30,padB=46,padR=10;
  const cw=(w-padL-padR)/8, rh=(h-padT-padB)/(rows.length+1);
  const HD=o.headers;
  function cellRect(ri,ci){return{px:padL+ci*cw,py:padT+(ri+1)*rh}}
  function draw(p,hover){
    x.clearRect(0,0,w,h);
    /* en-têtes colonnes */
    x.font='700 10px '+FONT;x.textAlign='center';x.textBaseline='middle';
    HD.forEach((hd,ci)=>{
      const px=padL+ci*cw;
      x.fillStyle=o.sortCol===ci?C.blue:'#33507A';
      x.fillText(hd,px+cw/2,padT-rh/2);
      if(o.sortCol===ci){x.fillText(o.sortDir>0?'▲':'▼',px+cw/2,padT-rh/2+11)}
    });
    /* ligne moyenne régionale */
    const avgA=clamp(p*3,0,1);
    x.globalAlpha=avgA;
    x.fillStyle='#E8F1FD';rr(x,padL,padT,w-padL-padR,rh-2,4);x.fill();
    x.fillStyle=C.blue;x.font='800 10.5px '+FONT;x.textAlign='right';
    x.fillText('🌍 '+o.avgLabel,padL-8,padT+rh/2);
    o.avgRow.scores.forEach((sc0,ci)=>{
      const col=window.WHO_SURV_DATA.heatColor(sc0);
      x.fillStyle=col.bg;x.globalAlpha=avgA*0.95;
      rr(x,padL+ci*cw+1.5,padT+1.5,cw-3,rh-5,4);x.fill();
      x.globalAlpha=avgA;x.fillStyle=col.fg;x.font='700 10.5px '+FONT;x.textAlign='center';
      x.fillText(o.fmt(o.avgRow.vals[ci],1),padL+ci*cw+cw/2,padT+rh/2);
    });
    x.globalAlpha=1;
    /* pays */
    rows.forEach((r0,ri)=>{
      const ra=clamp((p*1600-ri*30)/320,0,1);
      if(ra<=0)return;
      const py=padT+(ri+1)*rh;
      x.globalAlpha=ra;
      if(r0.sel){x.fillStyle='rgba(0,102,204,.07)';x.fillRect(padL-padL,py,w,rh)}
      x.fillStyle=r0.sel?C.blue:C.ink;x.font=(r0.sel?'800 ':'600 ')+'10.5px '+FONT;x.textAlign='right';
      x.fillText(r0.flag+' '+r0.name,padL-8,py+rh/2);
      r0.scores.forEach((sc0,ci)=>{
        const col=window.WHO_SURV_DATA.heatColor(sc0);
        const hv=hover&&hover.r===ri&&hover.c===ci;
        x.fillStyle=col.bg;x.globalAlpha=ra*(hv?1:0.93);
        rr(x,padL+ci*cw+1.5,py+1.5,cw-3,rh-3,4);x.fill();
        x.globalAlpha=ra;
        if(hv){x.strokeStyle=C.blue;x.lineWidth=1.8;rr(x,padL+ci*cw+1.5,py+1.5,cw-3,rh-3,4);x.stroke()}
        x.fillStyle=col.fg;x.font='600 10.5px '+FONT;x.textAlign='center';
        x.fillText(o.fmt(r0.vals[ci],ci===3||ci===4?1:0),padL+ci*cw+cw/2,py+rh/2);
      });
      x.globalAlpha=1;
    });
    /* légende gradient */
    const ly=h-padB+22,lw=Math.min(300,w*0.5),lx=(w-lw)/2;
    const g=x.createLinearGradient(lx,0,lx+lw,0);
    ['#DCFCE7','#FEF3C7','#FED7AA','#FECACA','#DC2626'].forEach((cc,i)=>g.addColorStop(i/4,cc));
    rr(x,lx,ly,lw,10,5);x.fillStyle=g;x.fill();
    x.fillStyle=C.muted;x.font='600 9.5px '+FONT;
    x.textAlign='left';x.fillText('0',lx,ly+22);
    x.textAlign='center';x.fillText('50',lx+lw/2,ly+22);
    x.textAlign='right';x.fillText('120+',lx+lw,ly+22);
    x.textBaseline='alphabetic';
    cv._whoGeom={padL,padT,cw,rh};
  }
  cv.onmousemove=e=>{
    const g=cv._whoGeom;if(!g)return;
    const{mx,my}=mpos(cv,e);
    const ci=Math.floor((mx-g.padL)/g.cw), ri=Math.floor((my-g.padT)/g.rh)-1;
    if(ci<0||ci>7){tipHide();draw(cv._whoP||1,null);return}
    if(ri<0||ri>=rows.length){tipHide();draw(cv._whoP||1,null);return}
    const r0=rows[ci>=0?ri:0],sc0=r0.scores[ci];
    const st=sc0>100?o.t('c8.crit'):sc0>75?o.t('c8.high'):sc0>50?o.t('c8.mod'):o.t('c8.low');
    const stc=sc0>75?C.red:sc0>50?C.amber:sc0>25?'#EAB308':C.ok;
    tipShow(`<div class="who-tip-t">${r0.flag} ${r0.name} · ${HD[ci]}</div>
      <div class="who-tip-row">${o.metricLabels[ci]} : <b>${o.fmt(r0.vals[ci],1)}${ci!==5?'%':'%'}</b></div>
      <div class="who-tip-row">${o.t('c2.rank')} : <b>${ci+1}</b> · Score <b>${Math.round(sc0)}/120</b></div>
      <div class="who-tip-row">${o.t('c8.status')} : <b style="color:${stc}">${st}</b></div>`,e.clientX,e.clientY);
    draw(cv._whoP||1,{r:ri,c:ci});
  };
  cv.onmouseleave=()=>{tipHide();draw(cv._whoP||1,null)};
  cv.onclick=e=>{
    const g=cv._whoGeom;if(!g)return;
    const{mx,my}=mpos(cv,e);
    if(my>g.padT-g.rh&&my<g.padT){
      const ci=Math.floor((mx-g.padL)/g.cw);
      if(ci>=0&&ci<8&&o.onSort)o.onSort(ci);
    }
  };
  run(cv,o.animate,1800,p=>{cv._whoP=p;draw(p,null)});
}

/* ════════════════ GRAPHIQUE 9 — ANJE barres groupées ════════════════ */
function c9ANJE(cv,o){
  const P=prep(cv);if(!P)return;const{x,w,h}=P;
  const padL=170,padR=26,padT=10,padB=16,iw=w-padL-padR,ih=h-padT-padB;
  const rows=o.metrics.length,group=ih/rows,n=o.series.length;
  const bh=Math.min(9,(group-10)/n);
  function draw(p,hover){
    x.clearRect(0,0,w,h);
    /* grille + objectif */
    for(let g6=0;g6<=100;g6+=20){
      const gx=padL+iw*g6/100;
      x.strokeStyle=C.grid;x.beginPath();x.moveTo(gx,padT);x.lineTo(gx,h-padB);x.stroke();
      x.fillStyle=C.muted;x.font='600 9px '+FONT;x.textAlign='center';x.fillText(g6+'%',gx,h-4);
    }
    const tx=padL+iw*0.8;
    x.strokeStyle=C.red;x.setLineDash([5,4]);x.lineWidth=1.4;
    x.beginPath();x.moveTo(tx,padT);x.lineTo(tx,h-padB);x.stroke();x.setLineDash([]);
    x.fillStyle=C.red;x.font='700 9px '+FONT;x.textAlign='left';
    x.fillText(o.t('c9.target'),tx+5,padT+10);
    o.metrics.forEach((m0,ri)=>{
      const gy=padT+ri*group;
      x.fillStyle=C.ink;x.font='600 10.5px '+FONT;x.textAlign='right';x.textBaseline='middle';
      x.fillText(m0,padL-10,gy+group/2);
      o.series.forEach((s0,si)=>{
        const y=gy+(group-n*bh)/2+si*bh;
        const t=clamp((p*1300-ri*60-si*40)/520,0,1);
        const bw=iw*s0.vals[ri]/100*t;
        const hv=hover&&hover.r===ri&&hover.s===si;
        x.fillStyle=s0.color;x.globalAlpha=hv?1:0.88;
        rr(x,padL,y,bw,bh-1.5,3);x.fill();x.globalAlpha=1;
        if(hv){x.strokeStyle='#0F2440';x.lineWidth=1;rr(x,padL,y,bw,bh-1.5,3);x.stroke()}
        if(t>=1&&bh>=8){
          x.fillStyle='#33507A';x.font='700 8px '+FONT;x.textAlign='left';
          x.fillText(s0.vals[ri]+'%',padL+bw+4,y+(bh-1.5)/2);
        }
      });
    });
    x.textBaseline='alphabetic';
  }
  cv.onmousemove=e=>{
    const{mx,my}=mpos(cv,e);
    const ri=Math.floor((my-padT)/(ih/rows));
    if(ri<0||ri>=rows){tipHide();draw(cv._whoP||1,null);return}
    const gy=padT+ri*(ih/rows),off=my-gy-( (ih/rows)-n*bh)/2;
    const si=clamp(Math.floor(off/bh),0,n-1);
    const s0=o.series[si];
    tipShow(`<div class="who-tip-t"><i style="background:${s0.color}"></i>${s0.name}</div>
      <div class="who-tip-row">${o.metrics[ri]} · <b>${s0.vals[ri]}%</b></div>
      <div class="who-tip-row">${o.t('c9.gap')} : <b>${s0.vals[ri]>=80?'✓':(s0.vals[ri]-80)+' pts'}</b></div>`,e.clientX,e.clientY);
    draw(cv._whoP||1,{r:ri,s:si});
  };
  cv.onmouseleave=()=>{tipHide();draw(cv._whoP||1,null)};
  run(cv,o.animate,1500,p=>{cv._whoP=p;draw(p,null)});
}

/* ════════════════ GRAPHIQUE 10 — anémie aires ════════════════ */
function c10Anaemia(cv,o){
  const P=prep(cv);if(!P)return;const{x,w,h}=P;
  const padL=34,padR=12,padT=14,padB=24,iw=w-padL-padR,ih=h-padT-padB;
  const years=[2017,2018,2019,2020,2021,2022,2023,2024];
  const X=i=>padL+iw*i/7, Y=v=>padT+ih*(1-v/85);
  const groups=o.groups; /* [{name,color,vals}] ordonnés du +haut au +bas */
  function draw(p,hover){
    x.clearRect(0,0,w,h);
    x.font='600 9.5px '+FONT;x.textAlign='right';x.textBaseline='middle';
    for(let g7=0;g7<=85;g7+=20){
      x.strokeStyle=C.grid;x.beginPath();x.moveTo(padL,Y(g7));x.lineTo(w-padR,Y(g7));x.stroke();
      x.fillStyle=C.muted;x.fillText(g7+'%',padL-5,Y(g7));
    }
    x.textAlign='center';x.textBaseline='alphabetic';
    years.forEach((yr,i)=>{x.fillStyle=C.muted;x.fillText(yr,X(i),h-7)});
    groups.forEach((gp,gi)=>{
      const pts=gp.vals.map((v,i)=>({x:X(i),y:Y(v)}));
      const vis=partial(pts,p);
      const g=x.createLinearGradient(0,padT,0,padT+ih);
      g.addColorStop(0,gp.color+'B3');g.addColorStop(1,gp.color+'4D');
      x.beginPath();smooth(x,vis);
      x.lineTo(vis[vis.length-1].x,padT+ih);x.lineTo(vis[0].x,padT+ih);x.closePath();
      x.globalAlpha=gi===0?0.5:gi===1?0.55:0.6;x.fillStyle=g;x.fill();x.globalAlpha=1;
      x.beginPath();smooth(x,vis);x.strokeStyle=gp.color;x.lineWidth=2;x.stroke();
    });
    /* objectif OMS 20% */
    x.strokeStyle=C.red;x.setLineDash([5,4]);x.lineWidth=1.4;
    x.beginPath();x.moveTo(padL,Y(20));x.lineTo(w-padR,Y(20));x.stroke();x.setLineDash([]);
    x.fillStyle=C.red;x.font='700 9px '+FONT;x.textAlign='left';
    x.fillText(o.t('c10.target'),padL+4,Y(20)-6);
    if(hover>=0){
      x.strokeStyle='#B9CCE4';x.beginPath();x.moveTo(X(hover),padT);x.lineTo(X(hover),padT+ih);x.stroke();
      groups.forEach(gp=>{
        x.beginPath();x.arc(X(hover),Y(gp.vals[hover]),4,0,7);x.fillStyle=gp.color;x.fill();
        x.strokeStyle='#fff';x.lineWidth=1.4;x.stroke();
      });
    }
  }
  cv.onmousemove=e=>{
    const{mx}=mpos(cv,e);
    const i=clamp(Math.round((mx-padL)/iw*7),0,7);
    tipShow(`<div class="who-tip-t">${years[i]}</div>`+groups.map(gp=>
      `<div class="who-tip-row"><i style="background:${gp.color}"></i>${gp.name} · <b>${gp.vals[i]}%</b></div>`).join(''),e.clientX,e.clientY);
    draw(cv._whoP||1,i);
  };
  cv.onmouseleave=()=>{tipHide();draw(cv._whoP||1,-1)};
  run(cv,o.animate,1300,p=>{cv._whoP=p;draw(p,-1)});
}

/* ════════════════ GRAPHIQUE 11 — polaire ════════════════ */
function c11Polar(cv,o){
  const P=prep(cv);if(!P)return;const{x,w,h}=P;
  const cx=w/2,cy=h/2+4,R=Math.min(w,h)/2-34;
  const M=MONTHS[o.lang]||MONTHS.fr;
  const layers=[{v:o.y22,color:'#B9CCE4',alpha:0.35},{v:o.y23,color:'#64748B',alpha:0.55},{v:o.y24,color:C.blue,alpha:0.9}];
  const maxR=Math.max(...o.y24)*1.12;
  const rOf=v=>R*v/maxR;
  const segColor=v=>v>=150?C.red:v>=118?C.amber:C.ok;
  function draw(p,hover){
    x.clearRect(0,0,w,h);
    const rot=(1-p)*-Math.PI/3;
    /* cercles */
    [0.33,0.66,1].forEach(f=>{
      x.beginPath();x.arc(cx,cy,R*f,0,7);x.strokeStyle=C.grid;x.lineWidth=1;x.stroke();
      x.fillStyle='#9FB4CE';x.font='600 8.5px '+FONT;x.textAlign='left';
      x.fillText(Math.round(maxR*f),cx+4,cy-R*f-2);
    });
    layers.forEach((L,li)=>{
      const sc=p*(li===2?1:0.96);
      for(let m1=0;m1<12;m1++){
        const a0=rot-Math.PI/2+m1*Math.PI/6, a1=a0+Math.PI/6-0.012;
        const lean=m1>=5&&m1<=8;
        x.beginPath();x.moveTo(cx,cy);
        x.arc(cx,cy,rOf(L.v[m1])*sc,a0,a1);x.closePath();
        x.globalAlpha=L.alpha*(lean&&li===2?1:0.85);
        x.fillStyle=li===2?segColor(L.v[m1]):L.color;
        x.fill();x.globalAlpha=1;
        if(hover===m1&&li===2){x.strokeStyle='#0F2440';x.lineWidth=1.6;x.stroke()}
      }
    });
    /* mois */
    x.font='700 10px '+FONT;x.fillStyle='#33507A';
    for(let m2=0;m2<12;m2++){
      const a=-Math.PI/2+(m2+0.5)*Math.PI/6;
      x.textAlign='center';x.textBaseline='middle';
      x.fillText(M[m2],cx+Math.cos(a)*(R+17),cy+Math.sin(a)*(R+17));
    }
    x.textBaseline='alphabetic';
  }
  cv.onmousemove=e=>{
    const{mx,my}=mpos(cv,e);
    const dx=mx-cx,dy=my-cy;
    if(Math.hypot(dx,dy)>R+6){tipHide();draw(cv._whoP||1,-1);return}
    let a=Math.atan2(dy,dx)+Math.PI/2;if(a<0)a+=Math.PI*2;
    const m3=Math.floor(a/(Math.PI/6))%12;
    tipShow(`<div class="who-tip-t">${M[m3]}</div>
      <div class="who-tip-row"><i style="background:${C.blue}"></i>2024 · <b>${o.y24[m3]}</b></div>
      <div class="who-tip-row"><i style="background:#64748B"></i>2023 · <b>${o.y23[m3]}</b></div>
      <div class="who-tip-row"><i style="background:#B9CCE4"></i>2022 · <b>${o.y22[m3]}</b></div>`,e.clientX,e.clientY);
    draw(cv._whoP||1,m3);
  };
  cv.onmouseleave=()=>{tipHide();draw(cv._whoP||1,-1)};
  run(cv,o.animate,1300,p=>{cv._whoP=p;draw(p,-1)});
}

/* ════════════════ GRAPHIQUE 12 — scatter WASH ════════════════ */
function c12Wash(cv,o){
  const P=prep(cv);if(!P)return;const{x,w,h}=P;
  const padL=38,padR=14,padT=14,padB=30,iw=w-padL-padR,ih=h-padT-padB;
  const X=v=>padL+iw*(v-28)/64, Y=v=>padT+ih*(1-(v-4)/48);
  const rOf=pt0=>5+Math.sqrt(pt0.popU5)*3;
  const zoneColor=z=>z==='sahel'?C.red:z==='ile'?C.ok:'#3B82F6';
  const reg=linreg(o.pts.map(pt0=>({x:pt0.water,y:pt0.s})));
  function draw(p,hover){
    x.clearRect(0,0,w,h);
    /* quadrants */
    const qx=X(60),qy=Y(25);
    x.fillStyle='rgba(255,107,53,.05)';x.fillRect(padL,padT,qx-padL,qy-padT);
    x.fillStyle='rgba(239,68,68,.06)';x.fillRect(qx,padT,w-padR-qx,qy-padT);
    x.fillStyle='rgba(16,185,129,.06)';x.fillRect(padL,qy,qx-padL,h-padB-qy);
    x.fillStyle='rgba(59,130,246,.05)';x.fillRect(qx,qy,w-padR-qx,h-padB-qy);
    x.font='700 9px '+FONT;
    x.fillStyle='rgba(255,107,53,.8)';x.textAlign='left';x.fillText('↖ '+o.t('c12.q1'),padL+6,padT+12);
    x.fillStyle='rgba(239,68,68,.8)';x.textAlign='right';x.fillText(o.t('c12.q2')+' ↗',w-padR-6,padT+12);
    x.fillStyle='rgba(16,185,129,.85)';x.textAlign='left';x.fillText('↙ '+o.t('c12.q3'),padL+6,h-padB-8);
    x.fillStyle='rgba(59,130,246,.8)';x.textAlign='right';x.fillText(o.t('c12.q4')+' ↘',w-padR-6,h-padB-8);
    /* axes */
    x.font='600 9.5px '+FONT;x.fillStyle=C.muted;
    for(let g8=30;g8<=90;g8+=15){
      x.strokeStyle=C.grid;x.beginPath();x.moveTo(X(g8),padT);x.lineTo(X(g8),h-padB);x.stroke();
      x.textAlign='center';x.fillText(g8+'%',X(g8),h-16);
    }
    for(let g9=10;g9<=50;g9+=10){
      x.strokeStyle=C.grid;x.beginPath();x.moveTo(padL,Y(g9));x.lineTo(w-padR,Y(g9));x.stroke();
      x.textAlign='right';x.fillText(g9+'%',padL-5,Y(g9)+3);
    }
    x.textAlign='center';x.fillStyle='#33507A';x.font='700 10px '+FONT;
    x.fillText(o.t('c12.water'),padL+iw/2,h-3);
    /* points */
    o.pts.forEach((pt0,i)=>{
      const t=clamp((p-i*0.04)/0.45,0,1);
      if(t<=0)return;
      const px=X(pt0.water),py=Y(pt0.s),rb=rOf(pt0)*easeOut(t)*(hover===i?1.25:1);
      x.globalAlpha=0.85;
      x.beginPath();x.arc(px,py,rb,0,7);x.fillStyle=zoneColor(pt0.zone);x.fill();x.globalAlpha=1;
      x.strokeStyle=pt0.sel?'#0F2440':'rgba(255,255,255,.85)';x.lineWidth=pt0.sel?2.2:1.3;x.stroke();
      x.fillStyle='#0F2440';x.font='800 8.3px '+FONT;x.textAlign='center';
      x.fillText(pt0.code,px,py-rb-4);
    });
    /* régression */
    const rp=clamp((p-0.7)/0.3,0,1);
    if(rp>0){
      const x1=30,x2=30+60*rp;
      x.strokeStyle='rgba(124,58,237,.7)';x.lineWidth=2;x.setLineDash([6,4]);
      x.beginPath();x.moveTo(X(x1),Y(reg.a*x1+reg.b));x.lineTo(X(x2),Y(reg.a*x2+reg.b));x.stroke();x.setLineDash([]);
      if(rp>=1){x.fillStyle=C.violet;x.font='800 10px '+FONT;x.textAlign='right';x.fillText('R² = '+reg.r2.toFixed(2),w-padR-4,padT+26)}
    }
  }
  cv.onmousemove=e=>{
    const{mx,my}=mpos(cv,e);
    let hit=-1;
    o.pts.forEach((pt0,i)=>{if(Math.hypot(mx-X(pt0.water),my-Y(pt0.s))<=rOf(pt0)+3)hit=i});
    if(hit>=0){
      const pt0=o.pts[hit];
      tipShow(`<div class="who-tip-t">${pt0.flag} ${pt0.name}</div>
        <div class="who-tip-row">${o.t('c12.water')} · <b>${pt0.water}%</b></div>
        <div class="who-tip-row">Stunting · <b>${o.fmt(pt0.s,0)}%</b></div>`,e.clientX,e.clientY);
    }else tipHide();
    draw(cv._whoP||1,hit);
  };
  cv.onmouseleave=()=>{tipHide();draw(cv._whoP||1,-1)};
  run(cv,o.animate,1500,p=>{cv._whoP=p;draw(p,-1)});
}

/* ════════════════ GRAPHIQUE 13 — timeline 1000 jours ════════════════ */
function c13Timeline(cv,o){
  const P=prep(cv);if(!P)return;const{x,w,h}=P;
  const padL=26,padR=26,iw=w-padL-padR;
  const ty=h*0.42;
  const XD=d=>padL+iw*d/1000;
  const ms=o.milestones; /* [{day,label,icon,color}] */
  function draw(p,hover){
    x.clearRect(0,0,w,h);
    /* fenêtre dorée */
    x.fillStyle='rgba(245,158,11,.09)';
    rr(x,padL,ty-46,iw*p,92,10);x.fill();
    x.strokeStyle='rgba(245,158,11,.4)';x.setLineDash([5,4]);
    rr(x,padL,ty-46,iw,92,10);x.stroke();x.setLineDash([]);
    x.fillStyle='#B45309';x.font='800 9.5px '+FONT;x.textAlign='left';
    x.fillText('★ '+o.t('c13.window'),padL+8,ty-52);
    /* axe */
    x.strokeStyle='#C4D4E8';x.lineWidth=2.4;
    x.beginPath();x.moveTo(padL,ty);x.lineTo(padL+iw*p,ty);x.stroke();
    /* bandes interventions */
    o.ints.forEach((it0,ii)=>{
      const ip=clamp((p*1200-ii*160)/420,0,1);
      if(ip<=0)return;
      const x1=XD(it0.d0),x2=XD(it0.d0+(it0.d1-it0.d0)*ip);
      const by=ty-30-ii*9;
      x.strokeStyle=it0.color;x.lineWidth=5;x.lineCap='round';
      x.beginPath();x.moveTo(x1,by);x.lineTo(x2,by);x.stroke();
      if(ip>=1){
        x.fillStyle=it0.color;x.beginPath();x.arc(XD(it0.d1),by,3.4,0,7);x.fill();
      }
    });
    /* jalons */
    ms.forEach((m4,mi)=>{
      const mp=clamp((p*1000-m4.day/1000*700)/300,0,1);
      if(mp<=0)return;
      const px=XD(m4.day);
      x.globalAlpha=mp;
      x.beginPath();x.arc(px,ty,hover===mi?8:6.4,0,7);
      x.fillStyle=m4.color;x.fill();
      x.strokeStyle='#fff';x.lineWidth=2;x.stroke();
      x.font='11px '+FONT;x.textAlign='center';x.fillText(m4.icon,px,ty-14);
      x.fillStyle='#33507A';x.font='700 9.5px '+FONT;
      x.fillText(m4.label,px,ty+22);
      x.fillStyle=C.muted;x.font='600 8.5px '+FONT;
      x.fillText(o.fmt(m4.day,0)+' '+o.t('c13.days'),px,ty+34);
      x.globalAlpha=1;
    });
    /* courbe impact sous la timeline */
    const cy0=h*0.78,ch=h*0.15;
    x.fillStyle=C.muted;x.font='600 9px '+FONT;x.textAlign='left';
    x.fillText(o.t('c13.curve'),padL,cy0-ch-5);
    const n=40,pts=[];
    for(let i=0;i<=n;i++){
      const d=i/n;
      const val=100-26*Math.pow(d,1.35); /* réduction si intervention */
      pts.push({x:padL+iw*d,y:cy0-ch*(val-70)/30});
    }
    const vis=partial(pts,p);
    const g=x.createLinearGradient(0,cy0-ch,0,cy0);
    g.addColorStop(0,'rgba(0,168,107,.3)');g.addColorStop(1,'rgba(0,168,107,.03)');
    x.beginPath();smooth(x,vis);x.lineTo(vis[vis.length-1].x,cy0);x.lineTo(vis[0].x,cy0);x.closePath();
    x.fillStyle=g;x.fill();
    x.beginPath();smooth(x,vis);x.strokeStyle=C.green;x.lineWidth=2;x.stroke();
    /* sans intervention (ligne plate) */
    x.strokeStyle='#CBD5E1';x.setLineDash([4,3]);x.lineWidth=1.4;
    x.beginPath();x.moveTo(padL,cy0-ch);x.lineTo(padL+iw*p,cy0-ch);x.stroke();x.setLineDash([]);
    /* chip impact */
    if(p>0.9){
      const txt='−'+Math.round(o.impact)+'% '+o.t('c13.impact');
      x.font='800 10.5px '+FONT;
      const tw=x.measureText(txt).width+20;
      x.fillStyle=C.blue;rr(x,w/2-tw/2,cy0+6,tw,20,10);x.fill();
      x.fillStyle='#fff';x.textAlign='center';x.textBaseline='middle';
      x.fillText(txt,w/2,cy0+16);x.textBaseline='alphabetic';
    }
  }
  cv.onmousemove=e=>{
    const{mx,my}=mpos(cv,e);
    let hit=-1;
    ms.forEach((m4,mi)=>{if(Math.abs(mx-XD(m4.day))<12&&Math.abs(my-ty)<24)hit=mi});
    if(hit>=0){
      const m4=ms[hit];
      tipShow(`<div class="who-tip-t">${m4.icon} ${m4.label}</div><div class="who-tip-row">${o.intDesc[hit]}</div>`,e.clientX,e.clientY);
    }else tipHide();
    draw(cv._whoP||1,hit);
  };
  cv.onmouseleave=()=>{tipHide();draw(cv._whoP||1,-1)};
  run(cv,o.animate,1900,p=>{cv._whoP=p;draw(p,-1)});
}

/* ════════════════ GRAPHIQUE 14 — gauges ════════════════ */
function c14Gauges(cv,o){
  const P=prep(cv);if(!P)return;const{x,w,h}=P;
  const items=o.items; /* [{label,val}] */
  const cols=3,rowsN=2;
  const cw=w/cols,chh=h/rowsN;
  const colorFor=v=>v<50?C.red:v<75?C.amber:C.ok;
  function draw(p,hover){
    x.clearRect(0,0,w,h);
    items.forEach((it0,i)=>{
      const cc=i%cols,rrw=Math.floor(i/cols);
      const cx=cc*cw+cw/2, cy=rrw*chh+chh*0.52;
      const R=Math.min(cw,chh)*0.33;
      const a0=Math.PI,a1=Math.PI*2;
      const t=clamp((p*1100-i*90)/800,0,1);
      /* fond */
      x.beginPath();x.arc(cx,cy,R,a0,a1);x.strokeStyle='#E7EEF7';x.lineWidth=11;x.lineCap='round';x.stroke();
      /* valeur */
      const av=a0+(a1-a0)*it0.val/100*t;
      x.beginPath();x.arc(cx,cy,R,a0,av);x.strokeStyle=colorFor(it0.val);x.lineWidth=11;x.stroke();
      /* objectif 80% */
      const at=a0+(a1-a0)*0.8;
      x.strokeStyle='#0F2440';x.lineWidth=2.4;
      x.beginPath();
      x.moveTo(cx+Math.cos(at)*(R-9),cy+Math.sin(at)*(R-9));
      x.lineTo(cx+Math.cos(at)*(R+9),cy+Math.sin(at)*(R+9));x.stroke();
      /* texte */
      x.textAlign='center';
      x.fillStyle=hover===i?C.blue:C.ink;x.font='800 19px '+FONT;
      x.fillText(Math.round(it0.val*t)+'%',cx,cy+2);
      x.fillStyle=C.muted;x.font='700 10.5px '+FONT;
      x.fillText(it0.label,cx,cy+R*0.62+14);
      if(hover===i){
        x.strokeStyle=colorFor(it0.val);x.lineWidth=1.6;
        x.beginPath();x.arc(cx,cy,R+10,a0,a1);x.stroke();
      }
    });
  }
  cv.onmousemove=e=>{
    const{mx,my}=mpos(cv,e);
    let hit=-1;
    items.forEach((it0,i)=>{
      const cc=i%cols,rrw=Math.floor(i/cols);
      const cx=cc*cw+cw/2,cy=rrw*chh+chh*0.52,R=Math.min(cw,chh)*0.33;
      if(Math.hypot(mx-cx,my-cy)<R+14)hit=i;
    });
    if(hit>=0){
      const it0=items[hit];
      const st=it0.val>=75?o.t('c14.ok'):it0.val>=50?o.t('c14.mid'):o.t('c14.low');
      tipShow(`<div class="who-tip-t">${it0.label}</div>
        <div class="who-tip-row">${o.t('c14.target')} : <b>80%</b> · ${o.t('c14.gap')} : <b>${Math.round(it0.val-80)} pts</b></div>
        <div class="who-tip-row">${o.t('c14.status')} : <b>${st}</b></div>`,e.clientX,e.clientY);
    }else tipHide();
    draw(cv._whoP||1,hit);
  };
  cv.onmouseleave=()=>{tipHide();draw(cv._whoP||1,-1)};
  run(cv,o.animate,1400,p=>{cv._whoP=p;draw(p,-1)});
}

/* sparkline tableau (tendance 5 ans) */
function rowSpark(cv,vals,good){
  const P=prep(cv);if(!P)return;const{x,w,h}=P;
  const mx=Math.max(...vals),mn=Math.min(...vals);
  const col=good?C.ok:C.red;
  const pts=vals.map((v,i)=>({x:4+i*(w-8)/(vals.length-1),y:4+(h-8)*(1-(v-mn)/(mx-mn||1))}));
  x.beginPath();smooth(x,pts);x.strokeStyle=col;x.lineWidth=1.8;x.lineJoin='round';x.stroke();
  const lp=pts[pts.length-1];
  x.beginPath();x.arc(lp.x,lp.y,2.4,0,7);x.fillStyle=col;x.fill();
}

return{
  C,bindTip,tipShow,tipHide,prep,
  sparkBars,kpiGauge,kpiHBars,kpiDonut,rowSpark,
  c1Stunting,c2Rank,c3Radar,c4Season,c5Donut,c6Bubble,c7Waterfall,
  c8Heatmap,c9ANJE,c10Anaemia,c11Polar,c12Wash,c13Timeline,c14Gauges
};
})();
