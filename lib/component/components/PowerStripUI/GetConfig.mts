import type { RpcChannel } from '../../../rpc/channel/RpcChannel.mjs';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.mjs';
import type { PowerStripUIConfig } from '../PowerStripUI.mjs';

/**
 * Obtain the component's configuration
 */
export default async function GetConfig(channel: RpcChannel): Promise<ResponseSuccessFrame<PowerStripUIConfig>> {
  const requestFrame = createRequestFrame('POWERSTRIP_UI.GetConfig');
  return channel.sendRequestFrame(requestFrame);
}
