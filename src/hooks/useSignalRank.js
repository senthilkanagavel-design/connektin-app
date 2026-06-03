// src/hooks/useSignalRank.js
import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';

// Returns { weeklyRank, monthlyRank, allTimeRank, totalInIndustry, loading }
export function useSignalRank(uid, industry) {
  const [ranks, setRanks] = useState({
    weeklyRank: null,
    monthlyRank: null,
    allTimeRank: null,
    totalInIndustry: 0,
    loading: true,
  });

  useEffect(() => {
    if (!uid || !industry) return;

    const fetchRanks = async () => {
      try {
        const snap = await getDocs(
          query(
            collection(db, 'users'),
            where('industry', '==', industry),
          )
        );

        const users = snap.docs.map(d => ({ uid: d.id, ...d.data() }));
        const total = users.length;

        // Sort by weeklySignal desc — rank = position + 1
        const byWeekly = [...users].sort((a, b) => (b.weeklySignal || 0) - (a.weeklySignal || 0));
        const weeklyRank = byWeekly.findIndex(u => u.uid === uid) + 1;

        // Sort by monthlySignal desc
        const byMonthly = [...users].sort((a, b) => (b.monthlySignal || 0) - (a.monthlySignal || 0));
        const monthlyRank = byMonthly.findIndex(u => u.uid === uid) + 1;

        // Sort by allTimeSignal desc
        const byAllTime = [...users].sort((a, b) => (b.allTimeSignal || 0) - (a.allTimeSignal || 0));
        const allTimeRank = byAllTime.findIndex(u => u.uid === uid) + 1;

        setRanks({
          weeklyRank: weeklyRank || null,
          monthlyRank: monthlyRank || null,
          allTimeRank: allTimeRank || null,
          totalInIndustry: total,
          loading: false,
        });
      } catch (e) {
        console.error('useSignalRank error:', e);
        setRanks(r => ({ ...r, loading: false }));
      }
    };

    fetchRanks();
  }, [uid, industry]);

  return ranks;
}

// Fetch full leaderboard for a given industry + signal type
export async function fetchLeaderboard(industry, signalType = 'weeklySignal') {
  if (!industry) return [];
  try {
    const snap = await getDocs(
      query(collection(db, 'users'), where('industry', '==', industry))
    );
    const users = snap.docs.map(d => ({ uid: d.id, ...d.data() }));
    return users
      .sort((a, b) => (b[signalType] || 0) - (a[signalType] || 0))
      .filter(u => (u[signalType] || 0) > 0);
  } catch (e) {
    console.error('fetchLeaderboard error:', e);
    return [];
  }
}
