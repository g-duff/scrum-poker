import shared from '#src/styles/shared.module.css';
import { cx } from '#src/styles/cx';
import styles from '#src/pages/SessionPage.module.css';

export function CardPicker({
  deck,
  yourVote,
  error,
  onPick,
  onClear,
}: {
  deck: string[];
  yourVote: string | undefined;
  error: string | null;
  onPick: (card: string) => void;
  onClear: () => void;
}) {
  return (
    <section className={cx(shared.panel)}>
      <h2 className={cx(shared.sectionLabel)}>Pick a card</h2>
      <div className={cx(styles.cardGrid)}>
        {deck.map((card) => (
          <button
            key={card}
            type="button"
            className={cx(
              styles.card,
              card === yourVote ? styles.cardSelected : undefined,
            )}
            aria-pressed={card === yourVote}
            onClick={() => {
              onPick(card);
            }}
          >
            {card}
          </button>
        ))}
      </div>
      <div className={cx(shared.row, styles.cardFooter)}>
        <span className={cx(shared.muted)}>* = your pick</span>
        <button
          type="button"
          className={cx(shared.buttonSecondary)}
          disabled={yourVote === undefined}
          onClick={onClear}
        >
          Clear my vote
        </button>
      </div>
      {error !== null && (
        <p role="alert" className={cx(shared.note, shared.noteErr)}>
          {error}
        </p>
      )}
    </section>
  );
}
