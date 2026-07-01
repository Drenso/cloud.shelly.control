import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { PlugsUIStatus } from '../PlugsUI.js';

/**
 * Obtain the component's status
 */
export default async function GetStatus(channel: RpcChannel): Promise<ResponseSuccessFrame<PlugsUIStatus>> {
  const requestFrame = createRequestFrame('PLUGS_UI.GetStatus');
  return channel.sendRequestFrame(requestFrame);
}
