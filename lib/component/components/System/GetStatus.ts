import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { SystemStatus } from '../System.js';

/**
 * Obtain the component's status
 */
export default async function GetStatus(channel: RpcChannel): Promise<ResponseSuccessFrame<SystemStatus>> {
  const requestFrame = createRequestFrame('Sys.GetStatus');
  return channel.sendRequestFrame(requestFrame);
}
