const CACHE_NAME = 'inspection-pwa-v3';
const urlsToCache = [
  '/',
  '/app.html',
  '/report-generator.html',
  '/assets/images/Trinetra.png',
  '/assets/images/ins.webp',
  '/assets/images/icon-192.png',
  '/assets/images/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2'
];

// Install Service Worker
self.addEventListener('install', event => {
  console.log('🔧 Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('📦 Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .catch(err => console.error('❌ Cache failed:', err))
  );
  self.skipWaiting();
});

// Activate Service Worker
self.addEventListener('activate', event => {
  console.log('✅ Service Worker activated');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Strategy
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // 1. API requests: Network Only
  if (url.pathname.startsWith('/api/')) {
    return event.respondWith(fetch(event.request));
  }

  // 2. HTML Pages: Network First, then Cache (to ensure updates are seen)
  if (url.pathname.endsWith('.html') || url.pathname === '/' || url.pathname.includes('admin-dashboard')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Check if valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          // Clone and update cache
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          return caches.match(event.request).then(response => {
            if (response) return response;
            // Fallback to app.html for SPA navigation
            return caches.match('/app.html');
          });
        })
    );
    return;
  }

  // 3. Assets (Images, JS, CSS): Cache First, then Network
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }

        const fetchRequest = event.request.clone();
        return fetch(fetchRequest).then(response => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          const responseToCache = response.clone();
          if (event.request.url.startsWith('http')) {
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        });
      })
  );
});

// Background sync for offline data
self.addEventListener('sync', event => {
  if (event.tag === 'sync-inspections') {
    event.waitUntil(syncInspections());
  }
  if (event.tag === 'sync-pdf-reports') {
    event.waitUntil(syncPendingReports());
  }
});

async function syncInspections() {
  console.log('🔄 Syncing inspections from IndexedDB...');

  try {
    // Open IndexedDB
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('InspectionDB', 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });

    // Get all inspections with PENDING_SUBMIT status
    const tx = db.transaction(['inspections'], 'readonly');
    const store = tx.objectStore('inspections');
    const allInspections = await new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    const pending = allInspections.filter(i => i.syncStatus === 'PENDING_SUBMIT');
    console.log(`Found ${pending.length} pending inspections to sync`);

    // Get auth token from localStorage (passed from main app)
    const authToken = await clients.matchAll().then(clientList => {
      // Request token from first client
      if (clientList.length > 0) {
        return new Promise(resolve => {
          const channel = new MessageChannel();
          channel.port1.onmessage = event => resolve(event.data.authToken);
          clientList[0].postMessage({ type: 'GET_AUTH_TOKEN' }, [channel.port2]);
          setTimeout(() => resolve(null), 1000); // Timeout fallback
        });
      }
      return null;
    });

    if (!authToken) {
      console.warn('⚠️ No auth token available. Sync skipped.');
      return;
    }

    for (const inspection of pending) {
      try {
        const response = await fetch(`/api/inspections/${inspection.id}/submit`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({ inspectionJson: inspection.inspectionJson })
        });

        if (response.ok) {
          // Remove pending flag from IndexedDB
          const updateTx = db.transaction(['inspections'], 'readwrite');
          const updateStore = updateTx.objectStore('inspections');
          delete inspection.syncStatus;
          inspection.status = 'FINAL';
          updateStore.put(inspection);
          console.log(`✅ Synced inspection ${inspection.id}`);
        }
      } catch (err) {
        console.error(`❌ Failed to sync inspection ${inspection.id}`, err);
      }
    }

    db.close();
  } catch (error) {
    console.error('❌ Sync inspections error:', error);
  }
}

async function syncPendingReports() {
  console.log('🔄 Syncing pending PDF reports...');
  // PDF reports are generated by admin on-demand, no sync needed
  // This is a placeholder for future report queue if needed
}

// Push notifications (optional)
self.addEventListener('push', event => {
  const options = {
    body: event.data ? event.data.text() : 'New inspection update',
    icon: '/assets/images/icon-192.png',
    badge: '/assets/images/icon-192.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    }
  };

  event.waitUntil(
    self.registration.showNotification('Trinetra Inspection', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/app.html')
  );
});