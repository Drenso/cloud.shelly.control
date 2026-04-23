import { Service } from '../Component.js';

import GetStatus from './Shelly/GetStatus.js';
import GetConfig from './Shelly/GetConfig.js';
import ListMethods from './Shelly/ListMethods.js';
import GetDeviceInfo from './Shelly/GetDeviceInfo.js';
import ListProfiles from './Shelly/ListProfiles.js';
import SetProfile from './Shelly/SetProfile.js';
import ListTimezones from './Shelly/ListTimezones.js';
import DetectLocation from './Shelly/DetectLocation.js';
import CheckForUpdate from './Shelly/CheckForUpdate.js';
import Update from './Shelly/Update.js';
import FactoryReset from './Shelly/FactoryReset.js';
import ResetWifiConfig from './Shelly/ResetWifiConfig.js';
import Reboot from './Shelly/Reboot.js';
import SetAuth from './Shelly/SetAuth.js';
import PutUserCA from './Shelly/PutUserCA.js';
import PutTLSClientCert from './Shelly/PutTLSClientCert.js';
import PutTLSClientKey from './Shelly/PutTLSClientKey.js';
import GetComponents, { type ShellyGetComponentsResponseComponent } from './Shelly/GetComponents.js';
import type { RpcChannel } from '../../rpc/channel/RpcChannel.js';

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
