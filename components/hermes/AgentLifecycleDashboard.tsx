'use client';

import { useEffect, useState } from 'react';
import type { AgentLifecycleState, AgentProfile } from '@/lib/hermes/agentLifecycle';
import {
  buildAgentLifecycleState,
  selectAgentByIdWithCollaborators,
  selectCollaborationNetwork,
  selectTopAgentsByContribution,
  emptyAgentLifecycleState,
} from '@/lib/hermes/agentLifecycle';
import { listSongs } from '@/lib/hermes/storage';
import styles from './hermes.module.css';

interface AgentLifecycleDashboardProps {
  selectedAgentId?: string;
  onSelectAgent?: (agentId: string) => void;
}

export default function AgentLifecycleDashboard({
  selectedAgentId,
  onSelectAgent,
}: AgentLifecycleDashboardProps) {
  const [state, setState] = useState<AgentLifecycleState>(emptyAgentLifecycleState);

  useEffect(() => {
    try {
      const songs = listSongs();
      if (songs && songs.length > 0) {
        const newState = buildAgentLifecycleState(songs);
        setState(newState);
      }
    } catch (err) {
      console.error('Failed to load agent lifecycle state:', err);
    }
  }, []);

  const topAgents = selectTopAgentsByContribution(state, 10);
  const detailedAgent =
    selectedAgentId ? selectAgentByIdWithCollaborators(state, selectedAgentId) : null;
  const collaborationEdges = selectCollaborationNetwork(state);

  return (
    <div className={styles.agentDashboard}>
      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <span className={styles.panelTitle}>Agent Lifecycle · Complete Histories</span>
          <span className={styles.tag}>{Object.keys(state.profiles).length} agents</span>
        </div>

        <div className={styles.agentRosterGrid}>
          {topAgents.map((agent) => (
            <AgentRosterCard
              key={agent.agentId}
              agent={agent}
              isSelected={selectedAgentId === agent.agentId}
              onClick={() => onSelectAgent?.(agent.agentId)}
            />
          ))}
        </div>
      </section>

      {detailedAgent && (
        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <span className={styles.panelTitle}>{detailedAgent.name} · Lifecycle Profile</span>
            {detailedAgent.milestone && (
              <span className={styles.tag}>{detailedAgent.milestone}</span>
            )}
          </div>

          <div className={styles.agentDetailGrid}>
            <div className={styles.metaSection}>
              <h3>Overview</h3>
              <div className={styles.metaRow}>
                <span className={styles.label}>Role</span>
                <span className={styles.value}>{detailedAgent.role}</span>
              </div>
              <div className={styles.metaRow}>
                <span className={styles.label}>Contributions</span>
                <span className={styles.value}>{detailedAgent.totalContributions}</span>
              </div>
            </div>

            {detailedAgent.collaboratorDetails && detailedAgent.collaboratorDetails.length > 0 && (
              <div className={styles.metaSection}>
                <h3>Collaborators ({detailedAgent.collaboratorDetails.length})</h3>
                <div className={styles.collaboratorList}>
                  {detailedAgent.collaboratorDetails.map((collab) => (
                    <div key={collab.agentId} className={styles.collaboratorChip}>
                      {collab.name}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {collaborationEdges.length > 0 && (
        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <span className={styles.panelTitle}>Collaboration Network</span>
            <span className={styles.tag}>{collaborationEdges.length}</span>
          </div>

          <div className={styles.collaborationTable}>
            <div className={styles.tableHead}>
              <div className={styles.tableCell}>Agent A</div>
              <div className={styles.tableCell}>Agent B</div>
              <div className={styles.tableCell}>Count</div>
            </div>
            {collaborationEdges.slice(0, 10).map((edge, i) => (
              <div key={i} className={styles.tableRow}>
                <div className={styles.tableCell}>{edge.agentAId}</div>
                <div className={styles.tableCell}>{edge.agentBId}</div>
                <div className={styles.tableCell}>{edge.strength}</div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

interface AgentRosterCardProps {
  agent: AgentProfile;
  isSelected?: boolean;
  onClick?: () => void;
}

function AgentRosterCard({ agent, isSelected, onClick }: AgentRosterCardProps) {
  return (
    <article
      className={`${styles.lifecycleCard} ${isSelected ? styles.selected : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick?.();
        }
      }}
    >
      <div className={styles.cardHeader}>
        <div className={styles.cardTitle}>{agent.name}</div>
        {agent.totalContributions > 0 && (
          <span className={styles.badge}>{agent.totalContributions}</span>
        )}
      </div>

      <div className={styles.cardSubtitle}>{agent.role}</div>

      {agent.averageQualityScore > 0 && (
        <div className={styles.cardMetric}>
          <span className={styles.metricLabel}>Quality</span>
          <span className={styles.metricValue}>{Math.round(agent.averageQualityScore)}/100</span>
        </div>
      )}

      {agent.collaborators.length > 0 && (
        <div className={styles.cardMetric}>
          <span className={styles.metricLabel}>Collaborators</span>
          <span className={styles.metricValue}>{agent.collaborators.length}</span>
        </div>
      )}

      {agent.milestone && (
        <div className={styles.cardFooter}>
          <span className={styles.milestone}>{agent.milestone}</span>
        </div>
      )}
    </article>
  );
}
