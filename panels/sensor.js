const meterWireSeries=['sensor_raw','sensor_corrected'];
let calibration={offset:0}, previousCalibration=null, baseline=null;
try{
 const saved=JSON.parse(localStorage.getItem('pv-meter-calibration')||'{}');
 if(Number.isFinite(saved.current?.offset))calibration=saved.current;
 if(Number.isFinite(saved.previous?.offset))previousCalibration=saved.previous;
}catch{}
function saveCalibration(){
 try{localStorage.setItem('pv-meter-calibration',JSON.stringify({current:calibration,previous:previousCalibration}));}
 catch{$('sensor-status').textContent='Nie udało się zapisać ustawień w przeglądarce.';}
}
function updateSensor(){
 if(!result)return;
 for(const row of result.rows){
  row.sensor_raw=row.export_kwh-row.import_kwh;
  row.sensor_corrected=row.sensor_raw+calibration.offset;
 }
}
function paintSensor(){
 const r=result?.rows[index];
 $('sensor-readout').textContent=!r?'Brak danych':labelHour(index)+' · Surowy '+format(r.sensor_raw)+' kW · Skorygowany '+format(r.sensor_corrected)+' kW · Korekta '+format(calibration.offset)+' kW'+(calibration.date?' · '+new Date(calibration.date).toLocaleString():'')+(baseline?' · '+(Math.abs(r.sensor_corrected-baseline.center)>3*baseline.spread?'Poza zakresem odniesienia':'W zakresie odniesienia'):' · Brak zakresu odniesienia');
 $('undo-calibration').disabled=!previousCalibration;
}
$('calibration').onsubmit=e=>{
 e.preventDefault();const r=result?.rows[index], ref=$('reference-kw').valueAsNumber;
 if(!r||!Number.isFinite(ref-r.sensor_raw))return;
 previousCalibration=calibration;calibration={offset:ref-r.sensor_raw,date:new Date().toISOString()};
 saveCalibration();updateSensor();render();paintSensor();
};
$('undo-calibration').onclick=()=>{
 if(!previousCalibration)return;
 calibration=previousCalibration;previousCalibration=null;saveCalibration();updateSensor();render();paintSensor();
};
// Separate reference window, median and scaled MAD from universal-state-analyzer.
function median(values){
 const sorted=[...values].sort((a,b)=>a-b), n=sorted.length;
 return sorted[Math.floor((n-1)/2)]/2+sorted[Math.floor(n/2)]/2;
}
$('baseline-form').onsubmit=e=>{
 e.preventDefault();
 const parts=$('baseline-kw').value.split(';');
 const values=parts.map(x=>Number(x.trim().replace(',','.')));
 if(parts.length<5||parts.some(x=>!x.trim())||!values.every(Number.isFinite)){
  $('sensor-status').textContent='Podaj co najmniej pięć prawidłowych próbek.';return;
 }
 const center=median(values), spread=1.4826*median(values.map(v=>Math.abs(v-center)));
 if(!Number.isFinite(spread)||spread<=0){
  $('sensor-status').textContent='Potrzebne są próbki o większym zróżnicowaniu.';return;
 }
 baseline={center,spread};$('sensor-status').textContent='Zapisano zakres dla tej sesji.';paintSensor();
};
$('sensor-chart').onclick=()=>openChart(meterWireSeries);
