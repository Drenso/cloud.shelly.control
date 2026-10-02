import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { EnergyMeterConfig } from '../EnergyMeter.js';

/**
 * Obtain the component's configuration
 */
export default async function GetConfig(
  channel: RpcChannel,
  id: number,
): Promise<ResponseSuccessFrame<EnergyMeterConfig>> {
  const requestFrame = createRequestFrame('EM.GetConfig', { id });
  return channel.sendRequestFrame(requestFrame);
}
