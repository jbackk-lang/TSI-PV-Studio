const comparisonStart=$('comparison-start'), comparisonMeter=$('comparison-meter');
const day=new Date();day.setHours(0,0,0,0);
comparisonStart.value=new Date(day.getTime()-day.getTimezoneOffset()*60000).toISOString().slice(0,16);
function comparisonTime(t){return new Date(t).toLocaleString('pl-PL',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});}
function comparisonRows(){
 const start=new Date(comparisonStart.value).getTime();
 if(!result||!Number.isFinite(start))return [];
 const selected=comparisonMeter.value||'comparison-demo';
 const samples=history.filter(s=>s.id===selected&&s.source==='Modbus TCP'&&['W','kW'].includes(s.unit)).sort((a,b)=>a.time-b.time);
 return result.rows.map((r,i)=>{
  const time=start+i*3600000;
  if(selected==='comparison-demo'){
   const missing=i%24===11||i%24===12;
   return {time,predicted:r.import_kwh,measured:missing?null:r.import_kwh+(i%24===18?.35:0),coverage:missing?0:60};
  }
  let coverage=0,energy=0;
  for(let j=1;j<samples.length;j++){
   const a=samples[j-1],b=samples[j],gap=b.time-a.time;
   if(gap<=0||gap>300000||a.unit!==b.unit)continue;
   const from=Math.max(time,a.time),to=Math.min(time+3600000,b.time);
   if(to<=from)continue;
   coverage+=to-from;
   energy+=Math.max(0,-a.value)/(a.unit==='W'?1000:1)*(to-from)/3600000;
  }
  return {time,predicted:r.import_kwh,measured:coverage===3600000?energy:null,coverage:coverage/60000};
 });
}
function paintComparison(){
 const selected=comparisonMeter.value;
 const meters=inventory.filter(item=>item.target==='wire-4-1'&&item.protocol==='Modbus TCP');
 comparisonMeter.replaceChildren(new Option('Dane demonstracyjne','comparison-demo'),...meters.map(item=>new Option(item.name,item.id)));
 if([...comparisonMeter.options].some(option=>option.value===selected))comparisonMeter.value=selected;
 $('comparison-note').textContent=comparisonMeter.value==='comparison-demo'?'Demo: pomiar przykładowy z luką o 11:00 i 12:00 przy profilu od północy.':'Pobór oznacza ujemną moc w W lub kW. Luki powyżej pięciu minut pozostają bez oszacowania.';
 const rows=comparisonRows();
 $('comparison-download').disabled=!rows.length;
 $('comparison-table').replaceChildren(...rows.map(r=>{
  const row=document.createElement('tr');
  for(const v of [comparisonTime(r.time),format(r.predicted),r.measured===null?'Brak pełnych danych':format(r.measured),r.measured===null?'—':format(r.measured-r.predicted),format(r.coverage)])row.insertCell().textContent=v;
  return row;
 }));
 const canvas=$('comparison-chart'),width=canvas.clientWidth,ratio=devicePixelRatio;
 if(!width||!rows.length)return;
 canvas.width=width*ratio;canvas.height=310*ratio;
 const ctx=canvas.getContext('2d');ctx.scale(ratio,ratio);ctx.font='12px Segoe UI';
 const max=rows.reduce((m,r)=>Math.max(m,r.predicted,r.measured??0),1);
 const x=i=>50+i*(width-75)/Math.max(1,rows.length-1),y=v=>258-v*225/max;
 ctx.fillStyle='#d2e5d6';ctx.fillText('kWh',5,16);
 for(let i=0;i<=4;i++){const v=max*i/4;ctx.fillText(format(v),4,y(v));ctx.strokeStyle='#395447';ctx.beginPath();ctx.moveTo(50,y(v));ctx.lineTo(width-25,y(v));ctx.stroke();}
 for(const [key,color,label,legendX] of [['predicted','#a9e294','Symulacja',50],['measured','#8cc7d7','Pomiar',135]]){
  ctx.strokeStyle=color;ctx.fillStyle=color;ctx.fillText(label,legendX,17);ctx.lineWidth=2;
  ctx.beginPath();let connected=false;
  rows.forEach((r,i)=>{if(r[key]===null){connected=false;return;}if(connected)ctx.lineTo(x(i),y(r[key]));else ctx.moveTo(x(i),y(r[key]));connected=true;});ctx.stroke();
  rows.forEach((r,i)=>{if(r[key]!==null){ctx.beginPath();ctx.arc(x(i),y(r[key]),2.5,0,2*Math.PI);ctx.fill();}});
 }
 ctx.fillStyle='#d2e5d6';
 const step=Math.max(1,Math.ceil(rows.length/Math.max(1,Math.floor(width/115))));
 rows.forEach((r,i)=>{if(i%step===0)ctx.fillText(comparisonTime(r.time),Math.min(x(i),width-100),287);});
}
$('comparison-download').onclick=()=>{
 const rows=comparisonRows();
 if(!rows.length)return;
 const source=comparisonMeter.value==='comparison-demo'?'Demo':'Modbus TCP';
 const decimal=value=>String(Number(value.toFixed(6))).replace('.',',');
 const header='Czas (UTC);Symulacja (kWh);Pomiar (kWh);Różnica (kWh);Minuty danych;Źródło';
 const lines=rows.map(row=>[
  new Date(row.time).toISOString(),decimal(row.predicted),
  row.measured===null?'':decimal(row.measured),
  row.measured===null?'':decimal(row.measured-row.predicted),
  decimal(row.coverage),source
 ].join(';'));
 const url=URL.createObjectURL(new Blob(['\uFEFF'+[header,...lines].join('\r\n')],{type:'text/csv;charset=utf-8'}));
 const download=document.createElement('a');
 download.href=url;download.download='porownanie-licznika.csv';download.click();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
};
comparisonStart.onchange=paintComparison;
comparisonMeter.onchange=paintComparison;
window.addEventListener('resize',()=>{if(!$('meter').hidden)paintComparison();});
