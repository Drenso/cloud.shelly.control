import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { RecursivePartial } from '../../../util.js';
import type { AllowedPrimitives } from '../../Component.js';
import type { ServiceConfig } from '../Service.js';

export type ServiceSetConfigParams = {
  config: RecursivePartial<Omit<ServiceConfig, 'id'>, AllowedPrimitives>;
};

export type ServiceConfigResponse = {
  restart_required: boolean;
};

/**
 * Update the component's configuration
 */
export default async function SetConfig(
  channel: RpcChannel,
  id: number,
  params: ServiceSetConfigParams,
): Promise<ResponseSuccessFrame<ServiceConfigResponse>> {
  const requestFrame = createRequestFrame('Service.SetConfig', { ...params, id: id });
  return channel.sendRequestFrame(requestFrame);
}
