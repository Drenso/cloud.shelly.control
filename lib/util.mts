import mitt, { type Emitter, type EventType } from 'mitt';
import type { JsonObject, JsonValue } from '../types/json.mjs';

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

// Source - https://stackoverflow.com/a/66605669
// Posted by Voskanyan David
// Retrieved 2026-03-16, License - CC BY-SA 4.0
type Only<T, U> = {
  [P in keyof T]: T[P];
} & {
  [P in keyof U]?: never;
};

export type Either<T, U> = Only<T, U> | Only<U, T>;
export type Either3<T, U, V> = Only<T, U & V> | Only<U, T & V> | Only<V, T & U>;
export type Either4<T, U, V, X> = Only<T, U & V & X> | Only<U, T & V & X> | Only<V, T & U & X> | Only<X, T & U & V>;
export type Either5<T, U, V, X, Y> = Only<T, U & V & X & Y> | Only<U, T & V & X & Y> | Only<V, T & U & X & Y> | Only<X, T & U & V & Y> | Only<Y, T & U & V & X>;

export function fillStringTemplateTags(template: string, tags: Record<string, string>): string {
  let filledTemplate = template;
  for (const [tag, value] of Object.entries(tags)) {
    filledTemplate = filledTemplate.replace(`__${tag}__`, value);
  }
  return filledTemplate;
}

export function fillTranslationTagsRecursively(capabilityOptions: JsonValue, tags: Record<string, string>): JsonValue {
  if (typeof capabilityOptions !== 'object' || capabilityOptions === null) {
    if (typeof capabilityOptions === 'string') {
      return fillStringTemplateTags(capabilityOptions, tags);
    } else {
      return capabilityOptions;
    }
  }

  if (Array.isArray(capabilityOptions)) {
    return capabilityOptions.map(arrayValue => fillTranslationTagsRecursively(arrayValue, tags));
  }

  const filledCapabilityOptions: JsonObject = {};

  for (const capabilityOptionsKey in capabilityOptions) {
    filledCapabilityOptions[capabilityOptionsKey] = fillTranslationTagsRecursively(
      capabilityOptions[capabilityOptionsKey],
      tags,
    );
  }

  return filledCapabilityOptions;
}

export function translate(
  locale: string,
  template:
    | string
    | {
        en: string;
        [locale: string]: string;
      },
  tags: Record<string, string> = {},
): string {
  if (typeof template === 'string') {
    return fillStringTemplateTags(template, tags);
  }
  const templateString = template[locale] ?? template['en'];
  return fillStringTemplateTags(templateString, tags);
}

export function deepMerge(destination: Record<string, unknown>, source: Record<string, unknown>): object {
  const result = { ...destination };
  for (const key in source) {
    if (
      source[key] !== undefined &&
      typeof source[key] === 'object' &&
      source[key] !== null &&
      !Array.isArray(source[key])
    ) {
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
    if (value !== undefined && typeof value === 'object' && value !== null && !Array.isArray(value)) {
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

export function includesAny<T>(changedKeys: Array<keyof T>, anyOf: Array<keyof T>): boolean {
  return anyOf.some(key => changedKeys.includes(key));
}
