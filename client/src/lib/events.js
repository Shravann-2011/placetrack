// Tiny app-wide signal: "applications changed", so the sidebar counts refresh
const EVENT = 'placetrack:applications-changed';
export const notifyApplicationsChanged = () => window.dispatchEvent(new Event(EVENT));
export const onApplicationsChanged = (fn) => {
  window.addEventListener(EVENT, fn);
  return () => window.removeEventListener(EVENT, fn);
};
