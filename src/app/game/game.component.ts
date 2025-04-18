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
  showRetrySkip = false;
  score: number = 0;
  roundPossiblePoints: number = 0;
  hasRetried: boolean = false;

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
    this.hasRetried = false;
    // Reset guessLetters
    if (this.currentPokemon) {
      this.guessLetters = Array(this.currentPokemon.name.length).fill('');
      // Pre-fill revealed letters from clue
      const clueArr = this.clueArray;
      clueArr.forEach((letter, i) => {
        if (letter) this.guessLetters[i] = letter.toUpperCase();
      });
      // Set possible points for this round
      this.roundPossiblePoints = this.calculatePoints(this.currentPokemon.name.length, this.difficulty);
    }
    // Auto-focus first editable input after DOM updates
    setTimeout(() => {
      const firstInput = document.querySelector('.guess-blocks input:not([readonly])') as HTMLInputElement;
      if (firstInput) firstInput.focus();
    }, 0);
    if (this.difficulty === 'very-hard') {
      const pokemonImage = document.querySelector('.sprite-wrapper img') as HTMLImageElement;
      pokemonImage.classList.add('shaded');
    }
  }

  setDifficulty(diff: string) {
    this.difficulty = diff as Difficulty;
    this.nextPokemon(); // Load a new pokemon when difficulty changes
  }

  setGeneration(gen: number) {
    this.generation = gen;
    this.loadPokemonList();
  }

  getClue(): string {
    if (!this.currentPokemon) return '';
    const name = this.currentPokemon.name;
    if (this.difficulty === 'easy') {
      return name.length <= 4 ? name[0] + '*'.repeat(name.length - 1) : name.slice(0, 3) + '*'.repeat(name.length - 3);
    } else if (this.difficulty === 'medium') {
      return name[0] + '*'.repeat(name.length - 1);
    } else  {
      return '*'.repeat(name.length);
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
    // Auto-submit when last non-clue block is filled
    if (this.isLastInputFilled()) {
      this.autoSubmitGuess();
    }
  }

  // Check if all non-clue blocks are filled
  isLastInputFilled(): boolean {
    return this.guessLetters.every((letter, i) => this.clueArray[i] || letter);
  }

  // Auto-submit guess when last letter is input
  autoSubmitGuess() {
    if (!this.currentPokemon) return;
    const guessStr = this.guessLetters.join('').toLowerCase();
    if (guessStr === this.currentPokemon.name.toLowerCase()) {
      if (this.difficulty === 'very-hard') {
        const pokemonImage = document.querySelector('.sprite-wrapper img') as HTMLImageElement;
        pokemonImage.classList.remove('shaded');
      }
      this.feedback = 'Correct!';
      // Award points
      let earned = this.roundPossiblePoints;
      if (this.hasRetried) {
        earned = Math.floor(earned / 2);
      }
      this.score += earned;
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      setTimeout(() => this.nextPokemon(), 1000);
    } else {
      this.feedback = 'Try again!';
      this.showRetrySkip = true;
    }
  }

  // Handle backspace to move focus to previous block unless it's a clue
  onLetterKeyDown(idx: number, event: KeyboardEvent) {
    const input = event.target as HTMLInputElement;
    if (event.key === 'Backspace') {
      // Always clear the current block first
      if (!this.clueArray[idx]) {
        this.guessLetters[idx] = '';
        input.value = '';
      }
      // If current input is empty or will be cleared, move focus
      if (input.selectionStart === 0) {
        // Find previous editable (non-clue) input
        let prevIdx = idx - 1;
        while (prevIdx >= 0 && this.clueArray[prevIdx]) {
          prevIdx--;
        }
        if (prevIdx >= 0) {
          event.preventDefault();
          const prevInput = input.parentElement?.children[prevIdx] as HTMLInputElement;
          if (prevInput) {
            prevInput.focus();
            prevInput.select();
          }
        }
      }
    }
  }

  // Retry: clear guess blocks (except clues)
  retryGuess() {
    this.guessLetters = this.guessLetters.map((letter, i) => this.clueArray[i] ? letter : '');
    this.feedback = '';
    this.showRetrySkip = false;
    this.hasRetried = true;
    // Focus first editable input
    setTimeout(() => {
      const firstInput = document.querySelector('.guess-blocks input:not([readonly])') as HTMLInputElement;
      if (firstInput) firstInput.focus();
    }, 0);
  }

  // Skip: show new pokemon
  skipPokemon() {
    this.showRetrySkip = false;
    this.feedback = '';
    this.nextPokemon();
  }

  async submitGuess() {
    if (!this.currentPokemon) return;
    const guessStr = this.guessLetters.join('').toLowerCase();
    if (guessStr === this.currentPokemon.name.toLowerCase()) {
      this.feedback = 'Correct!';
      // Award points
      let earned = this.roundPossiblePoints;
      if (this.hasRetried) {
        earned = Math.floor(earned / 2);
      }
      this.score += earned;
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      setTimeout(() => this.nextPokemon(), 1000);
    } else {
      this.feedback = 'Try again!';
      this.showRetrySkip = true;
    }
  }

  getShadedSprite(): string {
    // For very-hard: apply CSS filter in template
    return this.currentPokemon?.sprite || '';
  }

  // Returns the missing letters (not shown in blocks), shuffled, for easy difficulty
  get missingLetters(): string[] {
    if (this.difficulty !== 'easy' || !this.currentPokemon) return [];
    const name = this.currentPokemon.name.toUpperCase();
    // Letters shown in blocks (clueArray)
    const shown = this.clueArray
      .map((c, i) => c ? name[i] : null)
      .filter(c => c !== null) as string[];
    // Unique letters in name
    const uniqueLetters = Array.from(new Set(name.split('')));
    // Filter out those already shown
    const missing = uniqueLetters.filter(l => !shown.includes(l));
    // Shuffle
    for (let i = missing.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [missing[i], missing[j]] = [missing[j], missing[i]];
    }
    return missing;
  }

  calculatePoints(nameLength: number, difficulty: Difficulty): number {
    const multipliers: { [key in Difficulty]: number } = {
      'easy': 5,
      'medium': 10,
      'hard': 15,
      'very-hard': 20
    };
    return nameLength * multipliers[difficulty];
  }
}
