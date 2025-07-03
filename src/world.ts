import { runSimulationStepAction } from '@/app/actions';
import type { EcosystemState } from '@/ai/schemas';
import { INITIAL_STATE, INITIAL_NARRATION } from './constants';

export class World {
  private state: EcosystemState;
  private narration: string;
  private timeAccumulator = 0;
  private readonly timePerStep = 2.0; // Seconds per day
  public isUpdating = false;

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

  public update(dt: number) {
    this.timeAccumulator += dt;
    if (this.timeAccumulator >= this.timePerStep && !this.isUpdating) {
      this.timeAccumulator -= this.timePerStep;
      this.isUpdating = true;

      // Fire-and-forget the async update. The renderer will pick up the
      // loading state and the new data once it's available.
      runSimulationStepAction(this.state)
        .then(result => {
          if (result) {
            this.state = result.newState;
            this.narration = result.narration;
          }
        })
        .catch(error => {
          console.error('Error during world update:', error);
          // You could add error handling here, like updating the narration
          // with an error message.
        })
        .finally(() => {
          this.isUpdating = false;
        });
    }
  }

  public reset() {
    this.state = JSON.parse(JSON.stringify(INITIAL_STATE));
    this.narration = INITIAL_NARRATION;
    this.timeAccumulator = 0;
    this.isUpdating = false;
  }
}
