/* BlackBoy Fortune service worker.
   Raise VERSION every time you change any site file, so phones drop the old copy. */
const VERSION = 'bbf-v1';                                   // name of this cache generation
const PAGES = ['index.html','shop.html','who-we-are.html','our-story.html','blog.html','reviews.html'];
const ASSETS = [
  'home.css','shop.css','who-we-are.css','our-story.css','blog.css','reviews.css',
  'home.js','shop.js','who-we-are.js','our-story.js','blog.js','reviews.js','manifest.json',
  'assets/img/logo.png','assets/img/logo-white.png','assets/img/logo-black.png','assets/img/logo-gold.png',
  'assets/img/icon-192.png','assets/img/icon-512.png','assets/img/apple-touch-icon.png',
  'assets/img/street-bridge.jpg','assets/img/three-friends.jpg','assets/img/group-studio.jpg',
  'assets/img/caps-flatlay.jpg','assets/img/two-friends-tree.jpg','assets/img/rack-shop.jpg',
  'assets/img/tracksuit.jpg','assets/img/collar-sweater.jpg','assets/img/plain-tee.jpg'
];

self.addEventListener('install', event => {                 // runs once when a new worker is found
  event.waitUntil(
    caches.open(VERSION).then(cache =>                      // open this version's cache
      Promise.all([...PAGES, ...ASSETS].map(url =>          // add every file on its own...
        cache.add(url).catch(() => {})))                    // ...so one missing file can't break the install
    ).then(() => self.skipWaiting())                        // activate right away instead of waiting
  );
});

self.addEventListener('activate', event => {                // runs when the new worker takes over
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))  // delete old versions
    ).then(() => self.clients.claim())                      // control open pages immediately
  );
});

self.addEventListener('fetch', event => {                   // runs for every request the pages make
  const req = event.request;
  if (req.method !== 'GET') return;                         // only cache plain page/file loads
  if (req.headers.has('range')) return;                     // video seeking uses range requests: let the network handle it
  const url = new URL(req.url);
  if (url.origin !== location.origin && !/fonts\.(googleapis|gstatic)\.com/.test(url.host)) return; // ignore other sites (WhatsApp etc.)

  if (req.mode === 'navigate') {                            // a page was opened
    event.respondWith(
      fetch(req).then(res => {                              // online: get the newest page...
        const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); return res;  // ...and keep a copy
      }).catch(() => caches.match(req).then(r => r || caches.match('index.html')))  // offline: saved page, else home
    );
    return;
  }

  event.respondWith(                                        // images, CSS, JS, fonts: saved copy first (fast)
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }  // save new files as they are used
      return res;
    }))
  );
});
