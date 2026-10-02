import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { CircuitBreakerConfig } from '../CircuitBreaker.js';

/**
 * Obtain the component's configuration
 */
export default async function GetConfig(
  channel: RpcChannel,
  id: number,
): Promise<ResponseSuccessFrame<CircuitBreakerConfig>> {
  const requestFrame = createRequestFrame('CB.GetConfig', { id });
  return channel.sendRequestFrame(requestFrame);
}
