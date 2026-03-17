import type { RpcChannel } from '../../../rpc/channel/RpcChannel.mjs';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.mjs';
import type { LightConfig } from '../Light.mjs';

/**
 * Obtain the component's configuration
 */
export default async function GetConfig(channel: RpcChannel, id: number): Promise<ResponseSuccessFrame<LightConfig>> {
  const requestFrame = createRequestFrame('Light.GetConfig', { id: id });
  return channel.sendRequestFrame(requestFrame);
}
