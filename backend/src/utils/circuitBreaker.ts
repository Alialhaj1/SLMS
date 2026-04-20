/**
 * §13.4.1 — Circuit Breaker Utility
 *
 * Protects external service calls from cascading failures.
 * Implements the circuit breaker pattern in-process (no external deps).
 *
 * States: CLOSED → OPEN → HALF_OPEN → CLOSED
 *
 * Usage:
 *   const breaker = new CircuitBreaker('payment-api', { failureThreshold: 5 });
 *   const result = await breaker.execute(() => axios.get('https://...'));
 */

import { logger } from '../utils/logger';

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  /** Number of consecutive failures before opening circuit (default: 5) */
  failureThreshold?: number;
  /** Time in ms to wait before trying again (default: 30000) */
  resetTimeoutMs?: number;
  /** Number of successful calls in HALF_OPEN to close the circuit (default: 2) */
  successThreshold?: number;
  /** Timeout for individual calls in ms (default: 10000) */
  callTimeoutMs?: number;
  /** Callback when state changes */
  onStateChange?: (name: string, from: CircuitState, to: CircuitState) => void;
}

export class CircuitBreaker {
  readonly name: string;
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime = 0;
  private readonly options: Required<CircuitBreakerOptions>;

  constructor(name: string, options: CircuitBreakerOptions = {}) {
    this.name = name;
    this.options = {
      failureThreshold: options.failureThreshold ?? 5,
      resetTimeoutMs: options.resetTimeoutMs ?? 30_000,
      successThreshold: options.successThreshold ?? 2,
      callTimeoutMs: options.callTimeoutMs ?? 10_000,
      onStateChange: options.onStateChange ?? (() => {}),
    };
  }

  /**
   * Execute a function through the circuit breaker.
   * Throws CircuitOpenError if circuit is open.
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      // Check if enough time has passed to try again
      if (Date.now() - this.lastFailureTime >= this.options.resetTimeoutMs) {
        this.transition('HALF_OPEN');
      } else {
        throw new CircuitOpenError(this.name);
      }
    }

    try {
      const result = await this.withTimeout(fn(), this.options.callTimeoutMs);
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Get current circuit state and metrics.
   */
  getStatus(): {
    name: string;
    state: CircuitState;
    failureCount: number;
    successCount: number;
    lastFailureTime: number;
  } {
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
    };
  }

  /**
   * Manually reset the circuit breaker.
   */
  reset(): void {
    this.transition('CLOSED');
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
  }

  // ─── Internal ──────────────────────────────────────────────────────────────

  private onSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= this.options.successThreshold) {
        this.transition('CLOSED');
        this.failureCount = 0;
        this.successCount = 0;
      }
    } else {
      // Reset failure count on success in CLOSED state
      this.failureCount = 0;
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === 'HALF_OPEN') {
      // Any failure in HALF_OPEN goes back to OPEN
      this.transition('OPEN');
      this.successCount = 0;
    } else if (this.failureCount >= this.options.failureThreshold) {
      this.transition('OPEN');
    }
  }

  private transition(newState: CircuitState): void {
    if (this.state !== newState) {
      const oldState = this.state;
      this.state = newState;
      logger.warn('Circuit breaker state change', {
        name: this.name,
        from: oldState,
        to: newState,
        failureCount: this.failureCount,
      });
      this.options.onStateChange(this.name, oldState, newState);
    }
  }

  private withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Circuit breaker "${this.name}": call timed out after ${ms}ms`));
      }, ms);

      promise
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(err => {
          clearTimeout(timer);
          reject(err);
        });
    });
  }
}

/**
 * Error thrown when circuit is open.
 */
export class CircuitOpenError extends Error {
  constructor(public readonly circuitName: string) {
    super(`Circuit breaker "${circuitName}" is OPEN — request rejected`);
    this.name = 'CircuitOpenError';
  }
}

// ─── Global Circuit Breaker Registry ─────────────────────────────────────────

const registry = new Map<string, CircuitBreaker>();

/**
 * Get or create a named circuit breaker.
 */
export function getCircuitBreaker(name: string, options?: CircuitBreakerOptions): CircuitBreaker {
  let breaker = registry.get(name);
  if (!breaker) {
    breaker = new CircuitBreaker(name, options);
    registry.set(name, breaker);
  }
  return breaker;
}

/**
 * Get all circuit breaker statuses (for monitoring).
 */
export function getAllCircuitBreakerStatuses(): Array<ReturnType<CircuitBreaker['getStatus']>> {
  return Array.from(registry.values()).map(b => b.getStatus());
}
