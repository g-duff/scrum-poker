export interface SessionNotifier {
  notify(sessionId: string): Promise<void>;
  subscribe(sessionId: string, onChange: () => void): () => void;
}
