import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { StorageConfig } from '../Storage.js';
import type { RecursivePartial } from '../../../util.js';
import type { AllowedPrimitives } from '../../Component.js';

export type StorageSetConfigParams = {
  config: RecursivePartial<Omit<StorageConfig, 'id'>, AllowedPrimitives>;
};

export type StorageSetConfigResponse = {
  restart_required: boolean;
};

/** Update the component's configuration. */
export default async function SetConfig(
  channel: RpcChannel,
  id: number,
  params: StorageSetConfigParams,
): Promise<ResponseSuccessFrame<StorageSetConfigResponse>> {
  const requestFrame = createRequestFrame('Storage.SetConfig', { ...params, id });
  return channel.sendRequestFrame(requestFrame);
}
