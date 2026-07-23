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

## Muscle Engagement

**There is no muscle-report endpoint.** Per-muscle training volume is derived
client-side by joining training records to exercise metadata. This was verified
by reproducing a third-party client's published figures exactly (14/14 muscles,
30-day window) — see "Deriving muscle volume" below.

48 candidate paths under the `report/*` family were probed and all returned 404.
Only `/api/mobile/v2/report` exists as a prefix (`/api/mobile/report`,
`/api/mobile/v1|v3/report`, `/api/app/report`, `/api/app/v2/report` and
`/api/report` are all absent), and `userTrainingDataRecord` is its only known
member. An unknown path returns a plain HTTP 404, not a 200 with an error code,
so probing is unambiguous.

### Deriving muscle volume

1. Each exercise entry inside a training record's `detail` carries
   `actionLibraryGroupId` (populated on 100% of entries observed) plus its own
   `totalCapacity` and `trainingPartId2`.
2. `GET /api/app/actionLibraryGroup/list?ids=…` returns, per exercise group,
   `mainMuscleGroupList[]` and `auxiliaryMuscleGroupList[]`. Each entry has
   `configId`, `categoryName`, `trainingPartId2`, and intensity thresholds
   (`minLowIntensity`/`maxLowIntensity`/`minMediumIntensity`/… ) — the same
   fields that appear on exercises in template detail responses.
3. For each exercise, credit its **full** `totalCapacity` to every muscle in the
   union of both lists. Volume is *not* split between primary and auxiliary, so
   the per-muscle totals sum to roughly 2.5x the session volume. A muscle can
   appear in both lists (e.g. Abs), so the union must be deduplicated or that
   exercise is counted twice.

`trainingPartId2` groups muscles into body parts: `11` Chest · `12` Shoulders ·
`13` Back · `14` Glutes · `15` Legs · `16` Arms · `17` Core.

Muscle `configId` → name: `1` Lats · `2` Pecs · `3` Front Delts · `4` Side Delts ·
`5` Rear Delts · `6` Biceps · `7` Triceps · `8` Quads · `9` Hamstrings ·
`10` Glutes · `11` Abs · `12` Forearms · `13` Calves · `14` Traps ·
`15` Adductors · `17` Back Extensors. **Note there is no 16** — never generate
this range by loop.

### Caveats

- Do **not** use the cached `wt_exercise_library` store for this. It keeps only
  `mainMuscleGroupName` (no auxiliary list) and covers a single tab/device type,
  resolving roughly 30% of exercise entries. Fetch
  `actionLibraryGroup/list` for the `actionLibraryGroupId`s actually present in
  the records instead — that resolved 58 of 59 across 80 records, and 100% of
  those inside the verification window.
- Chunk `ids` at 50 per request (URI length). 59 ids needs two calls.
- **Delisted exercises.** A record can reference an exercise the library no
  longer returns: id `167` "Spinal Rocking" is absent from `list`, and
  `actionLibraryGroup/167` answers `code: 0` with an empty `data`. Fall back to
  the record's own `trainingPartId2`, which is always present, to attribute it
  to a body part even when the specific muscles are unknown. In practice such
  exercises are mobility work with `countType: 2` and zero `totalCapacity`, so
  they contribute nothing to volume regardless.
- Records imported from FitNote have no `actionLibraryGroupId` and cannot
  participate in this join.
- Intensity thresholds are supplied per muscle but no endpoint returns a
  computed `fatigue` or `intensityLevel`; both would have to be derived from
  accumulated volume against those thresholds, and should be presented as the
  app's own estimate rather than a Speediance measurement.

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
