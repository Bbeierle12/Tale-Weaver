'use server';

/**
 * @fileOverview A flow for generating a species name for a simulation agent.
 *
 * - generateSpeciesName - Generates a Genus and species name based on color.
 */

import {ai} from '@/ai/genkit';
import {
  SpeciesNameInputSchema,
  SpeciesNameOutputSchema,
  type SpeciesNameInput,
  type SpeciesNameOutput,
} from '@/ai/schemas';

export async function generateSpeciesName(input: SpeciesNameInput): Promise<SpeciesNameOutput> {
  return generateSpeciesNameFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateSpeciesNamePrompt',
  input: {schema: SpeciesNameInputSchema},
  output: {schema: SpeciesNameOutputSchema},
  prompt: `You are an expert xenobiologist cataloging new lifeforms discovered in a digital simulation. Your task is to invent a plausible-sounding scientific name (Genus and species) for a new creature based on its coloration, provided as an RGB string.

The names should be creative, evocative, and follow Linnaean binomial nomenclature conventions. Feel free to use Latin or Greek roots. The name should hint at the color without being overly literal.

For example, for a reddish creature like 'rgb(210, 50, 50)', you might invent 'Rubicundus agilis' or 'Sanguinaria reptans'. For a greenish one ('rgb(50, 210, 50)'), 'Viridia errans' or 'Prasinus saltator' are good examples.

Creature Color: {{{color}}}
`,
});

const generateSpeciesNameFlow = ai.defineFlow(
  {
    name: 'generateSpeciesNameFlow',
    inputSchema: SpeciesNameInputSchema,
    outputSchema: SpeciesNameOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);
