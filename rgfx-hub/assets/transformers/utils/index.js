export {
  sleep,
  trackedTimeout,
  trackedInterval,
  debounce,
  throttleLatest,
  clearAllTimers,
  exclusive,
} from './async.js';

export { scaleLinear, randomInt, randomElement, hslToRgb } from './math.js';
export { getWorldRecord } from './world-record.js';

export function formatNumber(value) {
  return Number(value).toLocaleString();
}

export function pick(array, count) {
  const n = Math.min(count, array.length);
  const copy = array.slice();
  for (let i = 0; i < n; i++) {
    const j = i + Math.floor(Math.random() * (copy.length - i));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}
