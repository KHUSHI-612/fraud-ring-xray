import React from 'react';
import { X, BarChart3, CheckCircle, XCircle, AlertTriangle, AlertCircle } from 'lucide-react';

export default function EvaluationModal({ evaluation, loading, error, onClose, onRetry }) {
  if (!evaluation && !loading && !error) return null;

  const precPercent = evaluation?.precision != null 
    ? `${(evaluation.precision * 100).toFixed(1)}%` 
    : 'N/A';

  const recPercent = evaluation?.recall != null 
    ? `${(evaluation.recall * 100).toFixed(1)}%` 
    : 'N/A';

  const caughtText = evaluation
    ? `${evaluation.rings_caught ?? 0} / ${evaluation.rings_total ?? 6}`
    : 'N/A';

  const missedText = Array.isArray(evaluation?.rings_missed) && evaluation.rings_missed.length > 0
    ? evaluation.rings_missed.join(', ')
    : 'None';

  const fpCount = Array.isArray(evaluation?.false_positives)
    ? evaluation.false_positives.length
    : (evaluation?.false_positives_count ?? 0);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <BarChart3 size={22} color="#3b82f6" />
            <h2>Model Detection Performance</h2>
          </div>
          <button className="close-btn" onClick={onClose} title="Close Evaluation Panel">
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          {loading && (
            <div className="state-container" style={{ padding: '40px' }}>
              <div className="spinner" />
              <p>Fetching evaluation metrics from backend...</p>
            </div>
          )}

          {error && (
            <div className="state-container" style={{ padding: '40px' }}>
              <AlertTriangle size={36} color="#ef4444" />
              <p style={{ color: '#f87171' }}>{error}</p>
              <button className="btn-primary" onClick={onRetry}>
                Retry
              </button>
            </div>
          )}

          {!loading && !error && evaluation && (
            <>
              {/* Primary KPI Metric Cards Grid */}
              <div className="metrics-grid">
                <div className="metric-card">
                  <span className="metric-label">Precision</span>
                  <span className="metric-value blue">{precPercent}</span>
                  <span className="metric-subtext">True Positives / Flagged</span>
                </div>

                <div className="metric-card">
                  <span className="metric-label">Recall</span>
                  <span className="metric-value emerald">{recPercent}</span>
                  <span className="metric-subtext">Rings Caught / Ground Truth</span>
                </div>

                <div className="metric-card">
                  <span className="metric-label">Rings Caught</span>
                  <span className="metric-value">{caughtText}</span>
                  <span className="metric-subtext">Detected Fraud Rings</span>
                </div>

                <div className="metric-card">
                  <span className="metric-label">Rings Missed</span>
                  <span className="metric-value amber">{missedText}</span>
                  <span className="metric-subtext">Undetected Rings</span>
                </div>

                <div className="metric-card">
                  <span className="metric-label">False Positives</span>
                  <span className="metric-value red">{fpCount}</span>
                  <span className="metric-subtext">Legitimate Noise Groups</span>
                </div>
              </div>

              {/* Summary Bar */}
              <div className="summary-stats-bar">
                <div className="summary-item">
                  <span className="summary-label">Total Clusters Found:</span>
                  <span className="summary-val">{evaluation.total_clusters_found}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Flagged Suspicious:</span>
                  <span className="summary-val suspicious">{evaluation.total_flagged_suspicious}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Ground Truth Total:</span>
                  <span className="summary-val">6 Planted Rings</span>
                </div>
              </div>

              {/* True Positives vs False Positives Breakdown */}
              <div className="breakdown-columns">
                {/* True Positives */}
                <div className="breakdown-box">
                  <div className="breakdown-title true-positives">
                    <CheckCircle size={16} /> True Positives ({evaluation.true_positives?.length || 0})
                  </div>
                  <div className="breakdown-list">
                    {evaluation.true_positives?.map((tp) => (
                      <div key={tp.cluster_id} className="breakdown-item tp-item">
                        <span className="mono bold">{tp.cluster_id}</span>
                        <span className="badge-ring">{tp.matched_ring}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* False Positives */}
                <div className="breakdown-box">
                  <div className="breakdown-title false-positives">
                    <XCircle size={16} /> False Positives ({evaluation.false_positives?.length || 0})
                  </div>
                  <div className="breakdown-list">
                    {evaluation.false_positives?.map((fp) => (
                      <div key={fp.cluster_id} className="breakdown-item fp-item">
                        <span className="mono bold">{fp.cluster_id}</span>
                        <span className="badge-noise">
                          {fp.is_known_noise_bait ? 'Known Noise Bait' : 'False Positive'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Known Limitation Note at the bottom */}
              <div className="overlay-limitation-box" style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '12px 16px', borderRadius: '10px' }}>
                <AlertCircle size={16} color="#fbbf24" style={{ flexShrink: 0, marginTop: '2px' }} />
                <p style={{ fontSize: '0.84rem', color: '#fef08a', lineHeight: '1.45' }}>
                  <strong>Known limitation:</strong> RING_C1 is currently missed because its behavioral signals are split across signup-time buckets.
                </p>
              </div>

            </>
          )}
        </div>
      </div>
    </div>
  );
}
