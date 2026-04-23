import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';

/**
 * This method toggles the output state.
 */
export default async function Toggle(channel: RpcChannel, id: number): Promise<ResponseSuccessFrame<null>> {
  const requestFrame = createRequestFrame('CCT.Toggle', { id: id });
  return channel.sendRequestFrame(requestFrame);
}
