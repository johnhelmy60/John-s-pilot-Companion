import assert from 'node:assert/strict';
import { calculateAtmosphere, calculateWindComponents, calculateClimbFromRate, calculateClimbFromGradient, calculateFuelPlan, calculateDescentPlan } from '../src/performance-calculations.js';

const atmosphere=calculateAtmosphere({fieldElevationFt:5000,temperatureC:25,altimeterInHg:29.92});
assert.equal(atmosphere.pressureAltitudeFt,5000);
assert.ok(atmosphere.densityAltitudeFt>5000);
assert.equal(calculateAtmosphere({fieldElevationFt:5000,temperatureC:25,altimeterInHg:40}),null);

const direct=calculateWindComponents({runwayHeadingDeg:180,windDirectionDeg:180,windSpeedKt:10});
assert.equal(direct.headwindKt,10);
assert.ok(Math.abs(direct.crosswindKt)<0.001);
const rightCrosswind=calculateWindComponents({runwayHeadingDeg:180,windDirectionDeg:270,windSpeedKt:12,gustSpeedKt:18});
assert.ok(rightCrosswind.crosswindKt>11.99);
assert.ok(rightCrosswind.gustCrosswindKt>17.99);
assert.equal(calculateWindComponents({runwayHeadingDeg:180,windDirectionDeg:270,windSpeedKt:12,gustSpeedKt:8}),null);

const climbRate=calculateClimbFromRate({groundSpeedKt:120,verticalSpeedFpm:600});
assert.equal(climbRate.gradientFtPerNm,300);
assert.equal(climbRate.requiredFpm,600);
const climbGradient=calculateClimbFromGradient({groundSpeedKt:90,gradientFtPerNm:200});
assert.equal(climbGradient.requiredFpm,300);
assert.equal(climbGradient.gradientFtPerNm,200);

const fuel=calculateFuelPlan({fuelOnboardGal:48,fuelBurnGph:8,reserveMinutes:60,plannedMinutes:120});
assert.equal(fuel.totalEnduranceMinutes,360);
assert.equal(fuel.usableEnduranceMinutes,300);
assert.equal(fuel.fuelRemainingGal,32);
assert.equal(fuel.reserveExceedsFuel,false);

const descent=calculateDescentPlan({cruiseAltitudeFt:10000,targetAltitudeFt:5000,descentRateFpm:500,groundSpeedKt:120});
assert.equal(descent.descentMinutes,10);
assert.equal(descent.distanceNm,20);
assert.equal(calculateDescentPlan({cruiseAltitudeFt:5000,targetAltitudeFt:10000,descentRateFpm:500,groundSpeedKt:120}),null);

console.log('Runway and flight math calculations passed.');
