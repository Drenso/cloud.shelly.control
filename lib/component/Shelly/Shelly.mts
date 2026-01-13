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
  static GetComponents = GetComponents;
}
