import React, { useEffect, useState } from 'react';
import FlowHUD from './components/FlowHUD';
import Stopwatch from './components/Stopwatch';

export default function App() {
  const [state, setState] = useState('IDLE');
  const [score, setScore] = useState('--');
  const [running, setRunning] = useState(false);

  useEffect(() => {
    window.electronAPI.onStateChange((d) => {
      setState(d.state);
      setScore(d.score);
    });
  }, []);

  function start() {
    window.electronAPI.startTracking();
    setRunning(true);
  }

  function stop() {
    window.electronAPI.stopTracking();
    setRunning(false);
  }

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ margin: 0 }}>FlowPilot · Pika</h1>
      <p style={{ color: '#9fb0d3' }}>Start tracking to measure focused time. When focused, golden border + lofi will appear.</p>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <button onClick={start} disabled={running} style={{ background: '#10b981', color: '#fff' }}>Start</button>
        <button onClick={stop} disabled={!running} style={{ background: '#ef4444', color: '#fff' }}>Stop</button>
        <div>State: <strong>{state}</strong> | Score: <strong>{score}</strong></div>
      </div>

      <div style={{ marginTop: 18 }}>
        <Stopwatch running={running} state={state} />
      </div>

      <div style={{ marginTop: 20 }}>
        <FlowHUD state={state} score={score} />
      </div>
    </div>
  );
}
