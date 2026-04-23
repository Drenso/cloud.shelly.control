import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { SwitchConfig } from '../Switch.js';

/**
 * Obtain the component's configuration
 */
export default async function GetConfig(channel: RpcChannel, id: number): Promise<ResponseSuccessFrame<SwitchConfig>> {
  const requestFrame = createRequestFrame('Switch.GetConfig', { id: id });
  return channel.sendRequestFrame(requestFrame);
}
