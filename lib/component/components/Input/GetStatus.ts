import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { InputStatus } from '../Input.js';

/**
 * Obtain the component's status
 */
export default async function GetStatus(channel: RpcChannel, id: number): Promise<ResponseSuccessFrame<InputStatus>> {
  const requestFrame = createRequestFrame('Input.GetStatus', { id: id });
  return channel.sendRequestFrame(requestFrame);
}
