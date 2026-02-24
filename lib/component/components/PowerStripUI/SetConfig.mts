import type { RpcChannel } from '../../../rpc/channel/RpcChannel.mjs';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.mjs';
import type { PowerStripUIConfig } from '../PowerStripUI.mjs';
import type { RecursivePartial } from '../../../util.mjs';
import type { AllowedPrimitives } from '../../Component.mjs';

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
