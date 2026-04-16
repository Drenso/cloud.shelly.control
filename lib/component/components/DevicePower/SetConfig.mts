import type { RpcChannel } from '../../../rpc/channel/RpcChannel.mjs';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.mjs';

export type DevicePowerSetConfigParams = {
  config: Record<never, never>;
};

export type DevicePowerConfigResponse = {
  restart_required: boolean;
};

/**
 * Update the component's configuration
 */
export default async function SetConfig(
  channel: RpcChannel,
  id: number,
  params: DevicePowerSetConfigParams,
): Promise<ResponseSuccessFrame<DevicePowerConfigResponse>> {
  const requestFrame = createRequestFrame('DevicePower.SetConfig', { ...params, id: id });
  return channel.sendRequestFrame(requestFrame);
}
