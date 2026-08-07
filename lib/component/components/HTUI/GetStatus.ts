import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { HTUIStatus } from '../HTUI.js';

/**
 * Obtain the component's status
 */
export default async function GetStatus(channel: RpcChannel): Promise<ResponseSuccessFrame<HTUIStatus>> {
  const requestFrame = createRequestFrame('HT_UI.GetStatus');
  return channel.sendRequestFrame(requestFrame);
}
