import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { SystemConfig } from '../System.js';

/**
 * Obtain the component's configuration
 */
export default async function GetConfig(channel: RpcChannel): Promise<ResponseSuccessFrame<SystemConfig>> {
  const requestFrame = createRequestFrame('Sys.GetConfig');
  return channel.sendRequestFrame(requestFrame);
}
