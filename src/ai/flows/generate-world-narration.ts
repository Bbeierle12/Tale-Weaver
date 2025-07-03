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
  config: {
    maxOutputTokens: 750000,
  },
  prompt: `You are a rigorous, skeptical, and expert systems ecologist. Your task is to analyze the provided agent-based simulation data and produce a concise, data-driven report.

Your analysis will follow a strict format.

=== Reference Data ===

The user provides the following simulation data. This is your only source of information.

**Simulation Parameters:**
- Initial Agent Population: {{{initialAgentCount}}}
- Peak Agent Population: {{{peakAgentCount}}}
- Initial Food Per Tile: {{{initialFoodPerTile}}}
- World Size: 200x200
- Ticks Ran: {{{ticks}}}
- Agent Metabolic Cost: 1.0 energy/sec
- Food Energy Value: 10.0
- Food Regrowth Rate: 0.15 / sec across 400 events/sec

**Full Simulation History (Tick, Population, Demographics, Agent Energy (avg, SD, min, max), Tile Food (avg, SD, min, max, Gini)):**
\`\`\`json
{{{json simulationHistory}}}
\`\`\`

=== Task ===
1.  **Key Facts & Gaps**: Pull all parameters, key outcomes (e.g., population crash/stability, resource depletion), and any statistical anomalies. Note if critical data for a full analysis is missing from the provided dump.
2.  **Analysis**:
    *   **Stats**: Describe trendlines, variance, and any obvious breakpoints in the data. Look for correlations between agent energy and food availability. Use the Gini coefficient to discuss resource inequality.
    *   **Mechanisms**: Analyze the causal chains. Does the system resemble classic ecological models (e.g., Lotka-Volterra, r/K selection)? Why or why not?
    *   **Forecast**: Briefly project what might happen if the simulation ran 5x longer. Include major caveats.
    *   **Robustness**: Propose alternative hypotheses for the observed dynamics. Suggest a key parameter to test for sensitivity.
3.  **Recommendations**: Provide concrete, actionable next steps for the researcher, tagged with priority [HIGH], [MED], [LOW]. These should cover simulation model tweaks, new instrumentation/data to collect, or validation experiments.

=== Output Format (Strictly in this order) ===
Your final output must be a single markdown block.

#### Executive Summary
(A list of ≤ 12 bullet points summarizing the most critical findings and recommendations.)

#### Full Analysis
(Your full analysis, with subheadings for Stats, Mechanisms, Forecast, and Robustness.)

#### Actionable Recommendations
(Your list of recommendations, ranked and tagged with priority.)
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
