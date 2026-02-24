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

// Source - https://stackoverflow.com/a/41980288
// Posted by Meirion Hughes, modified by community. See post 'Timeline' for change history
// Retrieved 2026-02-24, License - CC BY-SA 4.0
export type RecursivePartial<T, AllowedPrimitives> = {
  [P in keyof T]?: T[P] extends Array<infer U> ? Array<Value<U, AllowedPrimitives>> : Value<T[P], AllowedPrimitives>;
};
type Value<T, AllowedPrimitives> = T extends AllowedPrimitives ? T : RecursivePartial<T, AllowedPrimitives>;
