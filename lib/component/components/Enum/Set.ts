import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';

export type EnumSetParams = {
  value: string;
};

/**
 * This method sets the value of the Enum component.
 */
export default async function Set(
  channel: RpcChannel,
  id: number,
  params: EnumSetParams,
): Promise<ResponseSuccessFrame<null>> {
  const requestFrame = createRequestFrame('Enum.Set', { ...params, id: id });
  return channel.sendRequestFrame(requestFrame);
}
