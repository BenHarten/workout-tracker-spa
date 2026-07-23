import { CUSTOM_KG_PRESET_ID } from "../types";
import type { PresetRules, TemplatePreset } from "../types";

/**
 * Preset handling.
 *
 * Presets used to be a hardcoded table of four ids. The API actually returns a
 * `templatePresetList` on every exercise describing the presets available to
 * it, including ranges — so rules are derived from that instead. Two shapes
 * exist and they are not interchangeable:
 *
 *  - load-based  (Training tab)   `weight` + `trainingCount`, edited as reps × RM
 *  - time-based  (Bodyweight tab) `trainingTime` only, edited as seconds, no load
 *
 * Treating a time-based preset as load-based is what made "Bench Lying Leg
 * Raise" (preset 12, "Lose Weight") read as "60 reps × 0 kg" when it means
 * "60 seconds, bodyweight".
 */

/** The app's own free-entry mode. Not a preset the API defines. */
export const CUSTOM_KG_RULES: PresetRules = {
  id: CUSTOM_KG_PRESET_ID,
  name: "Custom KG",
  kind: "load",
  loadLabel: "KG",
  step: 0.5,
  defW: 10,
  minW: 3.5,
  maxW: 100,
  defR: 10,
  minR: 1,
  maxR: 99,
  defRest: 60,
};

/** A preset is time-based when it carries a duration and no load. */
export function isTimeBased(preset: TemplatePreset): boolean {
  return preset.trainingTime !== undefined && preset.weight === undefined;
}

export function derivePresetRules(preset: TemplatePreset | null | undefined): PresetRules {
  if (!preset) return CUSTOM_KG_RULES;

  if (isTimeBased(preset)) {
    const def = preset.trainingTime ?? 60;
    return {
      id: preset.id,
      name: preset.name,
      kind: "time",
      // No load column: these exercises carry no weight at all.
      step: 1,
      defW: 0,
      minW: 0,
      maxW: 0,
      defR: def,
      minR: preset.trainingTimeScopeStart ?? 5,
      maxR: preset.trainingTimeScopeEnd ?? 600,
      defRest: preset.relaxTime ?? 60,
    };
  }

  return {
    id: preset.id,
    name: preset.name,
    kind: "load",
    // Load-based presets are expressed on the machine's RM scale, not kilos.
    loadLabel: "RM",
    step: 1,
    defW: preset.weight ?? 10,
    minW: preset.weightScopeStart ?? 1,
    maxW: preset.weightScopeEnd ?? 20,
    defR: preset.trainingCount ?? 10,
    minR: preset.trainingCountScopeStart ?? 1,
    maxR: preset.trainingCountScopeEnd ?? 99,
    defRest: preset.relaxTime ?? 60,
  };
}

/** Rules for the preset currently selected on an exercise. */
export function rulesFor(
  presets: TemplatePreset[],
  presetId: number,
): PresetRules {
  if (presetId === CUSTOM_KG_PRESET_ID) return CUSTOM_KG_RULES;
  return derivePresetRules(presets.find((p) => p.id === presetId));
}

/** Parse the API's templatePresetList, ignoring anything malformed. */
export function parsePresetList(raw: unknown): TemplatePreset[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((p): p is Record<string, unknown> => !!p && typeof p === "object")
    .filter((p) => typeof p.id === "number" && typeof p.name === "string")
    .map((p) => p as unknown as TemplatePreset);
}
