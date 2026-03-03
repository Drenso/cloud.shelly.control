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
  static GetStatus = GetStatus;
  static GetConfig = GetConfig;
  static ListMethods = ListMethods;
  static GetDeviceInfo = GetDeviceInfo;
  static ListProfiles = ListProfiles;
  static SetProfile = SetProfile;
  static ListTimezones = ListTimezones;
  static DetectLocation = DetectLocation;
  static CheckForUpdate = CheckForUpdate;
  static Update = Update;
  static FactoryReset = FactoryReset;
  static ResetWifiConfig = ResetWifiConfig;
  static Reboot = Reboot;
  static SetAuth = SetAuth;
  static PutUserCA = PutUserCA;
  static PutTLSClientCert = PutTLSClientCert;
  static PutTLSClientKey = PutTLSClientKey;
  static GetComponents = GetComponents;

  /**
   * A utility function outside the RPC spec to collect the paginated results of GetComponents in a single array.
   */
  static async getAllComponents(channel: RpcChannel): Promise<ShellyGetComponentsResponseComponent[]> {
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
