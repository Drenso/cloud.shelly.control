import type { RpcChannel } from '../../../rpc/channel/RpcChannel.mjs';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.mjs';
import type { TemperatureConfig } from '../Temperature.mjs';

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
