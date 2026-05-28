import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { HumidityConfig } from '../Humidity.js';
import type { RecursivePartial } from '../../../util.js';
import type { AllowedPrimitives } from '../../Component.js';

export type HumiditySetConfigParams = {
  config: RecursivePartial<Omit<HumidityConfig, 'id'>, AllowedPrimitives>;
};

export type HumiditySetConfigResponse = {
  restart_required: boolean;
};

/**
 * Update the component's configuration
 */
export default async function SetConfig(
  channel: RpcChannel,
  id: number,
  params: HumiditySetConfigParams,
): Promise<ResponseSuccessFrame<HumiditySetConfigResponse>> {
  const requestFrame = createRequestFrame('Humidity.SetConfig', { ...params, id: id });
  return channel.sendRequestFrame(requestFrame);
}
