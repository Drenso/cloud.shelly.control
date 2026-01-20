import mitt, { type Emitter, type EventType } from 'mitt';

export function createMitt<Events extends Record<EventType, unknown>>(): Emitter<Events> {
  // @ts-expect-error Mitt default export is broken
  return mitt<Events>();
}
