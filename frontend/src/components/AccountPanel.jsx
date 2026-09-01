import React, { useEffect, useState } from 'react';
import { 
  X, 
  User, 
  Phone, 
  Mail, 
  Smartphone, 
  Globe, 
  MapPin, 
  Calendar, 
  ShoppingBag, 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle,
  CheckCircle,
  Info,
  HelpCircle,
  Scale,
  Cpu
} from 'lucide-react';
import { API_BASE_URL } from '../config';


export default function AccountPanel({ accountId, clusters, evaluation, onClose }) {
  const [accountData, setAccountData] = useState(null);
  const [explainData, setExplainData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!accountId) return;

    setLoading(true);
    setError(null);
    setAccountData(null);
    setExplainData(null);

    Promise.all([
      fetch(`${API_BASE_URL}/accounts/${accountId}`).then((res) => {
        if (!res.ok) {
          if (res.status === 404) {
            throw new Error(`Account '${accountId}' was not found.`);
          }
          throw new Error(`Failed to load account (${res.status})`);
        }
        return res.json();
      }),
      fetch(`${API_BASE_URL}/explain/${accountId}`)
        .then((res) => (res.ok ? res.json() : null))
        .catch(() => null)
    ])

      .then(([acc, exp]) => {
        setAccountData(acc);
        setExplainData(exp);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [accountId]);

  if (!accountId) return null;

  // Filter clusters relevant to this account
  const accountClusters = (clusters || []).filter(
    (c) => c.members && c.members.includes(accountId)
  );

  const isAnySuspicious = accountClusters.some((c) => c.flagged_suspicious);

  const formatSignal = (sig) => {
    switch (sig) {
      case 'address':
        return 'Shared address';
      case 'device':
        return 'Shared device fingerprint';
      case 'ip':
        return 'Shared IP address';
      case 'behavioral':
        return 'Behavioral similarity';
      default:
        return sig;
    }
  };

  const getTierInfo = (tierKey) => {
    switch (tierKey) {
      case 'high_confidence_fraud':
        return {
          label: 'HIGH CONFIDENCE FRAUD',
          classKey: 'high-fraud',
          color: '#ef4444',
          icon: <ShieldAlert size={14} color="#f87171" />
        };
      case 'needs_human_review':
        return {
          label: 'NEEDS HUMAN REVIEW',
          classKey: 'needs-review',
          color: '#f59e0b',
          icon: <AlertTriangle size={14} color="#fbbf24" />
        };
      case 'likely_legitimate':
      default:
        return {
          label: 'LIKELY LEGITIMATE',
          classKey: 'likely-legit',
          color: '#10b981',
          icon: <ShieldCheck size={14} color="#34d399" />
        };
    }
  };

  const activeTier = explainData ? getTierInfo(explainData.confidence_tier) : null;

  return (
    <aside className="side-panel">
      {/* Panel Header */}
      <div className="panel-header">
        <div className="panel-title-group">
          {isAnySuspicious ? (
            <ShieldAlert size={22} color="#ef4444" />
          ) : (
            <ShieldCheck size={22} color="#9ca3af" />
          )}
          <span className="panel-account-id">{accountId}</span>
        </div>
        <button className="close-btn" onClick={onClose} title="Close panel">
          <X size={20} />
        </button>
      </div>

      {/* Panel Content */}
      <div className="panel-body">
        {loading && (
          <div className="state-container">
            <div className="spinner" />
            <p>Fetching account metadata and explanation...</p>
          </div>
        )}

        {error && (
          <div className="state-container">
            <AlertTriangle size={32} color="#ef4444" />
            <p style={{ color: '#f87171' }}>{error}</p>
            <button 
              className="btn-primary" 
              onClick={() => {
                setLoading(true);
                setError(null);
                fetch(`${API_BASE_URL}/accounts/${accountId}`)

                  .then((res) => res.json())
                  .then((data) => { setAccountData(data); setLoading(false); })
                  .catch((e) => { setError(e.message); setLoading(false); });
              }}
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && accountData && (
          <>
            {/* Defense-Only Safety Note */}
            <div className="panel-safety-banner">
              <ShieldCheck size={16} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <p><strong>Defense-only system:</strong> Flags and explains suspicious activity. Never automatically blocks or bans accounts.</p>
              </div>
            </div>

            {/* Dual Signal Section: Rule-Based Assessment & ML Classifier Assessment */}
            {explainData && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Rule-Based Signal */}
                <div className="info-card explain-backend-card">
                  <div className="card-title" style={{ justifyContent: 'space-between', width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Scale size={14} color="#60a5fa" />
                      Rule-Based Assessment
                    </div>

                    {activeTier && (
                      <span className={`confidence-badge ${activeTier.classKey}`}>
                        {activeTier.icon}
                        <span>{activeTier.label}</span>
                      </span>
                    )}
                  </div>

                  <div className="backend-explanation-text">
                    "{explainData.explanation}"
                  </div>

                  <div style={{ display: 'flex', gap: '12px', fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    <span>Risk Density: <strong>{explainData.weight_density?.toFixed(3)}</strong></span>
                    <span>Cluster: <strong>{explainData.cluster_id || 'None (Isolated)'}</strong></span>
                  </div>
                </div>

                {/* Independent ML Classifier Signal */}
                <div className="info-card" style={{ background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.12) 0%, rgba(17, 24, 39, 0.85) 100%)', border: '1px solid rgba(168, 85, 247, 0.35)' }}>
                  <div className="card-title" style={{ justifyContent: 'space-between', width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Cpu size={14} color="#c084fc" />
                      ML Model Signal (Logistic Regression)
                    </div>

                    <span className="confidence-badge" style={{ background: 'rgba(168, 85, 247, 0.2)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.4)' }}>
                      <Cpu size={12} color="#c084fc" />
                      <span>{explainData.ml_confidence != null ? `${(explainData.ml_confidence * 100).toFixed(0)}% Fraud Prob` : 'N/A'}</span>
                    </span>
                  </div>

                  <div style={{ marginTop: '4px' }}>
                    <div style={{ height: '6px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div 
                        style={{ 
                          height: '100%', 
                          width: `${(explainData.ml_confidence * 100).toFixed(0)}%`, 
                          background: explainData.ml_confidence >= 0.5 ? 'linear-gradient(90deg, #a855f7, #c084fc)' : '#10b981',
                          borderRadius: '3px',
                          transition: 'width 0.4s ease'
                        }} 
                      />
                    </div>
                  </div>

                  <p className="human-review-note" style={{ color: '#d8b4fe', fontStyle: 'italic', marginTop: '4px' }}>
                    <Info size={12} color="#c084fc" style={{ flexShrink: 0, marginTop: '1px' }} />
                    <span>ML probability is an investigative confidence signal, not an automatic fraud verdict.</span>
                  </p>
                </div>
              </div>
            )}


            {/* Cluster Memberships & Explainability Section */}
            <div className="info-card">
              <div className="card-title">
                <ShieldAlert size={14} />
                Cluster Forensic Evidence Analysis ({accountClusters.length})
              </div>

              {accountClusters.length === 0 ? (
                <div className="eval-note normal-note" style={{ background: 'rgba(107, 114, 128, 0.08)', border: '1px solid rgba(107, 114, 128, 0.2)', color: 'var(--text-secondary)' }}>
                  <Info size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <p><strong>Independent Account:</strong> This account does not share device IDs, IP addresses, shipping locations, or behavioral timing with any other account.</p>
                    <p style={{ marginTop: '4px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>It is an isolated account and is not part of any connected cluster.</p>
                  </div>
                </div>
              ) : (
                accountClusters.map((cluster) => {
                  const tpMatch = evaluation?.true_positives?.find(
                    (tp) => tp.cluster_id === cluster.cluster_id
                  );
                  const fpMatch = evaluation?.false_positives?.find(
                    (fp) => fp.cluster_id === cluster.cluster_id
                  );

                  const isFlagged = cluster.flagged_suspicious;
                  const isTP = !!tpMatch;
                  const isFP = !!fpMatch;

                  // Endpoint threshold rule: >= 0.8 high_confidence_fraud, < 0.8 needs_human_review, unflagged likely_legitimate
                  let clusterTierKey = 'likely_legitimate';
                  if (isFlagged) {
                    clusterTierKey = cluster.weight_density >= 0.8 ? 'high_confidence_fraud' : 'needs_human_review';
                  }
                  const clusterTier = getTierInfo(clusterTierKey);

                  const formattedSignals = (cluster.signals_involved || []).map(formatSignal);

                  return (
                    <div
                      key={cluster.cluster_id}
                      className={`cluster-badge-card ${isTP ? 'tp-card' : isFP ? 'fp-card' : isFlagged ? 'suspicious' : 'normal'}`}
                    >
                      {/* Header with Risk-Review Tier */}
                      <div className="badge-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="cluster-name">{cluster.cluster_id}</span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            ({cluster.size} accounts)
                          </span>
                        </div>
                        <span className={`confidence-badge ${clusterTier.classKey}`}>
                          {clusterTier.icon}
                          <span>{clusterTier.label}</span>
                        </span>
                      </div>

                      {/* Ground-Truth Outcome Badge & Text Explanation */}
                      <div style={{ marginTop: '4px' }}>
                        {isTP && (
                          <div className="outcome-badge tp">
                            <CheckCircle size={16} color="#34d399" style={{ flexShrink: 0, marginTop: '2px' }} />
                            <div>
                              <div className="outcome-title text-tp">TRUE POSITIVE — Confirmed Fraud Ring</div>
                              <div className="outcome-detail">Matched Ring: <strong>{tpMatch.matched_ring}</strong></div>
                            </div>
                          </div>
                        )}

                        {isFP && (
                          <div className="outcome-badge fp">
                            <AlertTriangle size={16} color="#f87171" style={{ flexShrink: 0, marginTop: '2px' }} />
                            <div>
                              <div className="outcome-title text-fp">FALSE POSITIVE — Known Noise</div>
                              <div className="outcome-detail">Reason: This cluster matches a planted noise group in evaluation.json.</div>
                            </div>
                          </div>
                        )}

                        {!isFlagged && (
                          <div className="outcome-badge not-flagged">
                            <Info size={16} color="#9ca3af" style={{ flexShrink: 0, marginTop: '2px' }} />
                            <div>
                              <div className="outcome-title text-not-flagged">LIKELY LEGITIMATE — NOT FLAGGED</div>
                              <p className="outcome-explanation">
                                Cluster density (<strong>{cluster.weight_density.toFixed(3)}</strong>) is below the minimum suspicious threshold (<strong>0.500</strong>). No suspicious threshold was reached.
                              </p>
                            </div>
                          </div>
                        )}

                        {isFlagged && !isTP && !isFP && (
                          <div className="outcome-badge flagged-unmatched">
                            <HelpCircle size={16} color="#fbbf24" style={{ flexShrink: 0, marginTop: '2px' }} />
                            <div>
                              <div className="outcome-title text-unmatched">FLAGGED — Evaluation Status Unavailable</div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Risk / Cluster Density Metric */}
                      <div className="cluster-metrics-row">
                        <div className="metric-box">
                          <span className="metric-box-label">Risk / Cluster Density</span>
                          <span className="metric-box-val">{cluster.weight_density.toFixed(3)}</span>
                        </div>
                        <div className="metric-box">
                          <span className="metric-box-label">Cluster Size</span>
                          <span className="metric-box-val">{cluster.size} Accounts</span>
                        </div>
                      </div>

                      {/* Shared Signals */}
                      {formattedSignals.length > 0 && (
                        <div style={{ marginTop: '4px' }}>
                          <div className="signals-label">Shared Signals Involved:</div>
                          <div className="signals-tag-group">
                            {formattedSignals.map((sig) => (
                              <span key={sig} className="signal-tag">{sig}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Member Accounts List */}
                      <div style={{ marginTop: '6px' }}>
                        <div className="signals-label">Member Accounts:</div>
                        <div className="members-mono-list">
                          {cluster.members.join(', ')}
                        </div>
                      </div>

                      {/* Human Review Note */}
                      <div className="human-review-note">
                        <Info size={12} color="#9ca3af" style={{ flexShrink: 0, marginTop: '1px' }} />
                        <span>These tiers prioritize investigation. They are not automatic fraud verdicts and should not be used as the sole basis for enforcement.</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Account Details Card */}
            <div className="info-card">
              <div className="card-title">
                <User size={14} /> Account Profile Details
              </div>

              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label"><User size={12} inline="true" /> Full Name</span>
                  <span className="info-value">{accountData.name || 'N/A'}</span>
                </div>

                <div className="info-item">
                  <span className="info-label"><Phone size={12} inline="true" /> Phone</span>
                  <span className="info-value mono">{accountData.phone || 'N/A'}</span>
                </div>

                <div className="info-item full-width">
                  <span className="info-label"><Mail size={12} inline="true" /> Email</span>
                  <span className="info-value mono">{accountData.email || 'N/A'}</span>
                </div>

                <div className="info-item">
                  <span className="info-label"><Smartphone size={12} inline="true" /> Device ID</span>
                  <span className="info-value mono">{accountData.device_id || 'N/A'}</span>
                </div>

                <div className="info-item">
                  <span className="info-label"><Globe size={12} inline="true" /> IP Address</span>
                  <span className="info-value mono">{accountData.ip_address || 'N/A'}</span>
                </div>

                <div className="info-item full-width">
                  <span className="info-label"><MapPin size={12} inline="true" /> Shipping Address</span>
                  <span className="info-value">{accountData.shipping_address || 'N/A'}</span>
                </div>

                <div className="info-item full-width">
                  <span className="info-label"><Calendar size={12} inline="true" /> Signup Date</span>
                  <span className="info-value mono">
                    {accountData.signup_date ? new Date(accountData.signup_date).toLocaleString() : 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Orders Section */}
            <div className="info-card">
              <div className="card-title">
                <ShoppingBag size={14} /> Order History ({accountData.orders?.length || 0})
              </div>

              {(!accountData.orders || accountData.orders.length === 0) ? (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  No orders recorded for this account.
                </p>
              ) : (
                <div className="orders-list">
                  {accountData.orders.map((order) => (
                    <div key={order.order_id} className="order-item">
                      <div>
                        <div className="order-id">{order.order_id}</div>
                        <div className="order-meta">
                          {order.payment_method?.toUpperCase()} • {new Date(order.order_date).toLocaleDateString()}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div className="order-amount">₹{typeof order.amount === 'number' ? order.amount.toFixed(2) : order.amount}</div>
                        <span className={`order-status ${order.status?.toLowerCase()}`}>
                          {order.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
