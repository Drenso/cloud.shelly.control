import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { HumidityConfig } from '../Humidity.js';

/**
 * Obtain the component's configuration
 */
export default async function GetConfig(
  channel: RpcChannel,
  id: number,
): Promise<ResponseSuccessFrame<HumidityConfig>> {
  const requestFrame = createRequestFrame('Humidity.GetConfig', { id: id });
  return channel.sendRequestFrame(requestFrame);
}
