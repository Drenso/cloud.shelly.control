import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { RGBCCTConfig } from '../RGBCCT.js';
import type { RecursivePartial } from '../../../util.js';
import type { AllowedPrimitives } from '../../Component.js';

export type RGBCCTSetConfigParams = {
  config: RecursivePartial<Omit<RGBCCTConfig, 'id'>, AllowedPrimitives>;
};

export type RGBCCTSetConfigResponse = {
  restart_required: boolean;
};

/**
 * Update the component's configuration
 */
export default async function SetConfig(
  channel: RpcChannel,
  id: number,
  params: RGBCCTSetConfigParams,
): Promise<ResponseSuccessFrame<RGBCCTSetConfigResponse>> {
  const requestFrame = createRequestFrame('RGBCCT.SetConfig', { ...params, id: id });
  return channel.sendRequestFrame(requestFrame);
}
