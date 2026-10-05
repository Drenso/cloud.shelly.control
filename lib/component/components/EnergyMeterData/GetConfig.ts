import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { EnergyMeterDataConfig } from '../EnergyMeterData.js';

/**
 * Obtain the component's configuration
 */
export default async function GetConfig(
  channel: RpcChannel,
  id: number,
): Promise<ResponseSuccessFrame<EnergyMeterDataConfig>> {
  const requestFrame = createRequestFrame('EMData.GetConfig', { id });
  return channel.sendRequestFrame(requestFrame);
}
