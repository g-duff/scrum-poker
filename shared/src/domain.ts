export interface Participant {
  id: string;
  sessionId: string;
  displayName: string;
  tokenHash: string;
  lastSeenAt: Date;
}

export interface Vote {
  sessionId: string;
  participantId: string;
  value: string;
}

// The whole session is stored as one in-memory object behind SessionStore
// (per the Architecture section), so participants and votes are nested
// here rather than kept in separate stores.
export interface Session {
  id: string;
  deck: string[];
  state: 'voting' | 'revealed';
  roundNumber: number;
  expiresAt: Date;
  participants: Participant[];
  votes: Vote[];
}

export interface SessionSnapshotParticipant {
  id: string;
  name: string;
  active: boolean;
  hasVoted: boolean;
  vote?: string;
}

export interface SessionSnapshot {
  id: string;
  round: number;
  state: 'voting' | 'revealed';
  deck: string[];
  participants: SessionSnapshotParticipant[];
  yourVote?: string;
}
