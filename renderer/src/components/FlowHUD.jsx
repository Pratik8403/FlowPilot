import React from 'react';

export default function FlowHUD({ state, score }) {
  return (
    <div style={{
      marginTop: 12,
      padding: 12,
      background: '#071129',
      borderRadius: 12,
      maxWidth: 500,
      boxShadow: '0 6px 18px rgba(2,6,23,0.6)'
    }}>
      <div style={{ fontSize: 12, color: '#9fb0d3' }}>Pika • FlowPilot</div>
      <div style={{ fontSize: 16, fontWeight: 700, marginTop: 6 }}>
        State: {state} • Score: {score}
      </div>
      <div style={{ fontSize: 12, color: '#9fb0d3', marginTop: 6 }}>
        When you reach deep focus, a golden border will appear around the active window.
      </div>
    </div>
  );
}
