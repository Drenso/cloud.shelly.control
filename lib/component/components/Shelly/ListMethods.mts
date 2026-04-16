import type { RpcChannel } from '../../../rpc/channel/RpcChannel.mjs';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.mjs';

type NamespaceMethodMapping = {
  CCT: ['GetConfig', 'SetConfig', 'GetStatus', 'Set', 'Toggle', 'DimUp', 'DimDown', 'DimStop'];
  Cover: ['SetConfig', 'GetConfig', 'GetStatus', 'Calibrate', 'Open', 'Close', 'Stop', 'GoToPosition', 'ResetCounters'];
  DevicePower: ['SetConfig', 'GetConfig', 'GetStatus'];
  Flood: ['SetConfig', 'GetConfig', 'GetStatus'];
  Illuminance: ['GetConfig', 'SetConfig', 'GetStatus'];
  Input: ['SetConfig', 'GetConfig', 'GetStatus', 'CheckExpression', 'ResetCounters', 'Trigger'];
  Light: [
    'GetConfig',
    'SetConfig',
    'GetStatus',
    'Set',
    'Toggle',
    'DimUp',
    'DimDown',
    'DimStop',
    'SetAll',
    'Calibrate',
    'ResetCounters',
  ];
  POWERSTRIP_UI: ['SetConfig', 'GetConfig', 'GetStatus'];
  Presence: ['SetConfig', 'GetConfig', 'GetStatus', 'AddZone', 'DeleteZone', 'TiltCalibrate', 'LiveTrack', 'SetSensor'];
  PresenceZone: ['SetConfig', 'GetConfig', 'GetStatus'];
  RGBCCT: ['GetConfig', 'SetConfig', 'GetStatus', 'Set', 'Toggle', 'DimUp', 'DimDown', 'DimStop'];
  Switch: ['Set', 'Toggle', 'SetConfig', 'GetConfig', 'GetStatus', 'ResetCounters'];
  Sys: ['SetConfig', 'GetConfig', 'GetStatus', 'SetTime'];
  Temperature: ['GetConfig', 'SetConfig', 'GetStatus'];
  Ws: ['SetConfig', 'GetConfig', 'GetStatus'];
};

export type NameSpace = keyof NamespaceMethodMapping;
export type ComponentMethod<Namespace extends NameSpace> = NamespaceMethodMapping[Namespace][number];
export type NamespaceMethod<Namespace extends NameSpace> = `${Namespace}:${NamespaceMethodMapping[Namespace][number]}`;
export type Method = NamespaceMethod<NameSpace>;

type ShellyListMethodsResponse = {
  // Names of the methods allowed
  methods: Method[];
};

/**
 * This method lists all available RPC methods.
 * It takes into account both ACL and authentication restrictions and only lists the methods allowed
 * for the particular user/channel that's making the request.
 */
export default async function ListMethods(
  channel: RpcChannel,
): Promise<ResponseSuccessFrame<ShellyListMethodsResponse>> {
  const requestFrame = createRequestFrame('Shelly.ListMethods');
  return channel.sendRequestFrame(requestFrame);
}
