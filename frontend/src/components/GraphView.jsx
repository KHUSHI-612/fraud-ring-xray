import React, { useEffect, useRef } from 'react';
import { Network } from 'vis-network/standalone';

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

    const nodesMap = new Map();
    const edgeSet = new Map();

    // 1. Process connected cluster member accounts
    clusters.forEach((cluster) => {
      const isSuspicious = cluster.flagged_suspicious;
      const members = cluster.members || [];

      members.forEach((accId) => {
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

    // 2. If showAllAccounts is enabled, add remaining isolated accounts
    if (showAllAccounts && Array.isArray(allAccountIds)) {
      allAccountIds.forEach((accId) => {
        if (!nodesMap.has(accId)) {
          nodesMap.set(accId, {
            id: accId,
            label: accId,
            isSuspicious: false,
            isIsolated: true,
            clusters: [],
          });
        }
      });
    }

    // Format nodes for vis-network
    const nodes = Array.from(nodesMap.values()).map((node) => {
      // Isolated node styling (dimmed/subtle)
      if (node.isIsolated) {
        return {
          id: node.id,
          label: node.label,
          title: `Account ID: ${node.id}\nStatus: Isolated (No shared signals/edges)`,
          shape: 'dot',
          size: 8,
          font: {
            color: '#6b7280',
            size: 9,
            face: 'JetBrains Mono, monospace',
            strokeWidth: 1,
            strokeColor: '#0b0f19',
          },
          color: {
            background: '#1f2937',
            border: '#374151',
            highlight: {
              background: '#374151',
              border: '#6b7280',
            },
            hover: {
              background: '#374151',
              border: '#6b7280',
            },
          },
          borderWidth: 1,
          borderWidthSelected: 2,
          shadow: false,
        };
      }

      // Clustered node styling (Red for suspicious, Gray for normal)
      const isSus = node.isSuspicious;
      const clusterDetails = node.clusters
        .map((cId) => {
          const ring = ringMap.get(cId);
          return ring ? `${cId} (${ring})` : cId;
        })
        .join(', ');

      const titleTooltip = `Account ID: ${node.id}\nCluster(s): ${clusterDetails}\nStatus: ${isSus ? 'Suspicious' : 'Normal'}`;

      return {
        id: node.id,
        label: node.label,
        title: titleTooltip,
        shape: 'dot',
        size: isSus ? 20 : 15,
        font: {
          color: '#ffffff',
          size: 13,
          face: 'JetBrains Mono, monospace',
          strokeWidth: 3,
          strokeColor: '#0b0f19',
        },
        color: {
          background: isSus ? '#dc2626' : '#4b5563',
          border: isSus ? '#ef4444' : '#9ca3af',
          highlight: {
            background: isSus ? '#f87171' : '#6b7280',
            border: '#ffffff',
          },
          hover: {
            background: isSus ? '#f87171' : '#6b7280',
            border: '#ffffff',
          },
        },
        borderWidth: 2,
        borderWidthSelected: 3,
        shadow: isSus
          ? { enabled: true, color: 'rgba(239, 68, 68, 0.5)', size: 12, x: 0, y: 0 }
          : false,
      };
    });

    // Format edges for vis-network
    const edges = Array.from(edgeSet.values()).map((edge) => {
      const isSus = edge.isSuspicious;
      return {
        id: edge.id,
        from: edge.from,
        to: edge.to,
        width: isSus ? 2.5 : 1.2,
        color: {
          color: isSus ? '#ef4444' : '#4b5563',
          highlight: isSus ? '#f87171' : '#9ca3af',
          hover: isSus ? '#f87171' : '#9ca3af',
          opacity: isSus ? 0.85 : 0.45,
        },
      };
    });

    const data = { nodes, edges };

    const options = {
      physics: {
        enabled: true,
        solver: 'forceAtlas2Based',
        forceAtlas2Based: {
          gravitationalConstant: showAllAccounts ? -20 : -40,
          centralGravity: 0.005,
          springLength: showAllAccounts ? 120 : 110,
          springConstant: 0.05,
          damping: 0.4,
          avoidOverlap: 0.8,
        },
        stabilization: {
          enabled: true,
          iterations: showAllAccounts ? 220 : 150,
          updateInterval: 25,
        },
      },
      interaction: {
        hover: true,
        tooltipDelay: 100,
        dragNodes: true,
        dragView: true,
        zoomView: true,
        selectable: true,
      },
    };

    const network = new Network(containerRef.current, data, options);
    networkRef.current = network;

    // Draw prominent Cluster Labels dynamically above each connected cluster
    network.on('afterDrawing', (ctx) => {
      if (!clusters || clusters.length === 0) return;

      const nodePositions = network.getPositions();

      clusters.forEach((cluster) => {
        const members = cluster.members || [];
        if (members.length === 0) return;

        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        let count = 0;

        members.forEach((accId) => {
          const pos = nodePositions[accId];
          if (pos) {
            minX = Math.min(minX, pos.x);
            maxX = Math.max(maxX, pos.x);
            minY = Math.min(minY, pos.y);
            maxY = Math.max(maxY, pos.y);
            count++;
          }
        });

        if (count === 0) return;

        const centerX = (minX + maxX) / 2;
        const topY = minY - 34;

        const matchedRing = ringMap.get(cluster.cluster_id);
        const cNum = cluster.cluster_id.replace('cluster_', '');
        
        let labelText = `CLUSTER ${cNum}`;
        if (matchedRing) {
          const ringClean = matchedRing.replace('RING_', '');
          labelText = `CLUSTER ${cNum} • RING ${ringClean}`;
        }

        const isSuspicious = cluster.flagged_suspicious;
        const isTruePositive = !!matchedRing;

        ctx.save();
        ctx.font = 'bold 12px "JetBrains Mono", Inter, sans-serif';
        const textWidth = ctx.measureText(labelText).width;
        const paddingX = 10;
        const paddingY = 4;
        const badgeWidth = textWidth + paddingX * 2;
        const badgeHeight = 24;
        const badgeX = centerX - badgeWidth / 2;
        const badgeY = topY - badgeHeight / 2;
        const radius = 6;

        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, radius);
        } else {
          ctx.rect(badgeX, badgeY, badgeWidth, badgeHeight);
        }

        if (isTruePositive) {
          ctx.fillStyle = 'rgba(185, 28, 28, 0.95)';
          ctx.strokeStyle = '#f87171';
          ctx.lineWidth = 1.8;
        } else if (isSuspicious) {
          ctx.fillStyle = 'rgba(153, 27, 27, 0.9)';
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 1.2;
        } else {
          ctx.fillStyle = 'rgba(31, 41, 55, 0.85)';
          ctx.strokeStyle = '#6b7280';
          ctx.lineWidth = 1.2;
        }
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(labelText, centerX, topY);

        ctx.restore();
      });
    });

    // Node select event
    network.on('selectNode', (params) => {
      if (params.nodes && params.nodes.length > 0) {
        onSelectAccount(params.nodes[0]);
      }
    });

    // Deselect / Canvas click event
    network.on('deselectNode', () => {
      onSelectAccount(null);
    });

    network.on('click', (params) => {
      if (params.nodes.length === 0) {
        onSelectAccount(null);
      }
    });

    return () => {
      network.destroy();
    };
  }, [clusters, evaluation, allAccountIds, showAllAccounts]);

  // Keep network selection in sync if changed from parent
  useEffect(() => {
    if (networkRef.current) {
      if (selectedAccountId) {
        networkRef.current.selectNodes([selectedAccountId]);
      } else {
        networkRef.current.unselectAll();
      }
    }
  }, [selectedAccountId]);

  return (
    <div className="graph-wrapper">
      <div ref={containerRef} className="vis-network-container" />
    </div>
  );
}
