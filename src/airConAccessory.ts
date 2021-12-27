import { CharacteristicValue, PlatformAccessory, Service } from 'homebridge';
import { NatureRemoPlatform } from './platform';

export class NatureNemoAirConAccessory {
  private readonly service: Service;
  private readonly name: string;
  private readonly id: string;
  private readonly deviceId: string;

  private state = {
    targetHeatingCoolingState: this.platform.Characteristic.TargetHeatingCoolingState.OFF,
    targetTemperature: 24,
  };

  constructor(
    private readonly platform: NatureRemoPlatform,
    private readonly accessory: PlatformAccessory,
  ) {
    this.accessory.category = this.platform.api.hap.Categories.AIR_CONDITIONER;

    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, this.accessory.context.appliance.model.manufacturer)
      .setCharacteristic(this.platform.Characteristic.Model, this.accessory.context.appliance.model.name)
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.accessory.context.appliance.id)
      .setCharacteristic(this.platform.Characteristic.Name, this.accessory.context.appliance.nickname);

    this.service
      = this.accessory.getService(this.platform.Service.Thermostat) || this.accessory.addService(this.platform.Service.Thermostat);
    this.service.setCharacteristic(this.platform.Characteristic.TemperatureDisplayUnits,
      this.platform.Characteristic.TemperatureDisplayUnits.CELSIUS);
    this.service.getCharacteristic(this.platform.Characteristic.CurrentHeatingCoolingState)
      .onGet(this.getCurrentHeatingCoolingState.bind(this));
    this.service.getCharacteristic(this.platform.Characteristic.TargetHeatingCoolingState)
      .onGet(this.getTargetHeatingCoolingState.bind(this))
      .onSet(this.setTargetHeatingCoolingState.bind(this));
    this.service.getCharacteristic(this.platform.Characteristic.CurrentTemperature)
      .onGet(this.getCurrentTemperature.bind(this));
    this.service.getCharacteristic(this.platform.Characteristic.TargetTemperature)
      .onGet(this.getTargetTemperature.bind(this))
      .onSet(this.setTargetTemperature.bind(this));

    this.platform.logger.debug('[%s] id -> %s', this.accessory.context.appliance.nickname, this.accessory.context.appliance.id);
    this.name = this.accessory.context.appliance.nickname;
    this.id = this.accessory.context.appliance.id;
    this.deviceId = this.accessory.context.appliance.device.id;
  }

  async getCurrentHeatingCoolingState(): Promise<CharacteristicValue> {
    this.platform.logger.debug('getCurrentHeatingCoolingState called');
    try {
      const airConState = await this.platform.natureRemoApi.getAirConState(this.id);
      this.platform.logger.info('[%s] Current Heater Cooler State -> %s, %s', this.name, airConState.on, airConState.mode);
      return this.convertHeatingCoolingState(airConState.on, airConState.mode);
    } catch (err) {
      if (err instanceof Error) {
        this.platform.logger.error(err.message);
      }
      throw err;
    }
  }

  async getTargetHeatingCoolingState(): Promise<CharacteristicValue> {
    this.platform.logger.debug('getTargetHeatingCoolingState called');
    try {
      const airConState = await this.platform.natureRemoApi.getAirConState(this.id);
      this.platform.logger.info('[%s] Target Heater Cooler State -> %s, %s', this.name, airConState.on, airConState.mode);
      const state = this.convertHeatingCoolingState(airConState.on, airConState.mode);
      this.state.targetHeatingCoolingState = state;
      return state;
    } catch (err) {
      if (err instanceof Error) {
        this.platform.logger.error(err.message);
      }
      throw err;
    }
  }

  async setTargetHeatingCoolingState(value: CharacteristicValue): Promise<void> {
    this.platform.logger.debug('setTargetHeatingCoolingState called ->', value);
    if (typeof value !== 'number') {
      throw new Error('value must be a number');
    }
    if (value === this.state.targetHeatingCoolingState) {
      this.platform.logger.debug('[%s] Same state. skip sending', this.name);
      return;
    }
    this.state.targetHeatingCoolingState = value;
    try {
      if (value === this.platform.Characteristic.TargetHeatingCoolingState.AUTO) {
        throw new Error('This plugin does not support auto');
      } else if (value === this.platform.Characteristic.TargetHeatingCoolingState.OFF) {
        await this.platform.natureRemoApi.setAirconPowerOff(this.id);
        this.platform.logger.info('[%s] Target Heater Cooler State <- OFF', this.name);
      } else {
        const mode = this.convertOperationMode(value);
        await this.platform.natureRemoApi.setAirconOperationMode(this.id, mode);
        this.platform.logger.info('[%s] Target Heater Cooler State <- %s', this.name, mode);
      }
    } catch (err) {
      if (err instanceof Error) {
        this.platform.logger.error(err.message);
      }
      throw err;
    }
  }

  async getCurrentTemperature(): Promise<CharacteristicValue> {
    try {
      const sensorValue = await this.platform.natureRemoApi.getSensorValue(this.deviceId);
      this.platform.logger.info('[%s] Current Temperature -> %s', this.name, sensorValue.te);
      if (sensorValue.te) {
        return sensorValue.te;
      } else {
        throw new Error('cannnot get sensor value');
      }
    } catch (err) {
      if (err instanceof Error) {
        this.platform.logger.error(err.message);
      }
      throw err;
    }
  }

  async getTargetTemperature(): Promise<CharacteristicValue> {
    this.platform.logger.debug('getTargetTemperature called');
    try {
      const airConState = await this.platform.natureRemoApi.getAirConState(this.id);
      this.platform.logger.info('[%s] Target Temperature -> %s', this.name, airConState.temp);
      this.state.targetTemperature = parseFloat(airConState.temp);
      return airConState.temp;
    } catch (err) {
      if (err instanceof Error) {
        this.platform.logger.error(err.message);
      }
      throw err;
    }
  }

  async setTargetTemperature(value: CharacteristicValue): Promise<void> {
    this.platform.logger.debug('setTargetTemperature called ->', value);
    if (typeof value !== 'number') {
      throw new Error('value must be a number');
    }
    if (value === this.state.targetTemperature) {
      this.platform.logger.debug('[%s] Same state. skip sending', this.name);
      return;
    }
    this.state.targetTemperature = value;
    const targetTemp = `${Math.round(value)}`;
    try {
      await this.platform.natureRemoApi.setAirconTemperature(this.id, targetTemp);
      this.platform.logger.info('[%s] Target Temperature <- %s', this.name, targetTemp);
    } catch (err) {
      if (err instanceof Error) {
        this.platform.logger.error(err.message);
      }
      throw err;
    }
  }

  private convertHeatingCoolingState(on: boolean, mode: string): number {
    if (!on) {
      return this.platform.Characteristic.CurrentHeatingCoolingState.OFF;
    } else {
      if (mode === 'warm') {
        return this.platform.Characteristic.CurrentHeatingCoolingState.HEAT;
      } else if (mode === 'cool') {
        return this.platform.Characteristic.CurrentHeatingCoolingState.COOL;
      } else {
        throw new Error(`This plugin does not support ${mode}`);
      }
    }
  }

  private convertOperationMode(state: number): string {
    if (state === this.platform.Characteristic.TargetHeatingCoolingState.HEAT) {
      return 'warm';
    } else if (state === this.platform.Characteristic.TargetHeatingCoolingState.COOL) {
      return 'cool';
    } else {
      throw new Error(`This plugin does not support ${state}`);
    }
  }
}
