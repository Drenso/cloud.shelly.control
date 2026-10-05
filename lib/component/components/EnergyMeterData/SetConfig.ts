import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { RecursivePartial } from '../../../util.js';
import type { AllowedPrimitives } from '../../Component.js';
import type { EnergyMeterDataConfig } from '../EnergyMeterData.js';

export type EnergyMeterDataSetConfigParams = {
  config: RecursivePartial<Omit<EnergyMeterDataConfig, 'id'>, AllowedPrimitives>;
};

export type EnergyMeterDataConfigResponse = {
  restart_required: boolean;
};

/**
 * Update the component's configuration
 */
export default async function SetConfig(
  channel: RpcChannel,
  id: number,
  params: EnergyMeterDataSetConfigParams,
): Promise<ResponseSuccessFrame<EnergyMeterDataConfigResponse>> {
  const requestFrame = createRequestFrame('EMData.SetConfig', { ...params, id });
  return channel.sendRequestFrame(requestFrame);
}
