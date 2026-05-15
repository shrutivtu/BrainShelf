import { useSyncExternalStore } from 'react';

const listeners = new Set();

function notify() {
  listeners.forEach((cb) => cb());
}

function subscribe(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function normalizePath(raw) {
  if (raw === '/index.html' || raw === '') return '/';
  return raw;
}

function getPath() {
  return normalizePath(window.location.pathname);
}

window.addEventListener('popstate', notify);

export function navigate(to) {
  if (getPath() === to) return;
  window.history.pushState(null, '', to);
  notify();
}

export function useRoute() {
  return useSyncExternalStore(subscribe, getPath);
}
