export const LIVING_ATLAS_STRANDS = 40;
export const LIVING_ATLAS_SAMPLES = 160;
export const LIVING_ATLAS_POSITION_COUNT = LIVING_ATLAS_STRANDS * LIVING_ATLAS_SAMPLES * 2 * 3;

const FULL_TURN = Math.PI * 2;
const BREATH_PERIOD_SECONDS = FULL_TURN * 40;

/**
 * Écrit des paires XYZ pour LineSegments, sans allocation par image.
 * La sphère de latitudes devient un tore tressé dans le plan XY.
 * Les oscillations bornées sont périodiques ; aucun hasard ne dépend de l’image.
 */
export function writeLivingAtlasFilaments(
  target: Float32Array,
  progress: number,
  timeSeconds: number,
): void {
  if (target.length < LIVING_ATLAS_POSITION_COUNT) {
    throw new RangeError(`Le tampon doit contenir au moins ${LIVING_ATLAS_POSITION_COUNT} valeurs.`);
  }

  const clampedProgress = Number.isNaN(progress) ? 0 : Math.min(1, Math.max(0, progress));
  const blend = clampedProgress * clampedProgress * (3 - 2 * clampedProgress);
  const phase = Number.isFinite(timeSeconds) ? (timeSeconds % BREATH_PERIOD_SECONDS) / 40 : 0;

  for (let strand = 0; strand < LIVING_ATLAS_STRANDS; strand += 1) {
    const fraction = (strand + 0.5) / LIVING_ATLAS_STRANDS;
    const strandPhase = fraction * FULL_TURN;
    const latitude = Math.asin(fraction * 2 - 1);
    const start = strand * LIVING_ATLAS_SAMPLES * 6;

    for (let sample = 0; sample < LIVING_ATLAS_SAMPLES; sample += 1) {
      const angle = (sample / LIVING_ATLAS_SAMPLES) * FULL_TURN;
      const cosine = Math.cos(angle);
      const sine = Math.sin(angle);

      const sphereLatitude = latitude + 0.1 * Math.sin(3 * angle + 2 * strandPhase + phase);
      const sphereRadius = 1.74
        + 0.07 * Math.sin(5 * angle - 3 * strandPhase + 2 * phase)
        + 0.03 * Math.cos(2 * angle + strandPhase - phase);
      const sphereRing = sphereRadius * Math.cos(sphereLatitude);
      const sphereDepth = sphereRadius * Math.sin(sphereLatitude);

      const weave = 3 * angle + strandPhase + 0.12 * Math.sin(2 * angle + phase);
      const tubeRadius = 0.55 + 0.035 * Math.cos(4 * angle - 2 * strandPhase + phase);
      const torusRing = 1.46 + 0.06 * Math.sin(3 * angle + phase) + tubeRadius * Math.cos(weave);
      const torusDepth = tubeRadius * Math.sin(weave);

      // Une interpolation de deux volumes bornés conserve le cadrage durant l’ouverture.
      const ring = sphereRing + (torusRing - sphereRing) * blend;
      const offset = start + sample * 6;
      target[offset] = ring * cosine;
      target[offset + 1] = ring * sine;
      target[offset + 2] = sphereDepth + (torusDepth - sphereDepth) * blend;

      if (sample > 0) {
        target[offset - 3] = target[offset];
        target[offset - 2] = target[offset + 1];
        target[offset - 1] = target[offset + 2];
      }
    }

    // Recopie exacte du premier point : aucune couture liée aux arrondis de 2π.
    const lastEndpoint = start + LIVING_ATLAS_SAMPLES * 6 - 3;
    target[lastEndpoint] = target[start];
    target[lastEndpoint + 1] = target[start + 1];
    target[lastEndpoint + 2] = target[start + 2];
  }
}
