// Agent Lifecycle tracking — aggregates agent contributions across all songs
// in the vault to build persistent agent profiles and social graphs.
// Inspired by Foundry's BeaconState + selector pattern.

import type { SongPackage } from './types';
import { AGENT_DEFINITIONS } from './agents';

export interface AgentContribution {
  songId: string;
  agentId: string;
  role: string; // "orchestrator", "hook-designer", "lyricist", etc.
  personaUsed?: string; // which persona was the song written in
  qualityScore?: number; // 0-100 if available
  timestamp: string;
}

export interface CollaborationEdge {
  agentAId: string;
  agentBId: string;
  collaborationCount: number;
  lastCollaborated: string;
}

export interface AgentProfile {
  agentId: string;
  name: string;
  role: string;
  totalContributions: number;
  collaborators: string[]; // agent ids
  personaSpecialization: Record<string, number>; // persona id → average score
  averageQualityScore: number;
  firstContribution?: string;
  lastContribution?: string;
  milestone?: string;
}

export interface AgentLifecycleState {
  profiles: Record<string, AgentProfile>;
  contributions: AgentContribution[];
  collaborationGraph: Record<string, CollaborationEdge[]>; // agentId → [edges]
  lastUpdated: string;
}

export const emptyAgentLifecycleState: AgentLifecycleState = {
  profiles: {},
  contributions: [],
  collaborationGraph: {},
  lastUpdated: new Date().toISOString(),
};

// Initialize profiles for all HERMES agents
function initializeProfiles(): Record<string, AgentProfile> {
  const profiles: Record<string, AgentProfile> = {};
  for (const agent of AGENT_DEFINITIONS) {
    profiles[agent.id] = {
      agentId: agent.id,
      name: agent.name,
      role: agent.role,
      totalContributions: 0,
      collaborators: [],
      personaSpecialization: {},
      averageQualityScore: 0,
    };
  }
  return profiles;
}

// Build agent lifecycle state from a set of songs
export function buildAgentLifecycleState(songs: SongPackage[]): AgentLifecycleState {
  const profiles = initializeProfiles();
  const contributions: AgentContribution[] = [];
  const collaborationGraph: Record<string, CollaborationEdge[]> = {};

  for (const agent of AGENT_DEFINITIONS) {
    collaborationGraph[agent.id] = [];
  }

  // Scan through all songs and extract agent contributions
  for (const song of songs) {
    // Extract agents from agentOutputs if available, otherwise use all agents
    const agentsInSong = song.agentOutputs
      ? song.agentOutputs.map((ao) => ao.agentId).filter(Boolean)
      : AGENT_DEFINITIONS.map((a) => a.id);

    // Persona from inputs if available
    const personaUsed = song.inputs?.personaId;
    const timestamp = song.createdAt || new Date().toISOString();

    for (const agentId of agentsInSong) {
      const contribution: AgentContribution = {
        songId: song.id,
        agentId,
        role: 'contributor', // Will be more specific when we track per-agent roles
        personaUsed,
        timestamp,
      };
      contributions.push(contribution);

      // Update profile
      if (profiles[agentId]) {
        profiles[agentId].totalContributions++;
        if (!profiles[agentId].firstContribution) {
          profiles[agentId].firstContribution = timestamp;
        }
        profiles[agentId].lastContribution = timestamp;

        // Track persona specialization
        if (personaUsed) {
          profiles[agentId].personaSpecialization[personaUsed] =
            (profiles[agentId].personaSpecialization[personaUsed] || 0) + 1;
        }
      }
    }

    // Build collaboration edges (all agents in this song collaborated)
    for (let i = 0; i < agentsInSong.length; i++) {
      for (let j = i + 1; j < agentsInSong.length; j++) {
        const idA = agentsInSong[i];
        const idB = agentsInSong[j];
        recordCollaboration(collaborationGraph, idA, idB, timestamp);
      }
    }
  }

  // Finalize profiles with collaborators list and quality scores
  for (const agent of AGENT_DEFINITIONS) {
    const edges = collaborationGraph[agent.id] || [];
    profiles[agent.id].collaborators = edges.map((e) => e.agentBId);

    // Calculate average quality (placeholder for future scoring)
    const agentContribs = contributions.filter((c) => c.agentId === agent.id);
    if (agentContribs.length > 0) {
      const withScore = agentContribs.filter((c) => c.qualityScore !== undefined);
      if (withScore.length > 0) {
        profiles[agent.id].averageQualityScore =
          withScore.reduce((sum, c) => sum + (c.qualityScore || 0), 0) / withScore.length;
      }
    }

    // Compute milestones
    if (profiles[agent.id].totalContributions >= 10) {
      profiles[agent.id].milestone = `🏆 10+ songs`;
    } else if (profiles[agent.id].totalContributions >= 5) {
      profiles[agent.id].milestone = `⭐ 5+ songs`;
    }
  }

  return {
    profiles,
    contributions,
    collaborationGraph,
    lastUpdated: new Date().toISOString(),
  };
}

function recordCollaboration(
  graph: Record<string, CollaborationEdge[]>,
  agentAId: string,
  agentBId: string,
  timestamp: string,
) {
  if (!graph[agentAId]) graph[agentAId] = [];
  let edge = graph[agentAId].find((e) => e.agentBId === agentBId);
  if (!edge) {
    edge = {
      agentAId,
      agentBId,
      collaborationCount: 0,
      lastCollaborated: timestamp,
    };
    graph[agentAId].push(edge);
  }
  edge.collaborationCount++;
  edge.lastCollaborated = timestamp;
}

// Selectors (pure projections over AgentLifecycleState)

export function selectTopAgentsByContribution(
  state: AgentLifecycleState,
  limit = 5,
): AgentProfile[] {
  return Object.values(state.profiles)
    .sort((a, b) => b.totalContributions - a.totalContributions)
    .slice(0, limit);
}

export function selectAgentByIdWithCollaborators(
  state: AgentLifecycleState,
  agentId: string,
): (AgentProfile & { collaboratorDetails: AgentProfile[] }) | null {
  const profile = state.profiles[agentId];
  if (!profile) return null;

  const collaboratorDetails = profile.collaborators
    .map((id) => state.profiles[id])
    .filter(Boolean) as AgentProfile[];

  return {
    ...profile,
    collaboratorDetails,
  };
}

export function selectCollaborationNetwork(
  state: AgentLifecycleState,
): Array<{ agentAId: string; agentBId: string; strength: number }> {
  const edges: Array<{ agentAId: string; agentBId: string; strength: number }> = [];

  for (const [agentAId, collaborations] of Object.entries(state.collaborationGraph)) {
    for (const edge of collaborations) {
      edges.push({
        agentAId,
        agentBId: edge.agentBId,
        strength: edge.collaborationCount,
      });
    }
  }

  return edges.sort((a, b) => b.strength - a.strength);
}

export function selectAgentContributionTimeline(
  state: AgentLifecycleState,
  agentId: string,
): AgentContribution[] {
  return state.contributions
    .filter((c) => c.agentId === agentId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export function selectAgentStats(state: AgentLifecycleState) {
  return {
    totalAgents: Object.keys(state.profiles).length,
    totalSongs: state.contributions.length > 0 ? Math.max(...state.contributions.map(c => c.songId ? 1 : 0)) : 0,
    averageCollaborationsPerAgent: Object.values(state.profiles).reduce((sum, p) => sum + p.collaborators.length, 0) / Object.keys(state.profiles).length,
  };
}
