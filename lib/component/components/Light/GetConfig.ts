import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { LightConfig } from '../Light.js';

/**
 * Obtain the component's configuration
 */
export default async function GetConfig(channel: RpcChannel, id: number): Promise<ResponseSuccessFrame<LightConfig>> {
  const requestFrame = createRequestFrame('Light.GetConfig', { id: id });
  return channel.sendRequestFrame(requestFrame);
}
