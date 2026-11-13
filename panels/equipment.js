const inventoryKey='pv-equipment-inventory';
const diagramTargets=new Map();
let inventory=[];
try{
 const saved=JSON.parse(localStorage.getItem(inventoryKey)||'[]');
 if(Array.isArray(saved))inventory=saved;
}catch{}
function saveInventory(next){
 try{localStorage.setItem(inventoryKey,JSON.stringify(next));}
 catch{$('inventory-status').textContent='Nie udało się zapisać bazy w przeglądarce.';return;}
 inventory=next;
 $('inventory-status').textContent='Zapisano bazę.';
 if(result)showHour();
 paintInventory();
 return true;
}
function drawHistory(){
 const canvas=$('history-chart'), width=canvas.clientWidth;
 if(!width)return;
 const selected=$('history-series').value;
 const rows=history.filter(sample=>JSON.stringify([sample.id,sample.unit,sample.source])===selected);
 const ctx=canvas.getContext('2d'), ratio=devicePixelRatio;
 canvas.width=width*ratio;canvas.height=310*ratio;ctx.scale(ratio,ratio);
 if(!rows.length){$('history-detail').textContent='Brak zapisanych próbek.';return;}
 const low=Math.min(0,...rows.map(row=>row.value)), high=Math.max(0,...rows.map(row=>row.value));
 const first=rows[0].time, last=rows.at(-1).time;
 const x=t=>first===last?width/2:62+(t-first)/Math.max(1,last-first)*(width-82);
 const y=v=>high===low?150:268-(v-low)/(high-low)*234;
 ctx.font='12px Segoe UI';ctx.fillStyle='#d2e5d6';ctx.fillText(rows[0].unit,8,16);
 for(let step=0;step<=(high===low?0:4);step++){
  const v=low+(high-low)*step/4;
  ctx.strokeStyle='#395447';ctx.beginPath();ctx.moveTo(62,y(v));ctx.lineTo(width-20,y(v));ctx.stroke();
  ctx.fillText(format(v),4,y(v)+4);
 }
 ctx.strokeStyle='#a9e294';ctx.lineWidth=2;ctx.beginPath();
 rows.forEach((row,i)=>i?ctx.lineTo(x(row.time),y(row.value)):ctx.moveTo(x(row.time),y(row.value)));ctx.stroke();
 ctx.fillStyle='#a9e294';
 for(const row of rows){ctx.beginPath();ctx.arc(x(row.time),y(row.value),4,0,2*Math.PI);ctx.fill();}
 ctx.fillStyle='#d2e5d6';ctx.fillText(new Date(first).toLocaleTimeString(),62,296);
 if(first!==last&&width>230)ctx.fillText(new Date(last).toLocaleTimeString(),width-86,296);
 $('history-detail').textContent=rows[0].source+' · '+rows.length+' próbek · ostatnia: '+format(rows.at(-1).value)+' '+rows[0].unit;
}
$('history-series').onchange=drawHistory;
window.addEventListener('resize',drawHistory);
function paintInventory(){
 const target=$('inventory-target'),selected=target.value;
 target.replaceChildren(new Option('Bez przypisania',''),...[...diagramTargets].map(([id,label])=>new Option(label,id)));
 target.value=diagramTargets.has(selected)?selected:'';
 $('inventory-list').replaceChildren(...inventory.map(item=>{
  const row=document.createElement('tr');
  for(const value of [item.type==='sensor'?'Czujnik':'Urządzenie',item.name,item.model||'—',diagramTargets.get(item.target)||'—',item.link||'—',(['Modbus TCP','Modbus RTU'].includes(item.protocol)||item.protocol==='demo')?sampleLabel(item):item.link?'Zapisano konfigurację · brak odczytu':'Brak konfiguracji']){
   row.insertCell().textContent=value;
  }
  const remove=document.createElement('button');remove.textContent='Usuń';
  remove.setAttribute('aria-label','Usuń '+item.name);
  remove.onclick=()=>saveInventory(inventory.filter(entry=>entry.id!==item.id));
  const edit=document.createElement('button');edit.textContent='Edytuj';
  edit.onclick=()=>editInventory(item);
  const actions=row.insertCell();if(item.protocol!=='demo')actions.append(edit);actions.append(remove);
  if(['Modbus TCP','Modbus RTU'].includes(item.protocol)){
   const read=document.createElement('button');read.textContent='Odczytaj próbkę';
   read.onclick=()=>readSample(item,read);
   actions.append(read);
  }
  return row;
 }));
 const series=$('history-series'), previous=series.value;
 const options=new Map(history.filter(sample=>inventory.some(item=>item.id===sample.id)).map(sample=>[
  JSON.stringify([sample.id,sample.unit,sample.source]), sample.name+' · '+sample.unit+' · '+sample.source
 ]));
 series.replaceChildren(...[...options].map(([key,label])=>new Option(label,key)));
 if(options.has(previous))series.value=previous;
 requestAnimationFrame(drawHistory);
 $('sample-history').replaceChildren(...history.filter(sample=>inventory.some(item=>item.id===sample.id)).slice().reverse().map(sample=>{
  const row=document.createElement('tr');
  for(const value of [sample.name,new Date(sample.time).toLocaleString(),format(sample.value)+' '+sample.unit,sample.source]){
   row.insertCell().textContent=value;
  }
  return row;
 }));
}
const historyKey='pv-sample-history';
let history=[];
try{
 const saved=JSON.parse(localStorage.getItem(historyKey)||'[]');
 if(Array.isArray(saved))history=saved.filter(s=>s&&Number.isFinite(s.value)&&Number.isFinite(s.time)).slice(-200);
}catch{}
const latestSamples=new Map(history.map(sample=>[sample.id,sample]));
function recordSample(item,value,source){
 const sample={id:item.id,name:item.name,value,time:Date.now(),unit:item.connection.measurementUnit||'',source};
 latestSamples.set(item.id,sample);
 history=[...history,sample].slice(-200);
 try{localStorage.setItem(historyKey,JSON.stringify(history));}
 catch{$('inventory-status').textContent='Próbka dostępna w tej sesji. Zapis lokalny nie powiódł się.';return false;}
 return true;
}
$('meter-demo').onclick=()=>{
 const item={id:'demo-meter',type:'sensor',name:'Licznik demonstracyjny',model:'Próbka testowa',
  target:'wire-4-1',link:'Demo',protocol:'demo',connection:{measurementUnit:'W'}};
 if(!inventory.some(entry=>entry.id===item.id)&&!saveInventory([...inventory,item]))return;
 if(recordSample(item,-350,'Demo'))$('inventory-status').textContent='Dodano próbkę demo: −350 W (pobór).';
 paintInventory();if(result)showHour();
};
function sampleLabel(item){
 const sample=latestSamples.get(item.id);
 if(!sample)return 'Brak próbki';
 if(sample.error)return 'Błąd odczytu';
 return (sample.source==='Demo'?'Demo · ':'')+(sample.source!=='Demo'&&Date.now()-sample.time>60000?'Nieaktualny · ':'')+
  format(sample.value)+' '+sample.unit+' · '+new Date(sample.time).toLocaleTimeString();
}
setInterval(()=>{if(!$('inventory').hidden)paintInventory();if(result&&!$('start').hidden)showHour();},15000);
async function readSample(item,button){
 const c=item.connection;
 if(c.register==null||c.register===''){
  editInventory(item);$('inventory-status').textContent='Uzupełnij adres rejestru i zapisz wpis.';return;
 }
 button.disabled=true;
 try{
  const response=await fetch('/modbus-read',{method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({transport:item.protocol==='Modbus RTU'?'rtu':'tcp',com:c.com,baud:Number(c.baud),parity:c.parity,stop:Number(c.stop),host:c.host,port:Number(c.port),unit:Number(c.unit),address:Number(c.register),input:c.function==='4',format:c.format||'u16',scale:Number(c.scale??1),swap:c.order==='zamieniona'})});
  const sample=await response.json();
  if(!inventory.includes(item))return;
  if(response.ok&&Number.isFinite(sample.value)){
   if(recordSample(item,sample.value,item.protocol))$('inventory-status').textContent=item.name+' · '+sampleLabel(item);
  }else{
   latestSamples.set(item.id,{error:true});$('inventory-status').textContent=item.name+' · '+(sample.error||'Nieprawidłowy odczyt.');
  }
 }catch{if(!inventory.includes(item))return;latestSamples.set(item.id,{error:true});$('inventory-status').textContent='Nie udało się pobrać próbki.';}
 finally{button.disabled=false;paintInventory();if(result)showHour();}
}
const networkFields=[['host','Adres IP lub nazwa hosta',''],['port','Port TCP','502',1,65535],['unit','Adres urządzenia','1',0,255],['register','Adres rejestru od 0','',0,65535],['function','Typ rejestru (3 – holding, 4 – input)','4',3,4],['format','Format (u16, s16, u32, s32)','u16'],['order','Kolejność słów (normalna lub zamieniona)','normalna'],['scale','Mnożnik','1'],['measurementUnit','Jednostka pomiaru','W']];
const linkFields={
 Ethernet:networkFields,'Wi-Fi':networkFields,
 'RS-485':[['com','Port COM',''],['baud','Prędkość transmisji (bit/s)','9600',1,1000000],['parity','Parzystość (N, E lub O)','E'],['stop','Bity stopu','1',1,2],['unit','Adres urządzenia','1',1,247],...networkFields.slice(3)],
 'Bluetooth LE':[['address','Identyfikator urządzenia',''],['service','UUID usługi GATT',''],['characteristic','UUID charakterystyki GATT','']]
};
let editingId=null;
function connectionFields(values={}){
 const link=$('inventory-link').value;
 $('connection-fields').replaceChildren(...(linkFields[link]||[]).map(([key,title,initial,min,max])=>{
  const label=document.createElement('label'),input=document.createElement('input');
  label.textContent=title;input.name=key;input.required=true;input.maxLength=253;
  if(min!==undefined){input.type='number';input.min=min;input.max=max;}
  if(key==='format')input.pattern='[us](16|32)';
  if(key==='order')input.pattern='normalna|zamieniona';
  if(key==='scale'){input.type='number';input.step='any';}
  if(key==='parity')input.pattern='[NEO]';
  input.value=values[key]??initial;label.append(input);return label;
 }));
}
function editInventory(item){
 editingId=item?.id??null;
 for(const [field,value] of Object.entries({name:item?.name,model:item?.model,target:item?.target,link:item?.link,type:item?.type??'sensor'})){
  $('inventory-'+field).value=value??'';
 }
 connectionFields(item?.connection);
}
$('inventory-link').onchange=()=>connectionFields();
$('inventory-new').onclick=()=>editInventory();
$('inventory-form').onsubmit=event=>{
 event.preventDefault();
 const name=$('inventory-name').value.trim();
 if(!name)return;
 const link=$('inventory-link').value;
 const connection=Object.fromEntries([...$('connection-fields').querySelectorAll('input')].map(input=>[input.name,input.value.trim()]));
 if(Object.values(connection).some(value=>!value)){
  $('inventory-status').textContent='Uzupełnij wszystkie parametry łącza.';return;
 }
 const item={id:editingId??crypto.randomUUID(),type:$('inventory-type').value,name,
  model:$('inventory-model').value.trim(),target:$('inventory-target').value,link,connection,
  protocol:link==='Bluetooth LE'?'GATT':link==='RS-485'?'Modbus RTU':link?'Modbus TCP':null};

 if(saveInventory(editingId?inventory.map(entry=>entry.id===editingId?item:entry):[...inventory,item])){
  if(editingId){latestSamples.delete(editingId);paintInventory();if(result)showHour();}
  editInventory();
 }
};
