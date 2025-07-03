'use server';

/**
 * @fileOverview A flow for having a conversation about a simulation's results.
 *
 * - chatAboutSimulation - A conversational flow to analyze simulation data.
 */

import {ai} from '@/ai/genkit';
import {
  SimulationChatInputSchema,
  SimulationChatOutputSchema,
  type SimulationChatInput,
  type SimulationChatOutput,
} from '@/ai/schemas';

export async function chatAboutSimulation(
  input: SimulationChatInput
): Promise<SimulationChatOutput> {
  return simulationChatFlow(input);
}

const prompt = ai.definePrompt({
  name: 'simulationChatPrompt',
  input: {schema: SimulationChatInputSchema},
  output: {schema: SimulationChatOutputSchema},
  config: {
    maxOutputTokens: 750000,
  },
  prompt: `You are a helpful and brilliant simulation analyst called 'SIM-SAGE'. The user is running an agent-based simulation and will ask you questions about the data.

Your task is to answer the user's questions based on the provided simulation data. You have access to the full tick-by-tick history of the simulation.

When answering, be concise and refer directly to the data. If the user asks for something not in the data, state that clearly.

=== Reference Data ===

The user provides the following simulation data. This is your only source of information.

**Simulation Parameters:**
- Initial Agent Population: {{{initialAgentCount}}}
- Peak Agent Population: {{{peakAgentCount}}}
- Initial Food Per Tile: {{{initialFoodPerTile}}}
- World Size: 200x200
- Ticks Ran: {{{ticks}}}

**Full Simulation History (Tick, Population, Demographics, Agent Energy (avg, SD, min, max), Tile Food (avg, SD, min, max, Gini)):**
\`\`\`json
{{{json simulationHistory}}}
\`\`\`

=== Conversation History ===
{{#each messages}}
**{{this.role}}**: {{this.content}}
{{/each}}

**model**:`,
});

const simulationChatFlow = ai.defineFlow(
  {
    name: 'simulationChatFlow',
    inputSchema: SimulationChatInputSchema,
    outputSchema: SimulationChatOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);
