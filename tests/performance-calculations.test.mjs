import assert from 'node:assert/strict';
import { calculateAtmosphere, calculateWindComponent } from '../src/performance-calculations.js';
const atmosphere=calculateAtmosphere({fieldElevationFt:5000,temperatureC:25,altimeterInHg:29.92});assert.equal(atmosphere.pressureAltitudeFt,5000);assert.ok(atmosphere.densityAltitudeFt>5000);
assert.equal(calculateWindComponent({runwayHeadingDeg:180,windDirectionDeg:180,windSpeedKt:10}).componentKt,10);
assert.ok(calculateWindComponent({runwayHeadingDeg:180,windDirectionDeg:360,windSpeedKt:10}).componentKt<-9.99);
console.log('Manual atmospheric and runway wind calculations passed.');
