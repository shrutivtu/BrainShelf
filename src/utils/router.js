import { useCallback, useSyncExternalStore } from 'react';

const listeners = new Set();

function notify() {
  listeners.forEach((cb) => cb());
}

function subscribe(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getPath() {
  return window.location.pathname;
}

window.addEventListener('popstate', notify);

export function navigate(to) {
  if (window.location.pathname === to) return;
  window.history.pushState(null, '', to);
  notify();
}

export function useRoute() {
  return useSyncExternalStore(subscribe, getPath);
}
