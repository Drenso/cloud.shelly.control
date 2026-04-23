import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { IlluminanceConfig } from '../Illuminance.js';
import type { RecursivePartial } from '../../../util.js';
import type { AllowedPrimitives } from '../../Component.js';

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
