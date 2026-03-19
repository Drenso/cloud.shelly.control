import { Service } from '../Component.mjs';

import GetStatus from './Shelly/GetStatus.mjs';
import GetConfig from './Shelly/GetConfig.mjs';
import ListMethods from './Shelly/ListMethods.mjs';
import GetDeviceInfo from './Shelly/GetDeviceInfo.mjs';
import ListProfiles from './Shelly/ListProfiles.mjs';
import SetProfile from './Shelly/SetProfile.mjs';
import ListTimezones from './Shelly/ListTimezones.mjs';
import DetectLocation from './Shelly/DetectLocation.mjs';
import CheckForUpdate from './Shelly/CheckForUpdate.mjs';
import Update from './Shelly/Update.mjs';
import FactoryReset from './Shelly/FactoryReset.mjs';
import ResetWifiConfig from './Shelly/ResetWifiConfig.mjs';
import Reboot from './Shelly/Reboot.mjs';
import SetAuth from './Shelly/SetAuth.mjs';
import PutUserCA from './Shelly/PutUserCA.mjs';
import PutTLSClientCert from './Shelly/PutTLSClientCert.mjs';
import PutTLSClientKey from './Shelly/PutTLSClientKey.mjs';
import GetComponents, { type ShellyGetComponentsResponseComponent } from './Shelly/GetComponents.mjs';
import type { RpcChannel } from '../../rpc/channel/RpcChannel.mjs';

/**
 * This service is common for all Gen2+ devices. It handles device management.
 */
export default class Shelly extends Service {
  public static readonly GetStatus = GetStatus;
  public static readonly GetConfig = GetConfig;
  public static readonly ListMethods = ListMethods;
  public static readonly GetDeviceInfo = GetDeviceInfo;
  public static readonly ListProfiles = ListProfiles;
  public static readonly SetProfile = SetProfile;
  public static readonly ListTimezones = ListTimezones;
  public static readonly DetectLocation = DetectLocation;
  public static readonly CheckForUpdate = CheckForUpdate;
  public static readonly Update = Update;
  public static readonly FactoryReset = FactoryReset;
  public static readonly ResetWifiConfig = ResetWifiConfig;
  public static readonly Reboot = Reboot;
  public static readonly SetAuth = SetAuth;
  public static readonly PutUserCA = PutUserCA;
  public static readonly PutTLSClientCert = PutTLSClientCert;
  public static readonly PutTLSClientKey = PutTLSClientKey;
  public static readonly GetComponents = GetComponents;

  /**
   * A utility function outside the RPC spec to collect the paginated results of GetComponents in a single array.
   */
  public static async getAllComponents(channel: RpcChannel): Promise<ShellyGetComponentsResponseComponent[]> {
    const components: ShellyGetComponentsResponseComponent[] = [];
    while (true) {
      const componentsResponse = await Shelly.GetComponents(channel, { offset: components.length });
      components.push(...componentsResponse.result.components);
      if (components.length >= componentsResponse.result.total) {
        break;
      }
    }
    return components;
  }
}
