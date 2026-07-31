const CACHE="dhiexpress-supabase-v1";
const CORE=["./","./index.html","./search.html","./categories.html","./assets/css/style.css","./assets/js/app.js","./assets/js/pages.js","./assets/js/services.js","./assets/js/ui.js","./assets/js/config.js","./assets/icons/icon.svg"];
self.addEventListener("install",event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener("activate",event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",event=>{
  if(event.request.method!=="GET"||new URL(event.request.url).origin!==location.origin)return;
  event.respondWith(fetch(event.request).then(response=>{const clone=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,clone));return response;}).catch(()=>caches.match(event.request).then(r=>r||caches.match("./404.html"))));
});
