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

  async getPokemonListByGen(gen: number): Promise<Pokemon[]> {
    const res = await axios.get(`${this.pokeApi}/generation/${gen}`);
    const pokes = res.data.pokemon_species;
    return Promise.all(
      pokes.map(async (p: any) => {
        const pokeRes = await axios.get(p.url.replace('-species', ''));
        return {
          id: pokeRes.data.id,
          name: pokeRes.data.name,
          sprite: pokeRes.data.sprites.front_default,
          generation: gen
        };
      })
    );
  }
}
