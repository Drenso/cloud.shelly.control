import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';

export type NumberSetParams = {
  value: number;
};

/**
 * This method sets the value of the Number component.
 */
export default async function Set(
  channel: RpcChannel,
  id: number,
  params: NumberSetParams,
): Promise<ResponseSuccessFrame<null>> {
  const requestFrame = createRequestFrame('Number.Set', { ...params, id: id });
  return channel.sendRequestFrame(requestFrame);
}
