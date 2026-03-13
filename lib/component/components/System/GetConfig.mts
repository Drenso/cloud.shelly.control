import type { RpcChannel } from '../../../rpc/channel/RpcChannel.mjs';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.mjs';
import type { SystemConfig } from '../System.mjs';

/**
 * Obtain the component's configuration
 */
export default async function GetConfig(channel: RpcChannel): Promise<ResponseSuccessFrame<SystemConfig>> {
  const requestFrame = createRequestFrame('Sys.GetConfig');
  return channel.sendRequestFrame(requestFrame);
}
