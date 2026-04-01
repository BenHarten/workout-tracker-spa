import type { Config } from "../types";

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

const TYPE_MAP: Record<number, string> = { 2: "course", 5: "custom", 6: "plan" };

export function getTrainingType(typeCode: number): string | undefined {
  return TYPE_MAP[typeCode];
}

export class SpeedianceClient {
  private config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  get isLoggedIn(): boolean {
    return !!this.config.token;
  }

  updateConfig(config: Config) {
    this.config = config;
  }

  private get host(): string {
    return this.config.region === "EU"
      ? "euapi.speediance.com"
      : "api2.speediance.com";
  }

  private get baseUrl(): string {
    return `https://${this.host}`;
  }

  private getHeaders(): Record<string, string> {
    return {
      App_user_id: this.config.user_id,
      Token: this.config.token,
      Timestamp: String(Date.now()),
      Utc_offset: "+0000",
      Versioncode: "40304",
      Mobiledevices:
        '{"brand":"google","device":"emulator64_x86_64_arm64","deviceType":"sdk_gphone64_x86_64","os":"","os_version":"31","manufacturer":"Google"}',
      Timezone: "GMT",
      "Accept-Language": "en",
      App_type: "SOFTWARE",
      "Content-Type": "application/json",
    };
  }

  private getLoginHeaders(): Record<string, string> {
    return {
      Timestamp: String(Date.now()),
      Utc_offset: "+0000",
      Versioncode: "40304",
      Mobiledevices:
        '{"brand":"google","device":"emulator64_x86_64_arm64","deviceType":"sdk_gphone64_x86_64","os":"","os_version":"31","manufacturer":"Google"}',
      Timezone: "GMT",
      "Accept-Language": "en",
      App_type: "SOFTWARE",
      "Content-Type": "application/json",
    };
  }

  private async request(method: string, url: string, options?: RequestInit): Promise<Record<string, unknown>> {
    const resp = await fetch(url, { method, ...options });
    if (resp.status === 401) throw new AuthError("HTTP 401");

    const body = await resp.json();
    if (body?.code === 91) throw new AuthError("Unauthorized (code 91)");

    return body;
  }

  // ── Auth ──────────────────────────────────────────────────────

  async login(
    email: string,
    password: string,
    region: "EU" | "Global"
  ): Promise<{ success: boolean; message: string; token?: string; userId?: string }> {
    this.config = { ...this.config, region };
    const headers = this.getLoginHeaders();

    // Step 1: Verify identity
    const verifyBody = await this.request("POST", `${this.baseUrl}/api/app/v2/login/verifyIdentity`, {
      headers,
      body: JSON.stringify({ type: 2, userIdentity: email }),
    });

    const verifyData = (verifyBody.data ?? {}) as Record<string, unknown>;
    if (verifyData.isExist === false) {
      return { success: false, message: "Account does not exist. Register in the Speediance app first." };
    }
    if (verifyData.hasPwd === false) {
      return { success: false, message: "Account has no password. Set one in the Speediance app." };
    }

    // Step 2: Login with password
    const loginBody = await this.request("POST", `${this.baseUrl}/api/app/v2/login/byPass`, {
      headers,
      body: JSON.stringify({ userIdentity: email, password, type: 2 }),
    });

    const loginData = (loginBody.data ?? {}) as Record<string, unknown>;
    const token = loginData.token as string | undefined;
    const userId = loginData.appUserId as string | number | undefined;
    if (!token || !userId) {
      return { success: false, message: "Token or user ID missing in response" };
    }

    return { success: true, message: "Login successful", token, userId: String(userId) };
  }

  async logout(): Promise<void> {
    if (!this.isLoggedIn) return;
    try {
      await this.request("POST", `${this.baseUrl}/api/app/login/logout`, {
        headers: this.getHeaders(),
      });
    } catch {
      // Best-effort logout
    }
  }

  // ── Training Records ──────────────────────────────────────────

  async getTrainingRecords(startDate: string, endDate: string): Promise<unknown[]> {
    const url = `${this.baseUrl}/api/mobile/v2/report/userTrainingDataRecord?startDate=${startDate}&endDate=${endDate}`;
    const body = await this.request("GET", url, { headers: this.getHeaders() });
    return (body.data ?? []) as unknown[];
  }

  async getTrainingDetail(trainingId: number, trainingType: string): Promise<Record<string, unknown>> {
    let url: string;
    if (trainingType === "course") {
      url = `${this.baseUrl}/api/app/trainingInfo/courseTrainingInfoDetail/${trainingId}`;
    } else if (trainingType === "plan") {
      url = `${this.baseUrl}/api/app/trainingInfo/planTrainingInfoDetail/${trainingId}`;
    } else {
      url = `${this.baseUrl}/api/app/trainingInfo/cttTrainingInfoDetail/${trainingId}`;
    }
    const body = await this.request("GET", url, { headers: this.getHeaders() });
    return (body.data ?? {}) as Record<string, unknown>;
  }

  async getTrainingSessionInfo(trainingId: number, trainingType: string): Promise<Record<string, unknown>> {
    let url: string;
    if (trainingType === "plan") {
      url = `${this.baseUrl}/api/app/trainingInfo/planTrainingInfo/${trainingId}`;
    } else if (trainingType === "custom") {
      url = `${this.baseUrl}/api/app/trainingInfo/cttTrainingInfo/${trainingId}`;
    } else {
      url = `${this.baseUrl}/api/app/trainingInfo/courseTrainingInfo/${trainingId}`;
    }
    const body = await this.request("GET", url, { headers: this.getHeaders() });
    return (body.data ?? {}) as Record<string, unknown>;
  }

  // ── Workout Templates ─────────────────────────────────────────

  async getUserWorkouts(): Promise<unknown[]> {
    const url = `${this.baseUrl}/api/app/v4/customTrainingTemplate/appPage?pageNo=1&pageSize=-1&deviceTypes=${this.config.device_type}`;
    const body = await this.request("GET", url, { headers: this.getHeaders() });
    return (body.data ?? []) as unknown[];
  }

  async getWorkoutDetail(code: string): Promise<Record<string, unknown> | null> {
    const url = `${this.baseUrl}/api/app/v3/customTrainingTemplate/detailByCode?code=${code}`;
    const body = await this.request("GET", url, { headers: this.getHeaders() });
    return (body.data ?? null) as Record<string, unknown> | null;
  }
}
