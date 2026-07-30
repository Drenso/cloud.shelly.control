import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { JsonObject } from '../../../../types/json.js';

export type ObjectSetParams = {
  value: JsonObject;
};

/**
 * This method sets the value of the Object component.
 */
export default async function Set(
  channel: RpcChannel,
  id: number,
  params: ObjectSetParams,
): Promise<ResponseSuccessFrame<null>> {
  const requestFrame = createRequestFrame('Object.Set', { ...params, id: id });
  return channel.sendRequestFrame(requestFrame);
}
