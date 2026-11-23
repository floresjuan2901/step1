const CACHE="step1-v1.5.3";
const SHELL=["./", "index.html", "video-links.js", "sketchy-videos.js", "manifest.webmanifest", "firebase-config.js", "lib/pdf.min.js", "lib/pdf.worker.min.js", "lib/firebase-app-compat.js", "lib/firebase-auth-compat.js", "lib/firebase-firestore-compat.js", "lib/firebase-storage-compat.js", "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png"];
self.addEventListener("install",e=>{ e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL))); });
self.addEventListener("activate",e=>{ e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE&&k.startsWith("step1-")).map(k=>caches.delete(k)))).then(()=>self.clients.claim())); });
self.addEventListener("message",e=>{ if(e.data==="skip") self.skipWaiting(); });
self.addEventListener("fetch",e=>{
  const req=e.request; if(req.method!=="GET") return;
  const u=new URL(req.url);
  if (u.origin===location.origin){
    if(/\/(drive-videos\.js|video-mapping-report\.json)$/.test(u.pathname)){
      e.respondWith(Promise.resolve(new Response("Catalog unavailable as a public file.",{status:404,headers:{"Cache-Control":"no-store"}})));return;
    }
    e.respondWith(caches.open(CACHE).then(c=>c.match(req,{ignoreSearch:true}).then(hit=>{
      const net=fetch(req).then(r=>{ if(r.ok) c.put(req,r.clone()); return r; }).catch(()=>hit);
      return hit||net;
    })));
    return;
  }
  if (u.host==="fonts.googleapis.com"||u.host==="fonts.gstatic.com"){
    e.respondWith(caches.open("step1-fonts").then(c=>c.match(req).then(hit=>hit||fetch(req).then(r=>{ c.put(req,r.clone()); return r; }))));
  }
});
