import ShellyBleDevice from '../../lib/ble/BleDevice.js';
import type { BTHomeData } from '../../lib/ble/BTHome.js';
import {
  handleBatteryProperty,
  handleDewPointProperty,
  handleDirectionProperty,
  handleHumidityProperty,
  handleIlluminanceProperty,
  handleMoistureProperty,
  handlePrecipitationProperty,
  handlePressureProperty,
  handleTemperatureProperty,
  handleUvIndexProperty,
  handleVoltageProperty,
} from '../../lib/ble/BTHomePropertyHandlers.js';
import { safeSetCapabilityValue } from '../../lib/safeFunctions.js';

export default class EcowittWS90BleDevice extends ShellyBleDevice {
  public async handleBtHomeForward(btHomeData: BTHomeData): Promise<void> {
    // Packet type 1
    await handleIlluminanceProperty(this, btHomeData);
    await handleMoistureProperty(this, btHomeData, { alarmCapabilityId: 'alarm_rain' });
    if (btHomeData.speed?.length === 2) {
      await safeSetCapabilityValue(this, 'measure_wind_strength', btHomeData.speed[0]);
      await safeSetCapabilityValue(this, 'measure_gust_strength', btHomeData.speed[1]);
    }
    await handleUvIndexProperty(this, btHomeData);
    await handleDirectionProperty(this, btHomeData, { capabilityId: 'measure_wind_angle' });

    // Packet type 2
    await handleBatteryProperty(this, btHomeData);
    await handlePressureProperty(this, btHomeData);
    await handleDewPointProperty(this, btHomeData);
    await handleVoltageProperty(this, btHomeData, {capabilityId: 'measure_voltage.capacitor'});
    await handleHumidityProperty(this, btHomeData);
    await handleTemperatureProperty(this, btHomeData);
    await handlePrecipitationProperty(this, btHomeData);
  }
}
