import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { PlugpmUIStatus } from '../PlugpmUI.js';

/**
 * Obtain the component's status
 */
export default async function GetStatus(channel: RpcChannel): Promise<ResponseSuccessFrame<PlugpmUIStatus>> {
  const requestFrame = createRequestFrame('PLUGPM_UI.GetStatus');
  return channel.sendRequestFrame(requestFrame);
}
