import type { RpcChannel } from '../../../rpc/channel/RpcChannel.mjs';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.mjs';
import type { SystemStatus } from '../System.mjs';

/**
 * Obtain the component's status
 */
export default async function GetStatus(channel: RpcChannel): Promise<ResponseSuccessFrame<SystemStatus>> {
  const requestFrame = createRequestFrame('Sys.GetStatus');
  return channel.sendRequestFrame(requestFrame);
}
