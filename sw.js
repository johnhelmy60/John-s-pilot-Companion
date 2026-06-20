const CACHE='johns-pilot-companion-v2-15';
const ASSETS=[
  './index.html',
  './manifest.webmanifest',
  './icon.svg',
  './src/app.js',
  './src/aircraft.js',
  './src/airports.js',
  './src/frequencies.js',
  './src/craft.js',
  './src/briefing.js',
  './src/kneeboard.js',
  './src/minimums.js',
  './src/atc.js',
  './src/flightfollowing.js',
  './src/fuel.js',
  './src/wb.js',
  './data/airport_database_A_M.json?v=3',
  './data/airport_database_N_Z.json?v=3'
];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)))});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  const url=new URL(e.request.url);
  if(url.origin!==self.location.origin)return;
  e.respondWith(fetch(e.request).then(r=>{let copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r}).catch(()=>caches.match(e.request)));
});
