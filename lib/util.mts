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

export function deepMerge(destination: Record<string, unknown>, source: Record<string, unknown>): object {
  const result = { ...destination };
  for (const key in source) {
    if (source[key] !== undefined && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge((result[key] ?? {}) as Record<string, unknown>, source[key] as Record<string, unknown>);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

export function deepAssign<T, AllowedPrimitives>(
  destination: RecursivePartial<T, AllowedPrimitives>,
  source: RecursivePartial<T, AllowedPrimitives>,
): void {
  for (const key in source) {
    const value = source[key];
    if (value !== undefined && typeof value === 'object' && !Array.isArray(value)) {
      (destination[key] as RecursivePartial<T[typeof key], AllowedPrimitives>) ??= {};
      deepAssign(
        destination[key] as RecursivePartial<T[typeof key], AllowedPrimitives>,
        source[key] as RecursivePartial<T[typeof key], AllowedPrimitives>,
      );
    } else {
      destination[key] = source[key];
    }
  }
}
