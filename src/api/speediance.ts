import type {
  Config,
  ExerciseLibraryStore,
  ExerciseGroup,
  ExerciseDetail,
  ExerciseStep,
  ExerciseMuscles,
  ExerciseMuscleStore,
} from "../types";

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

  async fetchExerciseLibrary(deviceType: number): Promise<ExerciseLibraryStore> {
    // 1. Tabs
    const tabsBody = await this.request(
      "GET",
      `${this.baseUrl}/api/app/actionLibraryTab/list?deviceType=${deviceType}`,
      { headers: this.getHeaders() },
    );
    const tabs = (tabsBody.data ?? []) as Array<{ id: number; name: string }>;

    // 2. Exercises per tab (deduplicated by id)
    const exerciseMap = new Map<number, Record<string, unknown>>();
    for (const tab of tabs) {
      const groupsBody = await this.request(
        "GET",
        `${this.baseUrl}/api/app/actionLibraryGroup/trainingPartGroup?tabId=${tab.id}&deviceTypeList=${deviceType}`,
        { headers: this.getHeaders() },
      );
      const muscleGroups = (groupsBody.data ?? []) as Array<{
        actionLibraryGroupList?: Record<string, unknown>[];
      }>;
      for (const mg of muscleGroups) {
        for (const ex of mg.actionLibraryGroupList ?? []) {
          const id = ex.id as number;
          if (!exerciseMap.has(id)) {
            exerciseMap.set(id, { ...ex, category_id: tab.id, category_name: tab.name });
          }
        }
      }
    }

    // 3. Batch details (actionLibraryList, isUnilateral) — chunked + parallel to avoid URI too large
    const ids = Array.from(exerciseMap.keys());
    const CHUNK_SIZE = 50;
    const chunks: number[][] = [];
    for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
      chunks.push(ids.slice(i, i + CHUNK_SIZE));
    }
    const chunkResults = await Promise.all(
      chunks.map((chunk) => {
        const query = chunk.map((id) => `ids=${id}`).join("&");
        return this.request(
          "GET",
          `${this.baseUrl}/api/app/actionLibraryGroup/list?${query}`,
          { headers: this.getHeaders() },
        ).then((body) => (body.data ?? []) as Record<string, unknown>[]);
      }),
    );
    const details = chunkResults.flat();

    const exercises: ExerciseGroup[] = details.map((d) => {
      const base = exerciseMap.get(d.id as number) ?? {};
      const rawVariants = (d.actionLibraryList ?? []) as Array<{ id: number }>;
      return {
        id: d.id as number,
        name: String(d.name ?? base.name ?? "Unknown"),
        category_id: base.category_id as number,
        category_name: String(base.category_name ?? ""),
        actionLibraryList: rawVariants.slice(0, 1).map((v) => ({ id: v.id })),
        mainMuscleGroupName: String(d.mainMuscleGroupName ?? ""),
        accessories: String(d.accessories ?? ""),
      };
    });

    return {
      device_type: deviceType,
      fetched_at: new Date().toISOString(),
      tabs,
      exercises,
    };
  }

  async getExerciseDetail(groupId: number): Promise<ExerciseDetail> {
    const body = await this.request(
      "GET",
      `${this.baseUrl}/api/app/actionLibraryGroup/${groupId}?isDisplay=1`,
      { headers: this.getHeaders() },
    );
    const d = (body.data ?? {}) as Record<string, unknown>;

    let showDetails: ExerciseStep[] = [];
    try {
      showDetails = JSON.parse((d.showDetails as string) ?? "[]") as ExerciseStep[];
    } catch { /* ignore parse errors */ }

    const rawVariants = (d.actionLibraryList ?? []) as Array<{
      id: number;
      videoPath?: string;
      leftVideo?: string;
      rightVideo?: string;
    }>;

    return {
      id: groupId,
      isUnilateral: Boolean(d.isLeftRight),
      showDetails,
      actionLibraryList: rawVariants.map((v) => ({
        id: v.id,
        videoPath: v.videoPath,
        leftVideo: v.leftVideo,
        rightVideo: v.rightVideo,
      })),
    };
  }

  async saveTemplate(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    const body = await this.request("POST", `${this.baseUrl}/api/app/v2/customTrainingTemplate`, {
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });
    return (body.data ?? {}) as Record<string, unknown>;
  }

  async deleteTemplate(id: number): Promise<void> {
    await this.request("DELETE", `${this.baseUrl}/api/app/customTrainingTemplate?ids=${id}`, {
      headers: this.getHeaders(),
    });
  }

  /**
   * Muscle metadata for the given exercise group ids.
   *
   * There is no muscle-report endpoint — per-muscle volume is derived by
   * joining training records to this. Fetches only the ids actually present in
   * the user's records rather than reusing the cached exercise library, which
   * omits auxiliary muscles and covers a single tab.
   *
   * Ids are chunked at 50 for URI length. A record can reference an exercise
   * the library no longer returns (one delisted mobility exercise was observed),
   * so anything missing is reported back rather than silently dropped.
   */
  async fetchExerciseMuscles(groupIds: number[]): Promise<ExerciseMuscleStore> {
    const CHUNK_SIZE = 50;
    const chunks: number[][] = [];
    for (let i = 0; i < groupIds.length; i += CHUNK_SIZE) {
      chunks.push(groupIds.slice(i, i + CHUNK_SIZE));
    }

    const results = await Promise.all(
      chunks.map((chunk) =>
        this.request(
          "GET",
          `${this.baseUrl}/api/app/actionLibraryGroup/list?${chunk.map((id) => `ids=${id}`).join("&")}`,
          { headers: this.getHeaders() },
        ).then((body) => (body.data ?? []) as Record<string, unknown>[]),
      ),
    );

    const byGroupId: Record<string, ExerciseMuscles> = {};
    for (const group of results.flat()) {
      const id = group.id as number;
      if (typeof id !== "number") continue;

      /*
       * Union of primary and auxiliary. A muscle can appear in both lists (Abs
       * does), so this must deduplicate or that exercise counts twice.
       */
      const names = new Set<string>();
      for (const key of ["mainMuscleGroupList", "auxiliaryMuscleGroupList"]) {
        for (const m of (group[key] ?? []) as Record<string, unknown>[]) {
          const name = m?.categoryName;
          if (typeof name === "string" && name) names.add(name);
        }
      }

      byGroupId[String(id)] = {
        trainingPartId2: group.trainingPartId2 as number | undefined,
        muscles: [...names],
      };
    }

    return {
      byGroupId,
      fetched_at: new Date().toISOString(),
      unresolved: groupIds.filter((id) => !(String(id) in byGroupId)),
    };
  }
}
