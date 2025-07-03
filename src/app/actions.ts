'use server';

import {simulateEcosystemStep} from '@/ai/flows/generate-world-narration';
import type {
  EcosystemState,
  SimulationStepOutput,
} from '@/ai/schemas';

export async function runSimulationStepAction(
  currentState: EcosystemState
): Promise<SimulationStepOutput> {
  try {
    const result = await simulateEcosystemStep(currentState);
    return result;
  } catch (error) {
    console.error('Error running simulation step:', error);
    // Return a valid output structure even on error, to prevent crashing the client
    const logMessage =
      'A cosmic anomaly disrupted the flow of time. The ecosystem remains unchanged.';
    return {
      newState: {
        ...currentState,
        log: [...currentState.log, logMessage].slice(-5),
      },
      narration: logMessage,
    };
  }
}
