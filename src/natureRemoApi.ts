import { URLSearchParams } from 'url';
import { Mutex } from 'async-mutex';
import axios, { AxiosError } from 'axios';
import { API, HapStatusError, Logger } from 'homebridge';
import { ACButton, AirConParams, Appliance, Device, LIGHTState, OperationMode } from './types';
import { API_URL, CACHE_THRESHOLD } from './settings';

interface Cache {
  updated: number;
}

interface ApplianceCache extends Cache {
  appliances: Appliance[] | null;
}

interface DeviceCache extends Cache {
  devices: Device[] | null;
}

type AirConSettings = { button?: ACButton; operation_mode?: OperationMode; temperature?: string };

export class NatureRemoApi {

  private readonly mutex = new Mutex();

  private applianceCache: ApplianceCache = { updated: 0, appliances: null };
  private deviceCache: DeviceCache = { updated: 0, devices: null };

  constructor(
    private readonly logger: Logger,
    private readonly api: API,
    accessToken: string) {
    axios.defaults.baseURL = API_URL;
    axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
    axios.defaults.headers.post['Content-Type'] = 'application/x-www-form-urlencoded';
  }

  async getAllAppliances(): Promise<Appliance[]> {
    return await this.mutex.runExclusive(async () => {
      if (this.applianceCache.appliances && (Date.now() - this.applianceCache.updated) < CACHE_THRESHOLD) {
        return this.applianceCache.appliances;
      }
      const appliances = (await this.getMessage('/appliances')) as Appliance[];
      this.applianceCache = { updated: Date.now(), appliances: appliances };
      return appliances;
    });
  }

  async getAllDevices(): Promise<Device[]> {
    return await this.mutex.runExclusive(async () => {
      if (this.deviceCache.devices && (Date.now() - this.deviceCache.updated) < CACHE_THRESHOLD) {
        return this.deviceCache.devices;
      }
      const devices = (await this.getMessage('/devices')) as Device[];
      this.deviceCache = { updated: Date.now(), devices: devices };
      return devices;
    });
  }

  async getAirConState(id: string): Promise<AirConParams> {
    const appliances = await this.getAllAppliances();
    const appliance = appliances.find(val => val.type === 'AC' && val.id === id);
    if (appliance?.settings === undefined) {
      throw new this.api.hap.HapStatusError(this.api.hap.HAPStatus.RESOURCE_DOES_NOT_EXIST);
    }
    return appliance.settings;
  }

  async getLightState(id: string): Promise<LIGHTState> {
    const appliances = await this.getAllAppliances();
    const appliance = appliances.find(val => val.type === 'LIGHT' && val.id === id);
    if (appliance?.light === undefined) {
      throw new this.api.hap.HapStatusError(this.api.hap.HAPStatus.RESOURCE_DOES_NOT_EXIST);
    }
    return appliance.light.state;
  }

  async getDevice(id: string): Promise<Device> {
    const devices = await this.getAllDevices();
    const device = devices.find(val => val.id === id);
    if (device === undefined) {
      throw new this.api.hap.HapStatusError(this.api.hap.HAPStatus.RESOURCE_DOES_NOT_EXIST);
    }
    return device;
  }

  async setLight(applianceId: string, power: 'on' | 'off'): Promise<void> {
    const url = `/appliances/${applianceId}/light`;
    this.postMessage(url, { 'button': power });
  }

  async setAirconPowerOff(applianceId: string): Promise<void> {
    this.setAirconSettings(applianceId, { 'button': 'power-off'});
  }

  async setAirconOperationMode(applianceId: string, operationMode: OperationMode): Promise<void> {
    this.setAirconSettings(applianceId, { 'operation_mode': operationMode, 'button': '' });
  }

  async setAirconTemperature(applianceId: string, temperature: string): Promise<void> {
    this.setAirconSettings(applianceId, { 'temperature': temperature });
  }

  async setTvButton(applianceId: string, button: string): Promise<void> {
    const url = `/appliances/${applianceId}/tv`;
    this.postMessage(url, { 'button': button });
  }

  private async setAirconSettings(applianceId: string, settings: AirConSettings): Promise<void> {
    const url = `/appliances/${applianceId}/aircon_settings`;
    this.postMessage(url, settings);
  }

  private async getMessage(url: string): Promise<Appliance[] | Device[]> {
    try {
      const res = await axios.get(url);
      return res.data;
    } catch (err) {
      throw this.convertToHapStatusError(err as AxiosError);
    }
  }

  private async postMessage(url: string, params: Record<string, string>): Promise<void> {
    try {
      const data = new URLSearchParams(params);
      await axios.post(url, data.toString());
    } catch (err) {
      throw this.convertToHapStatusError(err as AxiosError);
    }
  }

  private convertToHapStatusError(error: AxiosError): HapStatusError {
    if (error.response?.status === 401) {
      this.logger.error('Authorization error. Access token is wrong.');
      return new this.api.hap.HapStatusError(this.api.hap.HAPStatus.INSUFFICIENT_AUTHORIZATION);
    } else if (error.response?.status === 429) {
      const rateLimitLimit = error.response?.headers['x-rate-limit-limit'];
      const rateLimitReset = error.response?.headers['x-rate-limit-reset'];
      const rateLimitRemaining = error.response?.headers['x-rate-limit-remaining'];
      this.logger.error(`Too Many Requests error. ${rateLimitLimit}, ${rateLimitReset}, ${rateLimitRemaining}`);
      return new this.api.hap.HapStatusError(this.api.hap.HAPStatus.RESOURCE_BUSY);
    } else {
      this.logger.error(`HTTP error. status code ->  ${error.response?.status}`);
      return new this.api.hap.HapStatusError(this.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }
  }
}
