import mitt, { type Emitter, type EventType } from 'mitt';

export function createMitt<Events extends Record<EventType, unknown>>(): Emitter<Events> {
  // @ts-expect-error Mitt default export is broken
  return mitt<Events>();
}

// Source - https://stackoverflow.com/a
// Posted by jcalz, modified by community. See post 'Timeline' for change history
// Retrieved 2026-01-26, License - CC BY-SA 4.0
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type UnionToIntersection<U> = (U extends any ? (x: U) => void : never) extends (x: infer I) => void ? I : never;
