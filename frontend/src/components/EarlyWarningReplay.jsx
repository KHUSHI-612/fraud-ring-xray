import React, { useEffect, useState, useRef } from 'react';
import { Play, Pause, RotateCcw, AlertTriangle, ShieldAlert } from 'lucide-react';
import { API_BASE_URL } from '../config';

export default function EarlyWarningReplay({ isFullPage, onClose }) {
  const [replayData, setReplayData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Playback animation state
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(2); // 1x, 2x, 5x, 10x

  const timerRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`${API_BASE_URL}/early-warning-replay`)
      .then((res) => {
        if (!res.ok) throw new Error(`Status ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setReplayData(data);
        setLoading(false);
        if (data?.timeline_steps?.length > 0) {
          setCurrentStepIndex(data.timeline_steps.length - 1); // default to end
        }
      })
      .catch((err) => {
        setError(`Unable to connect to ${API_BASE_URL}/early-warning-replay.`);
        setLoading(false);
      });
  }, []);

  // Playback timer loop
  useEffect(() => {
    if (isPlaying) {
      const intervalMs = Math.max(20, 300 / playbackSpeed);
      timerRef.current = setInterval(() => {
        setCurrentStepIndex((prev) => {
          if (!replayData?.timeline_steps) return prev;
          if (prev >= replayData.timeline_steps.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, intervalMs);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, playbackSpeed, replayData]);

  const steps = replayData?.timeline_steps || [];
  const totalSteps = steps.length;
  const currentStepObj = steps[currentStepIndex] || {};

  // Compute live cumulative prevented rupees at currentStepIndex
  const currentCumulativePrevented = currentStepObj.cumulative_prevented_rupees || 0;
  const totalPreventedFinal = replayData?.total_prevented_rupees || 65988.25;

  // Detections triggered up to currentStepIndex
  const detectedSoFar = (replayData?.ring_detections || []).filter((det) => {
    if (!det.detection_timestamp || !currentStepObj.timestamp) return false;
    return new Date(det.detection_timestamp) <= new Date(currentStepObj.timestamp);
  });

  const handleSliderChange = (e) => {
    setIsPlaying(false);
    setCurrentStepIndex(Number(e.target.value));
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentStepIndex(0);
  };

  const handlePlayToggle = () => {
    if (currentStepIndex >= totalSteps - 1) {
      setCurrentStepIndex(0);
    }
    setIsPlaying(!isPlaying);
  };

  const content = (
    <div 
      className={isFullPage ? "full-page-card" : "modal-content"} 
      onClick={(e) => e.stopPropagation()} 
      style={isFullPage ? { width: '100%', maxWidth: '100%', background: 'transparent' } : { maxWidth: '980px', padding: '24px' }}
    >
      {/* Top Header Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '28px' }}>
        <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#378ADD', textTransform: 'uppercase', letterSpacing: '0.12em', fontFamily: 'var(--font-mono)' }}>
          EARLY-WARNING CHRONOLOGICAL REPLAY
        </span>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em', lineHeight: 1.15 }}>
          Early-Warning Replay & Loss Prevention
        </h1>
        <p style={{ fontSize: '0.96rem', color: '#8FA3C4', maxWidth: '840px', lineHeight: 1.6, marginTop: '4px' }}>
          Chronological simulation processing accounts in signup order. Detects fraud ring density thresholds (≥ 0.5) at signup and calculates preventable order loss (₹).
        </p>
      </div>

      {loading && (
        <div className="state-container" style={{ padding: '60px' }}>
          <div className="spinner" />
          <p>Running chronological early-warning simulation engine...</p>
        </div>
      )}

      {!loading && error && (
        <div className="state-container" style={{ padding: '60px' }}>
          <AlertTriangle size={36} color="#E2574C" />
          <p style={{ color: '#E2574C' }}>{error}</p>
          <button className="btn-primary" onClick={onClose}>Close</button>
        </div>
      )}

      {!loading && replayData && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Controls & Hero Counter Container */}
          <div style={{ 
            background: '#080A0F', 
            border: '1px solid rgba(255, 255, 255, 0.12)', 
            borderRadius: '8px', 
            padding: '20px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            {/* Top Row Stats & Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
              
              {/* Animated Cumulative Rupee Prevented Counter */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#1D9E75', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                  CUMULATIVE PREVENTED LOSS (₹)
                </span>
                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#1D9E75', lineHeight: 1, fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>₹</span>
                  <span>{currentCumulativePrevented.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <span style={{ fontSize: '0.72rem', color: '#687D9D', fontFamily: 'var(--font-mono)' }}>
                  Target Total: ₹{totalPreventedFinal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              {/* Rings Detected & Account Counter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#8FA3C4', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)' }}>
                    RINGS DETECTED AT SIGNUP
                  </span>
                  <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#FFFFFF', fontFamily: 'var(--font-mono)' }}>
                    {detectedSoFar.length} / {replayData.total_detected_rings}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#8FA3C4', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)' }}>
                    ACCOUNTS JOINED
                  </span>
                  <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#FFFFFF', fontFamily: 'var(--font-mono)' }}>
                    {currentStepIndex + 1} / {totalSteps}
                  </span>
                </div>
              </div>

              {/* Playback Controls Group */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button 
                  onClick={handlePlayToggle}
                  style={{ 
                    background: isPlaying ? '#E2574C' : '#378ADD', 
                    color: '#FFFFFF', 
                    border: 'none', 
                    borderRadius: '6px', 
                    padding: '10px 20px',
                    fontSize: '0.86rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                  <span>{isPlaying ? 'Pause' : 'Play Replay'}</span>
                </button>

                <button 
                  onClick={handleReset}
                  style={{ 
                    background: 'rgba(255, 255, 255, 0.08)', 
                    color: '#8FA3C4', 
                    border: '1px solid rgba(255, 255, 255, 0.15)', 
                    borderRadius: '6px', 
                    padding: '10px 14px',
                    cursor: 'pointer'
                  }}
                  title="Reset Playback"
                >
                  <RotateCcw size={16} />
                </button>

                {/* Speed Selector */}
                <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '6px', padding: '2px' }}>
                  {[1, 2, 5, 10].map((spd) => (
                    <button
                      key={spd}
                      onClick={() => setPlaybackSpeed(spd)}
                      style={{
                        background: playbackSpeed === spd ? '#378ADD' : 'transparent',
                        color: playbackSpeed === spd ? '#FFFFFF' : '#8FA3C4',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '4px 8px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        fontFamily: 'var(--font-mono)'
                      }}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* Horizontal Timeline Slider */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.74rem', color: '#8FA3C4', fontFamily: 'var(--font-mono)' }}>
                <span>Earliest Signup: 2026-06-01</span>
                <span style={{ color: '#FFFFFF', fontWeight: 700 }}>
                  Current Timestamp: {currentStepObj.timestamp || '2026-06-01'} (Account {currentStepObj.account_id || ''})
                </span>
                <span>Latest Signup: 2026-09-01</span>
              </div>

              <input
                type="range"
                min="0"
                max={Math.max(0, totalSteps - 1)}
                value={currentStepIndex}
                onChange={handleSliderChange}
                style={{
                  width: '100%',
                  accentColor: '#378ADD',
                  cursor: 'pointer'
                }}
              />
            </div>
          </div>

          {/* Split View: Left Simulation Step Info & Right Ring Detections Feed */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
            
            {/* Left Column: Live Chronological Step Card */}
            <div style={{ 
              background: '#080A0F', 
              border: '1px solid rgba(255, 255, 255, 0.12)', 
              borderRadius: '8px', 
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#8FA3C4', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                CURRENT JOIN EVENT STEP ({currentStepIndex + 1} / {totalSteps})
              </span>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <span style={{ fontSize: '0.8rem', color: '#8FA3C4' }}>Joining Account ID:</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#FFFFFF', fontFamily: 'var(--font-mono)' }}>
                    {currentStepObj.account_id || 'N/A'}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <span style={{ fontSize: '0.8rem', color: '#8FA3C4' }}>Signup Date:</span>
                  <span style={{ fontSize: '0.86rem', color: '#FFFFFF', fontFamily: 'var(--font-mono)' }}>
                    {currentStepObj.timestamp || 'N/A'}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <span style={{ fontSize: '0.8rem', color: '#8FA3C4' }}>Component Risk Density:</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 800, color: (currentStepObj.density || 0) >= 0.5 ? '#E2574C' : '#1D9E75', fontFamily: 'var(--font-mono)' }}>
                    {currentStepObj.density != null ? currentStepObj.density.toFixed(3) : '0.000'}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0' }}>
                  <span style={{ fontSize: '0.8rem', color: '#8FA3C4' }}>Graph Network Nodes / Edges:</span>
                  <span style={{ fontSize: '0.86rem', color: '#FFFFFF', fontFamily: 'var(--font-mono)' }}>
                    {currentStepObj.total_nodes || 0} Nodes · {currentStepObj.total_edges || 0} Edges
                  </span>
                </div>
              </div>

              {/* Step Flag Notification Banner if Ring Detected at this step */}
              {currentStepObj.ring_flagged ? (
                <div style={{ 
                  background: 'rgba(226, 87, 76, 0.18)', 
                  border: '1px solid rgba(226, 87, 76, 0.4)', 
                  borderRadius: '6px', 
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  boxShadow: '0 4px 16px rgba(226, 87, 76, 0.2)'
                }}>
                  <ShieldAlert size={20} color="#E2574C" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#E2574C' }}>
                      RING DETECTED AT SIGNUP: {currentStepObj.ring_flagged.ring_id}
                    </span>
                    <p style={{ fontSize: '0.78rem', color: '#FFFFFF', marginTop: '4px', lineHeight: 1.45 }}>
                      Component density crossed <strong>{currentStepObj.ring_flagged.density}</strong> threshold with <strong>{currentStepObj.ring_flagged.members_present}/{currentStepObj.ring_flagged.total_members} members present</strong>. Prevented Loss: <strong style={{ color: '#1D9E75' }}>₹{currentStepObj.ring_flagged.prevented_rupees.toLocaleString('en-IN')}</strong>.
                    </p>
                  </div>
                </div>
              ) : (
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '6px', padding: '14px', textAlign: 'center', fontSize: '0.8rem', color: '#8FA3C4' }}>
                  No new ring threshold trigger at this step
                </div>
              )}
            </div>

            {/* Right Column: Detected Ring Events Timeline List */}
            <div style={{ 
              background: '#080A0F', 
              border: '1px solid rgba(255, 255, 255, 0.12)', 
              borderRadius: '8px', 
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#8FA3C4', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                EARLY-WARNING RING DETECTIONS ({detectedSoFar.length} / {replayData.total_detected_rings})
              </span>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '300px', overflowY: 'auto' }}>
                {replayData.ring_detections.map((det) => {
                  const isDetectedYet = new Date(det.detection_timestamp) <= new Date(currentStepObj.timestamp || '');

                  return (
                    <div 
                      key={det.ring_id}
                      style={{
                        background: isDetectedYet ? 'rgba(29, 158, 117, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                        border: isDetectedYet ? '1px solid rgba(29, 158, 117, 0.3)' : '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '6px',
                        padding: '12px 14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        opacity: isDetectedYet ? 1 : 0.45,
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.84rem', fontWeight: 800, color: isDetectedYet ? '#FFFFFF' : '#8FA3C4', fontFamily: 'var(--font-mono)' }}>
                          {det.ring_id} <span style={{ fontSize: '0.7rem', color: '#8FA3C4', fontWeight: 400 }}>({det.ring_type})</span>
                        </span>
                        <span style={{ fontSize: '0.82rem', fontWeight: 800, color: isDetectedYet ? '#1D9E75' : '#8FA3C4', fontFamily: 'var(--font-mono)' }}>
                          ₹{det.prevented_rupees.toLocaleString('en-IN')}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.75rem', color: '#8FA3C4', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span>Timestamp: <strong style={{ color: '#FFFFFF' }}>{det.detection_timestamp}</strong></span>
                        <span style={{ color: isDetectedYet ? '#1D9E75' : '#8FA3C4', fontWeight: 700 }}>
                          {det.members_present}/{det.total_members} members present
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Explicit Limitation Callout Banner for Behavioral Rings */}
          <div style={{ 
            background: '#080A0F', 
            border: '1px solid rgba(55, 138, 221, 0.3)', 
            borderLeft: '4px solid #378ADD',
            borderRadius: '6px', 
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '16px',
            marginTop: '8px'
          }}>
            <AlertTriangle size={22} color="#378ADD" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: '#378ADD', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                KNOWN LIMITATION: BEHAVIORAL RINGS (RING_C1 & RING_C2)
              </h4>
              <p style={{ fontSize: '0.86rem', color: '#C5D1E0', lineHeight: 1.6 }}>
                Behavioral rings (<strong>RING_C1</strong> and <strong>RING_C2</strong>) have 0 device or shipping address sharing. Their sole detection signal is a high order return rate (<strong>return_rate ≥ 40%</strong>) paired with tight signup timing. Because return telemetry requires post-purchase transaction history, <strong>these rings cannot be caught at signup time before orders are placed and returned</strong>. This early-warning simulation evaluates structural identifier sharing at signup.
              </p>
            </div>
          </div>

        </div>
      )}
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
