import { Component, OnInit } from '@angular/core';
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
export class GameComponent implements OnInit {
  difficulty: Difficulty = 'easy';
  generation: number = 1;
  availableGens = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  availablePokemonIds: number[] = [];
  pokemonBuffer: Pokemon[] = [];
  currentPokemon?: Pokemon;
  currentPokemonIndex: number = -1; 
  guess: string = '';
  feedback: string = '';
  loading = false;
  initialLoadComplete = false;
  guessLetters: string[] = [];
  showRetrySkip = false;
  score: number = 0;
  roundPossiblePoints: number = 0;
  hasRetried: boolean = false;

  constructor(private pokeService: PokemonService) {}

  ngOnInit(): void {
    this.initializeGame();
  }

  async initializeGame() {
    this.loading = true;
    this.initialLoadComplete = false;
    this.availablePokemonIds = await this.pokeService.getPokemonIdsByGen(this.generation);
    this.shuffleArray(this.availablePokemonIds); 
    this.pokemonBuffer = [];
    this.currentPokemonIndex = -1;
    this.currentPokemon = undefined;
    this.score = 0; 

    await this.prefetchNextPokemon(); 
    await this.prefetchNextPokemon(); 

    this.loading = false;
    this.initialLoadComplete = true;
    this.displayNextPokemon(); 
  }

  shuffleArray(array: any[]) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  async prefetchNextPokemon() {
    this.currentPokemonIndex++;
    if (this.currentPokemonIndex < this.availablePokemonIds.length) {
      const nextId = this.availablePokemonIds[this.currentPokemonIndex];
      try {
        const pokemon = await this.pokeService.getPokemonById(nextId);
        if (pokemon && pokemon.sprite) { 
          this.pokemonBuffer.push(pokemon);
        } else {
          console.warn(`Skipping Pokemon ID ${nextId} (no sprite or data), fetching next.`);
          await this.prefetchNextPokemon();
        }
      } catch (error) {
        console.error(`Failed to fetch Pokemon ID ${nextId}:`, error);
      }
    }
  }

  displayNextPokemon() {
    if (this.loading || !this.initialLoadComplete) return; 

    if (this.pokemonBuffer.length === 0) {
      if (this.currentPokemonIndex >= this.availablePokemonIds.length - 1) {
        this.feedback = "You've guessed all Pokémon for this generation!";
        this.currentPokemon = undefined; 
      } else {
        this.feedback = "Loading next Pokémon...";
        console.warn("Pokemon buffer empty, waiting for prefetch...");
      }
      return;
    }

    this.currentPokemon = this.pokemonBuffer.shift(); 

    this.guess = '';
    this.feedback = '';
    this.hasRetried = false;
    this.showRetrySkip = false;

    if (this.currentPokemon) {
      const cleanName = this.getCleanPokemonName(this.currentPokemon);
      this.guessLetters = Array(cleanName.length).fill('');
      const clueArr = this.clueArray;
      clueArr.forEach((letter, i) => {
        if (letter) this.guessLetters[i] = letter.toUpperCase();
      });
      this.roundPossiblePoints = this.calculatePoints(cleanName.length, this.difficulty);

      setTimeout(() => { 
        const pokemonImage = document.querySelector('.sprite-wrapper img') as HTMLImageElement;
        if (pokemonImage) {
          if (this.difficulty === 'very-hard') {
            pokemonImage.classList.add('shaded');
          } else {
            pokemonImage.classList.remove('shaded');
          }
        }
        const firstInput = document.querySelector('.guess-blocks input:not([readonly])') as HTMLInputElement;
        if (firstInput) firstInput.focus();
      }, 0);

      this.prefetchNextPokemon();

    } else {
      console.error("Error: Tried to display next Pokemon but it was undefined.");
      this.feedback = "Error loading Pokémon. Please try refreshing.";
    }
  }

  setDifficulty(diff: string) {
    this.difficulty = diff as Difficulty;
    this.displayNextPokemon();
    if (this.currentPokemon) {
        const cleanName = this.getCleanPokemonName(this.currentPokemon);
        this.guessLetters = Array(cleanName.length).fill('');
        const clueArr = this.clueArray;
        clueArr.forEach((letter, i) => {
          if (letter) this.guessLetters[i] = letter.toUpperCase();
        });
        this.roundPossiblePoints = this.calculatePoints(cleanName.length, this.difficulty);
        this.feedback = ''; 
        this.showRetrySkip = false;
        this.hasRetried = false;

        setTimeout(() => {
          const pokemonImage = document.querySelector('.sprite-wrapper img') as HTMLImageElement;
          if (pokemonImage) {
             if (this.difficulty === 'very-hard') {
               pokemonImage.classList.add('shaded');
             } else {
               pokemonImage.classList.remove('shaded');
             }
          }
          const firstInput = document.querySelector('.guess-blocks input:not([readonly])') as HTMLInputElement;
          if (firstInput) firstInput.focus();
        }, 0);
    }
  }

  setGeneration(gen: number) {
    this.generation = gen;
    this.initializeGame(); 
  }

  getClue(): string {
    if (!this.currentPokemon) return '';
    const name = this.getCleanPokemonName(this.currentPokemon);
    if (this.difficulty === 'easy') {
      const revealCount = Math.min(3, Math.max(1, Math.ceil(name.length / 3)));
      return name.slice(0, revealCount) + '*'.repeat(name.length - revealCount);
    } else if (this.difficulty === 'medium') {
      return name[0] + '*'.repeat(name.length - 1);
    } else {
      return '*'.repeat(name.length);
    }
  }

  get clueArray(): (string|null)[] {
    if (!this.currentPokemon) return [];
    const clue = this.getClue();
    return this.getCleanPokemonName(this.currentPokemon).split('').map((char, i) => clue[i] !== '*' ? char : null);
  }

  onLetterChange(idx: number, event: Event) {
    const input = event.target as HTMLInputElement;
    const val = input.value.toUpperCase().replace(/[^A-Z]/g, '');
    if (this.guessLetters[idx] !== undefined) {
        this.guessLetters[idx] = val;
    }
    if (val && idx < this.guessLetters.length - 1) {
        let nextIdx = idx + 1;
        while(nextIdx < this.guessLetters.length && this.clueArray[nextIdx]) {
            nextIdx++;
        }
        if (nextIdx < this.guessLetters.length) {
            const nextInput = input.parentElement?.children[nextIdx] as HTMLInputElement;
            if (nextInput) nextInput.focus();
        }
    }

    if (this.isLastInputFilled()) {
      this.autoSubmitGuess();
    }
  }

  get missingLetters(): string[] {
    if (this.difficulty !== 'easy' || !this.currentPokemon) return [];
    const name = this.getCleanPokemonName(this.currentPokemon).toUpperCase();
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

  isLastInputFilled(): boolean {
    if (!this.currentPokemon) return false;
    return this.guessLetters.every((letter, i) => this.clueArray[i] || letter);
  }

  autoSubmitGuess() {
    if (!this.currentPokemon) return;
    const guessStr = this.guessLetters.join('').toLowerCase();
    const correctName = this.getCleanPokemonName(this.currentPokemon).toLowerCase();

    if (guessStr === correctName) {
      const pokemonImage = document.querySelector('.sprite-wrapper img') as HTMLImageElement;
      if (pokemonImage) pokemonImage.classList.remove('shaded'); 
      this.feedback = 'Correct!';
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
      setTimeout(() => this.displayNextPokemon(), 1000); 
    } else {
      this.feedback = 'Try again!';
      this.showRetrySkip = true;
    }
  }

  onLetterKeyDown(idx: number, event: KeyboardEvent) {
    const input = event.target as HTMLInputElement;
    if (event.key === 'Backspace') {
      if (!this.clueArray[idx]) {
        this.guessLetters[idx] = '';
        input.value = '';
      }
      if (input.selectionStart === 0 && input.selectionEnd === 0) {
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

  retryGuess() {
    if (!this.currentPokemon) return;
    this.guessLetters = this.guessLetters.map((letter, i) => this.clueArray[i] ? letter : '');
    this.feedback = '';
    this.showRetrySkip = false;
    this.hasRetried = true;
    setTimeout(() => {
      const firstInput = document.querySelector('.guess-blocks input:not([readonly])') as HTMLInputElement;
      if (firstInput) {
         firstInput.focus();
         firstInput.select();
      }
    }, 0);
  }

  skipPokemon() {
    this.showRetrySkip = false;
    this.feedback = '';
    this.displayNextPokemon(); 
  }

  submitGuess() {
    this.autoSubmitGuess(); 
  }

  getCleanPokemonName(pokemon: Pokemon): string {
    return pokemon.name.replace(/-\w+$/, ''); 
  }

  calculatePoints(nameLength: number, difficulty: Difficulty): number {
    let basePoints = 10;
    if (difficulty === 'easy') basePoints *= 0.5;
    else if (difficulty === 'medium') basePoints *= 1;
    else if (difficulty === 'hard') basePoints *= 1.5;
    else if (difficulty === 'very-hard') basePoints *= 2;
    return Math.ceil(basePoints + nameLength * 0.5);
  }
}
