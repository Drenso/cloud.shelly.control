import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { EnergyMeterConfig } from '../EnergyMeter.js';
import type { RecursivePartial } from '../../../util.js';
import type { AllowedPrimitives } from '../../Component.js';

export type EnergyMeterSetConfigParams = {
  config: RecursivePartial<Omit<EnergyMeterConfig, 'id'>, AllowedPrimitives>;
};

export type EnergyMeterSetConfigResponse = {
  restart_required: boolean;
};

/**
 * Update the component's configuration
 */
export default async function SetConfig(
  channel: RpcChannel,
  id: number,
  params: EnergyMeterSetConfigParams,
): Promise<ResponseSuccessFrame<EnergyMeterSetConfigResponse>> {
  const requestFrame = createRequestFrame('EM.SetConfig', { ...params, id });
  return channel.sendRequestFrame(requestFrame);
}
