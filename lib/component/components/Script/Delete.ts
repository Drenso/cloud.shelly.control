import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';

/**
 * This method removes specified script.
 */
export default async function Delete(channel: RpcChannel, id: number): Promise<ResponseSuccessFrame<null>> {
  const requestFrame = createRequestFrame('Script.Delete', { id: id });
  return channel.sendRequestFrame(requestFrame);
}
