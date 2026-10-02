import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { CircuitBreakerConfig } from '../CircuitBreaker.js';

export type CircuitBreakerSetConfigParams = {
  config: Partial<Omit<CircuitBreakerConfig, 'id'>>;
};

export type CircuitBreakerSetConfigResponse = {
  restart_required: boolean;
};

/**
 * Update the component's configuration
 */
export default async function SetConfig(
  channel: RpcChannel,
  id: number,
  params: CircuitBreakerSetConfigParams,
): Promise<ResponseSuccessFrame<CircuitBreakerSetConfigResponse>> {
  const requestFrame = createRequestFrame('CB.SetConfig', { ...params, id });
  return channel.sendRequestFrame(requestFrame);
}
