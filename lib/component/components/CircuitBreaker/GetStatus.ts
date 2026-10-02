import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { CircuitBreakerStatus } from '../CircuitBreaker.js';

/**
 * Obtain the component's status
 */
export default async function GetStatus(
  channel: RpcChannel,
  id: number,
): Promise<ResponseSuccessFrame<CircuitBreakerStatus>> {
  const requestFrame = createRequestFrame('CB.GetStatus', { id });
  return channel.sendRequestFrame(requestFrame);
}
