import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';

/**
 * Obtain the component's status
 */
export default async function Mute(channel: RpcChannel, id: number): Promise<ResponseSuccessFrame<null>> {
  const requestFrame = createRequestFrame('Smoke.Mute', { id });
  return channel.sendRequestFrame(requestFrame);
}
