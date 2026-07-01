import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { RecursivePartial } from '../../../util.js';
import type { AllowedPrimitives } from '../../Component.js';
import type { PlugsUIConfig } from '../PlugsUI.js';

export type PlugsUISetConfigParams = {
  config: RecursivePartial<PlugsUIConfig, AllowedPrimitives>;
};

export type PlugsUISetConfigResponse = {
  restart_required: boolean;
};

/**
 * Update the component's configuration
 */
export default async function SetConfig(
  channel: RpcChannel,
  params: PlugsUISetConfigParams,
): Promise<ResponseSuccessFrame<PlugsUISetConfigResponse>> {
  const requestFrame = createRequestFrame('PLUGS_UI.SetConfig', params);
  return channel.sendRequestFrame(requestFrame);
}
