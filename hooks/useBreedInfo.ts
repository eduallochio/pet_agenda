import { useState, useEffect } from 'react';
import { findBreedInfo } from '../constants/breedInfo';
import { fetchBreedFromApi, BreedApiData } from '../services/breedApiService';

type State =
  | { status: 'loading' }
  | { status: 'found'; data: BreedApiData; source: 'local' | 'api' }
  | { status: 'not_found' };

export function useBreedInfo(breed: string, species: string): State {
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    if (!breed?.trim()) {
      setState({ status: 'not_found' });
      return;
    }

    let cancelled = false;

    async function resolve() {
      // 1. Tenta local primeiro (síncrono, sem delay)
      const local = findBreedInfo(breed, species);
      if (local) {
        if (!cancelled) setState({ status: 'found', data: local, source: 'local' });
        return;
      }

      // 2. Busca na API (cães e gatos)
      if (species === 'Cachorro' || species === 'Gato') {
        const api = await fetchBreedFromApi(breed, species);
        if (!cancelled) {
          setState(api ? { status: 'found', data: api, source: 'api' } : { status: 'not_found' });
        }
      } else {
        if (!cancelled) setState({ status: 'not_found' });
      }
    }

    resolve();
    return () => { cancelled = true; };
  }, [breed, species]);

  return state;
}
