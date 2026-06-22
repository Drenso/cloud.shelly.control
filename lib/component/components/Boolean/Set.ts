import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';

export type BooleanSetParams = {
  value: boolean;
};

/**
 * This method sets the value of the Boolean component.
 */
export default async function Set(
  channel: RpcChannel,
  id: number,
  params: BooleanSetParams,
): Promise<ResponseSuccessFrame<null>> {
  const requestFrame = createRequestFrame('Boolean.Set', { ...params, id: id });
  return channel.sendRequestFrame(requestFrame);
}
