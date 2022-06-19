export interface Runeword {
  name: string;
  runes: Rune[];
  itemType: string;
  itemCategories: ItemCategory[];
  level: number;
  attributes: string[];
  ladderOnly: boolean;
}
export type ItemCategory = 'armor' | 'head' | 'melee' | 'ranged' | 'shield';
export type Rune = 'Vex' | 'Hel' | 'El' | 'Eld' | 'Zod' | 'Eth' | 'Cham' | 'Sur' | 'Io' | 'Lo' | 'Amn' | 'Ber' | 'Ist' | 'Sol' | 'Ohm' | 'Um' | 'Jah' | 'Mal' | 'Ko' | 'Ith' | 'Gul' | 'Lem' | 'Fal' | 'Ort' | 'Pul' | 'Shael' | 'Dol' | 'Tir' | 'Lum' | 'Ral' | 'Thul' | 'Tal' | 'Nef';
