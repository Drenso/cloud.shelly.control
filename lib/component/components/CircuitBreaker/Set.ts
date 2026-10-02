import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';

export type CircuitBreakerSetParams = {
  /** False to disengage the breaker. */
  output: boolean;
};

export type CircuitBreakerSetResponse = {
  /** True if the lever was on before the method was executed, false otherwise. */
  was_on: boolean;
};

/**
 * This method sets the output of the CB component to OFF (breaker lever disengaged).
 */
export default async function Set(
  channel: RpcChannel,
  id: number,
  params: CircuitBreakerSetParams,
): Promise<ResponseSuccessFrame<CircuitBreakerSetResponse>> {
  const requestFrame = createRequestFrame('CB.Set', { ...params, id });
  return channel.sendRequestFrame(requestFrame);
}
