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

    // Format nodes for vis-network (Sleek, compact node sizing from original clean design)
    const nodes = Array.from(nodesMap.values()).map((node) => {
      // Isolated node styling (dimmed/subtle)
      if (node.isIsolated) {
        return {
          id: node.id,
          label: node.label,
          title: `Account ID: ${node.id}\nStatus: Isolated (No shared signals/edges)`,
          shape: 'dot',
          size: 7,
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

      // Clustered node styling (Small, clean dots as requested)
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
        size: isSus ? 11 : 9,
        font: {
          color: '#e5e7eb',
          size: 11,
          face: 'JetBrains Mono, monospace',
          strokeWidth: 2,
          strokeColor: '#0b0f19',
        },
        color: {
          background: isSus ? '#ef4444' : '#6b7280',
          border: isSus ? '#f87171' : '#9ca3af',
          highlight: {
            background: isSus ? '#f87171' : '#9ca3af',
            border: '#ffffff',
          },
          hover: {
            background: isSus ? '#f87171' : '#9ca3af',
            border: '#ffffff',
          },
        },
        borderWidth: 1.5,
        borderWidthSelected: 3,
        shadow: isSus ? { enabled: true, color: 'rgba(239, 68, 68, 0.35)', size: 6 } : false,
      };
    });

    // Format edges for vis-network
    const edges = Array.from(edgeSet.values()).map((edge) => ({
      id: edge.id,
      from: edge.from,
      to: edge.to,
      width: edge.isSuspicious ? 1.5 : 1,
      color: {
        color: edge.isSuspicious ? 'rgba(239, 68, 68, 0.45)' : 'rgba(156, 163, 175, 0.25)',
        highlight: '#ef4444',
        hover: '#ef4444',
      },
      smooth: {
        type: 'continuous',
      },
    }));

    const data = { nodes, edges };

    // Original clean physics options
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
        enabled: true,
        solver: 'forceAtlas2Based',
        forceAtlas2Based: {
          gravitationalConstant: -30,
          centralGravity: 0.008,
          springLength: 75,
          springConstant: 0.08,
          damping: 0.4,
          avoidOverlap: 0.8,
        },
        maxVelocity: 50,
        minVelocity: 0.1,
        stabilization: {
          enabled: true,
          iterations: 150,
          updateInterval: 25,
        },
      },
      interaction: {
        hover: true,
        tooltipDelay: 100,
        selectable: true,
        selectConnectedEdges: false,
      },
    };

    // Instantiate vis-network
    const network = new Network(containerRef.current, data, options);
    networkRef.current = network;

    // Handle node selection
    network.on('selectNode', (params) => {
      if (params.nodes && params.nodes.length > 0) {
        const selectedId = params.nodes[0];
        if (onSelectAccount) {
          onSelectAccount(selectedId);
        }
      }
    });

    // Handle click on canvas background (deselect)
    network.on('deselectNode', () => {
      if (onSelectAccount) {
        onSelectAccount(null);
      }
    });

    // Draw cluster header pill badges on graph canvas safely above top-most node
    network.on('afterDrawing', (ctx) => {
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

        const matchedRing = ringMap.get(cluster.cluster_id);
        const clusterLabelText = matchedRing
          ? `${cluster.cluster_id.toUpperCase()} • ${matchedRing}`
          : cluster.cluster_id;

        const isSuspicious = cluster.flagged_suspicious;

        ctx.save();
        ctx.font = 'bold 10px JetBrains Mono, monospace';

        const textWidth = ctx.measureText(clusterLabelText).width;
        const paddingX = 8;
        const rectWidth = textWidth + paddingX * 2;
        const rectHeight = 18;

        const rectX = avgX - rectWidth / 2;
        // Position badge safely 24px above the top-most node in the cluster
        const rectY = minY - 24;

        // Badge Background Pill
        ctx.beginPath();
        const radius = 9;
        ctx.roundRect(rectX, rectY, rectWidth, rectHeight, radius);

        if (isSuspicious) {
          ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
          ctx.shadowColor = 'rgba(239, 68, 68, 0.4)';
          ctx.shadowBlur = 6;
        } else {
          ctx.fillStyle = 'rgba(31, 41, 55, 0.85)';
          ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
          ctx.shadowBlur = 4;
        }
        ctx.fill();

        ctx.strokeStyle = isSuspicious ? '#f87171' : '#6b7280';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Badge Text
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(clusterLabelText, avgX, rectY + rectHeight / 2);

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

  // Handle selectedAccountId highlight
  useEffect(() => {
    if (networkRef.current && selectedAccountId) {
      try {
        networkRef.current.selectNodes([selectedAccountId]);
      } catch (err) {
        // Node might not be present in current view mode
      }
    }
  }, [selectedAccountId]);

  return (
    <div className="graph-wrapper">
      <div ref={containerRef} className="vis-network-container" />
    </div>
  );
}
