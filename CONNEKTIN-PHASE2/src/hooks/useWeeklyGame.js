// src/hooks/useWeeklyGame.js
import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';

function getWeekId() {
  const d = new Date();
  const day = d.getDay();
  const diff = (day === 0) ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const jan1Day = jan1.getDay();
  const firstMonday = new Date(jan1);
  firstMonday.setDate(jan1.getDate() + (jan1Day === 0 ? 1 : jan1Day === 1 ? 0 : 8 - jan1Day));
  firstMonday.setHours(0, 0, 0, 0);
  const weekNum = Math.floor((d - firstMonday) / (7 * 86400000)) + 1;
  return d.getFullYear() + "-W" + String(weekNum).padStart(2, "0");
}

export function useWeeklyGame() {
  const { user } = useAuth();
  const [game, setGame]       = useState(null);
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(true);
  const weekId = getWeekId();

  // Listen to game config
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'weeklyGames', weekId),
      (snap) => {
        setGame(snap.exists() ? { id: snap.id, ...snap.data() } : null);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return unsub;
  }, [weekId]);

  // Listen to user's result for this week
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = onSnapshot(
      doc(db, 'weeklyGames', weekId, 'results', user.uid),
      (snap) => setResult(snap.exists() ? snap.data() : null)
    );
    return unsub;
  }, [weekId, user?.uid]);

  return { game, result, loading, weekId };
}
