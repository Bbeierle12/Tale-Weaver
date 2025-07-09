/**
 * @fileOverview Implements an event-based decoupling system for agent–world
 * interactions in a TypeScript simulation engine.
 */

import type { Agent } from '@/Agent';

// 1) Define common event types and payloads
export type SimulationEvent =
  | { type: 'birth'; payload: { parent: Agent } }
  | { type: 'death'; payload: { agent: Agent } }
  | {
      type: 'food-consumed';
      payload: { agent: Agent; amount: number; x: number; y: number };
    };

// 2) Event handler signature
export type EventHandler<E extends SimulationEvent> = (event: E) => void;

// 3) SimulationEventBus: publish/subscribe
export class SimulationEventBus {
  private handlers: {
    [K in SimulationEvent['type']]?: EventHandler<
      Extract<SimulationEvent, { type: K }>
    >[];
  } = {};

  /**
   * Subscribe to a specific event type
   */
  on<T extends SimulationEvent['type']>(
    type: T,
    handler: EventHandler<Extract<SimulationEvent, { type: T }>>,
  ): void {
    if (!this.handlers[type]) this.handlers[type] = [];
    (this.handlers[type] as any[]).push(handler);
  }

  /**
   * Unsubscribe all handlers for a given type or all types.
   */
  off<T extends SimulationEvent['type']>(type?: T): void {
    if (type) {
      delete this.handlers[type];
    } else {
      this.handlers = {};
    }
  }

  /**
   * Publish an event to all subscribers
   */
  emit<E extends SimulationEvent>(event: E): void {
    const list = this.handlers[event.type] as EventHandler<E>[] | undefined;
    if (!list) return;
    for (const handler of list) {
      handler(event);
    }
  }
}
