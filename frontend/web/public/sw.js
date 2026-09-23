/* Repwise — minimal SW for ongoing workout lock-screen notifications. */
const WORKOUT_TAG = 'wt.active-workout';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('notificationclick', (event) => {
  const note = event.notification;
  note.close();
  const data = note.data || {};
  const workoutId = data.workoutId;
  const target = workoutId ? `/app/workouts/${workoutId}` : '/app/workouts';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          if ('navigate' in client && workoutId) {
            try {
              client.navigate(target);
            } catch {
              /* ignore */
            }
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(target);
      }
      return undefined;
    })
  );
});

/* Allow the page to ask the SW to post/replace a tagged notification. */
self.addEventListener('message', (event) => {
  const msg = event.data;
  if (!msg || msg.type !== 'WORKOUT_NOTIFICATION') {
    return;
  }
  if (msg.action === 'clear') {
    event.waitUntil(
      self.registration.getNotifications({ tag: WORKOUT_TAG }).then((list) => {
        for (const n of list) {
          n.close();
        }
      })
    );
    return;
  }
  if (msg.action === 'show' && msg.title) {
    const options = Object.assign({}, msg.options || {}, {
      tag: WORKOUT_TAG,
      renotify: false,
      silent: true
    });
    event.waitUntil(self.registration.showNotification(msg.title, options));
  }
});
