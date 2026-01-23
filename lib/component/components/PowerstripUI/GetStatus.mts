import type { RpcChannel } from '../../../rpc/channel/RpcChannel.mjs';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.mjs';
import type { PowerStripUIStatus } from '../PowerStripUI.mjs';

/**
 * Obtain the component's status
 */
export default async function GetStatus(channel: RpcChannel): Promise<ResponseSuccessFrame<PowerStripUIStatus>> {
  const requestFrame = createRequestFrame('POWERSTRIP_UI.GetStatus');
  return channel.sendRequestFrame(requestFrame);
}
