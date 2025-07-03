import type { EcosystemState } from './ai/schemas';
import type { World } from './world';

type StateSetter<S> = React.Dispatch<React.SetStateAction<S>>;

export class Renderer {
  private world: World;
  private setSimulationState: StateSetter<EcosystemState>;
  private setNarration: StateSetter<string>;
  private setIsLoading: StateSetter<boolean>;

  constructor(
    world: World,
    setSimulationState: StateSetter<EcosystemState>,
    setNarration: StateSetter<string>,
    setIsLoading: StateSetter<boolean>
  ) {
    this.world = world;
    this.setSimulationState = setSimulationState;
    this.setNarration = setNarration;
    this.setIsLoading = setIsLoading;
  }

  public draw() {
    // This isn't "drawing" in a traditional sense, but rather syncing
    // the simulation state with the React UI state, triggering a re-render.
    this.setSimulationState({ ...this.world.getState() });
    this.setNarration(this.world.getNarration());
    this.setIsLoading(this.world.isUpdating);
  }
}
