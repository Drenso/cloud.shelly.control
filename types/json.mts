export type JsonObject = {
  [key: string]: JsonValue;
};

export type JsonValue = JsonObject | JsonArray | string | number | boolean | null;

export type JsonArray = JsonValue[];

export type ReadonlyJsonObject = Readonly<{
  [key: string]: ReadonlyJsonValue;
}>;

export type ReadonlyJsonValue = ReadonlyJsonObject | ReadonlyJsonArray | string | number | boolean | null;

export type ReadonlyJsonArray = ReadonlyArray<ReadonlyJsonValue>;
