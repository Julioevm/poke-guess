import { Injectable } from '@angular/core';
import axios from 'axios';

export interface Pokemon {
  id: number;
  name: string;
  sprite: string;
  generation: number;
}

@Injectable({ providedIn: 'root' })
export class PokemonService {
  private readonly pokeApi = 'https://pokeapi.co/api/v2';

  async getPokemonById(id: number): Promise<Pokemon> {
    const res = await axios.get(`${this.pokeApi}/pokemon/${id}`);
    const species = await axios.get(res.data.species.url);
    const genNum = Number(species.data.generation.url.match(/generation\/(\d+)/)?.[1] || 1);
    return {
      id: res.data.id,
      name: res.data.name,
      sprite: res.data.sprites.front_default,
      generation: genNum
    };
  }

  // Fetches only the IDs of Pokemon for a given generation
  async getPokemonIdsByGen(gen: number): Promise<number[]> {
    try {
      const res = await axios.get(`${this.pokeApi}/generation/${gen}`);
      const speciesList = res.data.pokemon_species;
      const ids = speciesList.map((species: any) => {
        const idMatch = species.url.match(/\/pokemon-species\/(\d+)\/?$/);
        return idMatch ? parseInt(idMatch[1], 10) : null;
      }).filter((id: number | null): id is number => id !== null);
      return ids;
    } catch (error) {
      console.error(`Error fetching Pokemon IDs for generation ${gen}:`, error);
      return []; // Return empty array on error
    }
  }
}
