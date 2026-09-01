import React from 'react';
import { X, ShieldCheck, ShieldAlert, AlertCircle, Info } from 'lucide-react';


export default function GuardrailsModal({ onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '680px' }}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <ShieldCheck size={22} color="#10b981" />
            <h2>Safety & Decision Guardrails</h2>
          </div>
          <button className="close-btn" onClick={onClose} title="Close Guardrails Panel">
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          {/* Defense-Only Rule Banner */}
          <div className="guardrail-banner defense-only">
            <ShieldCheck size={20} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div className="guardrail-title green">Defense-Only System Rule</div>
              <p className="guardrail-text">
                This tool flags and explains suspicious activity. It <strong>never automatically blocks, bans, suspends, or takes enforcement action</strong> against an account.
              </p>
            </div>
          </div>

          {/* Risk Review Tiers Breakdown */}
          <div className="info-card">
            <div className="card-title">
              <ShieldAlert size={14} /> Risk-Review Tiers (Investigation Priority)
            </div>

            <div className="tiers-list">
              <div className="tier-item high-fraud">
                <div className="tier-badge high">HIGH CONFIDENCE FRAUD</div>
                <div className="tier-desc">
                  <strong>Criteria:</strong> Flagged suspicious & weight density ≥ 1.0. High multi-signal cluster density (e.g. shared device fingerprints + synchronized behavior).
                </div>
              </div>

              <div className="tier-item needs-review">
                <div className="tier-badge review">NEEDS REVIEW</div>
                <div className="tier-desc">
                  <strong>Criteria:</strong> Flagged suspicious & weight density &lt; 1.0 (clears 0.5 threshold). Requires analyst review as single shared signals (e.g. shared address/IP) may represent legitimate households, offices, or public networks.
                </div>
              </div>

              <div className="tier-item likely-legit">
                <div className="tier-badge legit">LIKELY LEGITIMATE</div>
                <div className="tier-desc">
                  <strong>Criteria:</strong> Not flagged suspicious. Cluster density is below the 0.500 risk threshold.
                </div>
              </div>
            </div>
          </div>

          {/* Human Review Required Note */}
          <div className="guardrail-banner human-review">
            <Info size={18} color="#60a5fa" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div className="guardrail-title blue">Human Review Language</div>
              <p className="guardrail-text">
                These tiers prioritize investigation. They are not automatic fraud verdicts and should not be used as the sole basis for enforcement.
              </p>
            </div>
          </div>

          {/* Known Limitation Note */}
          <div className="overlay-limitation-box" style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '12px 16px', borderRadius: '10px' }}>
            <AlertCircle size={16} color="#fbbf24" style={{ flexShrink: 0, marginTop: '2px' }} />
            <p style={{ fontSize: '0.84rem', color: '#fef08a', lineHeight: '1.45' }}>
              <strong>Known limitation:</strong> RING_C1 is currently missed because its behavioral signals are split across signup-time buckets.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
