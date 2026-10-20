import { Link } from 'react-router';
import shared from '#src/styles/shared.module.css';
import { cx } from '#src/styles/cx';
import styles from '#src/pages/SessionPage.module.css';

export function NotFound() {
  return (
    <main className={cx(shared.wrap)}>
      <h1 className={cx(styles.title)}>Scrum Poker</h1>
      <div className={cx(shared.panel)}>
        <p className={cx(styles.notFoundLead)}>Session not found</p>
        <p className={cx(shared.muted)}>
          It may have expired or the link may be wrong.
        </p>
        <Link to="/" className={cx(shared.buttonPrimary, styles.createLink)}>
          Create a new session
        </Link>
      </div>
    </main>
  );
}
