'use server';

/**
 * @fileOverview Adapts the game narration based on the player's actions and game events.
 *
 * - adaptNarrationToGameState - A function that adapts the game narration based on the game state.
 * - AdaptNarrationToGameStateInput - The input type for the adaptNarrationToGameState function.
 * - AdaptNarrationToGameStateOutput - The return type for the adaptNarrationToGameState function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AdaptNarrationToGameStateInputSchema = z.object({
  currentLocation: z.string().describe('The current location of the player in the game world.'),
  recentEvents: z.array(z.string()).describe('A list of recent events that have occurred in the game.'),
  playerScore: z.number().describe('The current score of the player.'),
  currentLevel: z.number().describe('The current level of the game.'),
});
export type AdaptNarrationToGameStateInput = z.infer<typeof AdaptNarrationToGameStateInputSchema>;

const AdaptNarrationToGameStateOutputSchema = z.object({
  narration: z.string().describe('The adapted narration based on the game state.'),
});
export type AdaptNarrationToGameStateOutput = z.infer<typeof AdaptNarrationToGameStateOutputSchema>;

export async function adaptNarrationToGameState(input: AdaptNarrationToGameStateInput): Promise<AdaptNarrationToGameStateOutput> {
  return adaptNarrationToGameStateFlow(input);
}

const prompt = ai.definePrompt({
  name: 'adaptNarrationToGameStatePrompt',
  input: {schema: AdaptNarrationToGameStateInputSchema},
  output: {schema: AdaptNarrationToGameStateOutputSchema},
  prompt: `You are the game narrator, tasked with describing the game world based on the current game state.

Current Location: {{{currentLocation}}}
Recent Events: {{#each recentEvents}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
Player Score: {{{playerScore}}}
Current Level: {{{currentLevel}}}

Generate a short narrative snippet that reflects the current game state and engages the player. Focus on making the story dynamic and responsive to the player's choices and the game's events.
`,
});

const adaptNarrationToGameStateFlow = ai.defineFlow(
  {
    name: 'adaptNarrationToGameStateFlow',
    inputSchema: AdaptNarrationToGameStateInputSchema,
    outputSchema: AdaptNarrationToGameStateOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
