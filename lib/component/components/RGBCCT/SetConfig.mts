import type { RpcChannel } from '../../../rpc/channel/RpcChannel.mjs';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.mjs';
import type { RGBCCTConfig } from '../RGBCCT.mjs';
import type { RecursivePartial } from '../../../util.mjs';
import type { AllowedPrimitives } from '../../Component.mjs';

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
