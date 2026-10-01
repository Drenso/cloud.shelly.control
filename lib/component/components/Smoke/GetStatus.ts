import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { SmokeStatus } from '../Smoke.js';

/**
 * Obtain the component's status
 */
export default async function GetStatus(channel: RpcChannel, id: number): Promise<ResponseSuccessFrame<SmokeStatus>> {
  const requestFrame = createRequestFrame('Smoke.GetStatus', { id });
  return channel.sendRequestFrame(requestFrame);
}
