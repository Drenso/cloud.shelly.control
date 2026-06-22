import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { ButtonStatus } from '../Button.js';

/**
 * Obtain the component's status
 */
export default async function GetStatus(channel: RpcChannel, id: number): Promise<ResponseSuccessFrame<ButtonStatus>> {
  const requestFrame = createRequestFrame('Button.GetStatus', { id: id });
  return channel.sendRequestFrame(requestFrame);
}
