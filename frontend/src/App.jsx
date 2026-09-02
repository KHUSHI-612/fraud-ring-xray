// Fraud Ring X-Ray UI Dashboard
import React, { useEffect, useState } from 'react';
import { ShieldAlert, AlertOctagon, Layers, Users, Search, ShieldCheck, User, Settings } from 'lucide-react';
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
  
  // Top Navigation Tab State: 'investigations' | 'guardrails' | 'evaluation' | 'ml'
  const [activeTab, setActiveTab] = useState('investigations');

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

    // 3. Fetch All 310 Accounts
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
      {/* Top Navigation Bar Container (Row 1) */}
      <nav className="app-top-navbar">
        <div className="top-navbar-left-group">
          <span className="top-navbar-brand">Fraud Ring X-Ray</span>
          
          <div className="top-navbar-tabs">
            <span 
              className={`top-navbar-tab ${activeTab === 'investigations' ? 'active' : ''}`}
              onClick={() => setActiveTab('investigations')}
            >
              Investigations
            </span>
            <span 
              className={`top-navbar-tab ${activeTab === 'guardrails' ? 'active' : ''}`}
              onClick={() => setActiveTab('guardrails')}
            >
              Guardrails
            </span>
            <span 
              className={`top-navbar-tab ${activeTab === 'evaluation' ? 'active' : ''}`}
              onClick={() => setActiveTab('evaluation')}
            >
              Evaluation Metrics
            </span>
            <span 
              className={`top-navbar-tab ${activeTab === 'ml' ? 'active' : ''}`}
              onClick={() => setActiveTab('ml')}
            >
              ML Validation
            </span>
          </div>
        </div>

        <div className="top-navbar-right-actions">
          <button className="top-navbar-icon-btn" title="Settings">
            <Settings size={17} color="var(--text-secondary)" />
          </button>
          <button className="top-navbar-icon-btn" title="User Profile">
            <User size={17} color="var(--text-secondary)" />
          </button>
        </div>
      </nav>

      {/* Second Header Control Bar (Row 2) - Black Background & White Outlines */}
      <header className="app-header-single">
        {/* Left: View Mode Toggle (Focused vs Show All 310) */}
        <div className="view-toggle-container">
          <button
            className={`view-toggle-btn ${!showAllAccounts ? 'active' : ''}`}
            onClick={() => setShowAllAccounts(false)}
            title="Show connected cluster accounts only"
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

        {/* Middle: Account Search Input (Shifted further right) */}
        <div style={{ position: 'relative', width: '380px', marginLeft: 'auto', marginRight: '48px' }}>
          <div className="search-bar-input">
            <Search size={15} color="var(--text-secondary)" />
            <input
              type="text"
              placeholder="Search account ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {filteredAccounts.length > 0 && (
            <div className="search-results-dropdown">
              {filteredAccounts.map((accId) => (
                <div
                  key={accId}
                  onClick={() => {
                    setSelectedAccountId(accId);
                    setActiveTab('investigations');
                    setSearchQuery('');
                  }}
                  className="search-result-item"
                >
                  {accId}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Rightmost: Aggregate KPI Summary Pills */}
        <div className="header-kpi-group" style={{ marginLeft: 'auto' }}>
          {/* Clusters KPI Pill with Hover Dropdown */}
          <div className="kpi-pill-wrapper">
            <div className="kpi-pill" title="Hover to view all clusters list">
              <Layers size={13} />
              <span>Clusters: <strong>{totalClusters}</strong></span>
            </div>
            <div className="kpi-dropdown">
              <div className="kpi-dropdown-header">All {totalClusters} Clusters</div>
              <div className="kpi-dropdown-list">
                {clusters.map((c) => {
                  const cIdRaw = c.cluster_id.replace('cluster_', '');
                  return (
                    <div key={c.cluster_id} className="kpi-dropdown-item">
                      <span className="mono bold">Cluster {cIdRaw}</span>
                      <span className={`kpi-status-tag ${c.flagged_suspicious ? 'suspicious' : 'normal'}`}>
                        {c.flagged_suspicious ? 'Suspicious' : 'Normal'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Suspicious KPI Pill with Hover Dropdown */}
          <div className="kpi-pill-wrapper">
            <div className="kpi-pill suspicious" title="Hover to view suspicious clusters list">
              <ShieldAlert size={13} />
              <span>Suspicious: <strong>{suspiciousClusters}</strong></span>
            </div>
            <div className="kpi-dropdown">
              <div className="kpi-dropdown-header suspicious">{suspiciousClusters} Flagged Suspicious Clusters</div>
              <div className="kpi-dropdown-list">
                {clusters.filter(c => c.flagged_suspicious).map((c) => {
                  const cIdRaw = c.cluster_id.replace('cluster_', '');
                  return (
                    <div key={c.cluster_id} className="kpi-dropdown-item">
                      <span className="mono bold" style={{ color: '#E2574C' }}>Cluster {cIdRaw}</span>
                      <span className="mono" style={{ fontSize: '0.72rem', color: '#8FA3C4' }}>{c.members?.length || 0} Accounts</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Accounts KPI Pill */}
          <div className="kpi-pill">
            <Users size={13} />
            <span>Accounts: <strong>{showAllAccounts ? (allAccountIds.length || 310) : connectedAccountsSet.size}</strong></span>
          </div>
        </div>
      </header>

      {/* Main Content Area - Full-Page Tab Switcher */}
      <main className="main-container">
        {activeTab === 'investigations' && (
          <>
            {loading && (
              <div className="state-container" style={{ flex: 1 }}>
                <div className="spinner" />
                <p>Loading network graph and cluster data...</p>
              </div>
            )}

            {!loading && error && (
              <div className="state-container" style={{ flex: 1 }}>
                <AlertOctagon size={48} color="#E2574C" />
                <h2 style={{ color: '#E2574C' }}>Backend Connection Error</h2>
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
                    onSelectAccount={(accId) => setSelectedAccountId(accId)}
                    onClose={() => setSelectedAccountId(null)}
                  />
                )}
              </>
            )}
          </>
        )}

        {activeTab === 'guardrails' && (
          <GuardrailsModal isFullPage={true} />
        )}

        {activeTab === 'evaluation' && (
          <EvaluationModal
            evaluation={evaluation}
            loading={evalLoading}
            error={evalError}
            isFullPage={true}
            onRetry={fetchData}
          />
        )}

        {activeTab === 'ml' && (
          <MLValidationModal isFullPage={true} />
        )}
      </main>
    </div>
  );
}
