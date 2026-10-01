import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { SmokeConfig } from '../Smoke.js';

/**
 * Obtain the component's configuration
 */
export default async function GetConfig(channel: RpcChannel, id: number): Promise<ResponseSuccessFrame<SmokeConfig>> {
  const requestFrame = createRequestFrame('Smoke.GetConfig', { id });
  return channel.sendRequestFrame(requestFrame);
}
