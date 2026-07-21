// src/components/college/CollegeCharts.jsx
//
// Shared visualizations for PrincipalDashboard.jsx / LecturerDashboard.jsx —
// both render the same college-growth story, so unlike the rest of this
// codebase's per-page duplication convention, the chart logic is factored
// out here rather than copy-pasted twice.
import { useEffect, useRef, useState } from 'react';
import { collection, getCountFromServer, query, Timestamp, where } from 'firebase/firestore';
import { db } from '../../firebase/config';

const T = {
  navy:   '#0A1628',
  teal:   '#0D9488',
  purple: '#534AB7',
  bg:     '#F0F4F8',
  white:  '#FFFFFF',
  border: '#E4E2DC',
  text:   '#0A1628',
  muted:  '#6B7280',
  faint:  '#9CA3AF',
  font:   "'DM Sans', sans-serif",
};

// Cumulative headcount as of each week boundary, via count() aggregation —
// cheap even at 2000+ students (no student docs are actually read).
export async function fetchWeeklyGrowth(collegeId, role, weeks = 8) {
  const now = new Date();
  const boundaries = Array.from({ length: weeks }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (weeks - 1 - i) * 7);
    d.setHours(23, 59, 59, 999);
    return d;
  });
  const counts = await Promise.all(
    boundaries.map(async (boundary) => {
      const q = query(
        collection(db, 'users'),
        where('collegeId', '==', collegeId),
        where('collegeRole', '==', role),
        where('createdAt', '<=', Timestamp.fromDate(boundary))
      );
      const snap = await getCountFromServer(q);
      return snap.data().count;
    })
  );
  return boundaries.map((d, i) => ({
    label: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    value: counts[i],
  }));
}

function niceMax(n) {
  if (n <= 4) return 4;
  const pow = Math.pow(10, Math.floor(Math.log10(n)));
  const step = n / pow <= 2 ? 0.5 * pow : n / pow <= 5 ? pow : 2 * pow;
  return Math.ceil(n / step) * step;
}

// Single-series cumulative growth — area + line, sequential teal, hover
// crosshair/tooltip, direct end-label. Falls back to a plain stat when the
// series is flat (a brand-new college has no real trend to plot yet).
export function GrowthChart({ points, seriesLabel = 'Students', height = 140 }) {
  const wrapRef = useRef(null);
  const [width, setWidth] = useState(320);
  const [hoverIdx, setHoverIdx] = useState(null);

  useEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  const values = points.map(p => p.value);
  const isFlat = Math.max(...values) === Math.min(...values);

  if (isFlat) {
    return (
      <div style={{ background: T.white, borderRadius: 14, border: `1px solid ${T.border}`, padding: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: T.text, fontFamily: T.font, marginBottom: 4 }}>
          {seriesLabel} growth
        </div>
        <div style={{ fontSize: 28, fontWeight: 800, color: T.teal, fontFamily: T.font, margin: '8px 0 4px' }}>
          {values[values.length - 1]}
        </div>
        <div style={{ fontSize: 12, color: T.faint, fontFamily: T.font }}>
          Trend appears once there's a few weeks of history.
        </div>
      </div>
    );
  }

  const padX = 8, padTop = 16, padBottom = 22;
  const plotW = Math.max(width - padX * 2, 10);
  const plotH = height - padTop - padBottom;
  const maxV = niceMax(Math.max(...values));
  const n = points.length;

  const x = i => padX + (plotW * i) / (n - 1);
  const y = v => padTop + plotH - (plotH * v) / maxV;

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(p.value)}`).join(' ');
  const areaPath = `${linePath} L ${x(n - 1)} ${padTop + plotH} L ${x(0)} ${padTop + plotH} Z`;

  const ticks = [0, 0.5, 1].map(f => Math.round(maxV * f));

  function handleMove(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = e.clientX - rect.left - padX;
    const idx = Math.max(0, Math.min(n - 1, Math.round((relX / plotW) * (n - 1))));
    setHoverIdx(idx);
  }

  const hp = hoverIdx != null ? points[hoverIdx] : null;

  return (
    <div style={{ background: T.white, borderRadius: 14, border: `1px solid ${T.border}`, padding: '14px 12px 8px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '0 4px', marginBottom: 2 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: T.text, fontFamily: T.font }}>{seriesLabel} growth</div>
        <div style={{ fontSize: 10, color: T.faint, fontFamily: T.font }}>Last {n} weeks</div>
      </div>
      <div ref={wrapRef} style={{ position: 'relative' }}>
        <svg width={width} height={height} onMouseMove={handleMove} onMouseLeave={() => setHoverIdx(null)} style={{ display: 'block', cursor: 'crosshair' }}>
          {ticks.map((t, i) => (
            <g key={i}>
              <line x1={padX} x2={width - padX} y1={y(t)} y2={y(t)} stroke={T.border} strokeWidth="1" />
              <text x={padX} y={y(t) - 4} fontSize="9" fill={T.faint} fontFamily={T.font}>{t}</text>
            </g>
          ))}
          <path d={areaPath} fill={T.teal} opacity="0.1" stroke="none" />
          <path d={linePath} fill="none" stroke={T.teal} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
          {/* end marker + direct label */}
          <circle cx={x(n - 1)} cy={y(points[n - 1].value)} r="4" fill={T.teal} stroke={T.white} strokeWidth="2" />
          <text x={x(n - 1)} y={y(points[n - 1].value) - 10} fontSize="11" fontWeight="700" fill={T.text} fontFamily={T.font} textAnchor="end">
            {points[n - 1].value}
          </text>
          {hp && (
            <>
              <line x1={x(hoverIdx)} x2={x(hoverIdx)} y1={padTop} y2={padTop + plotH} stroke={T.faint} strokeWidth="1" strokeDasharray="2,2" />
              <circle cx={x(hoverIdx)} cy={y(hp.value)} r="4" fill={T.teal} stroke={T.white} strokeWidth="2" />
            </>
          )}
          {points.map((p, i) => (
            <text key={i} x={x(i)} y={height - 6} fontSize="9" fill={T.faint} fontFamily={T.font} textAnchor="middle">
              {i === 0 || i === n - 1 || i === hoverIdx ? p.label : ''}
            </text>
          ))}
        </svg>
        {hp && (
          <div style={{
            position: 'absolute', top: 4, left: Math.min(Math.max(x(hoverIdx) - 46, 0), width - 96),
            background: T.navy, borderRadius: 8, padding: '6px 10px', pointerEvents: 'none',
            boxShadow: '0 4px 12px rgba(0,0,0,0.18)', whiteSpace: 'nowrap',
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.white, fontFamily: T.font }}>{hp.value}</div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.55)', fontFamily: T.font }}>{hp.label}</div>
          </div>
        )}
      </div>
    </div>
  );
}

// Part-to-whole students/lecturers split — categorical (teal/purple),
// legend carries the values directly so nothing depends on hover.
export function CompositionBar({ students, lecturers }) {
  const total = students + lecturers;
  if (total === 0) return null;
  const studentPct = (students / total) * 100;
  const lecturerPct = 100 - studentPct;
  const GAP = 2;

  return (
    <div style={{ background: T.white, borderRadius: 14, border: `1px solid ${T.border}`, padding: 16 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: T.text, fontFamily: T.font, marginBottom: 12 }}>Composition</div>
      <div style={{ display: 'flex', height: 10, borderRadius: 6, overflow: 'hidden', background: T.bg }}>
        <div style={{ width: `${studentPct}%`, background: T.teal, marginRight: lecturerPct > 0 ? GAP : 0, borderRadius: 6 }} />
        <div style={{ width: `${lecturerPct}%`, background: T.purple, borderRadius: 6 }} />
      </div>
      <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: T.teal, flexShrink: 0 }} />
          <span style={{ fontSize: 11, color: T.muted, fontFamily: T.font }}>Students</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: T.text, fontFamily: T.font }}>{students}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: T.purple, flexShrink: 0 }} />
          <span style={{ fontSize: 11, color: T.muted, fontFamily: T.font }}>Lecturers</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: T.text, fontFamily: T.font }}>{lecturers}</span>
        </div>
      </div>
    </div>
  );
}
