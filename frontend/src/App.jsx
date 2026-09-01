import React, { useEffect, useState } from 'react';
import { ShieldAlert, RefreshCw, AlertOctagon, Layers, Users, Search, BarChart3, ShieldCheck, Cpu } from 'lucide-react';
import GraphView from './components/GraphView';
import AccountPanel from './components/AccountPanel';
import EvaluationModal from './components/EvaluationModal';
import GuardrailsModal from './components/GuardrailsModal';
import MLValidationModal from './components/MLValidationModal';
import { API_BASE_URL } from './config';

export default function App() {
  const [clusters, setClusters] = useState([]);
  const [evaluation, setEvaluation] = useState(null);
  const [allAccountIds, setAllAccountIds] = useState([]);
  const [showAllAccounts, setShowAllAccounts] = useState(false);
  const [loading, setLoading] = useState(true);
  const [evalLoading, setEvalLoading] = useState(false);
  const [error, setError] = useState(null);
  const [evalError, setEvalError] = useState(null);
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showEvalModal, setShowEvalModal] = useState(false);
  const [showGuardrailsModal, setShowGuardrailsModal] = useState(false);
  const [showMLModal, setShowMLModal] = useState(false);


  const fetchData = () => {
    setLoading(true);
    setEvalLoading(true);
    setError(null);
    setEvalError(null);

    // 1. Fetch Clusters
    fetch(`${API_BASE_URL}/clusters`)
      .then((res) => {
        if (!res.ok) throw new Error(`Clusters API error: status ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setClusters(data || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching clusters:', err);
        setError(`Unable to connect to ${API_BASE_URL}/clusters.`);
        setLoading(false);
      });

    // 2. Fetch Evaluation
    fetch(`${API_BASE_URL}/evaluation`)
      .then((res) => {
        if (!res.ok) throw new Error(`Evaluation API error: status ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setEvaluation(data);
        setEvalLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching evaluation:', err);
        setEvalError(`Unable to connect to ${API_BASE_URL}/evaluation.`);
        setEvalLoading(false);
      });

    // 3. Fetch All 310 Accounts for Scalability Test
    fetch(`${API_BASE_URL}/accounts`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) {
          setAllAccountIds(data);
        }
      })
      .catch((err) => console.warn('Could not fetch all accounts list:', err));
  };


  useEffect(() => {
    fetchData();
  }, []);

  // Compute aggregate stats
  const totalClusters = clusters.length;
  const suspiciousClusters = clusters.filter((c) => c.flagged_suspicious).length;

  const connectedAccountsSet = new Set();
  clusters.forEach((c) => {
    (c.members || []).forEach((m) => connectedAccountsSet.add(m));
  });

  const activeAccountsList = showAllAccounts && allAccountIds.length > 0
    ? allAccountIds
    : Array.from(connectedAccountsSet);

  const filteredAccounts = searchQuery.trim()
    ? activeAccountsList.filter((a) => a.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  return (
    <div id="root">
      {/* Top Header */}
      <header className="app-header">
        <div className="brand-section">
          <div className="brand-icon-wrapper">
            <ShieldAlert size={24} />
          </div>
          <div>
            <h1 className="brand-title">Fraud Ring X-Ray</h1>
          </div>
        </div>

        {/* View Mode Segmented Toggle */}
        <div className="view-toggle-container">
          <button
            className={`view-toggle-btn ${!showAllAccounts ? 'active' : ''}`}
            onClick={() => setShowAllAccounts(false)}
            title="Show 44 connected cluster accounts only"
          >
            Focused ({connectedAccountsSet.size})
          </button>
          <button
            className={`view-toggle-btn ${showAllAccounts ? 'active' : ''}`}
            onClick={() => setShowAllAccounts(true)}
            title="Show all 310 accounts for scalability test"
          >
            Show All ({allAccountIds.length || 310})
          </button>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', width: '180px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              borderRadius: '20px',
              padding: '4px 12px',
            }}
          >
            <Search size={14} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
                outline: 'none',
                width: '100%',
              }}
            />
          </div>

          {filteredAccounts.length > 0 && (
            <div
              style={{
                position: 'absolute',
                top: '38px',
                left: 0,
                right: 0,
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                maxHeight: '200px',
                overflowY: 'auto',
                zIndex: 30,
                boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
              }}
            >
              {filteredAccounts.map((accId) => (
                <div
                  key={accId}
                  onClick={() => {
                    setSelectedAccountId(accId);
                    setSearchQuery('');
                  }}
                  style={{
                    padding: '8px 12px',
                    fontSize: '0.85rem',
                    fontFamily: 'var(--font-mono)',
                    cursor: 'pointer',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    color: 'var(--text-primary)',
                  }}
                  onMouseEnter={(e) => (e.target.style.background = 'rgba(255,255,255,0.1)')}
                  onMouseLeave={(e) => (e.target.style.background = 'transparent')}
                >
                  {accId}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="header-stats">
          <div className="stat-pill">
            <Layers size={14} className="stat-label" />
            <span className="stat-label">Clusters:</span>
            <span className="stat-value">{totalClusters}</span>
          </div>

          <div className="stat-pill">
            <AlertOctagon size={14} color="#ef4444" />
            <span className="stat-label">Suspicious:</span>
            <span className="stat-value suspicious">{suspiciousClusters}</span>
          </div>

          <div className="stat-pill">
            <Users size={14} className="stat-label" />
            <span className="stat-label">Accounts:</span>
            <span className="stat-value">
              {showAllAccounts ? (allAccountIds.length || 310) : connectedAccountsSet.size}
            </span>
          </div>

          {/* Legend */}
          <div className="header-legend">
            <div className="legend-item">
              <span className="legend-dot suspicious" />
              <span>Suspicious</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot normal" />
              <span>Normal</span>
            </div>
            {showAllAccounts && (
              <div className="legend-item">
                <span className="legend-dot isolated" />
                <span>Isolated</span>
              </div>
            )}
          </div>
        </div>

        {/* Safety & Guardrails Button */}
        <button
          className="guardrails-btn"
          onClick={() => setShowGuardrailsModal(true)}
          title="View Defense-Only Rule & Safety Guardrails"
        >
          <ShieldCheck size={16} />
          <span>Guardrails</span>
        </button>

        {/* Evaluation Metrics Button */}
        <button
          className="eval-btn"
          onClick={() => setShowEvalModal(true)}
          title="View Model Performance & Evaluation Metrics"
        >
          <BarChart3 size={16} />
          <span>Evaluation Metrics</span>
        </button>

        {/* ML Validation Button */}
        <button
          className="eval-btn"
          onClick={() => setShowMLModal(true)}
          title="View Validated ML Classifier Metrics & Feature Importance"
          style={{
            background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15) 0%, rgba(126, 34, 206, 0.25) 100%)',
            borderColor: 'rgba(168, 85, 247, 0.4)',
            color: '#c084fc'
          }}
        >
          <Cpu size={16} />
          <span>ML Validation</span>
        </button>

        {/* Refresh Button */}
        <button
          className="close-btn"
          onClick={fetchData}
          title="Refresh Data"
          disabled={loading}
        >
          <RefreshCw size={18} className={loading ? 'spinner' : ''} />
        </button>
      </header>

      {/* Main Container */}
      <main className="main-container">
        {loading && (
          <div className="state-container" style={{ flex: 1 }}>
            <div className="spinner" />
            <p>Loading network graph and cluster data...</p>
          </div>
        )}

        {!loading && error && (
          <div className="state-container" style={{ flex: 1 }}>
            <AlertOctagon size={48} color="#ef4444" />
            <h2 style={{ color: '#f87171' }}>Backend Connection Error</h2>
            <p style={{ maxWidth: '460px' }}>{error}</p>
            <button className="btn-primary" onClick={fetchData}>
              Retry Connection
            </button>
          </div>
        )}

        {!loading && !error && (
          <>
            <div style={{ flex: 1, position: 'relative', height: '100%' }}>
              <GraphView
                clusters={clusters}
                evaluation={evaluation}
                allAccountIds={allAccountIds}
                showAllAccounts={showAllAccounts}
                onSelectAccount={(accId) => setSelectedAccountId(accId)}
                selectedAccountId={selectedAccountId}
              />
            </div>

            {selectedAccountId && (
              <AccountPanel
                accountId={selectedAccountId}
                clusters={clusters}
                evaluation={evaluation}
                onClose={() => setSelectedAccountId(null)}
              />
            )}
          </>
        )}
      </main>

      {/* Evaluation Modal Overlay */}
      {showEvalModal && (
        <EvaluationModal
          evaluation={evaluation}
          loading={evalLoading}
          error={evalError}
          onClose={() => setShowEvalModal(false)}
          onRetry={fetchData}
        />
      )}

      {/* Guardrails Modal Overlay */}
      {showGuardrailsModal && (
        <GuardrailsModal
          onClose={() => setShowGuardrailsModal(false)}
        />
      )}

      {/* ML Validation Modal Overlay */}
      {showMLModal && (
        <MLValidationModal
          onClose={() => setShowMLModal(false)}
        />
      )}
    </div>
  );
}

