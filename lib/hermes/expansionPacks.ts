// Expansion packs — the Hit Factory analog of the video studio's scene packs.
// Each is a production/style preset (a ready-made Suno style string + production
// direction) the recommender can suggest and the Song Lab can apply. Add a pack
// by dropping a new expansion-packs/<name>/pack.json and importing it here.
import drillDark from '../../expansion-packs/drill-dark/pack.json';
import soulSample from '../../expansion-packs/soul-sample/pack.json';
import trapBallad from '../../expansion-packs/trap-ballad/pack.json';
import popAnthem from '../../expansion-packs/pop-anthem/pack.json';

export interface ExpansionPack {
  name: string;
  title: string;
  description: string;
  matches: string[];           // profile keywords this pack fits
  style: string;               // ready-to-paste Suno "Style of Music" string
  production: {
    tempoBpm: number;
    drums: string;
    bass: string;
    instrumentation: string[];
    mixVibe: string;
  };
  hookGuidance: string;
}

export const EXPANSION_PACKS: ExpansionPack[] = [
  drillDark as ExpansionPack,
  soulSample as ExpansionPack,
  trapBallad as ExpansionPack,
  popAnthem as ExpansionPack,
];

export function getExpansionPack(name: string): ExpansionPack | undefined {
  return EXPANSION_PACKS.find((p) => p.name === name);
}
