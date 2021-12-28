export type ApplianceType = 'AC' | 'TV' | 'LIGHT' | 'IR' | 'EL_SMART_METER';
export type Id = string;
export type Image = string;
export type DateTime = string;
export type OperationMode = '' | 'cool' | 'warm' | 'dry' | 'blow' | 'auto';
export type Temperature = string;
export type AirVolume = '' | 'auto' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10';
export type AirDirection = string;
export type ACButton = '' | 'power-off';

export interface User {
  id: Id;
  nickname: string;
  superuser: boolean;
}

export interface DeviceCore {
  id: Id;
  name: string;
  temperature_offset: number;
  humidity_offset: number;
  created_at: DateTime;
  updated_at: DateTime;
  firmware_version: string;
  mac_address: string;
  bt_mac_address: string;
  serial_number: string;
}

export interface Device extends DeviceCore {
  users: User[];
  newest_events: {
    te?: SensorValue;
    hu?: SensorValue;
    il?: SensorValue;
    mo?: SensorValue;
  };
}

export interface Appliance {
  id: Id;
  device: Device;
  model: ApplianceModel;
  nickname: string;
  image: Image;
  type: ApplianceType;
  settings?: AirConParams;
  aircon?: AirCon;
  signals: Signal[];
  tv?: TV;
  light?: LIGHT;
  smart_meter?: SmartMeter;
}

export interface AirConParams {
  temp: Temperature;
  temp_unit: '' | 'c' | 'f';
  mode: OperationMode;
  vol: AirVolume;
  dir: AirDirection;
  dirh: AirDirection;
  button: ACButton;
  updated_at: DateTime;
}

export interface AirCon {
  range: {
    modes: {
      cool: AirConRangeMode;
      warm: AirConRangeMode;
      dry: AirConRangeMode;
      blow: AirConRangeMode;
      auto: AirConRangeMode;
    };
    fixedButtons: ACButton[];
  };
  tempUnit: '' | 'c' | 'f';
}

export interface AirConRangeMode {
  temp: Temperature[];
  vol: AirVolume;
  dir: AirDirection;
  dirh: AirDirection;
}

export interface Signal {
  id: Id;
  name: string;
  image: Image;
}

export interface ApplianceModel {
  id: Id;
  manufacturer: string;
  remote_name?: string;
  name: string;
  image: Image;
  country?: string;
  series?: string;
}

export interface ApplianceModelAndParam {
  model: ApplianceModel;
  params: AirConParams;
}

export interface SensorValue {
  val: number;
  created_at: DateTime;
}

export interface TV {
  state: TVState;
  buttons: Button[];
}

export interface LIGHT {
  state: LIGHTState;
  buttons: Button[];
}

export interface Button {
  name: string;
  image: Image;
  label: string;
}

export interface TVState {
  input: 't' | 'bs' | 'cs';
}

export interface LIGHTState {
  brightness: string;
  power: 'on' | 'off';
  last_button: string;
}

export interface SmartMeter {
  echonetlite_properties: EchonetLiteProperty[];
}

export interface EchonetLiteProperty {
  name: string;
  epc: number;
  val: string;
  updated_at: DateTime;
}
