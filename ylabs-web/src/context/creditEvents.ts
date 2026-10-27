import type { InsufficientCreditsInfo } from "../services/creditService.ts";

type EventListener<T> = (data: T) => void;

class CreditEvents {
  private insufficientListeners: Set<EventListener<InsufficientCreditsInfo>> = new Set();
  private refreshListeners: Set<() => void> = new Set();

  onInsufficient(listener: EventListener<InsufficientCreditsInfo>) {
    this.insufficientListeners.add(listener);
    return () => {
      this.insufficientListeners.delete(listener);
    };
  }

  onRefresh(listener: () => void) {
    this.refreshListeners.add(listener);
    return () => {
      this.refreshListeners.delete(listener);
    };
  }

  emitInsufficient(info: InsufficientCreditsInfo) {
    this.insufficientListeners.forEach((fn) => {
      try {
        fn(info);
      } catch (e) {
        console.error("Error in insufficient credits listener:", e);
      }
    });
  }

  emitRefresh() {
    this.refreshListeners.forEach((fn) => {
      try {
        fn();
      } catch (e) {
        console.error("Error in refresh listener:", e);
      }
    });
  }
}

export const creditEvents = new CreditEvents();
