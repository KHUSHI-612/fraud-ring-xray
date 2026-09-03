import React from 'react';

export default function GuardrailsModal({ isFullPage, onClose }) {
  const content = (
    <div 
      className={isFullPage ? "full-page-card" : "modal-content"} 
      onClick={(e) => e.stopPropagation()}
      style={isFullPage ? { width: '100%', maxWidth: '100%', background: 'transparent' } : { maxWidth: '840px', padding: '24px' }}
    >
      {/* Top Header Section (Matching Screenshot) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '40px' }}>
        <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#378ADD', textTransform: 'uppercase', letterSpacing: '0.12em', fontFamily: 'var(--font-mono)' }}>
          SYSTEM GOVERNANCE POLICY
        </span>
        <h1 style={{ fontSize: '2.6rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em', lineHeight: 1.15 }}>
          Safety & Decision Guardrails
        </h1>
        <p style={{ fontSize: '0.98rem', color: '#8FA3C4', maxWidth: '780px', lineHeight: 1.6, marginTop: '4px' }}>
          Investigative system guardrails, operational boundaries, and human-in-the-loop review guidelines governing the Fraud Ring X-Ray console.
        </p>
      </div>

      {/* Main Sections Flow */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '44px' }}>
        
        {/* Section 1: Defense-Only System Rule */}
        <div style={{ borderLeft: '2px solid #378ADD', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#378ADD', fontFamily: 'var(--font-mono)' }}>
            1.
          </span>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.01em' }}>
            Defense-Only System Rule
          </h2>
          <p style={{ fontSize: '0.94rem', color: '#94A3B8', lineHeight: 1.65, maxWidth: '840px', marginTop: '4px' }}>
            The Fraud Ring X-Ray console is an <strong>investigative assistance tool</strong>. It surfaces structural anomalies and behavioral correlations for analyst review. It does not autonomously freeze accounts, reverse transactions, or enact enforcement. Every flagged cluster is a recommendation, not a verdict.
          </p>
        </div>

        {/* Section 2: Risk Classification Framework */}
        <div style={{ borderLeft: '2px solid #378ADD', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#378ADD', fontFamily: 'var(--font-mono)' }}>
            2.
          </span>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.01em' }}>
            Risk Classification Framework
          </h2>

          {/* 3-Column Risk Tiers Breakdown */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '32px', paddingTop: '12px' }}>
            
            {/* High Confidence Fraud */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.86rem', fontWeight: 800, color: '#FFFFFF' }}>High Confidence Fraud</span>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#E2574C', fontFamily: 'var(--font-mono)' }}>Density ≥ 1.000</span>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#8FA3C4', lineHeight: 1.6 }}>
                Flagged suspicious with high multi-signal cluster density (e.g. shared device fingerprints paired with synchronized signup and transaction timing).
              </p>
            </div>

            {/* Needs Human Review */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.86rem', fontWeight: 800, color: '#FFFFFF' }}>Needs Human Review</span>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#BA7517', fontFamily: 'var(--font-mono)' }}>0.500 – 0.999</span>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#8FA3C4', lineHeight: 1.6 }}>
                Clears baseline risk threshold (0.500). Requires analyst inspection as single shared attributes (e.g. shared shipping address/IP) may represent legitimate households.
              </p>
            </div>

            {/* Likely Legitimate */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.86rem', fontWeight: 800, color: '#FFFFFF' }}>Likely Legitimate</span>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#1D9E75', fontFamily: 'var(--font-mono)' }}>Density &lt; 0.500</span>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#8FA3C4', lineHeight: 1.6 }}>
                Not flagged suspicious. Cluster density remains below the 0.500 risk threshold, indicating standard non-coordinated account behavior.
              </p>
            </div>

          </div>
        </div>

        {/* Section 3 & 4: Governance Guidelines & Evaluation Boundaries */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px', paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#378ADD', fontFamily: 'var(--font-mono)' }}>
              3.
            </span>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#FFFFFF' }}>
              Human Review Language Standard
            </h3>
            <p style={{ fontSize: '0.88rem', color: '#8FA3C4', lineHeight: 1.6 }}>
              Risk classification tiers serve exclusively to prioritize analyst workflow sequences. They represent non-binding diagnostic indicators and must not be used as an automated enforcement verdict.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#378ADD', fontFamily: 'var(--font-mono)' }}>
              4.
            </span>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#FFFFFF' }}>
              Benchmark Evaluation Boundary
            </h3>
            <p style={{ fontSize: '0.88rem', color: '#8FA3C4', lineHeight: 1.6 }}>
              <strong>Known limitation:</strong> <code style={{ color: '#FFFFFF', background: 'rgba(255, 255, 255, 0.08)', padding: '2px 6px', borderRadius: '4px' }}>RING_C1</code> is currently undetected in baseline heuristic scoring because its behavioral synchronization signals are split across discrete signup time-window buckets.
            </p>
          </div>

        </div>

      </div>
    </div>
  );

  if (isFullPage) {
    return <div className="full-page-view-container">{content}</div>;
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      {content}
    </div>
  );
}
