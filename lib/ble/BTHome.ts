export const ALTERCO_MANUFACTURER_ID = '0ba9';
export const BTHOME_SERVICE_ID = 'fcd2';

export const VERSION_CHECK_CALL =
  'if (typeof homey_ble_forward_script_version !== typeof undefined) {console.log(homey_ble_forward_script_version())} else {console.log(undefined)}';

export type BleForwardEventData = {
  /** Device MAC address */
  addr: string;
  /** Address type */
  addr_type: BleAddressType;
  /**
   * Advertisement data
   *
   * base64 encoded
   */
  advData: string;
  /**
   * Scan response (active scans)
   *
   * Empty string for passive scans
   */
  scanRsp: string;
  /** Signal strength */
  rssi: number;
  /** Advertisement flags */
  flags: number;
  /** Device name */
  local_name?: string;
  /** Manufacturer-specific data */
  manufacturer_data?: Record<string, string>;
  /** Advertised service UUIDs */
  service_uuids?: unknown[];
  /**
   * Service-specific data
   *
   * Values are base64 encoded
   */
  service_data: Record<string, string>;
  /** Transmit power */
  tx_power_level?: number;
};

const enum BleAddressType {
  PUBLIC = 0x1,
  RANDOM_STATIC = 0x2,
  RANDOM_NON_RESOLVABLE = 0x3,
  RANDOM_RESOLVABLE = 0x4,
}

type BtHomeDataType = { parse: (buffer: Buffer, offset: number) => [unknown, number] };

function parseText(buffer: Buffer, offset: number): [string, number] {
  const length = buffer.readUInt8(offset);
  offset += 1;
  const string = buffer.toString('utf8', offset, offset + length);
  return [string, length + 1];
}

function parseRaw(buffer: Buffer, offset: number): [Buffer, number] {
  const length = buffer.readUInt8(offset);
  offset += 1;
  const raw = Buffer.from(buffer.subarray(offset, offset + length));
  return [raw, length + 1];
}

export type BTHomeDimmerEvent = {
  direction: BTHomeDimmerEventType;
  steps: number;
};

function parseDimmerEvent(buffer: Buffer, offset: number): [BTHomeDimmerEvent, number] {
  const eventType = buffer.readUInt8(offset);
  const steps = buffer.readUInt8(offset + 1);
  return [{ direction: eventType, steps }, 2];
}

export type BTHomeCommandEvent =
  | {
      opcode: BTHomeCommandEventType.On | BTHomeCommandEventType.Off | BTHomeCommandEventType.Toggle;
      steps: undefined;
      arguments: undefined;
    }
  | {
      opcode: BTHomeCommandEventType.StepUp | BTHomeCommandEventType.StepDown;
      steps: number;
      arguments: undefined;
    }
  | {
      opcode: unknown;
      steps: undefined;
      arguments: Buffer;
    };

function parseCommand(buffer: Buffer, offset: number): [BTHomeCommandEvent, number] {
  const length = buffer.readUInt8(offset) & 0x1f;
  offset += 1;
  const opcode = buffer.readUInt8(offset) as BTHomeCommandEventType;
  offset += 1;
  if (
    opcode === BTHomeCommandEventType.On ||
    opcode === BTHomeCommandEventType.Off ||
    opcode === BTHomeCommandEventType.Toggle
  ) {
    return [{ opcode, steps: undefined, arguments: undefined }, length + 2];
  }
  if (opcode === BTHomeCommandEventType.StepUp || opcode === BTHomeCommandEventType.StepDown) {
    const steps = buffer.readUIntLE(offset, length);
    return [{ opcode, steps, arguments: undefined }, length + 2];
  }
  const args = Buffer.from(buffer.subarray(offset, offset + length));
  return [{ opcode, arguments: args, steps: undefined }, length + 2];
}

export const enum BTHomeLightLevel {
  Dark = 0,
  Twilight = 1,
  Bright = 2,
}

export const enum BTHomeButtonEventType {
  None = 0x00,
  Press = 0x01,
  DoublePress = 0x02,
  TriplePress = 0x03,
  LongPress = 0x04,
  LongDoublePress = 0x05,
  LongTriplePress = 0x06,
  HoldPress = 0x80,
  HoldPress2 = 0xfe, // for firmware prior to 1.0.20
}

export const enum BTHomeCommandEventType {
  Off = 0x00,
  On = 0x01,
  Toggle = 0x02,
  StepUp = 0x03,
  StepDown = 0x04,
}

export const enum BTHomeDimmerEventType {
  None = 0x00,
  RotateLeft = 0x01,
  RotateRight = 0x02,
}

const btHomeDataTypes = {
  uint8: { parse: (buffer, offset) => [buffer.readUInt8(offset), 1] },
  uint16: { parse: (buffer, offset) => [buffer.readUInt16LE(offset), 2] },
  uint24: { parse: (buffer, offset) => [buffer.readUIntLE(offset, 3), 3] },
  uint32: { parse: (buffer, offset) => [buffer.readUint32LE(offset), 4] },
  sint8: { parse: (buffer, offset) => [buffer.readInt8(offset), 1] },
  sint16: { parse: (buffer, offset) => [buffer.readInt16LE(offset), 2] },
  sint32: { parse: (buffer, offset) => [buffer.readInt32LE(offset), 4] },
  boolean: { parse: (buffer, offset) => [buffer.readInt8(offset) > 0, 1] },
  text: { parse: parseText },
  raw: { parse: parseRaw },
  lightLevel: { parse: (buffer, offset) => [buffer.readUInt8(offset) as BTHomeLightLevel, 1] },
  buttonEvent: { parse: (buffer, offset) => [buffer.readUInt8(offset) as BTHomeButtonEventType, 1] },
  dimmerEvent: { parse: parseDimmerEvent },
  commandEvent: { parse: parseCommand },
} as const satisfies Record<string, BtHomeDataType>;

export type BTHomeData = {
  [id in keyof typeof btHomeObjects as (typeof btHomeObjects)[id]['property']]?: Array<
    ReturnType<(typeof btHomeObjects)[id]['dataType']['parse']>[0]
  >;
};

export function parseBtHomeServiceData(buffer: Buffer): BTHomeData {
  const parsed: Record<string, unknown> = {};

  let offset = 1;
  while (offset < buffer.length) {
    const btHomeObjectId = buffer.readUInt8(offset) as keyof typeof btHomeObjects;
    offset += 1;
    const btHomeObjectType = btHomeObjects[btHomeObjectId] as BtHomeObject;
    if (btHomeObjectType === undefined) {
      throw new Error(`Unknown BTHome object: ${btHomeObjectId.toString(16)}`);
    }
    const btHomeDataType = btHomeObjectType.dataType;
    const [rawData, length] = btHomeDataType.parse(buffer, offset);
    const data = btHomeObjectType.factor === undefined ? rawData : (rawData as number) * btHomeObjectType.factor;
    const property = btHomeObjectType.property;
    const currentData = parsed[property];

    if (currentData === undefined) {
      parsed[property] = [data];
    } else {
      (currentData as unknown[]).push(data);
    }

    offset += length;
  }

  return parsed;
}

export function parseBleForward(data: BleForwardEventData): BTHomeData | undefined {
  const btHomeServiceData = data.service_data[BTHOME_SERVICE_ID];
  if (btHomeServiceData === undefined) {
    return undefined;
  }

  return parseBtHomeServiceData(Buffer.from(btHomeServiceData, 'base64'));
}

export function handleBleForward(data: BleForwardEventData): void {
  const advData = Buffer.from(data.advData, 'base64');
  const scanRsp = Buffer.from(data.scanRsp, 'base64');
  const manufacturerData: Record<string, Buffer> = {};
  for (const manufacturer in data.manufacturer_data) {
    manufacturerData[manufacturer] = Buffer.from(data.manufacturer_data[manufacturer], 'base64');
  }
  const serviceData: Record<string, Buffer> = {};
  for (const service in data.service_data) {
    serviceData[service] = Buffer.from(data.service_data[service], 'base64');
  }
  const btHomeServiceData = serviceData[BTHOME_SERVICE_ID];
  console.log(advData, scanRsp, manufacturerData, serviceData);
  if (btHomeServiceData === undefined) {
    return;
  }
  try {
    const parsedBtHomeServiceData = parseBtHomeServiceData(btHomeServiceData);
    console.log(parsedBtHomeServiceData);
  } catch (e) {
    console.error('Error while parsing BTHome data:', e);
  }
}

type BtHomeObject = {
  property: string;
  dataType: (typeof btHomeDataTypes)[keyof typeof btHomeDataTypes];
  factor?: number;
  unit?: string;
};

const btHomeObjects = {
  0x51: {
    property: 'acceleration',
    dataType: btHomeDataTypes.uint16,
    factor: 0.001,
    unit: 'm/s²',
  },
  0x63: {
    property: 'acceleration',
    dataType: btHomeDataTypes.sint32,
    factor: 0.000001,
    unit: 'm/s²',
  },
  0x01: {
    property: 'battery',
    dataType: btHomeDataTypes.uint8,
    unit: '%',
  },
  0x60: {
    property: 'channel',
    dataType: btHomeDataTypes.uint8,
  },
  0x12: {
    property: 'co2',
    dataType: btHomeDataTypes.uint16,
    unit: 'ppm',
  },
  0x56: {
    property: 'conductivity',
    dataType: btHomeDataTypes.uint16,
    unit: 'µS/cm',
  },
  0x09: {
    property: 'count',
    dataType: btHomeDataTypes.uint8,
  },
  0x3d: {
    property: 'count',
    dataType: btHomeDataTypes.uint16,
  },
  0x3e: {
    property: 'count',
    dataType: btHomeDataTypes.uint32,
  },
  0x59: {
    property: 'count',
    dataType: btHomeDataTypes.sint8,
  },
  0x5a: {
    property: 'count',
    dataType: btHomeDataTypes.sint16,
  },
  0x5b: {
    property: 'count',
    dataType: btHomeDataTypes.sint32,
  },
  0x43: {
    property: 'current',
    dataType: btHomeDataTypes.uint16,
    factor: 0.001,
    unit: 'A',
  },
  0x5d: {
    property: 'current',
    dataType: btHomeDataTypes.sint16,
    factor: 0.001,
    unit: 'A',
  },
  0x08: {
    property: 'dewpoint',
    dataType: btHomeDataTypes.sint16,
    factor: 0.01,
    unit: '°C',
  },
  0x5e: {
    property: 'direction',
    dataType: btHomeDataTypes.uint16,
    factor: 0.01,
    unit: '°',
  },
  0x40: {
    property: 'distance',
    dataType: btHomeDataTypes.uint16,
    unit: 'mm',
  },
  0x41: {
    property: 'distance',
    dataType: btHomeDataTypes.uint16,
    factor: 0.1,
    unit: 'm',
  },
  0x42: {
    property: 'duration',
    dataType: btHomeDataTypes.uint24,
    factor: 0.001,
    unit: 's',
  },
  0x4d: {
    property: 'energy',
    dataType: btHomeDataTypes.uint32,
    factor: 0.001,
    unit: 'kWh',
  },
  0x0a: {
    property: 'energy',
    dataType: btHomeDataTypes.uint24,
    factor: 0.001,
    unit: 'kWh',
  },
  0x4b: {
    property: 'gas',
    dataType: btHomeDataTypes.uint24,
    factor: 0.001,
    unit: 'm3',
  },
  0x4c: {
    property: 'gas',
    dataType: btHomeDataTypes.uint32,
    factor: 0.001,
    unit: 'm3',
  },
  0x52: {
    property: 'gyroscope',
    dataType: btHomeDataTypes.uint16,
    factor: 0.001,
    unit: '°/s',
  },
  0x03: {
    property: 'humidity',
    dataType: btHomeDataTypes.uint16,
    factor: 0.01,
    unit: '%',
  },
  0x2e: {
    property: 'humidity',
    dataType: btHomeDataTypes.uint8,
    unit: '%',
  },
  0x05: {
    property: 'illuminance',
    dataType: btHomeDataTypes.uint24,
    factor: 0.01,
    unit: 'lx',
  },
  0x64: {
    property: 'lightLevel',
    dataType: btHomeDataTypes.lightLevel,
  },
  0x06: {
    property: 'mass',
    dataType: btHomeDataTypes.uint16,
    factor: 0.01,
    unit: 'kg',
  },
  0x07: {
    property: 'mass',
    dataType: btHomeDataTypes.uint16,
    factor: 0.01,
    unit: 'lb',
  },
  0x14: {
    property: 'moisture',
    dataType: btHomeDataTypes.uint16,
    factor: 0.01,
    unit: '%',
  },
  0x2f: {
    property: 'moisture',
    dataType: btHomeDataTypes.uint8,
    unit: '%',
  },
  0x0d: {
    property: 'pm2.5',
    dataType: btHomeDataTypes.uint16,
    unit: 'µg/m³',
  },
  0x0e: {
    property: 'pm10',
    dataType: btHomeDataTypes.uint16,
    unit: 'µg/m³',
  },
  0x0b: {
    property: 'power',
    dataType: btHomeDataTypes.uint24,
    factor: 0.01,
    unit: 'W',
  },
  0x5c: {
    property: 'power',
    dataType: btHomeDataTypes.sint32,
    factor: 0.01,
    unit: 'W',
  },
  0x5f: {
    property: 'precipitation',
    dataType: btHomeDataTypes.uint16,
    factor: 0.1,
    unit: 'mm',
  },
  0x04: {
    property: 'pressure',
    dataType: btHomeDataTypes.uint24,
    factor: 0.01,
    unit: 'hPa',
  },
  0x54: {
    property: 'raw',
    dataType: btHomeDataTypes.raw,
  },
  0x3f: {
    property: 'rotation',
    dataType: btHomeDataTypes.sint16,
    factor: 0.1,
    unit: '°',
  },
  0x61: {
    property: 'rotationalSpeed',
    dataType: btHomeDataTypes.uint16,
    unit: 'rpm',
  },
  0x65: {
    property: 'settingsRevision',
    dataType: btHomeDataTypes.uint8,
  },
  0x44: {
    property: 'speed',
    dataType: btHomeDataTypes.uint16,
    factor: 0.01,
    unit: 'm/s',
  },
  0x62: {
    property: 'speed',
    dataType: btHomeDataTypes.sint32,
    factor: 0.000001,
    unit: 'm/s',
  },
  0x57: {
    property: 'temperature',
    dataType: btHomeDataTypes.sint8,
    unit: '°C',
  },
  0x58: {
    property: 'temperature',
    dataType: btHomeDataTypes.sint8,
    factor: 0.35,
    unit: '°C',
  },
  0x45: {
    property: 'temperature',
    dataType: btHomeDataTypes.sint16,
    factor: 0.1,
    unit: '°C',
  },
  0x02: {
    property: 'temperature',
    dataType: btHomeDataTypes.sint16,
    factor: 0.01,
    unit: '°C',
  },
  0x53: {
    property: 'text',
    dataType: btHomeDataTypes.text,
  },
  0x50: {
    property: 'timestamp',
    dataType: btHomeDataTypes.uint32,
  },
  0x13: {
    property: 'tvoc',
    dataType: btHomeDataTypes.uint16,
    unit: 'µg/m³',
  },
  0x0c: {
    property: 'voltage',
    dataType: btHomeDataTypes.uint16,
    factor: 0.001,
    unit: 'V',
  },
  0x4a: {
    property: 'voltage',
    dataType: btHomeDataTypes.uint16,
    factor: 0.1,
    unit: 'V',
  },
  0x4e: {
    property: 'volume',
    dataType: btHomeDataTypes.uint32,
    factor: 0.001,
    unit: 'L',
  },
  0x47: {
    property: 'volume',
    dataType: btHomeDataTypes.uint16,
    factor: 0.1,
    unit: 'L',
  },
  0x48: {
    property: 'volume',
    dataType: btHomeDataTypes.uint16,
    unit: 'mL',
  },
  0x55: {
    property: 'volumeStorage',
    dataType: btHomeDataTypes.uint32,
    factor: 0.001,
    unit: 'L',
  },
  0x49: {
    property: 'volumeFlowrate',
    dataType: btHomeDataTypes.uint16,
    factor: 0.001,
    unit: 'm³/hr',
  },
  0x46: {
    property: 'uvIndex',
    dataType: btHomeDataTypes.uint8,
    factor: 0.1,
  },
  0x4f: {
    property: 'water',
    dataType: btHomeDataTypes.uint32,
    factor: 0.001,
    unit: 'L',
  },
  0x15: {
    property: 'battery',
    dataType: btHomeDataTypes.boolean,
  },
  0x16: {
    property: 'batteryCharging',
    dataType: btHomeDataTypes.boolean,
  },
  0x17: {
    property: 'carbonMonoxide',
    dataType: btHomeDataTypes.boolean,
  },
  0x18: {
    property: 'cold',
    dataType: btHomeDataTypes.boolean,
  },
  0x19: {
    property: 'connectivity',
    dataType: btHomeDataTypes.boolean,
  },
  0x1a: {
    property: 'door',
    dataType: btHomeDataTypes.boolean,
  },
  0x1b: {
    property: 'garageDoor',
    dataType: btHomeDataTypes.boolean,
  },
  0x1c: {
    property: 'gas',
    dataType: btHomeDataTypes.boolean,
  },
  0x0f: {
    property: 'genericBoolean',
    dataType: btHomeDataTypes.boolean,
  },
  0x1d: {
    property: 'heat',
    dataType: btHomeDataTypes.boolean,
  },
  0x1e: {
    property: 'light',
    dataType: btHomeDataTypes.boolean,
  },
  0x1f: {
    property: 'lock',
    dataType: btHomeDataTypes.boolean,
  },
  0x20: {
    property: 'moisture',
    dataType: btHomeDataTypes.boolean,
  },
  0x21: {
    property: 'motion',
    dataType: btHomeDataTypes.boolean,
  },
  0x22: {
    property: 'moving',
    dataType: btHomeDataTypes.boolean,
  },
  0x23: {
    property: 'occupancy',
    dataType: btHomeDataTypes.boolean,
  },
  0x11: {
    property: 'opening',
    dataType: btHomeDataTypes.boolean,
  },
  0x24: {
    property: 'plug',
    dataType: btHomeDataTypes.boolean,
  },
  0x10: {
    property: 'power',
    dataType: btHomeDataTypes.boolean,
  },
  0x25: {
    property: 'presence',
    dataType: btHomeDataTypes.boolean,
  },
  0x26: {
    property: 'problem',
    dataType: btHomeDataTypes.boolean,
  },
  0x27: {
    property: 'running',
    dataType: btHomeDataTypes.boolean,
  },
  0x28: {
    property: 'safety',
    dataType: btHomeDataTypes.boolean,
  },
  0x29: {
    property: 'smoke',
    dataType: btHomeDataTypes.boolean,
  },
  0x2a: {
    property: 'sound',
    dataType: btHomeDataTypes.boolean,
  },
  0x2b: {
    property: 'tamper',
    dataType: btHomeDataTypes.boolean,
  },
  0x2c: {
    property: 'vibration',
    dataType: btHomeDataTypes.boolean,
  },
  0x2d: {
    property: 'window',
    dataType: btHomeDataTypes.boolean,
  },
  0x3a: {
    property: 'buttonEvent',
    dataType: btHomeDataTypes.buttonEvent,
  },
  0x3b: {
    property: 'commandEvent',
    dataType: btHomeDataTypes.commandEvent,
  },
  0x3c: {
    property: 'dimmerEvent',
    dataType: btHomeDataTypes.dimmerEvent,
  },
  0xf0: {
    property: 'deviceTypeId',
    dataType: btHomeDataTypes.uint16,
  },
  0xf1: {
    property: 'firmwareVersion',
    dataType: btHomeDataTypes.uint32,
  },
  0xf2: {
    property: 'firmwareVersion',
    dataType: btHomeDataTypes.uint24,
  },
  0x00: {
    property: 'packetId',
    dataType: btHomeDataTypes.uint8,
  },
} as const satisfies Record<number, BtHomeObject>;
