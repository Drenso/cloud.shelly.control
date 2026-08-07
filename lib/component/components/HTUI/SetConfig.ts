import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { RecursivePartial } from '../../../util.js';
import type { AllowedPrimitives } from '../../Component.js';
import type { HTUIConfig } from '../HTUI.js';

export type HTUISetConfigParams = {
  config: RecursivePartial<HTUIConfig, AllowedPrimitives>;
};

export type HTUISetConfigResponse = {
  restart_required: boolean;
};

/**
 * Update the component's configuration
 */
export default async function SetConfig(
  channel: RpcChannel,
  params: HTUISetConfigParams,
): Promise<ResponseSuccessFrame<HTUISetConfigResponse>> {
  const requestFrame = createRequestFrame('HT_UI.SetConfig', params);
  return channel.sendRequestFrame(requestFrame);
}
