import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { ButtonConfig } from '../Button.js';

/**
 * Obtain the component's configuration
 */
export default async function GetConfig(channel: RpcChannel, id: number): Promise<ResponseSuccessFrame<ButtonConfig>> {
  const requestFrame = createRequestFrame('Button.GetConfig', { id: id });
  return channel.sendRequestFrame(requestFrame);
}
