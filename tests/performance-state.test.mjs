import assert from 'node:assert/strict';
import { createPerformanceViewModel } from '../src/performance-state.js';

const wb={totalWeightLb:1976,fuelGallons:48,cgArmIn:88.2,calculatedAt:'test'};
const fuel={plannedFlightHours:1.5,fuelBurnGph:8};
const view=createPerformanceViewModel(wb,fuel,{plannedFlightHours:'1.5',fuelBurnGph:'8',taxiFuelGallons:'1'},{fuelPpg:6});

assert.strictEqual(view.aircraftStep,view.landingWeightStep,'Both wizard steps must use the same W&B view object.');
assert.equal(view.aircraftStep.takeoffWeightLb,1976);
assert.equal(view.landingWeightStep.takeoffWeightLb,1976);
assert.equal(view.aircraftStep.startingFuelGallons,48);
assert.equal(view.landingWeightStep.startingFuelGallons,48);
assert.equal(view.calculation.landingWeightLb,1898);
console.log('Performance W&B synchronization test passed: 1976 lb and 48 gal match in both steps.');
