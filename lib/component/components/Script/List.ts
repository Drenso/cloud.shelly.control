import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';

export type ScriptListResponse = Array<{
  /** Identifier of the script */
  id: number;
  /** Name of the script */
  name: string;
  /** Whether the script starts on boot */
  enable: boolean;
  /** Whether the script is currently running */
  running: boolean;
}>;

/**
 * This method lists all scripts.
 */
export default async function List(channel: RpcChannel): Promise<ResponseSuccessFrame<ScriptListResponse>> {
  const requestFrame = createRequestFrame('Script.List');
  return channel.sendRequestFrame(requestFrame);
}
