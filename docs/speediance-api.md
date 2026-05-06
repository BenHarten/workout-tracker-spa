# Speediance API Reference

Endpoints used by `SpeedianceClient` (`src/api/speediance.ts`).

**Base URLs:**
- EU: `https://euapi.speediance.com`
- Global: `https://api2.speediance.com`

All authenticated requests require headers: `App_user_id`, `Token`, `Timestamp`, `Versioncode: 40304`, `App_type: SOFTWARE`, `Mobiledevices` (emulated Android device).

---

## Auth

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/app/v2/login/verifyIdentity` | Step 1 — check account exists and has a password. Body: `{ type: 2, userIdentity: email }`. Returns `{ isExist, hasPwd }`. |
| POST | `/api/app/v2/login/byPass` | Step 2 — login with password. Body: `{ userIdentity: email, password, type: 2 }`. Returns `{ token, appUserId }`. |
| POST | `/api/app/login/logout` | Invalidate session (best-effort). |

---

## Training Records

Training type codes: `2 = course`, `5 = custom`, `6 = plan`.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/mobile/v2/report/userTrainingDataRecord?startDate=&endDate=` | List training records in a date range. |
| GET | `/api/app/trainingInfo/courseTrainingInfoDetail/{id}` | Detail for a course training session. |
| GET | `/api/app/trainingInfo/planTrainingInfoDetail/{id}` | Detail for a plan training session. |
| GET | `/api/app/trainingInfo/cttTrainingInfoDetail/{id}` | Detail for a custom training session. |
| GET | `/api/app/trainingInfo/courseTrainingInfo/{id}` | Session info for a course. |
| GET | `/api/app/trainingInfo/planTrainingInfo/{id}` | Session info for a plan. |
| GET | `/api/app/trainingInfo/cttTrainingInfo/{id}` | Session info for a custom workout. |

---

## Workout Templates

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/app/v4/customTrainingTemplate/appPage?pageNo=1&pageSize=-1&deviceTypes=` | List all user workout templates. |
| GET | `/api/app/v3/customTrainingTemplate/detailByCode?code=` | Get template detail by code. |
| POST | `/api/app/v2/customTrainingTemplate` | Save / create a template. |
| DELETE | `/api/app/customTrainingTemplate?ids=` | Delete a template by ID. |

---

## Exercise Library

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/app/actionLibraryTab/list?deviceType=` | Fetch exercise category tabs. Returns `[{ id, name }]`. |
| GET | `/api/app/actionLibraryGroup/trainingPartGroup?tabId=&deviceTypeList=` | Fetch muscle groups + exercises per tab. |
| GET | `/api/app/actionLibraryGroup/list?ids=&ids=...` | Batch fetch exercise details (chunked in groups of 50 to avoid URI length limits). Returns `actionLibraryList`, `isUnilateral`, etc. |
| GET | `/api/app/actionLibraryGroup/{groupId}?isDisplay=1` | On-demand detail for one exercise group. Returns variants with video paths (`videoPath`, `leftVideo`, `rightVideo`) and `showDetails` (JSON-encoded steps). |

---

## Data Models

Full TypeScript definitions in `src/types/index.ts`. Key shapes:

### Training Record

```ts
TrainingRecord {
  id: number | string
  training_id: number | null
  date: string
  name: string
  duration: number        // seconds
  calories: number
  capacity: number
  type: "custom" | "plan" | "course" | "fitnote" | null
  start_time: string
  end_time: string
  detail: RecordDetail    // see below
  session_info: Record<string, unknown>
  raw: Record<string, unknown>
}
```

`RecordDetail` is a discriminated union — shape depends on source:
- **Speediance API**: `SpeedianceExercise[]` — each exercise has `finishedReps: FinishedRep[]` where `trainingInfoDetail.weights` holds per-set weight data
- **FitNote import**: `{ actionTrainingInfoList: FitNoteExercise[] }` — each exercise has `setTrainingInfoList: { reps, weight }[]`

```ts
SpeedianceExercise {
  actionLibraryName?: string
  actionName?: string
  actionLibraryGroupId?: number
  score?: number
  totalCapacity?: number
  maxWeight?: number
  finishedReps?: FinishedRep[]     // per-set data
  setTrainingInfoList?: SetInfo[]
}

FinishedRep {
  id: number
  finishedCount: number
  targetCount: number
  capacity: number
  time: number
  trainingInfoDetail?: {
    weights?: number[]
    leftWatts?: number[]
    rightWatts?: number[]
    leftAmplitudes?: number[]
    rightAmplitudes?: number[]
  }
}
```

### Exercise Library

```ts
ExerciseGroup {              // cached in library store (slim)
  id: number
  name: string
  category_id: number
  category_name: string
  actionLibraryList: { id: number }[]   // only first variant stored
  mainMuscleGroupName: string
  accessories: string
  // isUnilateral NOT cached — fetch on demand
}

ExerciseDetail {             // on-demand from /actionLibraryGroup/{id}
  id: number
  isUnilateral: boolean
  showDetails: { context: string; img: string }[]   // parsed from JSON string
  actionLibraryList: {
    id: number
    videoPath?: string
    leftVideo?: string
    rightVideo?: string
  }[]
}
```

### Config

```ts
Config {
  user_id: string
  token: string
  region: "EU" | "Global"
  unit: number
  device_type: number   // 1 = GymMonster, 2 = GymPal
}
```

---

## Notes

- Error code `91` in the response body means unauthorized — same as HTTP 401.
- `showDetails` on exercise detail is a JSON string, not an object — must be parsed separately.
- The exercise library fetch is a 3-step process: tabs → groups per tab → batch details. See `fetchExerciseLibrary()` for the full flow.
