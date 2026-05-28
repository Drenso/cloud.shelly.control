import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { VoltmeterConfig } from '../Voltmeter.js';
import type { RecursivePartial } from '../../../util.js';
import type { AllowedPrimitives } from '../../Component.js';

export type VoltmeterSetConfigParams = {
  config: RecursivePartial<Omit<VoltmeterConfig, 'id'>, AllowedPrimitives>;
};

export type VoltmeterSetConfigResponse = {
  restart_required: boolean;
};

/**
 * Update the component's configuration
 */
export default async function SetConfig(
  channel: RpcChannel,
  id: number,
  params: VoltmeterSetConfigParams,
): Promise<ResponseSuccessFrame<VoltmeterSetConfigResponse>> {
  const requestFrame = createRequestFrame('Voltmeter.SetConfig', { ...params, id: id });
  return channel.sendRequestFrame(requestFrame);
}
