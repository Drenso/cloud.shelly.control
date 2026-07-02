import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { JsonValue } from '../../../../types/json.js';

export type ServiceSetParams = {
  value: Record<string, JsonValue>;
};

/**
 * Update the component's configuration
 */
export default async function SetConfig(
  channel: RpcChannel,
  id: number,
  params: ServiceSetParams,
): Promise<ResponseSuccessFrame<null>> {
  const requestFrame = createRequestFrame('Service.Set', { ...params, id: id });
  return channel.sendRequestFrame(requestFrame);
}
