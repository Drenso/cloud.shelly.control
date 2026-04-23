import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import type { ComponentWithIdMapping, ComponentWithoutIdMapping, MappedComponent } from '../../ComponentMapping.js';

type ShellyGetComponentsParams = {
  // Index of the component from which to start generating the result
  offset?: number;
  // "status" will include the component's status, "config" - the config.
  // The keys are always included.
  // If empty/not provided, both will be returned.
  include?: ('config' | 'status')[];
  // An array of component keys in the format <type> <cid> (for example, boolean:200)
  // which is used to filter the response list.
  // If empty/not provided, all components will be returned.
  keys?: string[];
  // true to include only dynamic components, default false.
  dynamic_only?: boolean;
};

type ShellyGetComponentsResponse = {
  components: ShellyGetComponentsResponseComponent[];
  // Sys's configuration revision
  cfg_rev: number;
  // Index of the first component in the result
  offset: number;
  // Total number of components with all filters applied
  total: number;
};

// TODO make presence of status and config dependent on request params
export type ShellyGetComponentsResponseComponent = {
  // Component's key (in format <type>:<cid>, for example boolean:200)
  key: keyof typeof ComponentWithoutIdMapping | `${keyof typeof ComponentWithIdMapping}:${number}`;
  // Component's status, will be omitted if "status" is not specified in the include property.
  status?: InstanceType<MappedComponent>['status'];
  // Component's config, will be omitted if "config" is not specified in the include property.
  config?: InstanceType<MappedComponent>['config'];
};

/**
 * This method returns a list with device's components.
 * It supports paging, filter for dynamic components (for example virtual components)
 * and allows the user to get only the needed information from the component.
 */
export default async function GetComponents(
  channel: RpcChannel,
  params?: ShellyGetComponentsParams,
): Promise<ResponseSuccessFrame<ShellyGetComponentsResponse>> {
  const requestFrame = createRequestFrame('Shelly.GetComponents', params);
  return channel.sendRequestFrame(requestFrame);
}
