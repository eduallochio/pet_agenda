import AsyncStorage from '@react-native-async-storage/async-storage';
import { BreedInfo } from '../constants/breedInfo';

const DOG_API_KEY = process.env.EXPO_PUBLIC_DOG_API_KEY ?? '';
const CAT_API_KEY = process.env.EXPO_PUBLIC_CAT_API_KEY ?? '';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

export type BreedRatings = {
  energy: number;        // 1-5
  affection: number;     // 1-5
  intelligence: number;  // 1-5
  grooming: number;      // 1-5
  health: number;        // 1-5 (invertido: 5 = saudável)
  childFriendly: number; // 1-5
  strangerFriendly: number; // 1-5
};

export type BreedApiData = BreedInfo & {
  photoUrl?: string;
  breedId?: string | number;
  ratings?: BreedRatings;
  wikipediaUrl?: string;
  cfaUrl?: string;
  vetstreetUrl?: string;
  indoor?: boolean;
};

type CacheEntry = { data: BreedApiData; timestamp: number };

function cacheKey(breed: string, species: string) {
  return `breed_apiv2_${species}_${breed}`.toLowerCase().replace(/\s+/g, '_');
}

async function readCache(breed: string, species: string): Promise<BreedApiData | null> {
  try {
    const raw = await AsyncStorage.getItem(cacheKey(breed, species));
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) return null;
    return entry.data;
  } catch {
    return null;
  }
}

async function writeCache(breed: string, species: string, data: BreedApiData) {
  try {
    const entry: CacheEntry = { data, timestamp: Date.now() };
    await AsyncStorage.setItem(cacheKey(breed, species), JSON.stringify(entry));
  } catch {}
}

function mapSize(weight: { metric: string } | undefined): BreedInfo['size'] {
  if (!weight?.metric) return 'Médio';
  const max = parseFloat(weight.metric.split('-').pop() ?? '0');
  if (max <= 10) return 'Pequeno';
  if (max <= 25) return 'Médio';
  if (max <= 45) return 'Grande';
  return 'Gigante';
}

function parseCareFromDog(b: any): string[] {
  const care: string[] = [];
  if (b.grooming !== undefined) {
    if (b.grooming <= 1) care.push('Escovação mínima');
    else if (b.grooming <= 3) care.push('Escovação semanal');
    else care.push('Escovação frequente (diária ou quase)');
  }
  if (b.energy_level !== undefined) {
    if (b.energy_level <= 2) care.push('Exercícios leves');
    else if (b.energy_level <= 3) care.push('Exercício diário moderado');
    else care.push('Exercício diário intenso');
  }
  if (b.health_issues !== undefined && b.health_issues >= 3) {
    care.push('Acompanhamento veterinário regular recomendado');
  }
  if (care.length === 0) care.push('Cuidados gerais de higiene e saúde');
  return care;
}

async function fetchDogBreed(breedName: string): Promise<BreedApiData | null> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (DOG_API_KEY) headers['x-api-key'] = DOG_API_KEY;

    const res = await fetch(
      `https://api.thedogapi.com/v1/breeds/search?q=${encodeURIComponent(breedName)}`,
      { headers }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    const b = data[0];

    // Busca foto da raça
    let photoUrl: string | undefined;
    if (b.reference_image_id) {
      const imgRes = await fetch(
        `https://api.thedogapi.com/v1/images/${b.reference_image_id}`,
        { headers }
      );
      if (imgRes.ok) {
        const img = await imgRes.json();
        photoUrl = img.url;
      }
    }

    const ratings: BreedRatings = {
      energy: b.energy_level ?? 3,
      affection: b.affectionate_with_family ?? 3,
      intelligence: b.trainability ?? 3,
      grooming: b.grooming ?? 3,
      health: b.health_issues ? Math.max(1, 6 - b.health_issues) : 3,
      childFriendly: b.good_with_young_children ?? 3,
      strangerFriendly: b.openness_to_strangers ?? 3,
    };

    return {
      name: b.name ?? breedName,
      species: 'Cachorro',
      origin: b.origin ?? b.country_codes ?? 'Desconhecida',
      size: mapSize(b.weight),
      lifespan: b.life_span ?? '—',
      temperament: b.temperament ? b.temperament.split(', ').slice(0, 6) : [],
      characteristics: b.bred_for ?? b.breed_group ?? 'Informação não disponível.',
      care: parseCareFromDog(b),
      curiosity: b.history ?? `${b.name} pertence ao grupo ${b.breed_group ?? 'não classificado'}.`,
      emoji: '🐕',
      photoUrl,
      breedId: b.id,
      ratings,
    };
  } catch {
    return null;
  }
}

async function fetchCatBreed(breedName: string): Promise<BreedApiData | null> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (CAT_API_KEY) headers['x-api-key'] = CAT_API_KEY;

    const res = await fetch(
      `https://api.thecatapi.com/v1/breeds/search?q=${encodeURIComponent(breedName)}`,
      { headers }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    const b = data[0];

    // Busca foto da raça
    let photoUrl: string | undefined;
    if (b.reference_image_id) {
      const imgRes = await fetch(
        `https://api.thecatapi.com/v1/images/${b.reference_image_id}`,
        { headers }
      );
      if (imgRes.ok) {
        const img = await imgRes.json();
        photoUrl = img.url;
      }
    }

    const weightMax = parseFloat((b.weight?.metric ?? '').split('-').pop() ?? '0');
    const size: BreedInfo['size'] = weightMax <= 4 ? 'Pequeno' : weightMax <= 6 ? 'Médio' : 'Grande';

    const ratings: BreedRatings = {
      energy: b.energy_level ?? 3,
      affection: b.affection_level ?? 3,
      intelligence: b.intelligence ?? 3,
      grooming: b.grooming ?? 3,
      health: b.health_issues ? Math.max(1, 6 - b.health_issues) : 3,
      childFriendly: b.child_friendly ?? 3,
      strangerFriendly: b.stranger_friendly ?? 3,
    };

    return {
      name: b.name ?? breedName,
      species: 'Gato',
      origin: b.origin ?? 'Desconhecida',
      size,
      lifespan: b.life_span ? `${b.life_span} anos` : '—',
      temperament: b.temperament ? b.temperament.split(', ').slice(0, 6) : [],
      characteristics: b.description ?? 'Informação não disponível.',
      care: [
        (b.grooming ?? 0) >= 4 ? 'Escovação frequente necessária' : 'Escovação semanal',
        b.indoor === 1 ? 'Gato de interior — ambiente seguro' : 'Pode ter acesso ao exterior',
        (b.health_issues ?? 0) >= 3 ? 'Acompanhamento veterinário regular recomendado' : 'Cuidados gerais de saúde',
      ],
      curiosity: b.wikipedia_url
        ? `Saiba mais em: Wikipedia`
        : `${b.name} é uma raça de origem ${b.origin ?? 'desconhecida'}.`,
      emoji: '🐱',
      photoUrl,
      breedId: b.id,
      ratings,
      wikipediaUrl: b.wikipedia_url,
      cfaUrl: b.cfa_url,
      vetstreetUrl: b.vetstreet_url,
      indoor: b.indoor === 1,
    };
  } catch {
    return null;
  }
}

export async function fetchBreedFromApi(
  breedName: string,
  species: string
): Promise<BreedApiData | null> {
  const cached = await readCache(breedName, species);
  if (cached) return cached;

  let result: BreedApiData | null = null;
  if (species === 'Cachorro') result = await fetchDogBreed(breedName);
  else if (species === 'Gato') result = await fetchCatBreed(breedName);

  if (result) await writeCache(breedName, species, result);
  return result;
}

// Busca lista de todas as raças para o explorador
export async function fetchAllBreeds(species: 'Cachorro' | 'Gato'): Promise<BreedApiData[]> {
  const key = `breed_all_${species}`;
  try {
    const cached = await AsyncStorage.getItem(key);
    if (cached) {
      const entry = JSON.parse(cached);
      if (Date.now() - entry.timestamp < CACHE_TTL_MS) return entry.data;
    }
  } catch {}

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const baseUrl = species === 'Cachorro' ? 'https://api.thedogapi.com/v1' : 'https://api.thecatapi.com/v1';
    if (species === 'Cachorro' && DOG_API_KEY) headers['x-api-key'] = DOG_API_KEY;
    if (species === 'Gato' && CAT_API_KEY) headers['x-api-key'] = CAT_API_KEY;

    const res = await fetch(`${baseUrl}/breeds`, { headers });
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];

    const breeds: BreedApiData[] = data.map((b: any) => {
      if (species === 'Cachorro') {
        return {
          name: b.name,
          species: 'Cachorro' as const,
          origin: b.origin ?? b.country_codes ?? 'Desconhecida',
          size: mapSize(b.weight),
          lifespan: b.life_span ?? '—',
          temperament: b.temperament ? b.temperament.split(', ').slice(0, 4) : [],
          characteristics: b.bred_for ?? b.breed_group ?? '',
          care: parseCareFromDog(b),
          curiosity: b.history ?? '',
          emoji: '🐕',
          photoUrl: b.image?.url,
          breedId: b.id,
          ratings: {
            energy: b.energy_level ?? 3,
            affection: b.affectionate_with_family ?? 3,
            intelligence: b.trainability ?? 3,
            grooming: b.grooming ?? 3,
            health: b.health_issues ? Math.max(1, 6 - b.health_issues) : 3,
            childFriendly: b.good_with_young_children ?? 3,
            strangerFriendly: b.openness_to_strangers ?? 3,
          },
        };
      } else {
        const weightMax = parseFloat((b.weight?.metric ?? '').split('-').pop() ?? '0');
        return {
          name: b.name,
          species: 'Gato' as const,
          origin: b.origin ?? 'Desconhecida',
          size: weightMax <= 4 ? 'Pequeno' as const : weightMax <= 6 ? 'Médio' as const : 'Grande' as const,
          lifespan: b.life_span ? `${b.life_span} anos` : '—',
          temperament: b.temperament ? b.temperament.split(', ').slice(0, 4) : [],
          characteristics: b.description ?? '',
          care: [],
          curiosity: '',
          emoji: '🐱',
          photoUrl: b.image?.url,
          breedId: b.id,
          ratings: {
            energy: b.energy_level ?? 3,
            affection: b.affection_level ?? 3,
            intelligence: b.intelligence ?? 3,
            grooming: b.grooming ?? 3,
            health: b.health_issues ? Math.max(1, 6 - b.health_issues) : 3,
            childFriendly: b.child_friendly ?? 3,
            strangerFriendly: b.stranger_friendly ?? 3,
          },
          wikipediaUrl: b.wikipedia_url,
          indoor: b.indoor === 1,
        };
      }
    });

    await AsyncStorage.setItem(key, JSON.stringify({ data: breeds, timestamp: Date.now() }));
    return breeds;
  } catch {
    return [];
  }
}

// Busca galeria de fotos de uma raça
export async function fetchBreedGallery(
  breedId: string | number,
  species: 'Cachorro' | 'Gato',
  limit = 10
): Promise<string[]> {
  const key = `breed_gallery_${species}_${breedId}`;
  try {
    const cached = await AsyncStorage.getItem(key);
    if (cached) {
      const entry = JSON.parse(cached);
      if (Date.now() - entry.timestamp < CACHE_TTL_MS) return entry.data;
    }
  } catch {}

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const baseUrl = species === 'Cachorro' ? 'https://api.thedogapi.com/v1' : 'https://api.thecatapi.com/v1';
    if (species === 'Cachorro' && DOG_API_KEY) headers['x-api-key'] = DOG_API_KEY;
    if (species === 'Gato' && CAT_API_KEY) headers['x-api-key'] = CAT_API_KEY;

    const param = species === 'Cachorro' ? 'breed_ids' : 'breed_ids';
    const res = await fetch(
      `${baseUrl}/images/search?${param}=${breedId}&limit=${limit}&size=med`,
      { headers }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const urls: string[] = data.map((img: any) => img.url).filter(Boolean);

    await AsyncStorage.setItem(key, JSON.stringify({ data: urls, timestamp: Date.now() }));
    return urls;
  } catch {
    return [];
  }
}
