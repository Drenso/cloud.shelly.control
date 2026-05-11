import type { ZCLNode } from 'zigbee-clusters';
import ShellyZigbeeDevice from '../../lib/zigbee/ZigbeeDevice.js';
import initOnOffDevice from '@drenso/homey-zigbee-library/capabilities/onOff.mjs';
import initElectricalMeasurementDevice from '@drenso/homey-zigbee-library/capabilities/electricalMeasurement.mjs';
import initMeteringDevice from '@drenso/homey-zigbee-library/capabilities/metering.mjs';

function createCapabilityOverrides(postFix: string): {
  measureVoltageCapability: string;
  measureCurrentCapability: string;
  measurePowerCapability: string;
  meterPowerCapability: string;
} {
  const overrides = {
    measureVoltageCapability: 'measure_voltage',
    measureCurrentCapability: 'measure_current',
    measurePowerCapability: 'measure_power',
    measureFrequencyCapability: 'measure_frequency',
    meterPowerCapability: 'meter_power',
  };
  let override: keyof typeof overrides;
  for (override in overrides) {
    overrides[override] = `${overrides[override]}${postFix}`;
  }
  return overrides;
}

export default class ShellyEMGen4ZigbeeDevice extends ShellyZigbeeDevice {
  protected async configureDevice(zclNode: ZCLNode): Promise<void> {
    // endpoint 1
    await initOnOffDevice(this, zclNode, { endpointId: 1 });

    // endpoint 2
    const overrides2 = createCapabilityOverrides('.2');
    await initMeteringDevice(this, zclNode, {
      endpointId: 2,
      noPowerFactorReporting: true,
      storePropertyPostfix: '2',
      ...overrides2,
    });
    await initElectricalMeasurementDevice(this, zclNode, { endpointId: 2, storePropertyPostfix: '2', ...overrides2 });

    // endpoint 3
    const overrides3 = createCapabilityOverrides('.3');
    await initMeteringDevice(this, zclNode, {
      endpointId: 3,
      noPowerFactorReporting: true,
      storePropertyPostfix: '3',
      ...overrides3,
    });
    await initElectricalMeasurementDevice(this, zclNode, { endpointId: 3, storePropertyPostfix: '3', ...overrides3 });
  }
}
