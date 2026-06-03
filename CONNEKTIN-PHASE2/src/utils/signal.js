// src/utils/signal.js
import { db } from "../firebase/config";
import { doc, getDoc, updateDoc, increment, serverTimestamp } from "firebase/firestore";

// Signal points per action
export const SIGNAL_POINTS = {
  POST_CREATED:          10,
  STORY_CREATED:          8,
  POST_LIKED_BY_OTHERS:   3,
  POST_COMMENT_RECEIVED:  5,
  COMMENT_GIVEN:          4,
  ARTICLE_READ:           5,
  ARTICLE_CREATED:       15,
  CIRCLE_REQUEST_SENT:    5,
  CIRCLE_ACCEPTED:       15,
  PROFILE_VIEWED:         2,
  LOGIN_ACTIVITY:         1,
};

// Bar thresholds (weekly)
export const SIGNAL_BARS = [
  { bars: 0, min: 0,   max: 0,   label: "No Signal" },
  { bars: 1, min: 1,   max: 19,  label: "Warming Up" },
  { bars: 2, min: 20,  max: 49,  label: "Building" },
  { bars: 3, min: 50,  max: 99,  label: "Good Signal" },
  { bars: 4, min: 100, max: 149, label: "Strong Signal" },
  { bars: 5, min: 150, max: Infinity, label: "Full Signal" },
];

// Get bar count + label from a score
export function getSignalBar(weeklyScore = 0) {
  const match = SIGNAL_BARS.slice().reverse().find(b => weeklyScore >= b.min);
  return match || SIGNAL_BARS[0];
}

// Check if weekly reset is needed (Monday 00:00)
function needsWeeklyReset(lastReset) {
  if (!lastReset) return true;
  const now = new Date();
  const last = lastReset.toDate ? lastReset.toDate() : new Date(lastReset);
  const dayOfWeek = now.getDay();
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const lastMonday = new Date(now);
  lastMonday.setDate(now.getDate() - daysSinceMonday);
  lastMonday.setHours(0, 0, 0, 0);
  return last < lastMonday;
}

// Check if monthly reset is needed (1st of month)
function needsMonthlyReset(lastReset) {
  if (!lastReset) return true;
  const now = new Date();
  const last = lastReset.toDate ? lastReset.toDate() : new Date(lastReset);
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  return last < firstOfMonth;
}

// Main function — call this for every signal-earning action
export async function addSignal(uid, points) {
  if (!uid || !points) return;
  try {
    const userRef = doc(db, "users", uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) return;

    const data = snap.data();
    const updates = {};

    // Check weekly reset
    if (needsWeeklyReset(data.weeklySignalReset)) {
      updates.weeklySignal = points;
      updates.weeklySignalReset = serverTimestamp();
    } else {
      updates.weeklySignal = increment(points);
    }

    // Check monthly reset
    if (needsMonthlyReset(data.monthlySignalReset)) {
      updates.monthlySignal = points;
      updates.monthlySignalReset = serverTimestamp();
    } else {
      updates.monthlySignal = increment(points);
    }

    // All-time never resets
    updates.allTimeSignal = increment(points);

    await updateDoc(userRef, updates);
  } catch (e) {
    console.error("Signal update error:", e);
  }
}
