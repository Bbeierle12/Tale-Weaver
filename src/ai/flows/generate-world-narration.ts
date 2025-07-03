'use server';

/**
 * @fileOverview A flow for simulating a step in an ecosystem.
 *
 * - simulateEcosystemStep - Simulates one time step of the ecosystem.
 * - EcosystemState - The type for the ecosystem's state.
 * - SimulationStepOutput - The return type for the simulation step.
 */

import {ai} from '@/ai/genkit';
import {
  EcosystemState,
  EcosystemStateSchema,
  SimulationStepOutput,
  SimulationStepOutputSchema,
} from '@/ai/schemas';

export async function simulateEcosystemStep(
  input: EcosystemState
): Promise<SimulationStepOutput> {
  return simulateEcosystemStepFlow(input);
}

const prompt = ai.definePrompt({
  name: 'simulateEcosystemStepPrompt',
  input: {schema: EcosystemStateSchema},
  output: {schema: SimulationStepOutputSchema},
  prompt: `You are an expert ecosystem simulator. Your task is to advance the simulation by one day.
Given the current state of the ecosystem, you must calculate the state for the next day.

Current State:
- Day: {{{day}}}
- Populations: {{#each populations}}* {{this.[@key]}}: {{this}} {{/each}}
- Environment: Temperature {{environment.temperature}}°C, Rainfall {{environment.rainfall}}mm
- Recent Events: {{#each log}}* {{{this}}} {{/each}}

Follow these rules for the simulation:
1.  **Time:** Increment the day by 1.
2.  **Population Dynamics:**
    *   Model growth: Species should reproduce. Grass grows based on rainfall. Herbivores (like Rabbits) reproduce based on grass availability. Carnivores (like Foxes) reproduce based on herbivore availability.
    *   Model consumption/predation: Foxes eat Rabbits, reducing their population. Rabbits eat Grass, reducing its abundance.
    *   Model death: A small percentage of each animal population may die of natural causes each day.
    *   Populations cannot be negative. The minimum is 0. All populations must be integers.
3.  **Environmental Changes:**
    *   Slightly and randomly vary the temperature and rainfall for the new day to simulate natural weather patterns.
4.  **Logging:** Update the log with 1-3 new, significant events from the step you just simulated. Keep the log size from growing too large (max 5 items).
5.  **Narration:** Write a brief, engaging summary of the events of the day. Explain the major changes and why they happened.
6.  **Output:** Provide the complete new state of the ecosystem and the narration in the specified JSON format.

Ecosystem Interactions:
- Grass is the producer. It grows with rain and sun (moderate temperature). Its population is measured in units of biomass.
- Rabbits are primary consumers (herbivores). They eat Grass.
- Foxes are secondary consumers (carnivores). They eat Rabbits.

Example Logic:
- If grass is plentiful, rabbit population might increase by 10%.
- If rabbits are plentiful, fox population might increase by 5%.
- A fox needs to eat several rabbits over time to survive and reproduce.
- If there is a drought (low rainfall), grass will decrease, which will then impact the rabbit and fox populations in subsequent steps.

Now, calculate the next day's state based on the provided input. Make the simulation interesting and somewhat unpredictable.`,
});

const simulateEcosystemStepFlow = ai.defineFlow(
  {
    name: 'simulateEcosystemStepFlow',
    inputSchema: EcosystemStateSchema,
    outputSchema: SimulationStepOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (output) {
      // Ensure populations are integers
      for (const species in output.newState.populations) {
        output.newState.populations[species] = Math.round(output.newState.populations[species]);
      }
    }
    return output!;
  }
);
