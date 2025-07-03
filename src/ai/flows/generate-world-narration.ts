'use server';

/**
 * @fileOverview A flow for generating a deep-dive analysis of an agent simulation.
 *
 * - analyzeSimulation - Generates an analysis based on final simulation stats.
 */

import {ai} from '@/ai/genkit';
import {
  SimulationAnalysisInputSchema,
  SimulationAnalysisOutputSchema,
} from '@/ai/schemas';
import type { SimulationAnalysisInput, SimulationAnalysisOutput } from '@/ai/schemas';

export async function analyzeSimulation(
  input: SimulationAnalysisInput
): Promise<SimulationAnalysisOutput> {
  return analyzeSimulationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeSimulationPrompt',
  input: {schema: SimulationAnalysisInputSchema},
  output: {schema: SimulationAnalysisOutputSchema},
  prompt: `You are an expert ecologist and data analyst, tasked with analyzing data from an agent-based life simulation.

The simulation uses a simple model:
- Agents wander randomly on a 2D map.
- The map contains food tiles that slowly regrow.
- Agents consume food from their current tile to gain energy.
- Agents have a constant metabolic cost, losing energy over time.
- If an agent's energy reaches zero, it dies.
- All agents are present from the start; there is no reproduction.

Here is the data from the completed simulation run:
- Total Duration: {{{ticks}}} ticks.
- Peak Agent Population: {{{peakAgentCount}}} agents.
- Final Agent Population: {{{finalAgentCount}}} agents.
- Final Average Agent Energy: {{{finalAvgEnergy}}}
- Final Average Food per Tile: {{{finalAvgTileFood}}}

Based on this data, provide a deep-dive analysis. Address the following points:
1.  **Population Dynamics:** Describe the population trend. Was there a sharp decline? A slow attrition? What does the difference between the peak and final population tell you?
2.  **Environment & Carrying Capacity:** How did the agents impact the environment (the food)? Does the final average food level suggest the environment was depleted, stable, or plentiful? Discuss the concept of carrying capacity in relation to the number of agents.
3.  **Survival Analysis:** What factors likely determined which agents survived? Since behavior is random, survival would be linked to luck (finding food tiles) and the overall food availability.
4.  **Conclusion:** Summarize the simulation's story. Was it a story of a population boom followed by a crash? A stable ecosystem? A slow decline into extinction? Offer one suggestion for a future experiment (e.g., adding reproduction, predator-prey dynamics, or genetic traits).

Structure your report using markdown. Use headings for each section (e.g., "## Population Dynamics"). Your tone should be scientific and insightful.`,
});

const analyzeSimulationFlow = ai.defineFlow(
  {
    name: 'analyzeSimulationFlow',
    inputSchema: SimulationAnalysisInputSchema,
    outputSchema: SimulationAnalysisOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);
