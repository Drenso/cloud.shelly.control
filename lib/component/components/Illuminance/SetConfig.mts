import type { RpcChannel } from '../../../rpc/channel/RpcChannel.mjs';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.mjs';
import type { IlluminanceConfig } from '../Illuminance.mjs';
import type { RecursivePartial } from '../../../util.mjs';
import type { AllowedPrimitives } from '../../Component.mjs';

export type IlluminanceSetConfigParams = {
  config: RecursivePartial<Omit<IlluminanceConfig, 'id'>, AllowedPrimitives>;
};

export type IlluminanceSetConfigResponse = {
  restart_required: boolean;
};

/**
 * Update the component's configuration
 */
export default async function SetConfig(
  channel: RpcChannel,
  id: number,
  params: IlluminanceSetConfigParams,
): Promise<ResponseSuccessFrame<IlluminanceSetConfigResponse>> {
  const requestFrame = createRequestFrame('Illuminance.SetConfig', { ...params, id: id });
  return channel.sendRequestFrame(requestFrame);
}
