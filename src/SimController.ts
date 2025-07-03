import { runSimulationStepAction } from '@/app/actions';
import type { EcosystemState } from '@/ai/schemas';

export const INITIAL_NARRATION =
  'A new world awakens, teeming with potential. Lush grass sways in the gentle breeze, a small warren of rabbits nibbles contentedly, and a lone fox watches from a distance. The story of this ecosystem is ready to be written.';

export const INITIAL_STATE: EcosystemState = {
  day: 1,
  populations: {
    Grass: 1000,
    Rabbits: 20,
    Foxes: 5,
  },
  environment: {
    temperature: 15,
    rainfall: 5,
  },
  log: ['The simulation has begun in a temperate meadow.'],
};

export class SimController {
  private state: EcosystemState;
  private narration: string;

  constructor() {
    this.state = JSON.parse(JSON.stringify(INITIAL_STATE));
    this.narration = INITIAL_NARRATION;
  }

  public getState(): EcosystemState {
    return this.state;
  }

  public getNarration(): string {
    return this.narration;
  }

  public async nextDay(): Promise<void> {
    const result = await runSimulationStepAction(this.state);
    if (result) {
      this.state = result.newState;
      this.narration = result.narration;
    }
  }

  public reset(): void {
    this.state = JSON.parse(JSON.stringify(INITIAL_STATE));
    this.narration = INITIAL_NARRATION;
  }
}
