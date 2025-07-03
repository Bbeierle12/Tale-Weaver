/**
 * @fileOverview This file contains the Zod schemas and TypeScript types for the simulation analysis.
 */

import {z} from 'zod';

export const SimulationAnalysisInputSchema = z.object({
  ticks: z.number().describe('The total number of ticks the simulation ran.'),
  peakAgentCount: z
    .number()
    .describe('The maximum number of agents alive at any point.'),
  finalAgentCount: z
    .number()
    .describe('The number of agents alive at the end of the simulation.'),
  finalAvgEnergy: z
    .number()
    .describe('The average energy of the agents at the end.'),
  finalAvgTileFood: z
    .number()
    .describe('The average food per tile on the map at the end.'),
});
export type SimulationAnalysisInput = z.infer<
  typeof SimulationAnalysisInputSchema
>;

export const SimulationAnalysisOutputSchema = z.object({
  analysis: z
    .string()
    .describe(
      'A detailed, markdown-formatted analysis of the simulation.'
    ),
});
export type SimulationAnalysisOutput = z.infer<
  typeof SimulationAnalysisOutputSchema
>;
