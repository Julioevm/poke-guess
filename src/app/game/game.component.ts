import { Component } from '@angular/core';
import { PokemonService, Pokemon } from '../pokemon.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import confetti from 'canvas-confetti';

export type Difficulty = 'easy' | 'medium' | 'hard' | 'very-hard';

@Component({
  selector: 'app-game',
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [PokemonService]
})
export class GameComponent {
  difficulty: Difficulty = 'easy';
  generation: number = 1;
  availableGens = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  pokemonList: Pokemon[] = [];
  currentPokemon?: Pokemon;
  guess: string = '';
  feedback: string = '';
  loading = false;
  guessLetters: string[] = [];

  constructor(private pokeService: PokemonService) {
    this.loadPokemonList();
  }

  async loadPokemonList() {
    this.loading = true;
    this.pokemonList = await this.pokeService.getPokemonListByGen(this.generation);
    this.loading = false;
    this.nextPokemon();
  }

  nextPokemon() {
    if (!this.pokemonList.length) return;
    const idx = Math.floor(Math.random() * this.pokemonList.length);
    this.currentPokemon = this.pokemonList[idx];
    this.guess = '';
    this.feedback = '';
    // Reset guessLetters
    if (this.currentPokemon) {
      this.guessLetters = Array(this.currentPokemon.name.length).fill('');
      // Pre-fill revealed letters from clue
      const clueArr = this.clueArray;
      clueArr.forEach((letter, i) => {
        if (letter) this.guessLetters[i] = letter.toUpperCase();
      });
    }
  }

  setDifficulty(diff: string) {
    this.difficulty = diff as Difficulty;
  }

  setGeneration(gen: number) {
    this.generation = gen;
    this.loadPokemonList();
  }

  getClue(): string {
    if (!this.currentPokemon) return '';
    const name = this.currentPokemon.name;
    if (this.difficulty === 'easy') {
      return name.length <= 4 ? name[0] : name.slice(0, 3) + '*'.repeat(name.length - 3);
    } else if (this.difficulty === 'medium') {
      return name[0] + '*'.repeat(name.length - 1);
    } else if (this.difficulty === 'hard') {
      return '*'.repeat(name.length);
    } else {
      // very-hard
      return '';
    }
  }

  // Helper to convert clue to an array for block rendering
  get clueArray(): (string|null)[] {
    if (!this.currentPokemon) return [];
    const clue = this.getClue();
    return this.currentPokemon.name.split('').map((char, i) => clue[i] !== '*' ? char : null);
  }

  // Called when a letter input changes
  onLetterChange(idx: number, event: Event) {
    const input = event.target as HTMLInputElement;
    const val = input.value.toUpperCase().replace(/[^A-Z]/g, '');
    this.guessLetters[idx] = val;
    // Move to next input if filled
    if (val && input.nextElementSibling) {
      (input.nextElementSibling as HTMLInputElement).focus();
    }
  }

  // Update submitGuess to use guessLetters
  async submitGuess() {
    if (!this.currentPokemon) return;
    const guessStr = this.guessLetters.join('').toLowerCase();
    if (guessStr === this.currentPokemon.name.toLowerCase()) {
      this.feedback = 'Correct!';
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      setTimeout(() => this.nextPokemon(), 1000);
    } else {
      this.feedback = 'Try again!';
    }
  }

  getShadedSprite(): string {
    // For very-hard: apply CSS filter in template
    return this.currentPokemon?.sprite || '';
  }
}
