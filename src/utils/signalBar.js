// src/utils/signalBar.js
// Returns bar count (1-5) and label based on weekly signal score

export function getSignalBar(weeklySignal = 0) {
  if (weeklySignal >= 100) return { bars: 5, label: 'Elite' };
  if (weeklySignal >= 60)  return { bars: 4, label: 'Strong' };
  if (weeklySignal >= 30)  return { bars: 3, label: 'Active' };
  if (weeklySignal >= 10)  return { bars: 2, label: 'Growing' };
  if (weeklySignal >= 1)   return { bars: 1, label: 'New' };
  return { bars: 0, label: 'Inactive' };
}
