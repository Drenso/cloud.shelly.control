import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';

export type EnergyMeterGetCTTypesResponse = {
  supported: string[];
};

/**
 * Obtain list of supported current transformer types
 */
export default async function GetCTTypes(
  channel: RpcChannel,
  id: number,
): Promise<ResponseSuccessFrame<EnergyMeterGetCTTypesResponse>> {
  const requestFrame = createRequestFrame('EM.GetCTTypes', { id });
  return channel.sendRequestFrame(requestFrame);
}
