export function getFromRecord<A extends string, B>(record: Partial<Record<A, B>>, item: string): B | undefined {
  if (item in record) {
    return record[item as A];
  } else return undefined;
}
