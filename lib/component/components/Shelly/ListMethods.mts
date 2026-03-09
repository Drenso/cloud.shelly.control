import type { RpcChannel } from '../../../rpc/channel/RpcChannel.mjs';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.mjs';

type NamespaceMethodMapping = {
  Switch: ['Set', 'Toggle', 'SetConfig', 'GetConfig', 'GetStatus', 'ResetCounters'];
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
  Ws: ['SetConfig', 'GetConfig', 'GetStatus'];
  POWERSTRIP_UI: ['SetConfig', 'GetConfig', 'GetStatus'];
  Temperature: ['GetConfig', 'SetConfig', 'GetStatus'];
  Input: ['SetConfig', 'GetConfig', 'GetStatus', 'CheckExpression', 'ResetCounters', 'Trigger'];
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
