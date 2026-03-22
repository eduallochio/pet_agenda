// Faixas de peso ideal por espécie (kg) — valores médios gerais
export const IDEAL_WEIGHT_BY_SPECIES: Record<string, { min: number; max: number }> = {
  Cachorro:  { min: 5,   max: 30  },
  Gato:      { min: 3.5, max: 6   },
  Coelho:    { min: 1.5, max: 4   },
  Hamster:   { min: 0.08, max: 0.2 },
  Pássaro:   { min: 0.02, max: 1  },
  Peixe:     { min: 0.01, max: 0.5 },
  Réptil:    { min: 0.1, max: 2   },
  Outro:     { min: 1,   max: 10  },
};

export function getIdealWeight(species: string): { min: number; max: number } | null {
  return IDEAL_WEIGHT_BY_SPECIES[species] ?? null;
}
