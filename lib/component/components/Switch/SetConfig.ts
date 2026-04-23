import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { SwitchConfig } from '../Switch.js';

export type SwitchSetConfigParams = {
  config: Partial<Omit<SwitchConfig, 'id'>>;
};

export type SwitchSetConfigResponse = {
  restart_required: boolean;
};

/**
 * Update the component's configuration
 */
export default async function SetConfig(
  channel: RpcChannel,
  id: number,
  params: SwitchSetConfigParams,
): Promise<ResponseSuccessFrame<SwitchSetConfigResponse>> {
  const requestFrame = createRequestFrame('Switch.SetConfig', { ...params, id: id });
  return channel.sendRequestFrame(requestFrame);
}
