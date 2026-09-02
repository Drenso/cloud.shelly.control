import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';

export type CameraGetCapabilitiesResponse = {
  /** List of supported stream resolutions and frame rates (e.g. "1920x1080@25"). The values returned here are the only ones accepted by the streams.N.resolution configuration field. */
  resolutions: string[];
  /** Two numbers [min, max] representing the minimum and maximum supported stream bitrate in kbps. The streams.N.bitrate configuration field must fall within this range. */
  bitrate_range: [number, number];
  /** List of supported detection types (currently "motion"). */
  detect: Array<'motion'>;
  /** Maximum number of CameraZone instances that can be created. */
  max_zones: number;
  /** List of supported zone shapes (currently "rectangle"). */
  zone_type: Array<'rectangle'>;
};

/** Returns the supported resolutions, detection types, and zone limitations. */
export default async function GetCapabilities(
  channel: RpcChannel,
  id: number,
): Promise<ResponseSuccessFrame<CameraGetCapabilitiesResponse>> {
  const requestFrame = createRequestFrame('Camera.GetCapabilities', { id });
  return channel.sendRequestFrame(requestFrame);
}
