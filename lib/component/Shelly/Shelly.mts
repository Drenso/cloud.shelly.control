import { Service } from '../Component.mjs';

import GetStatus from './GetStatus.mjs';
import GetConfig from './GetConfig.mjs';
import ListMethods from './ListMethods.mjs';
import GetDeviceInfo from './GetDeviceInfo.mjs';
import ListProfiles from './ListProfiles.mjs';
import SetProfile from './SetProfile.mjs';
import ListTimezones from './ListTimezones.mjs';
import DetectLocation from './DetectLocation.mjs';
import CheckForUpdate from './CheckForUpdate.mjs';
import Update from './Update.mjs';
import FactoryReset from './FactoryReset.mjs';
import ResetWifiConfig from './ResetWifiConfig.mjs';
import Reboot from './Reboot.mjs';
import SetAuth from './SetAuth.mjs';
import PutUserCA from './PutUserCA.mjs';
import PutTLSClientCert from './PutTLSClientCert.mjs';
import PutTLSClientKey from './PutTLSClientKey.mjs';
import GetComponents from './GetComponents.mjs';

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
}
