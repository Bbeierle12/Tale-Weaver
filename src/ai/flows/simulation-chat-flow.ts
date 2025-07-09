'use server';

/**
 * @fileOverview A flow for having a conversation about a simulation's results.
 *
 * - chatAboutSimulation - A conversational flow to analyze simulation data.
 */

import { ai } from '@/ai/genkit';
import {
  SimulationChatInputSchema,
  SimulationChatOutputSchema,
  type SimulationChatInput,
  type SimulationChatOutput,
} from '@/ai/schemas';

export async function chatAboutSimulation(
  input: SimulationChatInput,
): Promise<SimulationChatOutput> {
  return simulationChatFlow(input);
}

const prompt = ai.definePrompt({
  name: 'simulationChatPrompt',
  input: { schema: SimulationChatInputSchema },
  output: { schema: SimulationChatOutputSchema },
  config: {
    maxOutputTokens: Number(process.env.MAX_OUTPUT_TOKENS ?? 4096),
  },
  prompt: `You are a helpful and brilliant simulation analyst called 'SIM-SAGE'. The user is running an agent-based simulation and will ask you questions about the data.

Your task is to have a natural, multi-turn conversation with the user, answering their questions based on the provided simulation data and the history of your chat.

When answering, be concise and refer directly to the data. If the user asks for something not in the data, state that clearly. Use the conversation history to understand the context of the user's current question.

=== Reference Data ===
The user provides the following simulation data. This is your only source of information for answering questions about the simulation.

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
This is the conversation you have had with the user so far. Use it to maintain context.
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
    const { output } = await prompt(input);
    return output!;
  },
);
