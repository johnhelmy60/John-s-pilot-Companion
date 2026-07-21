function finite(value){return value!==null&&value!==''&&Number.isFinite(Number(value))}

export function calculateAtmosphere(values){
 if(!finite(values.fieldElevationFt)||!finite(values.temperatureC)||!finite(values.altimeterInHg))return null;
 var elevation=Number(values.fieldElevationFt),temperature=Number(values.temperatureC),altimeter=Number(values.altimeterInHg);
 if(elevation < -1500||elevation > 30000||temperature < -100||temperature > 70||altimeter < 25||altimeter > 35)return null;
 var pressureAltitudeFt=elevation+(29.92-altimeter)*1000;
 var isaTemperatureC=15-1.98*(pressureAltitudeFt/1000);
 return {pressureAltitudeFt:pressureAltitudeFt,densityAltitudeFt:pressureAltitudeFt+120*(temperature-isaTemperatureC),isaTemperatureC:isaTemperatureC};
}

export function calculateWindComponents(values){
 if(!finite(values.runwayHeadingDeg)||!finite(values.windDirectionDeg)||!finite(values.windSpeedKt))return null;
 var heading=Number(values.runwayHeadingDeg),direction=Number(values.windDirectionDeg),speed=Number(values.windSpeedKt);
 var gust=finite(values.gustSpeedKt)?Number(values.gustSpeedKt):null;
 if(heading<1||heading>360||direction<0||direction>360||speed<0||speed>250||gust!=null&&(gust<speed||gust>250))return null;
 var angle=((direction-heading+540)%360)-180,rad=angle*Math.PI/180;
 return {angleDegrees:angle,headwindKt:speed*Math.cos(rad),crosswindKt:speed*Math.sin(rad),gustHeadwindKt:gust==null?null:gust*Math.cos(rad),gustCrosswindKt:gust==null?null:gust*Math.sin(rad)};
}

export function calculateWindComponent(values){var result=calculateWindComponents(values);return result?{angleDegrees:result.angleDegrees,componentKt:result.headwindKt}:null}

function gradientValues(groundSpeedKt,gradientFtPerNm){
 var percent=gradientFtPerNm/60.76;
 return {requiredFpm:gradientFtPerNm*groundSpeedKt/60,gradientFtPerNm:gradientFtPerNm,gradientPercent:percent,angleDegrees:Math.atan(gradientFtPerNm/6076)*180/Math.PI};
}
export function calculateClimbFromRate(values){
 if(!finite(values.groundSpeedKt)||!finite(values.verticalSpeedFpm))return null;
 var gs=Number(values.groundSpeedKt),fpm=Number(values.verticalSpeedFpm);
 if(gs<=0||gs>1000||fpm<0||fpm>10000)return null;
 return gradientValues(gs,fpm*60/gs);
}
export function calculateClimbFromGradient(values){
 if(!finite(values.groundSpeedKt)||!finite(values.gradientFtPerNm))return null;
 var gs=Number(values.groundSpeedKt),gradient=Number(values.gradientFtPerNm);
 if(gs<=0||gs>1000||gradient<0||gradient>10000)return null;
 return gradientValues(gs,gradient);
}

export function calculateClimbPlan(values){
 if(!finite(values.startAltitudeFt)||!finite(values.targetAltitudeFt)||!finite(values.verticalSpeedFpm)||!finite(values.indicatedAirspeedKt))return null;
 var start=Number(values.startAltitudeFt),target=Number(values.targetAltitudeFt),rate=Number(values.verticalSpeedFpm),kias=Number(values.indicatedAirspeedKt);
 if(target<=start||start< -1500||target>100000||rate<=0||rate>10000||kias<=0||kias>500)return null;
 var minutes=(target-start)/rate;
 return {climbMinutes:minutes,approximateDistanceNm:kias*minutes/60,altitudeToGainFt:target-start};
}

export function calculateFuelPlan(values){
 if(!finite(values.fuelOnboardGal)||!finite(values.fuelBurnGph)||!finite(values.reserveMinutes))return null;
 var fuel=Number(values.fuelOnboardGal),burn=Number(values.fuelBurnGph),reserve=Number(values.reserveMinutes),planned=finite(values.plannedMinutes)?Number(values.plannedMinutes):null;
 if(fuel<0||fuel>10000||burn<=0||burn>1000||reserve<0||reserve>1440||planned!=null&&(planned<0||planned>10000))return null;
 var totalMinutes=fuel/burn*60,reserveFuel=burn*reserve/60;
 return {totalEnduranceMinutes:totalMinutes,usableEnduranceMinutes:Math.max(0,totalMinutes-reserve),reserveExceedsFuel:reserveFuel>fuel,fuelRemainingGal:planned==null?null:fuel-burn*planned/60};
}

export function calculateDescentPlan(values){
 var speed=finite(values.indicatedAirspeedKt)?values.indicatedAirspeedKt:values.groundSpeedKt;
 if(!finite(values.cruiseAltitudeFt)||!finite(values.targetAltitudeFt)||!finite(values.descentRateFpm)||!finite(speed))return null;
 var cruise=Number(values.cruiseAltitudeFt),target=Number(values.targetAltitudeFt),rate=Number(values.descentRateFpm),gs=Number(speed);
 if(cruise<=target||cruise>100000||target< -1500||rate<=0||rate>10000||gs<=0||gs>500)return null;
 var minutes=(cruise-target)/rate;
 return {descentMinutes:minutes,distanceNm:gs*minutes/60,altitudeToLoseFt:cruise-target};
}
