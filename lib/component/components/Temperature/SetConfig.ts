import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { TemperatureConfig } from '../Temperature.js';

export type TemperatureSetConfigParams = {
  config: Partial<Omit<TemperatureConfig, 'id'>>;
};

export type TemperatureSetConfigResponse = {
  restart_required: boolean;
};

/**
 * Update the component's configuration
 */
export default async function SetConfig(
  channel: RpcChannel,
  id: number,
  params: TemperatureSetConfigParams,
): Promise<ResponseSuccessFrame<TemperatureSetConfigResponse>> {
  const requestFrame = createRequestFrame('Temperature.SetConfig', { ...params, id: id });
  return channel.sendRequestFrame(requestFrame);
}
