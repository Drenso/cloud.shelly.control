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

function parseDimmerEvent(buffer: Buffer, offset: number): [[BTHomeDimmerEvent, number], number] {
  const eventType = buffer.readUInt8(offset);
  const steps = buffer.readUInt8(offset + 1);
  return [[eventType, steps], 2];
}

const btHomeDataTypes = {
  uint8: { parse: (buffer, offset) => [buffer.readUInt8(offset), 1] },
  uint16: { parse: (buffer, offset) => [buffer.readUInt16LE(offset), 2] },
  uint24: { parse: (buffer, offset) => [buffer.readUInt8(offset) || buffer.readUInt16LE(offset + 1) << 8, 3] },
  uint32: { parse: (buffer, offset) => [buffer.readUint32LE(offset), 4] },
  int16: { parse: (buffer, offset) => [buffer.readInt16LE(offset), 2] },
  dimmerEvent: { parse: parseDimmerEvent },
} as const satisfies Record<string, BtHomeDataType>;

type BtHomeObject = {
  property: string;
  dataType: (typeof btHomeDataTypes)[keyof typeof btHomeDataTypes];
};

const btHomeObjects = {
  0x00: {
    property: 'packetId',
    dataType: btHomeDataTypes.uint8,
  },
  0x01: {
    property: 'battery',
    dataType: btHomeDataTypes.uint8,
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
  0x3a: {
    property: 'buttonEvent',
    dataType: btHomeDataTypes.uint8,
  },
  0x60: {
    property: 'channel',
    dataType: btHomeDataTypes.uint8,
  },
  0x3c: {
    property: 'dimmerEvent',
    dataType: btHomeDataTypes.dimmerEvent,
  },
  0x3f: {
    property: 'rotation',
    dataType: btHomeDataTypes.int16,
  },
} as const satisfies Record<number, BtHomeObject>;

export const enum BTHomeButtonEvent {
  None = 0x00,
  Press = 0x01,
  DoublePress = 0x02,
  TriplePress = 0x03,
  LongPress = 0x04,
  LongDoublePress = 0x05,
  LongTriplePress = 0x06,
  HoldPress = 0x80,
}

export const enum BTHomeDimmerEvent {
  None = 0x00,
  RotateLeft = 0x01,
  RotateRight = 0x02,
}

export type BTHomeData = {
  packetId?: number[];
  battery?: number[];
  deviceTypeId?: number[];
  firmwareVersion?: number[];
  buttonEvent?: BTHomeButtonEvent[];
  channel?: number[];
  dimmerEvent?: [BTHomeDimmerEvent, number][];
  rotation?: number[];
};

export function parseBtHomeServiceData(buffer: Buffer): BTHomeData {
  const parsed: Record<string, unknown> = {};

  let offset = 1;
  while (offset < buffer.length) {
    const btHomeObjectId = buffer.readUInt8(offset) as keyof typeof btHomeObjects;
    offset += 1;
    const btHomeObjectType = btHomeObjects[btHomeObjectId];
    if (btHomeObjectType === undefined) {
      throw new Error(`Unknown BTHome object: ${btHomeObjectId.toString(16)}`);
    }
    const btHomeDataType = btHomeObjectType.dataType;
    const [data, length] = btHomeDataType.parse(buffer, offset);
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
