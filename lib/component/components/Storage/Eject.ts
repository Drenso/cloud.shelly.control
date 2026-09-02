import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';

/**
 * Unmounts the SD card to allow safe physical removal while the camera is running. Auto-mounting is disabled until the SD card is removed and re-inserted.
 * For network-mounted (NFS) storage this method is a no-op and returns successfully without unmounting.
 */
export default async function Eject(channel: RpcChannel, id: number): Promise<ResponseSuccessFrame<null>> {
  const requestFrame = createRequestFrame('Storage.Eject', { id });
  return channel.sendRequestFrame(requestFrame);
}
