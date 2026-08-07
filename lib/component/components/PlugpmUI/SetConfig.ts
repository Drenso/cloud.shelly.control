import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { RecursivePartial } from '../../../util.js';
import type { AllowedPrimitives } from '../../Component.js';
import type { PlugpmUIConfig } from '../PlugpmUI.js';

export type PlugpmUISetConfigParams = {
  config: RecursivePartial<PlugpmUIConfig, AllowedPrimitives>;
};

export type PlugpmUISetConfigResponse = {
  restart_required: boolean;
};

/**
 * Update the component's configuration
 */
export default async function SetConfig(
  channel: RpcChannel,
  params: PlugpmUISetConfigParams,
): Promise<ResponseSuccessFrame<PlugpmUISetConfigResponse>> {
  const requestFrame = createRequestFrame('PLUGPM_UI.SetConfig', params);
  return channel.sendRequestFrame(requestFrame);
}
