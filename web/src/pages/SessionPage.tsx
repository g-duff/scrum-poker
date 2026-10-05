import { useParams } from 'react-router';

export function SessionPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <main>
      <h1>Scrum Poker</h1>
      <p>Session: {id}</p>
    </main>
  );
}
