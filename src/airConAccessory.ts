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
    this.name = this.accessory.context.appliance.nickname;
    this.id = this.accessory.context.appliance.id;
    this.deviceId = this.accessory.context.appliance.device.id;

    this.accessory.category = this.platform.api.hap.Categories.AIR_CONDITIONER;

    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, this.accessory.context.appliance.model.manufacturer)
      .setCharacteristic(this.platform.Characteristic.Model, this.accessory.context.appliance.model.name)
      .setCharacteristic(this.platform.Characteristic.FirmwareRevision, this.accessory.context.appliance.device.firmware_version)
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.id)
      .setCharacteristic(this.platform.Characteristic.Name, this.name);

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

    this.platform.logger.debug('[%s] id -> %s', this.name, this.id);
  }

  async getCurrentHeatingCoolingState(): Promise<CharacteristicValue> {
    this.platform.logger.debug('getCurrentHeatingCoolingState called');
    const airConState = await this.platform.natureRemoApi.getAirConState(this.id);
    this.platform.logger.info('[%s] Current Heater Cooler State -> %s, %s', this.name, airConState.button || 'power-on', airConState.mode);
    return this.convertHeatingCoolingState(airConState.button, airConState.mode);
  }

  async getTargetHeatingCoolingState(): Promise<CharacteristicValue> {
    this.platform.logger.debug('getTargetHeatingCoolingState called');
    const airConState = await this.platform.natureRemoApi.getAirConState(this.id);
    this.platform.logger.info('[%s] Target Heater Cooler State -> %s, %s', this.name, airConState.button || 'power-on', airConState.mode);
    const state = this.convertHeatingCoolingState(airConState.button, airConState.mode);
    this.state.targetHeatingCoolingState = state;
    return state;
  }

  async setTargetHeatingCoolingState(value: CharacteristicValue): Promise<void> {
    this.platform.logger.debug('setTargetHeatingCoolingState called ->', value);
    if (typeof value !== 'number') {
      throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.INVALID_VALUE_IN_REQUEST);
    }
    if (value === this.state.targetHeatingCoolingState) {
      this.platform.logger.debug('[%s] Same state. skip sending', this.name);
      return;
    }
    if (value === this.platform.Characteristic.TargetHeatingCoolingState.AUTO) {
      this.platform.logger.error('This plugin does not support auto');
      throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.INVALID_VALUE_IN_REQUEST);
    } else if (value === this.platform.Characteristic.TargetHeatingCoolingState.OFF) {
      await this.platform.natureRemoApi.setAirconPowerOff(this.id);
      this.platform.logger.info('[%s] Target Heater Cooler State <- OFF', this.name);
      this.state.targetHeatingCoolingState = value;
    } else {
      const mode = this.convertOperationMode(value);
      await this.platform.natureRemoApi.setAirconOperationMode(this.id, mode);
      this.platform.logger.info('[%s] Target Heater Cooler State <- %s', this.name, mode);
      this.state.targetHeatingCoolingState = value;
    }
  }

  async getCurrentTemperature(): Promise<CharacteristicValue> {
    const device = await this.platform.natureRemoApi.getDevice(this.deviceId);
    if (device.newest_events.te) {
      this.platform.logger.info('[%s] Current Temperature -> %s', this.name, device.newest_events.te.val);
      return device.newest_events.te.val;
    } else {
      throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.RESOURCE_DOES_NOT_EXIST);
    }
  }

  async getTargetTemperature(): Promise<CharacteristicValue> {
    this.platform.logger.debug('getTargetTemperature called');
    const airConState = await this.platform.natureRemoApi.getAirConState(this.id);
    this.platform.logger.info('[%s] Target Temperature -> %s', this.name, airConState.temp);
    this.state.targetTemperature = parseFloat(airConState.temp);
    return airConState.temp;
  }

  async setTargetTemperature(value: CharacteristicValue): Promise<void> {
    this.platform.logger.debug('setTargetTemperature called ->', value);
    if (typeof value !== 'number') {
      throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.INVALID_VALUE_IN_REQUEST);
    }
    if (value === this.state.targetTemperature) {
      this.platform.logger.debug('[%s] Same state. skip sending', this.name);
      return;
    }
    this.state.targetTemperature = value;
    const targetTemp = `${Math.round(value)}`;
    await this.platform.natureRemoApi.setAirconTemperature(this.id, targetTemp);
    this.platform.logger.info('[%s] Target Temperature <- %s', this.name, targetTemp);
  }

  private convertHeatingCoolingState(button: string, mode: string): number {
    if (button === 'power-off') {
      return this.platform.Characteristic.CurrentHeatingCoolingState.OFF;
    } else {
      if (mode === 'warm') {
        return this.platform.Characteristic.CurrentHeatingCoolingState.HEAT;
      } else if (mode === 'cool') {
        return this.platform.Characteristic.CurrentHeatingCoolingState.COOL;
      } else {
        throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.INVALID_VALUE_IN_REQUEST);
      }
    }
  }

  private convertOperationMode(state: number): 'warm' | 'cool' {
    if (state === this.platform.Characteristic.TargetHeatingCoolingState.HEAT) {
      return 'warm';
    } else if (state === this.platform.Characteristic.TargetHeatingCoolingState.COOL) {
      return 'cool';
    } else {
      throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.INVALID_VALUE_IN_REQUEST);
    }
  }
}
