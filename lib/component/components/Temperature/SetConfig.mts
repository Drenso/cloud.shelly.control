import type { RpcChannel } from '../../../rpc/channel/RpcChannel.mjs';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.mjs';
import type { TemperatureConfig } from '../Temperature.mjs';

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
