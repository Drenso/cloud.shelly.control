import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';

export type ButtonTriggerParams = {
  event: 'single_push' | 'double_push' | 'triple_push' | 'long_push';
};

/**
 * This method triggers the Button component.
 */
export default async function Trigger(
  channel: RpcChannel,
  id: number,
  params: ButtonTriggerParams,
): Promise<ResponseSuccessFrame<null>> {
  const requestFrame = createRequestFrame('Button.Trigger', { ...params, id: id });
  return channel.sendRequestFrame(requestFrame);
}
