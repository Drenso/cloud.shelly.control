import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';

export type InputTriggerParams = {
  event_type: 'btn_down' | 'btn_up' | 'single_push' | 'double_push' | 'triple_push' | 'long_push';
};

/**
 * Emit input events on demand without actual change on the physical inputs.
 *
 * Only available for `PlusI4` and `PlusI4 DC`, `I4 Gen3` and `I4 DC Gen3`
 *
 * (only for type `button`)
 */
export default async function Trigger(
  channel: RpcChannel,
  id: number,
  params: InputTriggerParams,
): Promise<ResponseSuccessFrame<null>> {
  const requestFrame = createRequestFrame('Input.Trigger', { ...params, id: id });
  return channel.sendRequestFrame(requestFrame);
}
