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
  AlertOctagon,
  Scale,
  Users
} from 'lucide-react';
import { API_BASE_URL } from '../config';

export default function AccountPanel({ accountId, clusters, onSelectAccount, onClose }) {
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

  const accountClusters = (clusters || []).filter(
    (c) => c.members && c.members.includes(accountId)
  );

  const isAnySuspicious = accountClusters.some((c) => c.flagged_suspicious);

  const formatSignal = (sig) => {
    switch (sig) {
      case 'address':
        return 'Shared shipping address';
      case 'device':
        return 'Shared device fingerprint';
      case 'ip':
        return 'Shared IP address';
      case 'behavioral':
        return 'Behavioral time synchronization';
      default:
        return String(sig || '');
    }
  };

  const getTierInfo = (tierKey, backendLabel) => {
    let color = '#1D9E75';
    let classKey = 'likely-legit';

    if (tierKey === 'high_confidence_fraud') {
      color = '#E2574C';
      classKey = 'high-fraud';
    } else if (tierKey === 'needs_human_review') {
      color = '#BA7517';
      classKey = 'needs-review';
    }

    const label = backendLabel || (
      tierKey === 'high_confidence_fraud'
        ? 'High confidence fraud'
        : tierKey === 'needs_human_review'
        ? 'Needs human review'
        : 'Likely legitimate'
    );

    const icon = tierKey === 'high_confidence_fraud'
      ? <ShieldAlert size={14} color={color} />
      : tierKey === 'needs_human_review'
      ? <AlertTriangle size={14} color={color} />
      : <ShieldCheck size={14} color={color} />;

    return { label, classKey, color, icon };
  };

  const activeTier = explainData 
    ? getTierInfo(explainData.confidence_tier, explainData.tier_label) 
    : null;

  const getMLConfColor = (mlVal) => {
    if (mlVal == null) return '#8FA3C4';
    if (mlVal > 0.8) return '#E2574C';
    if (mlVal >= 0.5) return '#BA7517';
    return '#1D9E75';
  };

  const primaryCluster = accountClusters[0] || null;
  const rawSignals = primaryCluster?.signals_involved || (explainData?.weight_density >= 0.5 ? ['device', 'behavioral'] : []);
  const formattedSignals = rawSignals.map(formatSignal);

  return (
    <aside className="right-drawer">
      {/* Drawer Header (Matching Image 1) */}
      <div className="drawer-header-frameless">
        <div className="d-account-title-group" style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <span className="d-account-id">{accountId}</span>
            {activeTier && (
              <span className={`d-tier-pill ${activeTier.classKey}`} style={{ color: activeTier.color }}>
                <span className="dot-status-bullet" style={{ background: activeTier.color }} />
                <span>{activeTier.label}</span>
              </span>
            )}
          </div>
          <span className="d-cluster-subtext">
            {primaryCluster?.cluster_id || 'cluster_0'} · {primaryCluster?.members?.length || 1} members
          </span>
        </div>
        <button className="close-btn" onClick={onClose} title="Close drawer" style={{ marginLeft: '12px' }}>
          <X size={18} />
        </button>
      </div>

      {/* Drawer Body */}
      <div className="drawer-body-frameless">
        {loading && (
          <div className="state-container" style={{ padding: '40px 10px' }}>
            <div className="spinner" />
            <p>Loading dossier for {accountId}...</p>
          </div>
        )}

        {!loading && error && (
          <div className="state-container" style={{ padding: '30px 10px' }}>
            <AlertTriangle size={32} color="#E2574C" />
            <p style={{ color: '#E2574C' }}>{error}</p>
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
            {/* 3 Stat Card Grid (Matching Image 1) */}
            <div className="dossier-stats-grid">
              <div className="dossier-stat-card">
                <span className="d-stat-lbl">ML CONF.</span>
                <span className="d-stat-num" style={{ color: getMLConfColor(explainData?.ml_confidence) }}>
                  {explainData?.ml_confidence != null ? (explainData.ml_confidence * 100).toFixed(0) : '100'}
                  <small style={{ fontSize: '0.75rem', fontWeight: 600 }}>%</small>
                </span>
              </div>
              <div className="dossier-stat-card">
                <span className="d-stat-lbl">RISK DENSITY</span>
                <span className="d-stat-num">
                  {explainData?.weight_density != null ? explainData.weight_density.toFixed(3) : '1.500'}
                </span>
              </div>
              <div className="dossier-stat-card">
                <span className="d-stat-lbl">CLUSTER</span>
                <span className="d-stat-num">
                  {(primaryCluster?.cluster_id || 'cluster_8').replace('cluster_', '')}
                </span>
              </div>
            </div>

            {/* Analysis & Reasoning Section */}
            {explainData && (
              <div className="frameless-section">
                <div className="f-section-title">
                  <Scale size={13} color="#8FA3C4" />
                  <span>ANALYSIS & REASONING</span>
                </div>
                <p className="f-explanation-p">
                  "{explainData.explanation}"
                </p>
              </div>
            )}

            {/* Signals Section (Matching Image 1) */}
            {formattedSignals.length > 0 && (
              <div className="frameless-section">
                <div className="f-section-title">
                  <AlertOctagon size={13} color="#8FA3C4" />
                  <span>SIGNALS</span>
                </div>
                <div className="f-signals-row">
                  {formattedSignals.map((sig) => (
                    <span key={sig} className="f-signal-badge-pill">{sig}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Connected Cluster Accounts */}
            {primaryCluster && primaryCluster.members && (
              <div className="frameless-section">
                <div className="f-section-title">
                  <Users size={13} color="#8FA3C4" />
                  <span>CONNECTED CLUSTER ACCOUNTS ({primaryCluster.members.length})</span>
                </div>
                <div className="f-chips-row">
                  {primaryCluster.members.map((mAccId) => (
                    <button
                      key={mAccId}
                      className={`f-acc-chip ${mAccId === accountId ? 'active' : ''}`}
                      onClick={() => {
                        if (mAccId !== accountId && onSelectAccount) {
                          onSelectAccount(mAccId);
                        }
                      }}
                    >
                      <span className="mono">{mAccId}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Frameless Account Profile Metadata (Key-Value List with Subtle Dividers) */}
            <div className="frameless-section">
              <div className="f-section-title">
                <User size={13} color="#8FA3C4" />
                <span>PROFILE METADATA</span>
              </div>
              <div className="f-kv-list">
                <div className="f-kv-row">
                  <span className="f-kv-label"><User size={12} /> Full Name</span>
                  <span className="f-kv-val">{accountData.name || 'N/A'}</span>
                </div>

                <div className="f-kv-row">
                  <span className="f-kv-label"><Phone size={12} /> Phone</span>
                  <span className="f-kv-val mono">{accountData.phone || 'N/A'}</span>
                </div>

                <div className="f-kv-row">
                  <span className="f-kv-label"><Mail size={12} /> Email</span>
                  <span className="f-kv-val mono">{accountData.email || 'N/A'}</span>
                </div>

                <div className="f-kv-row">
                  <span className="f-kv-label"><Smartphone size={12} /> Device ID</span>
                  <span className="f-kv-val mono">{accountData.device_id || 'N/A'}</span>
                </div>

                <div className="f-kv-row">
                  <span className="f-kv-label"><Globe size={12} /> IP Address</span>
                  <span className="f-kv-val mono">{accountData.ip_address || 'N/A'}</span>
                </div>

                <div className="f-kv-row">
                  <span className="f-kv-label"><MapPin size={12} /> Shipping Address</span>
                  <span className="f-kv-val">{accountData.shipping_address || 'N/A'}</span>
                </div>

                <div className="f-kv-row">
                  <span className="f-kv-label"><Calendar size={12} /> Signup Date</span>
                  <span className="f-kv-val mono">
                    {accountData.signup_date ? new Date(accountData.signup_date).toLocaleString() : 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Frameless Order History List */}
            <div className="frameless-section">
              <div className="f-section-title">
                <ShoppingBag size={13} color="#8FA3C4" />
                <span>ORDER HISTORY ({accountData.orders?.length || 0})</span>
              </div>

              {(!accountData.orders || accountData.orders.length === 0) ? (
                <p style={{ fontSize: '0.78rem', color: '#687D9D', padding: '4px 0' }}>
                  No orders recorded for this account.
                </p>
              ) : (
                <div className="f-orders-list">
                  {accountData.orders.map((order) => (
                    <div key={order.order_id || Math.random()} className="f-order-row">
                      <div className="f-order-left">
                        <span className="f-order-id">{order.order_id}</span>
                        <span className="f-order-sub">
                          {order.payment_method ? String(order.payment_method).toUpperCase() : 'PAYMENT'} • {order.order_date ? new Date(order.order_date).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                      <div className="f-order-right">
                        <span className="f-order-amount">₹{typeof order.amount === 'number' ? order.amount.toFixed(2) : (order.amount || '0.00')}</span>
                        <span className={`f-order-tag ${(order.status || '').toLowerCase()}`}>
                          {order.status || 'COMPLETED'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Minimal Guardrail Footer Note */}
            <div className="f-defense-note">
              <ShieldCheck size={13} color="#1D9E75" style={{ flexShrink: 0 }} />
              <span>Defense-only system: Flags activity for human analyst review. Never auto-blocks.</span>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
