/** Praça de D. João I, Porto */
export const ORIGIN = {
  lat: 41.147631,
  lon: -8.608955,
} as const

/** Half-side of the square fetch bbox in meters (~500 m → ~1 km across) */
export const MAP_RADIUS_M = 550

/** Eye height while walking */
export const EYE_HEIGHT = 1.7

/** Walk / run speeds (m/s) */
export const WALK_SPEED = 4.2
export const RUN_SPEED = 7.5

/** Landmark height overrides (meters) keyed by name substring */
export const LANDMARK_HEIGHTS: Record<string, number> = {
  rivoli: 28,
  'palácio atlântico': 45,
  'palacio atlantico': 45,
  rialto: 55,
  'teatro municipal': 28,
  'teatro sá da bandeira': 22,
  'teatro sa da bandeira': 22,
}

export const DEFAULT_LEVEL_HEIGHT = 3.2
export const DEFAULT_LEVELS = 5
export const MAX_BUILDING_HEIGHT = 80
