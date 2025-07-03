// src/ai/flows/generate-world-narration.ts
'use server';

/**
 * @fileOverview Generates narrative descriptions of the game world using AI.
 *
 * - generateWorldNarration - A function that generates narrative descriptions of the game world.
 * - GenerateWorldNarrationInput - The input type for the generateWorldNarration function.
 * - GenerateWorldNarrationOutput - The return type for the generateWorldNarration function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateWorldNarrationInputSchema = z.object({
  locationDescription: z
    .string()
    .describe('A description of the current location in the game world.'),
  events: z.string().describe('A description of recent events in the game.'),
  score: z.number().describe('The player score.'),
  level: z.number().describe('The current level of the game.'),
});
export type GenerateWorldNarrationInput = z.infer<
  typeof GenerateWorldNarrationInputSchema
>;

const GenerateWorldNarrationOutputSchema = z.object({
  narration: z.string().describe('A narrative description of the game world.'),
});
export type GenerateWorldNarrationOutput = z.infer<
  typeof GenerateWorldNarrationOutputSchema
>;

export async function generateWorldNarration(
  input: GenerateWorldNarrationInput
): Promise<GenerateWorldNarrationOutput> {
  return generateWorldNarrationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateWorldNarrationPrompt',
  input: {schema: GenerateWorldNarrationInputSchema},
  output: {schema: GenerateWorldNarrationOutputSchema},
  prompt: `You are a fantasy narrator describing the game world to the player.

Use the following game state information to create a vivid and immersive narrative:

Location: {{locationDescription}}
Events: {{events}}
Score: {{score}}
Level: {{level}}

Narrative:`, // Prompt should end with 'Narrative:'
});

const generateWorldNarrationFlow = ai.defineFlow(
  {
    name: 'generateWorldNarrationFlow',
    inputSchema: GenerateWorldNarrationInputSchema,
    outputSchema: GenerateWorldNarrationOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
