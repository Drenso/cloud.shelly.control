import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { PowerStripUIConfig } from '../PowerStripUI.js';

/**
 * Obtain the component's configuration
 */
export default async function GetConfig(channel: RpcChannel): Promise<ResponseSuccessFrame<PowerStripUIConfig>> {
  const requestFrame = createRequestFrame('POWERSTRIP_UI.GetConfig');
  return channel.sendRequestFrame(requestFrame);
}
