import React, { useEffect, useState } from 'react';

export default function Stopwatch({ running, state }) {
  const [sec, setSec] = useState(0);

  useEffect(() => {
    let t;
    if (running && state === 'FOCUS') {
      t = setInterval(() => setSec((s) => s + 1), 1000);
    }
    return () => clearInterval(t);
  }, [running, state]);

  useEffect(() => {
    if (!running) setSec(0);
  }, [running]);

  const hh = String(Math.floor(sec / 3600)).padStart(2, '0');
  const mm = String(Math.floor((sec % 3600) / 60)).padStart(2, '0');
  const ss = String(sec % 60).padStart(2, '0');

  return (
    <div style={{
      background: '#041028',
      padding: 12,
      borderRadius: 10,
      display: 'inline-block'
    }}>
      <div style={{ fontSize: 12, color: '#9fb0d3' }}>
        Productive Time (counts only during deep focus)
      </div>
      <div style={{ fontSize: 20, fontWeight: 700 }}>
        {hh}:{mm}:{ss}
      </div>
    </div>
  );
}
