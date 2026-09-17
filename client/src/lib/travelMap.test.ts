import test from 'node:test';
import assert from 'node:assert/strict';
import { globeClick, projectPin, readTravelMap } from './travelMap.js';
test('travel map rejects malformed pins and bounds rotation', () => {
  const state = readTravelMap('{"rotation":{"lon":7,"lat":99},"pins":[{"name":"Bangkok","note":"x","emoji":"📍","status":"visited","lat":13.7,"lon":100.5},{"name":2}]}');
  assert.equal(state.rotation.lat, 70); assert.equal(state.pins.length, 1);
});
test('globe conversion only accepts clicks on its sphere and projects front pins', () => {
  const rotation = { lon: 0, lat: 0 }, rect = { left: 0, top: 0, width: 200, height: 200 };
  assert.deepEqual(globeClick(100, 100, rect, rotation), { lat: 0, lon: 0 });
  assert.equal(globeClick(0, 0, rect, rotation), null);
  assert.equal(projectPin(0, 0, rotation).visible, true);
  assert.equal(projectPin(0, 180, rotation).visible, false);
});
