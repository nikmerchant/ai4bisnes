import "server-only";

export const VISUAL_PACKAGING_MEDIA_ENABLED = false as const;
export const VISUAL_PACKAGING_SIDE_EFFECT_CLASS = "direction_only" as const;

export function assertVisualPackagingMediaDisabled() {
  return { enabled: VISUAL_PACKAGING_MEDIA_ENABLED, sideEffectClass: VISUAL_PACKAGING_SIDE_EFFECT_CLASS };
}
