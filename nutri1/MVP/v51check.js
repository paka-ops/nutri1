
(function(){
 const IDS=['health','agri','unicef','who','wfp','fao','monitoring'];
 const labels={health:'Ministry of Health',agri:'Ministry of Agriculture',unicef:'UNICEF',who:'WHO',wfp:'WFP',fao:'FAO',monitoring:'Projects, Surveys & Nutrition Surveillance'};
 const $=id=>document.getElementById(id);
 function text(el){return (el?.innerText||el?.textContent||'').replace(/\s+/g,' ').trim()}
 function resultFor(section,subject){
   const c=document.getElementById(section+'Country')?.selectedOptions?.[0]?.textContent||document.getElementById('country')?.selectedOptions?.[0]?.textContent||'Togo';
   const year=document.getElementById(section+'Year')?.value||'2026';
   const results={
    health:`${c} ${year}: signal recalculated. Risk stratification, screening priorities and intervention impact are ready for review.`,
    agri:`${c} ${year}: production, loss, market and climate signals reconciled. Priority hotspots updated on the intelligence layer.`,
    unicef:`${c} ${year}: child and maternal nutrition indicators refreshed. Hotspots, feeding signals and alerts recalculated.`,
    who:`${c} ${year}: NCD risk profile recalculated from the selected condition. Prevention priorities and trend signals updated.`,
    wfp:`${c} ${year}: food-security risk, affordability, consumption and vulnerability layers synchronized. Early-warning status updated.`,
    fao:`${c} ${year}: food-system intelligence refreshed. Production, post-harvest loss, markets, safety and climate-agriculture links recalculated.`,
    monitoring:`${c} ${year}: monitoring workspace executed. Indicators, data-quality checks, survey coverage and evaluation readiness recalculated.`
   };
   return results[section]||`${subject}: workflow completed successfully.`;
 }
 window.runV51Simulation=function(section,subject){
   const box=$('v51Live'); if(!box)return;
   $('v51LiveTitle').textContent='⚡ '+(labels[section]||'NUTRI.N°1 Intelligence');
   $('v51LiveSub').textContent='Live simulation • '+subject;
   $('v51LiveSteps').innerHTML='<div class="v51-step run">Connecting institutional data sources…</div><div class="v51-step run">Validating records, indicators and provenance…</div><div class="v51-step run">Running NUTRI.N°1 AI + analytics engine…</div><div class="v51-step run">Updating dashboard, GIS and alerts…</div>';
   $('v51LiveResult').textContent='Processing…'; box.classList.add('show');
   setTimeout(()=>{$('v51LiveSteps').innerHTML='<div class="v51-step ok">Data sources connected</div><div class="v51-step ok">Quality and provenance checks passed</div><div class="v51-step ok">AI + analytics completed</div><div class="v51-step ok">Dashboard and early-warning layers updated</div>'; $('v51LiveResult').textContent=resultFor(section,subject); toast('✓ '+subject+' — intelligence updated');},1250);
 };
 window.closeV51Sim=function(){$('v51Live')?.classList.remove('show')};
 function wire(){
   IDS.forEach(section=>{
     const root=document.getElementById(section); if(!root||root.dataset.v51wired)return; root.dataset.v51wired='1';
     root.addEventListener('click',function(e){
       if(e.target.closest('button,input,select,textarea,a,summary,.v51-live'))return;
       const el=e.target.closest('.core-card,.institution-map-grid button,.inst-kpi,.ncd-card,.risk-row,.alert-row,.age-card,.accordion,.card');
       if(!el||!root.contains(el))return;
       const heading=text(el.querySelector('h2,h3,b,.kpi,span'))||text(el).slice(0,90);
       // Ignore structural wrappers; target cards with a meaningful label.
       if(heading.length<3)return;
       el.classList.add('v51-actionable');
       runV51Simulation(section,heading);
     });
     root.querySelectorAll('.core-card,.inst-kpi,.ncd-card,.risk-row,.alert-row,.age-card,.institution-map-grid button').forEach(el=>el.classList.add('v51-actionable'));
   });
 }
 document.addEventListener('DOMContentLoaded',()=>setTimeout(wire,900));
 // Re-wire after dynamic page rendering.
 new MutationObserver(()=>{clearTimeout(window.__v51wire);window.__v51wire=setTimeout(wire,300)}).observe(document.body,{childList:true,subtree:true});
 // Make filter changes visibly behave like a live system.
 document.addEventListener('change',e=>{const id=e.target?.id||''; IDS.forEach(s=>{if(id===s+'Country'||id===s+'Level'||id===s+'Year'){setTimeout(()=>runV51Simulation(s,(e.target.selectedOptions?.[0]?.textContent||e.target.value)+' selected'),250)}})});
})();
