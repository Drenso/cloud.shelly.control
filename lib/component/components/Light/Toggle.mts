import type { RpcChannel } from '../../../rpc/channel/RpcChannel.mjs';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.mjs';

/**
 * This method toggles the output state.
 */
export default async function Toggle(channel: RpcChannel, id: number): Promise<ResponseSuccessFrame<null>> {
  const requestFrame = createRequestFrame('Light.Toggle', { id: id });
  return channel.sendRequestFrame(requestFrame);
}
