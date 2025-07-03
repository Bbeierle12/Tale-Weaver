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
  prompt: `You are an expert ecologist and data analyst, providing a core-diagnostics checklist for an agent-based life simulation.

Your analysis MUST address the following 12 points, using the provided data. Structure your response in markdown.

**Simulation Parameters & Initial Conditions:**
- **Initial Agent Population:** {{{initialAgentCount}}}
- **Initial Food Per Tile:** {{{initialFoodPerTile}}}
- **World Size:** 200x200
- **Agent Parameters:**
  - Move Speed: 1.0 units/sec
  - Metabolic Cost: 1.0 energy/sec
  - Food Consumption Amount: 0.05 per attempt
  - Food Energy Value: 10.0 energy per unit of food
- **Environment Parameters:**
  - Food Regrowth Rate: 0.15 / sec
  - Food Regrowth Events: 400 / sec

---

### Core Diagnostics Checklist

**1. Hypothesis or Design Question:**
What was this run testing? (Assume the goal was to observe population dynamics under starvation pressure with no reproduction.)

**2. Parameter Set:**
(Listed above)

**3. Initial Conditions:**
(Listed above)

**4. Reproduction:**
Did agents reproduce? (The current model has no reproduction, so state this clearly. Births will be 0).

**5. Population and Energy Evolution:**
Describe the evolution of the live population, deaths per tick, and mean agent energy over the simulation's {{{ticks}}} ticks. Use the historical data provided. What does the trend show?

**6. Resource Evolution:**
How did the average food per tile and its standard deviation evolve? Does this indicate resource depletion, stability, or something else?

**7. Per-tick Energy Budget:**
Analyze the energy budget. Was the total energy gained from food consumption enough to offset the total metabolic cost? (You will need to estimate this, as per-agent consumption is not in the data).

**8. Spatial Correlation:**
Given random walk, survival is likely tied to luck. Discuss if initial agent placement in relation to food would have mattered.

**9. Density-Dependent Regulation:**
With no reproduction, the key density-dependent factor is resource competition. How did the declining population density affect the per-capita resource availability?

**10. Inequality:**
Discuss the potential for inequality. Even with identical agents, would some be "luckier" by randomly finding more food patches? How would this create a Gini-like effect in energy distribution?

**11. Parameter Sensitivity:**
Theorize how sensitive the results might be to \`metabolicCost\` and \`growthRate\`. What would a small change in these parameters do to the survival curve?

**12. Next Experiment:**
Based on this run, what is a concrete next experiment? (e.g., adding reproduction, changing agent behavior, introducing vision).

---

### Data Summary

**Tick-level Data (Sample):**
Provide a markdown table of the simulation history. Show the first 5 rows, a separator '...', and the last 5 rows if the history is longer than 10 rows. Columns: \`Tick, Live Agents, Deaths, Avg Energy, Avg Food, Avg Food SD\`.

**Plot Descriptions:**
1.  **Population over Time:** Describe the shape of the curve for live agents and deaths per tick over time.
2.  **Resources over Time:** Describe the shape of the curve for average food per tile over time.

---

### Summary Paragraph (<150 words)

Provide a concise summary answering Question 1 and highlighting any surprising results from the analysis relative to that hypothesis.

**Simulation History Data:**
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
