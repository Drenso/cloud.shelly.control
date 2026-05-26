import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { RecursivePartial } from '../../../util.js';
import type { AllowedPrimitives } from '../../Component.js';
import type { PillConfig } from '../Pill.js';

export type PillSetConfigParams = {
  config: RecursivePartial<PillConfig, AllowedPrimitives>;
};

export type PillSetConfigResponse = {
  restart_required: boolean;
};

/**
 * Update the component's configuration
 */
export default async function SetConfig(
  channel: RpcChannel,
  params: PillSetConfigParams,
): Promise<ResponseSuccessFrame<PillSetConfigResponse>> {
  const requestFrame = createRequestFrame('Pill.SetConfig', params);
  return channel.sendRequestFrame(requestFrame);
}
