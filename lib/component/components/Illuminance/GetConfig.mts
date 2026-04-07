import type { RpcChannel } from '../../../rpc/channel/RpcChannel.mjs';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.mjs';
import type { IlluminanceConfig } from '../Illuminance.mjs';

/**
 * Obtain the component's configuration
 */
export default async function GetConfig(
  channel: RpcChannel,
  id: number,
): Promise<ResponseSuccessFrame<IlluminanceConfig>> {
  const requestFrame = createRequestFrame('Illuminance.GetConfig', { id: id });
  return channel.sendRequestFrame(requestFrame);
}
