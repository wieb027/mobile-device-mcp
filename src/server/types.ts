import type { ManagedSubprocess } from "./runtime.js";

export type Platform = "android" | "ios";
export type DeviceType = "simulator" | "device";

export interface DiscoveredDevice {
    id: string;
    platform: Platform;
    name: string;
    state: string;
    deviceType?: DeviceType; // iOS only
}

export interface RegisteredDevice {
    id: string;
    platform: Platform;
    deviceType?: DeviceType;
    port: number;
    authToken: string;
    serverProcess: ManagedSubprocess;
    tunnelProcess?: ManagedSubprocess; // iOS real devices only
}
