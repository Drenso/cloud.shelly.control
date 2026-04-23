import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { PowerStripUIStatus } from '../PowerStripUI.js';

/**
 * Obtain the component's status
 */
export default async function GetStatus(channel: RpcChannel): Promise<ResponseSuccessFrame<PowerStripUIStatus>> {
  const requestFrame = createRequestFrame('POWERSTRIP_UI.GetStatus');
  return channel.sendRequestFrame(requestFrame);
}
