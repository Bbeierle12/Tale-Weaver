'use server';
/**
 * @fileOverview This file contains the Zod schemas and TypeScript types for the ecosystem simulation.
 * It is separate from the flow definition to allow these types to be used in client components
 * without violating the "use server" directive which only allows async function exports.
 *
 * - EcosystemStateSchema - Zod schema for the state of the ecosystem.
 * - EcosystemState - TypeScript type inferred from EcosystemStateSchema.
 * - SimulationStepOutputSchema - Zod schema for the output of a simulation step.
 * - SimulationStepOutput - TypeScript type inferred from SimulationStepOutputSchema.
 */

import {z} from 'zod';

export const EcosystemStateSchema = z.object({
  day: z.number().describe('The current day in the simulation.'),
  populations: z
    .record(z.string(), z.number())
    .describe('A map of species names to their population count.'),
  environment: z
    .object({
      temperature: z.number().describe('The average temperature in Celsius.'),
      rainfall: z.number().describe('The rainfall in mm.'),
    })
    .describe('The current environmental conditions.'),
  log: z
    .array(z.string())
    .describe('A log of the last few significant events.'),
});
export type EcosystemState = z.infer<typeof EcosystemStateSchema>;

export const SimulationStepOutputSchema = z.object({
  newState: EcosystemStateSchema.describe(
    'The updated state of the ecosystem after the time step.'
  ),
  narration: z
    .string()
    .describe(
      'A narrative summary of what happened during this time step, explaining the changes in population and environment.'
    ),
});
export type SimulationStepOutput = z.infer<typeof SimulationStepOutputSchema>;
