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
  prompt: `You are an expert ecologist and data analyst, providing a concise analysis of an agent-based life simulation.

Your analysis must be structured in markdown format as follows:

### Summary of Findings
Provide a concise summary paragraph (less than 150 words) of the simulation. State the primary observation (e.g., population collapse due to starvation) and highlight any key dynamics you observed from the data.

### Key Observations
- **Population Trend:** Describe the trend of the live agent population and deaths over time.
- **Resource Trend:** Describe how the average food per tile evolved. Did the agents deplete the resources?
- **Survival Factors:** Briefly comment on why some agents survived longer than others, considering the random-walk behavior.

### Data Table: Simulation History (Sample)
Provide a markdown table of the simulation history. Show the first 5 rows, a separator '...', and the last 5 rows if the history is longer than 10 rows. Columns: \`Tick, Live Agents, Deaths, Avg Energy, Avg Food, Avg Food SD\`.

### Suggested Next Experiment
Based on this run, suggest a single, concrete next experiment (e.g., adding reproduction, giving agents vision).

---

#### Reference Data

**Simulation Parameters:**
- Initial Agent Population: {{{initialAgentCount}}}
- Initial Food Per Tile: {{{initialFoodPerTile}}}
- World Size: 200x200
- Ticks: {{{ticks}}}
- Agent Metabolic Cost: 1.0 energy/sec
- Food Energy Value: 10.0
- Food Regrowth Rate: 0.15 / sec across 400 events/sec

**Full Simulation History:**
\`\`\`json
{{{json simulationHistory}}}
\`\`\`
`,
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
