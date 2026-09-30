/* Runtime pacing derived from OpenNARS Lab 3.0.4 SimNAR. */

/** Processing's original SimNAR setup requests one world update every 20 ms. */
export const JAVA_SIMNAR_TARGET_TPS = 50;

/** A practical smoothness floor for a browser-hosted NARS environment. */
export const MICROWORLD_MIN_SMOOTH_TPS = 20;

/** Start at the smoothness floor while keeping the Java target selectable. */
export const MICROWORLD_DEFAULT_TPS = MICROWORLD_MIN_SMOOTH_TPS;
export const MICROWORLD_MAX_TPS = JAVA_SIMNAR_TARGET_TPS;
