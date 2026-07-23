import { SPLIT_QUERY, useMediaQuery } from "../hooks/useMediaQuery";
import { ExerciseDetailPage } from "./ExerciseDetailPage";
import { ProgressPage } from "./ProgressPage";

/**
 * Renders /progress/exercise/:name appropriately for the viewport.
 *
 * Wide screens keep the exercise list beside the detail, so the URL still
 * deep-links but the surrounding context stays. Narrow screens have no room
 * for both and show the detail on its own, with a back button.
 */
export function ExerciseRoute() {
  const isSplit = useMediaQuery(SPLIT_QUERY);
  return isSplit ? <ProgressPage /> : <ExerciseDetailPage />;
}
