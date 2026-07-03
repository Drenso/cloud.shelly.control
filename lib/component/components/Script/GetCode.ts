import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';

export type ScriptGetCodeParams = {
  /**
   * Byte offset from the beginning.
   *
   * Default value: `0`
   */
  offset?: number;
  /**
   * Bytes to read.
   *
   * Default value: maximum possible number of bytes till the end is reached.
   */
  len?: number;
};

export type ScriptGetCodeResponse = {
  /** The requested data chunk */
  data: string;
  /** Number of bytes remaining till the end of the code */
  left: number;
};

/**
 * This method downloads code from an existing script.
 */
export default async function GetCode(
  channel: RpcChannel,
  id: number,
  params?: ScriptGetCodeParams,
): Promise<ResponseSuccessFrame<ScriptGetCodeResponse>> {
  const requestFrame = createRequestFrame('Script.GetCode', { ...params, id: id });
  return channel.sendRequestFrame(requestFrame);
}
