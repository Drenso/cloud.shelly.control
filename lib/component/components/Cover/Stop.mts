import type { RpcChannel } from '../../../rpc/channel/RpcChannel.mjs';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.mjs';

/**
 * Stop the cover.
 */
export default async function Stop(channel: RpcChannel, id: number): Promise<ResponseSuccessFrame<null>> {
  const requestFrame = createRequestFrame('Cover.Stop', { id: id });
  return channel.sendRequestFrame(requestFrame);
}
