import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { TemperatureConfig } from '../Temperature.js';

/**
 * Obtain the component's configuration
 */
export default async function GetConfig(
  channel: RpcChannel,
  id: number,
): Promise<ResponseSuccessFrame<TemperatureConfig>> {
  const requestFrame = createRequestFrame('Temperature.GetConfig', { id: id });
  return channel.sendRequestFrame(requestFrame);
}
