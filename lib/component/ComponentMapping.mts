import Switch from './components/Switch.mjs';

export const ComponentWithIdMapping = { switch: Switch } as const;
export const ComponentWithoutIdMapping = {} as const;

export const ComponentMapping = {
  ...ComponentWithIdMapping,
  ...ComponentWithoutIdMapping,
} as const;

export type MappedComponent = (typeof ComponentMapping)[keyof typeof ComponentMapping];
