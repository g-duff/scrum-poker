import { describe, expect, it, vi } from 'vitest';
import { createInProcessSessionNotifier } from '#src/shell/inProcessSessionNotifier';

describe('createInProcessSessionNotifier', () => {
  it('calls a subscriber when its session is notified', async () => {
    const notifier = createInProcessSessionNotifier();
    const onChange = vi.fn();
    notifier.subscribe('s1', onChange);

    await notifier.notify('s1');

    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('does not call a subscriber for a different session', async () => {
    const notifier = createInProcessSessionNotifier();
    const onChange = vi.fn();
    notifier.subscribe('s1', onChange);

    await notifier.notify('s2');

    expect(onChange).not.toHaveBeenCalled();
  });

  it('calls every subscriber of a session', async () => {
    const notifier = createInProcessSessionNotifier();
    const first = vi.fn();
    const second = vi.fn();
    notifier.subscribe('s1', first);
    notifier.subscribe('s1', second);

    await notifier.notify('s1');

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('stops calling a subscriber once unsubscribed', async () => {
    const notifier = createInProcessSessionNotifier();
    const onChange = vi.fn();
    const unsubscribe = notifier.subscribe('s1', onChange);

    unsubscribe();
    await notifier.notify('s1');

    expect(onChange).not.toHaveBeenCalled();
  });

  it('unsubscribing twice does not throw', () => {
    const notifier = createInProcessSessionNotifier();
    const unsubscribe = notifier.subscribe('s1', vi.fn());

    unsubscribe();

    expect(() => {
      unsubscribe();
    }).not.toThrow();
  });

  it('notifying a session with no subscribers does not throw', async () => {
    const notifier = createInProcessSessionNotifier();

    await expect(notifier.notify('unknown')).resolves.toBeUndefined();
  });
});
