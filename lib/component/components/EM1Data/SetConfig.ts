import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { EM1DataConfig } from '../EM1Data.js';
import type { RecursivePartial } from '../../../util.js';
import type { AllowedPrimitives } from '../../Component.js';

export type EM1DataSetConfigParams = {
  config: RecursivePartial<Omit<EM1DataConfig, 'id'>, AllowedPrimitives>;
};

export type EM1DataSetConfigResponse = {
  restart_required: boolean;
};

/**
 * Update the component's configuration
 */
export default async function SetConfig(
  channel: RpcChannel,
  id: number,
  params: EM1DataSetConfigParams,
): Promise<ResponseSuccessFrame<EM1DataSetConfigResponse>> {
  const requestFrame = createRequestFrame('EM1Data.SetConfig', { ...params, id: id });
  return channel.sendRequestFrame(requestFrame);
}
