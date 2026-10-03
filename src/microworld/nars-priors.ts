/**
 * Optional starter knowledge for a reproducible sensorimotor demonstration.
 * This center-sector rule is authored for the TypeScript Lab. SimNAR.java
 * only comments out different left/right candidate rules; it does not install
 * these priors in the original default Microworld.
 */
export const MICROWORLD_STARTER_PRIORS = Object.freeze([
  "<(&/,<{1} --> [on]>,(^Forward,{SELF})) =/> <{SELF} --> [satisfied]>>.",
] as const);
