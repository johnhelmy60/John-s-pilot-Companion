function finite(value){return value!==null&&value!==''&&Number.isFinite(Number(value))}

export function calculateLandingWeight(values){
 const takeoffWeightLb=Number(values.takeoffWeightLb),startingFuelGallons=Number(values.startingFuelGallons),plannedFlightHours=Number(values.plannedFlightHours),fuelBurnGph=Number(values.fuelBurnGph),taxiFuelGallons=Number(values.taxiFuelGallons),fuelPoundsPerGallon=Number(values.fuelPoundsPerGallon);
 const all=[takeoffWeightLb,startingFuelGallons,plannedFlightHours,fuelBurnGph,taxiFuelGallons,fuelPoundsPerGallon];
 if(!all.every(Number.isFinite)||takeoffWeightLb<=0||startingFuelGallons<0||plannedFlightHours<0||fuelBurnGph<=0||taxiFuelGallons<0||fuelPoundsPerGallon<=0)return null;
 const flightFuelConsumedGallons=plannedFlightHours*fuelBurnGph,totalFuelConsumedGallons=taxiFuelGallons+flightFuelConsumedGallons;
 if(totalFuelConsumedGallons>startingFuelGallons)return null;
 return {flightFuelConsumedGallons,totalFuelConsumedGallons,landingWeightLb:takeoffWeightLb-totalFuelConsumedGallons*fuelPoundsPerGallon};
}

export function createPerformanceViewModel(wbSnapshot,fuelSnapshot,edits,aircraft){
 const wb=wbSnapshot?Object.freeze(Object.assign({},wbSnapshot)):null;
 const plannedFlightHours=finite(edits.plannedFlightHours)?Number(edits.plannedFlightHours):(fuelSnapshot&&finite(fuelSnapshot.plannedFlightHours)?Number(fuelSnapshot.plannedFlightHours):null);
 const fuelBurnGph=finite(edits.fuelBurnGph)?Number(edits.fuelBurnGph):(fuelSnapshot&&finite(fuelSnapshot.fuelBurnGph)?Number(fuelSnapshot.fuelBurnGph):null);
 const taxiFuelGallons=finite(edits.taxiFuelGallons)?Number(edits.taxiFuelGallons):null;
 const sharedWb=Object.freeze({takeoffWeightLb:wb&&finite(wb.totalWeightLb)?Number(wb.totalWeightLb):null,startingFuelGallons:wb&&finite(wb.fuelGallons)?Number(wb.fuelGallons):null,cgArmIn:wb&&finite(wb.cgArmIn)?Number(wb.cgArmIn):null});
 const inputs={takeoffWeightLb:sharedWb.takeoffWeightLb,startingFuelGallons:sharedWb.startingFuelGallons,plannedFlightHours,fuelBurnGph,taxiFuelGallons,fuelPoundsPerGallon:aircraft&&finite(aircraft.fuelPpg)?Number(aircraft.fuelPpg):null};
 return Object.freeze({wbSnapshot:wb,aircraftStep:sharedWb,landingWeightStep:sharedWb,plannedFlightHours,fuelBurnGph,taxiFuelGallons,calculation:calculateLandingWeight(inputs)});
}
