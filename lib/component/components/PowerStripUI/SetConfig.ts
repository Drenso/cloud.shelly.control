import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { PowerStripUIConfig } from '../PowerStripUI.js';
import type { RecursivePartial } from '../../../util.js';
import type { AllowedPrimitives } from '../../Component.js';

export type PowerStripUISetConfigParams = {
  config: RecursivePartial<PowerStripUIConfig, AllowedPrimitives>;
};

export type PowerStripUISetConfigResponse = {
  restart_required: boolean;
};

/**
 * Update the component's configuration
 */
export default async function SetConfig(
  channel: RpcChannel,
  params: PowerStripUISetConfigParams,
): Promise<ResponseSuccessFrame<PowerStripUISetConfigResponse>> {
  const requestFrame = createRequestFrame('POWERSTRIP_UI.SetConfig', params);
  return channel.sendRequestFrame(requestFrame);
}
