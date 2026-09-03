import React, { useEffect, useRef } from 'react';
import { Network } from 'vis-network/standalone';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

export default function GraphView({
  clusters,
  evaluation,
  allAccountIds = [],
  showAllAccounts = false,
  onSelectAccount,
  selectedAccountId,
}) {
  const containerRef = useRef(null);
  const networkRef = useRef(null);
  const connectedNodesRef = useRef([]);

  useEffect(() => {
    if (!containerRef.current || !clusters || clusters.length === 0) return;

    // Lookup for true positive matched rings
    const ringMap = new Map();
    if (evaluation && Array.isArray(evaluation.true_positives)) {
      evaluation.true_positives.forEach((tp) => {
        if (tp.cluster_id && tp.matched_ring) {
          ringMap.set(tp.cluster_id, tp.matched_ring);
        }
      });
    }

    const nodeMLConfMap = new Map();
    const nodeTierMap = new Map();
    const nodesMap = new Map();
    const edgeSet = new Map();

    clusters.forEach((cluster) => {
      const isSuspicious = cluster.flagged_suspicious;
      const members = cluster.members || [];
      const tierKey = cluster.confidence_tier || 'likely_legitimate';

      let tierLabel = 'Likely legitimate';
      if (tierKey === 'high_confidence_fraud') tierLabel = 'High confidence fraud';
      else if (tierKey === 'needs_human_review') tierLabel = 'Needs human review';

      members.forEach((accId) => {
        const existingConf = nodeMLConfMap.get(accId) || 0;
        nodeMLConfMap.set(accId, Math.max(existingConf, cluster.ml_confidence || 0));
        nodeTierMap.set(accId, tierLabel);

        if (!nodesMap.has(accId)) {
          nodesMap.set(accId, {
            id: accId,
            label: accId,
            isSuspicious: isSuspicious,
            isIsolated: false,
            clusters: [cluster.cluster_id],
          });
        } else {
          const existing = nodesMap.get(accId);
          existing.isSuspicious = existing.isSuspicious || isSuspicious;
          if (!existing.clusters.includes(cluster.cluster_id)) {
            existing.clusters.push(cluster.cluster_id);
          }
        }
      });

      for (let i = 0; i < members.length; i++) {
        for (let j = i + 1; j < members.length; j++) {
          const u = members[i];
          const v = members[j];
          const edgeKey = [u, v].sort().join('---');

          if (!edgeSet.has(edgeKey)) {
            edgeSet.set(edgeKey, {
              id: edgeKey,
              from: u,
              to: v,
              isSuspicious: isSuspicious,
            });
          } else {
            const existingEdge = edgeSet.get(edgeKey);
            existingEdge.isSuspicious = existingEdge.isSuspicious || isSuspicious;
          }
        }
      }
    });

    // Save connected node IDs for camera fitting
    connectedNodesRef.current = Array.from(nodesMap.keys());

    // When showAllAccounts is enabled, place isolated nodes in a spiral constellation
    if (showAllAccounts && Array.isArray(allAccountIds)) {
      let isoIndex = 0;
      const constCenterX = 0;
      const constCenterY = 0;

      allAccountIds.forEach((accId) => {
        if (!nodesMap.has(accId)) {
          const angleStep = 2.4;
          const r = 180 + Math.sqrt(isoIndex) * 22;
          const theta = isoIndex * angleStep;

          const isoX = constCenterX + r * Math.cos(theta) * 1.1;
          const isoY = constCenterY + r * Math.sin(theta) * 0.95;
          isoIndex++;

          nodesMap.set(accId, {
            id: accId,
            label: accId,
            x: isoX,
            y: isoY,
            isSuspicious: false,
            isIsolated: true,
            clusters: [],
          });
        }
      });
    }

    const nodes = Array.from(nodesMap.values()).map((node) => {
      const mlConf = nodeMLConfMap.get(node.id) || 0;
      const tierLabel = nodeTierMap.get(node.id) || 'Isolated';

      if (node.isIsolated) {
        return {
          id: node.id,
          label: node.label,
          x: node.x,
          y: node.y,
          title: `Account ID: ${node.id}\nStatus: Isolated`,
          shape: 'dot',
          size: 5,
          font: {
            color: '#687D9D',
            size: 8.5,
            face: 'JetBrains Mono, monospace',
          },
          color: {
            background: '#132743',
            border: '#8FA3C4',
          },
          borderWidth: 1,
        };
      }

      const isSus = node.isSuspicious;
      const titleTooltip = `Account ID: ${node.id}\nRisk Tier: ${tierLabel}\nML Confidence: ${(mlConf * 100).toFixed(1)}%\nStatus: ${isSus ? 'Suspicious' : 'Normal'}`;

      return {
        id: node.id,
        label: node.label,
        title: titleTooltip,
        shape: 'dot',
        size: isSus ? 12 : 7.5,
        font: {
          color: isSus ? '#F3F6FA' : '#8FA3C4',
          size: isSus ? 11 : 9.5,
          face: 'JetBrains Mono, monospace',
          strokeWidth: 2,
          strokeColor: '#000000',
        },
        color: {
          background: isSus ? '#E2574C' : '#1D9E75',
          border: isSus ? '#E2574C' : '#1D9E75',
          highlight: {
            background: isSus ? '#E2574C' : '#1D9E75',
            border: '#378ADD',
          },
          hover: {
            background: isSus ? '#E2574C' : '#1D9E75',
            border: '#378ADD',
          },
        },
        borderWidth: isSus ? 1.5 : 1,
        borderWidthSelected: 3,
        shadow: isSus ? { enabled: true, color: 'rgba(226, 87, 76, 0.45)', size: 8 } : false,
      };
    });

    const edges = Array.from(edgeSet.values()).map((edge) => ({
      id: edge.id,
      from: edge.from,
      to: edge.to,
      width: edge.isSuspicious ? 2.2 : 1.5,
      color: {
        color: edge.isSuspicious ? 'rgba(226, 87, 76, 0.85)' : 'rgba(143, 163, 196, 0.55)',
        highlight: '#E2574C',
        hover: '#E2574C',
      },
      smooth: {
        type: 'continuous',
      },
    }));

    const data = { nodes, edges };

    // Dynamic forceAtlas2Based physics layout (Live spring animation on load)
    const options = {
      nodes: {
        borderWidth: 1.5,
      },
      edges: {
        smooth: {
          type: 'continuous',
          forceDirection: 'none',
        },
      },
      physics: {
        solver: 'forceAtlas2Based',
        forceAtlas2Based: {
          gravitationalConstant: -45,
          centralGravity: 0.005,
          springLength: 85,
          springConstant: 0.06,
          damping: 0.25,
          avoidOverlap: 0.6,
        },
        maxVelocity: 50,
        minVelocity: 0.05,
        stabilization: {
          enabled: false, // Live organic animation on every refresh!
        },
      },
      interaction: {
        hover: true,
        tooltipDelay: 100,
        selectable: true,
        selectConnectedEdges: false,
      },
    };

    const network = new Network(containerRef.current, data, options);
    networkRef.current = network;

    // Node click handler
    network.on('click', (params) => {
      if (params.nodes.length > 0) {
        const clickedNodeId = params.nodes[0];
        if (onSelectAccount) {
          onSelectAccount(clickedNodeId);
        }
      } else {
        if (onSelectAccount) {
          onSelectAccount(null);
        }
      }
    });

    // Custom Canvas Overlay Drawing
    network.on('afterDrawing', (ctx) => {
      // 1. Draw ML Confidence Outer Ring around cluster nodes using strict 3-tier colors
      ctx.save();
      nodesMap.forEach((node) => {
        if (node.isIsolated) return;
        const pos = network.getPositions([node.id])[node.id];
        if (!pos) return;

        const mlConf = nodeMLConfMap.get(node.id) || 0;
        let ringColor = 'rgba(29, 158, 117, 0.6)'; // Legitimate (Teal)
        if (mlConf > 0.8) {
          ringColor = 'rgba(226, 87, 76, 0.9)'; // High Risk (Coral/Red)
        } else if (mlConf >= 0.5) {
          ringColor = 'rgba(186, 117, 23, 0.85)'; // Needs Review (Amber)
        }

        ctx.beginPath();
        const outerRadius = node.isSuspicious ? 16 : 13;
        ctx.arc(pos.x, pos.y, outerRadius, 0, 2 * Math.PI);
        ctx.strokeStyle = ringColor;
        ctx.lineWidth = 2;
        ctx.stroke();
      });
      ctx.restore();

      // 2. Draw Cluster Header Badges
      clusters.forEach((cluster) => {
        const members = cluster.members || [];
        if (members.length === 0) return;

        let sumX = 0;
        let minY = Infinity;
        let count = 0;

        members.forEach((accId) => {
          if (nodesMap.has(accId)) {
            const pos = network.getPositions([accId])[accId];
            if (pos) {
              sumX += pos.x;
              if (pos.y < minY) minY = pos.y;
              count++;
            }
          }
        });

        if (count === 0 || minY === Infinity) return;

        const avgX = sumX / count;

        const cIdRaw = (cluster?.cluster_id || '').replace('cluster_', '') || '0';
        const cIdFormatted = `Cluster ${cIdRaw}`;
        const matchedRing = cluster?.cluster_id ? ringMap.get(cluster.cluster_id) : null;
        
        let formattedRing = '';
        if (matchedRing) {
          formattedRing = String(matchedRing).replace('RING_', 'Ring ');
        }

        const clusterLabelText = formattedRing
          ? `${cIdFormatted} · ${formattedRing}`
          : cIdFormatted;

        const isSuspicious = cluster.flagged_suspicious;

        ctx.save();
        ctx.font = '600 12px JetBrains Mono, monospace';

        const textWidth = ctx.measureText(clusterLabelText).width;
        const paddingX = 10;
        const rectWidth = textWidth + paddingX * 2;
        const rectHeight = 22;

        const rectX = avgX - rectWidth / 2;
        const rectY = minY - 30;

        // Background box (Pure Black Surface)
        ctx.fillStyle = 'rgba(9, 11, 16, 0.95)';
        ctx.beginPath();
        ctx.roundRect(rectX, rectY, rectWidth, rectHeight, 4);
        ctx.fill();

        // Left accent line
        ctx.beginPath();
        ctx.moveTo(rectX, rectY);
        ctx.lineTo(rectX, rectY + rectHeight);
        ctx.strokeStyle = isSuspicious ? '#E2574C' : '#1D9E75';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Label Text
        ctx.fillStyle = isSuspicious ? '#E2574C' : '#1D9E75';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(clusterLabelText, avgX + 1, rectY + rectHeight / 2);

        ctx.restore();
      });
    });

    return () => {
      if (networkRef.current) {
        networkRef.current.destroy();
        networkRef.current = null;
      }
    };
  }, [clusters, evaluation, showAllAccounts, allAccountIds]);

  useEffect(() => {
    if (networkRef.current && selectedAccountId) {
      try {
        networkRef.current.selectNodes([selectedAccountId]);
      } catch (err) {
        // Node might not be present in current view mode
      }
    }
  }, [selectedAccountId]);

  // Interactive Zoom Control Handlers
  const handleZoomIn = () => {
    if (networkRef.current) {
      const scale = networkRef.current.getScale();
      networkRef.current.moveTo({
        scale: Math.min(scale * 1.35, 2.5),
        animation: { duration: 250, easingFunction: 'easeInOutQuad' },
      });
    }
  };

  const handleZoomOut = () => {
    if (networkRef.current) {
      const scale = networkRef.current.getScale();
      networkRef.current.moveTo({
        scale: Math.max(scale / 1.35, 0.15),
        animation: { duration: 250, easingFunction: 'easeInOutQuad' },
      });
    }
  };

  const handleResetView = () => {
    if (networkRef.current) {
      if (connectedNodesRef.current.length > 0) {
        networkRef.current.fit({
          nodes: connectedNodesRef.current,
          animation: { duration: 400, easingFunction: 'easeInOutQuad' },
        });
      } else {
        networkRef.current.fit({
          animation: { duration: 400, easingFunction: 'easeInOutQuad' },
        });
      }
    }
  };

  return (
    <div className="graph-wrapper" style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={containerRef} className="vis-network-container" style={{ width: '100%', height: '100%' }} />

      {/* Canvas Top-Left Legend Overlay (Matching Image 1) */}
      <div className="canvas-legend-bar-topleft">
        <div className="legend-bar-item">
          <span className="legend-dot fraud" />
          <span>FRAUD</span>
        </div>
        <div className="legend-bar-item">
          <span className="legend-dot review" />
          <span>REVIEW</span>
        </div>
        <div className="legend-bar-item">
          <span className="legend-dot legit" />
          <span>LEGIT</span>
        </div>
      </div>

      {/* Canvas Bottom-Left Zoom & Node Count Indicator */}
      <div className="canvas-bottomleft-info">
        <span>1.00x · {showAllAccounts ? 310 : 44} NODES</span>
      </div>

      {/* Interactive Floating Zoom Controls */}
      <div className="canvas-zoom-controls">
        <button className="zoom-btn" onClick={handleZoomIn} title="Zoom In (+)">
          <ZoomIn size={15} />
        </button>
        <button className="zoom-btn" onClick={handleZoomOut} title="Zoom Out (-)">
          <ZoomOut size={15} />
        </button>
        <button className="zoom-btn" onClick={handleResetView} title="Reset View">
          <Maximize2 size={14} />
        </button>
      </div>
    </div>
  );
}
