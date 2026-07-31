import ShellyLocalDevice from '../../lib/local/LocalDevice.js';
import type { ComponentMethod, NameSpace } from '../../lib/component/components/Shelly/ListMethods.js';
import type { MappedComponent } from '../../lib/component/ComponentMapping.js';
import type Boolean from '../../lib/component/components/Boolean.js';
import type Number from '../../lib/component/components/Number.js';
import type { NumberStatus } from '../../lib/component/components/Number.js';
import type { BooleanStatus } from '../../lib/component/components/Boolean.js';
import { safeAddCapability, safeSetCapabilityValue } from '../../lib/safeFunctions.js';
import type Enum from '../../lib/component/components/Enum.js';
import type { EnumStatus } from '../../lib/component/components/Enum.js';
import type Object from '../../lib/component/components/Object.js';
import type { ObjectStatus } from '../../lib/component/components/Object.js';

type PhaseInfoObject = {
  counter: {
    /**
     * Aggregated total active energy
     *
     * In kWh
     */
    total: number;
    /**
     * Unix timestamp marking the start of the current minute (in UTC).
     */
    minute_ts: number;
    /**
     * Energy consumption in ??? for the last three complete minutes.
     * The 0-th element indicates the counts accumulated during the minute preceding minute_ts.
     *
     * Present only if the device clock is synced.
     */
    by_minute: [0, 0, 0];
  };
  total_current: 0;
  /** kW */
  total_power: 0;
  /** kWh */
  total_act_energy: 0;
  phase_a: {
    voltage: 233;
    current: 0;
    /** kW */
    power: 0;
  };
  phase_b: {
    voltage: 233.6;
    current: 0;
    /** kW */
    power: 0;
  };
  phase_c: {
    voltage: 230.4;
    current: 0;
    /** kW */
    power: 0;
  };
};

// https://shelly-api-docs.shelly.cloud/gen2/Devices/ShellyX/XT1/TopACPortableEVCharger
export default class Eve01LocalDevice extends ShellyLocalDevice {
  protected async registerComponent(
    virtualComponent: InstanceType<MappedComponent>,
    methods: ComponentMethod<NameSpace>[],
  ): Promise<void> {
    const role = virtualComponent.attrs?.role;
    switch (role) {
      case 'start_charging':
        await this.registerStartCharging(virtualComponent as Boolean);
        await virtualComponent.setInitialValues(this);
        return;
      case 'work_state':
        await this.registerWorkState(virtualComponent as Enum);
        await virtualComponent.setInitialValues(this);
        return;
      case 'current_limit':
        // TODO
        break;
      case 'energy_charge':
        await this.registerEnergyCharge(virtualComponent as Number);
        await virtualComponent.setInitialValues(this);
        return;
      case 'time_charge':
        await this.registerTimeCharge(virtualComponent as Number);
        await virtualComponent.setInitialValues(this);
        return;
      case 'phase_info':
        await this.registerPhaseInfo(virtualComponent as Object);
        await virtualComponent.setInitialValues(this);
        return;
      default: {
        await virtualComponent.registerHomeyDevice(this, methods as never);
        await virtualComponent.setInitialValues(this);
      }
    }
  }

  private async registerWorkState(virtualComponent: Enum): Promise<void> {
    await virtualComponent.registerCapability(this, 'evcharger_charging_state', undefined);

    virtualComponent.onStatusUpdate = async (
      _homeyDevice: ShellyLocalDevice,
      status: Partial<EnumStatus>,
    ): Promise<void> => {
      if (status.value !== undefined) {
        await safeSetCapabilityValue(this, 'evcharger_charging_state', status.value);
      }
    };
  }

  private async registerStartCharging(virtualComponent: Boolean): Promise<void> {
    await virtualComponent.registerCapability(this, 'evcharger_charging', undefined, async (value: boolean) => {
      const channel = this.virtualDevice?.getChannel();
      if (channel === undefined) {
        throw new Error(this.homey.__('error.host_unreachable'));
      }
      await virtualComponent.Set(channel, { value });
    });

    virtualComponent.onStatusUpdate = async (
      _homeyDevice: ShellyLocalDevice,
      status: Partial<BooleanStatus>,
    ): Promise<void> => {
      if (status.value !== undefined) {
        await safeSetCapabilityValue(this, 'evcharger_charging', status.value);
      }
    };
  }

  private async registerEnergyCharge(virtualComponent: Number): Promise<void> {
    await safeAddCapability(this, 'meter_power.session');

    virtualComponent.onStatusUpdate = async (
      _homeyDevice: ShellyLocalDevice,
      status: Partial<NumberStatus>,
    ): Promise<void> => {
      if (status.value !== undefined) {
        await safeSetCapabilityValue(this, 'meter_power.session', status.value);
      }
    };
  }

  private async registerPhaseInfo(virtualComponent: Object): Promise<void> {
    await safeAddCapability(this, 'meter_power');
    await safeAddCapability(this, 'meter_power.active');

    await safeAddCapability(this, 'measure_power');
    await safeAddCapability(this, 'measure_current');

    await safeAddCapability(this, 'measure_power.phase_a');
    await safeAddCapability(this, 'measure_current.phase_a');
    await safeAddCapability(this, 'measure_voltage.phase_a');

    await safeAddCapability(this, 'measure_power.phase_b');
    await safeAddCapability(this, 'measure_current.phase_b');
    await safeAddCapability(this, 'measure_voltage.phase_b');

    await safeAddCapability(this, 'measure_power.phase_c');
    await safeAddCapability(this, 'measure_current.phase_c');
    await safeAddCapability(this, 'measure_voltage.phase_c');

    virtualComponent.onStatusUpdate = async (
      _homeyDevice: ShellyLocalDevice,
      status: Partial<ObjectStatus>,
    ): Promise<void> => {
      if (status.value !== undefined) {
        const phaseInfo = status.value as PhaseInfoObject | null;

        await safeSetCapabilityValue(this, 'meter_power', phaseInfo?.counter.total ?? null);
        await safeSetCapabilityValue(this, 'meter_power.active', phaseInfo?.total_act_energy ?? null);

        await safeSetCapabilityValue(this, 'measure_power', phaseInfo === null ? null : phaseInfo.total_power * 1000);
        await safeSetCapabilityValue(this, 'measure_current', phaseInfo?.total_current ?? null);

        await safeSetCapabilityValue(
          this,
          'measure_power.phase_a',
          phaseInfo === null ? null : phaseInfo.phase_a.power * 1000,
        );
        await safeSetCapabilityValue(this, 'measure_current.phase_a', phaseInfo?.phase_a.current ?? null);
        await safeSetCapabilityValue(this, 'measure_voltage.phase_a', phaseInfo?.phase_a.voltage ?? null);

        await safeSetCapabilityValue(
          this,
          'measure_power.phase_b',
          phaseInfo === null ? null : phaseInfo?.phase_b.power * 1000,
        );
        await safeSetCapabilityValue(this, 'measure_current.phase_b', phaseInfo?.phase_b.current ?? null);
        await safeSetCapabilityValue(this, 'measure_voltage.phase_b', phaseInfo?.phase_b.voltage ?? null);

        await safeSetCapabilityValue(
          this,
          'measure_power.phase_c',
          phaseInfo === null ? null : phaseInfo.phase_c.power * 1000,
        );
        await safeSetCapabilityValue(this, 'measure_current.phase_c', phaseInfo?.phase_c.current ?? null);
        await safeSetCapabilityValue(this, 'measure_voltage.phase_c', phaseInfo?.phase_c.voltage ?? null);
      }
    };
  }

  private async registerTimeCharge(virtualComponent: Number): Promise<void> {
    await safeAddCapability(this, 'shelly_charge_time');

    virtualComponent.onStatusUpdate = async (
      _homeyDevice: ShellyLocalDevice,
      status: Partial<NumberStatus>,
    ): Promise<void> => {
      if (status.value !== undefined) {
        const value = status.value;
        await safeSetCapabilityValue(this, 'shelly_charge_time', value);
      }
    };
  }
}
