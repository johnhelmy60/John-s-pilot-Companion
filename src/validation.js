var rules={
 rwy:{min:1,max:360,label:'Runway or heading'},windDir:{min:0,max:360,label:'Wind direction'},windSpeed:{min:0,max:250,label:'Wind speed'},gust:{min:0,max:300,label:'Gust'},xwLimit:{min:0,max:100,label:'Crosswind limit'},
 fuelOnboard:{min:0,max:1000,label:'Fuel onboard'},flightHours:{min:0,max:48,label:'Planned flight time'},fuelBurn:{min:.1,max:200,label:'Fuel burn'},
 startHobbs:{min:0,max:99999,label:'Starting Hobbs'},endHobbs:{min:0,max:99999,label:'Ending Hobbs'},startTach:{min:0,max:99999,label:'Starting tach'},endTach:{min:0,max:99999,label:'Ending tach'},rate:{min:0,max:10000,label:'Rental rate'},
 goCeil:{min:0,max:60000,label:'Ceiling'},goVis:{min:0,max:200,label:'Visibility'},
 craftMaintain:{min:0,max:60000,label:'Maintain altitude'},craftExpect:{min:0,max:60000,label:'Expected altitude'},craftExpectTime:{min:0,max:120,label:'Expected altitude time'},
 ffAltimeter:{min:20,max:40,label:'Altimeter'},
 acEmptyWt:{min:1,max:100000,label:'Empty weight'},acEmptyArm:{min:-1000,max:1000,label:'Empty arm'},acMaxWt:{min:1,max:100000,label:'Maximum gross weight'},acFuelPpg:{min:.1,max:20,label:'Fuel weight'},acFrontArm:{min:-1000,max:1000,label:'Front arm'},acRearArm:{min:-1000,max:1000,label:'Rear arm'},acBagArm:{min:-1000,max:1000,label:'Baggage arm'},acFuelArm:{min:-1000,max:1000,label:'Fuel arm'},acFuelBurn:{min:.1,max:200,label:'Fuel burn'},acXwLimit:{min:0,max:100,label:'Crosswind limit'}
};

var airportIds=['planDeparture','planArrival','craftDep','craftArrival','airportSearch','customCode','freqCode','briefAirportSelect'];
var frequencyIds=['craftFreq','ffFrequency','atcFrequency','freqValue'];
var squawkIds=['craftSquawk','ffSquawk','atcSquawk'];
var altitudeIds=['ffAltitude','ffAssignedAltitude','atcAltitude'];
var requiredIds=['acN','acType','acEmptyWt','acEmptyArm','acMaxWt','acFuelPpg','acFuelBurn'];

function messageFor(input){
 var raw=input.value.trim();if(!raw)return input.required||requiredIds.indexOf(input.id)>=0?'This field is required.':'';
 var rule=rules[input.id];
 if(!rule&&input.type==='number'){
  if(/(Wt|Weight|frontWt|rearWt|bagWt)$/i.test(input.id))rule={min:0,max:100000,label:'Weight'};
  else if(/Arm$/i.test(input.id))rule={min:-1000,max:1000,label:'Arm'};
  else if(/Moment$/i.test(input.id))rule={min:-1000000000,max:1000000000,label:'Moment'};
  else if(/(Ceil|Altitude)$/i.test(input.id))rule={min:0,max:60000,label:'Altitude'};
  else if(/Vis$/i.test(input.id))rule={min:0,max:200,label:'Visibility'};
  else if(/(Xw|Gust|SurfaceWind)$/i.test(input.id))rule={min:0,max:300,label:'Wind value'};
  else if(/Reserve$/i.test(input.id))rule={min:0,max:1440,label:'Reserve'};
  else if(input.id==='customElev')rule={min:-1500,max:30000,label:'Airport elevation'};
 }
 if(rule){var value=Number(raw.replace(/,/g,''));if(!isFinite(value))return rule.label+' must be a number.';if(value<rule.min||value>rule.max)return rule.label+' must be between '+rule.min+' and '+rule.max+'.'}
 if(airportIds.indexOf(input.id)>=0&&!/^[A-Z0-9]{3,7}$/i.test(raw))return 'Use a 3–7 character airport or waypoint identifier.';
 if(frequencyIds.indexOf(input.id)>=0){var freq=Number(raw);if(!/^\d{3}\.\d{1,3}$/.test(raw)||freq<108||freq>137)return 'Enter an aviation frequency from 108.000 to 137.000 MHz.';}
 if(squawkIds.indexOf(input.id)>=0&&!/^[0-7]{4}$/.test(raw))return 'Squawk must contain exactly four digits from 0 through 7.';
 if(altitudeIds.indexOf(input.id)>=0){var altitude=Number(raw.replace(/,/g,''));if(!/^\d{1,2}(,?\d{3})?$/.test(raw)||altitude<0||altitude>60000)return 'Enter an altitude from 0 to 60,000 feet.';}
 if(input.id==='atcRunway'&&!/^(0?[1-9]|[12][0-9]|3[0-6])[LRC]?$/i.test(raw))return 'Use runway 1–36 with optional L, C, or R.';
 if(input.id==='acN'&&!/^N?[A-Z0-9-]{2,10}$/i.test(raw))return 'Enter a valid aircraft registration or callsign identifier.';
 if(input.id==='planRouteEntry'||input.id==='routeEntry'){
  if(!/^[A-Z0-9./,\s-]{1,80}$/i.test(raw))return 'Use letters, numbers, spaces, commas, period, slash, or hyphen.';
  if(raw.split(/[\s,]+/).some(function(token){return token.length>12}))return 'Each route entry must be 12 characters or fewer.';
 }
 if(input.type==='number'&&raw!==''&&!isFinite(Number(raw)))return 'Enter a valid number.';
 var section=input.closest('section');function related(id){var control=section&&section.querySelector('#'+id);return control&&control.value!==''?Number(control.value):null}
 if(input.id==='gust'&&related('windSpeed')!=null&&Number(raw)<related('windSpeed'))return 'Gust cannot be lower than steady wind speed.';
 if(input.id==='endHobbs'&&related('startHobbs')!=null&&Number(raw)<related('startHobbs'))return 'Ending Hobbs cannot be lower than starting Hobbs.';
 if(input.id==='endTach'&&related('startTach')!=null&&Number(raw)<related('startTach'))return 'Ending tach cannot be lower than starting tach.';
 if(input.id==='acMaxWt'&&related('acEmptyWt')!=null&&Number(raw)<=related('acEmptyWt'))return 'Maximum gross weight must exceed empty weight.';
 if(input.id==='planArrival'&&section&&raw.toUpperCase()===String((section.querySelector('#planDeparture')||{}).value||'').toUpperCase())return 'Arrival must differ from departure.';
 return '';
}

function errorElement(input){
 var id=input.id+'Error',error=(input.parentElement&&input.parentElement.querySelector('#'+id))||document.getElementById(id);
 if(!error){error=document.createElement('div');error.id=id;error.className='fieldError';error.setAttribute('role','alert');input.insertAdjacentElement('afterend',error)}
 input.setAttribute('aria-describedby',id);return error;
}

export function validateInput(input,show){
 if(!input||!input.id||input.disabled)return true;
 var message=messageFor(input),error=errorElement(input);
 input.setCustomValidity(message);input.setAttribute('aria-invalid',message?'true':'false');
 if(show||!message)error.textContent=message;return !message;
}

export function validateSection(section,show){
 var valid=true;
 Array.from(section.querySelectorAll('input,select,textarea')).forEach(function(input){if(!validateInput(input,show))valid=false});
 return valid;
}

function associateLabels(root){
 Array.from(root.querySelectorAll('label')).forEach(function(label){
  if(label.htmlFor)return;
  var control=label.querySelector('input,select,textarea'),within=label.parentElement?label.parentElement.querySelectorAll('input,select,textarea'):[];
  if(!control&&within.length===1)control=within[0];
  if(!control&&label.nextElementSibling&&label.nextElementSibling.matches('input,select,textarea'))control=label.nextElementSibling;
  if(control&&control.id)label.htmlFor=control.id;
 });
 Array.from(root.querySelectorAll('input,select,textarea')).forEach(function(control){
  if(control.getAttribute('aria-label')||control.getAttribute('aria-labelledby')||root.querySelector('label[for="'+control.id+'"]'))return;
  var row=control.closest('tr'),label='';
  if(row){var cells=Array.from(row.children),cell=control.closest('td'),index=cells.indexOf(cell),table=row.closest('table'),headers=table?Array.from(table.querySelectorAll('th')):[];label=((cells[0]&&cells[0].textContent.trim())||'Load item')+(headers[index]?' '+headers[index].textContent.trim():' value')}
  control.setAttribute('aria-label',label||control.placeholder||control.id.replace(/([a-z])([A-Z])/g,'$1 $2'));
 });
}

export function enhanceForms(roots){
 roots.forEach(function(root){
  associateLabels(root);
  var heading=root.querySelector('h2');if(heading){if(!heading.id)heading.id=root.id+'Title';root.setAttribute('aria-labelledby',heading.id)}
  root.setAttribute('role','region');
  Array.from(root.querySelectorAll('button')).forEach(function(button){if(!button.type)button.type='button'});
  Array.from(root.querySelectorAll('input,select,textarea')).forEach(function(input){
   validateInput(input,false);
   input.addEventListener('input',function(){validateInput(input,true)});
   input.addEventListener('blur',function(){validateInput(input,true)});
  });
 Array.from(root.querySelectorAll('[id$="Out"], [id$="Status"], .big')).forEach(function(output){if(!output.hasAttribute('aria-live'))output.setAttribute('aria-live','polite')});
 Array.from(root.querySelectorAll('.bubbleBox')).forEach(function(group,index){group.setAttribute('role','group');if(!group.getAttribute('aria-label')){var previous=group.previousElementSibling;group.setAttribute('aria-label',previous&&previous.textContent.trim()?previous.textContent.trim():'Option group '+(index+1))}});
 });
}
