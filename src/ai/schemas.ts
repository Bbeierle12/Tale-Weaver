/**
 * @fileOverview This file contains the Zod schemas and TypeScript types for the simulation analysis.
 */

import {z} from 'zod';

export const SimulationTickSchema = z.object({
  tick: z.number().describe('The simulation tick number.'),
  liveAgents: z.number().describe('The number of agents alive at this tick.'),
  deaths: z.number().describe('The number of agents that died this tick.'),
  avgEnergy: z.number().describe('The average energy of agents at this tick.'),
  avgTileFood: z.number().describe('The average food per tile at this tick.'),
  avgTileFoodSD: z
    .number()
    .describe('The standard deviation of food per tile at this tick.'),
});

export const SimulationAnalysisInputSchema = z.object({
  ticks: z.number().describe('The total number of ticks the simulation ran.'),
  peakAgentCount: z
    .number()
    .describe('The maximum number of agents alive at any point.'),
  initialAgentCount: z
    .number()
    .describe('The number of agents at the start of the simulation.'),
  initialFoodPerTile: z
    .number()
    .describe('The initial food value for each tile.'),
  simulationHistory: z
    .array(SimulationTickSchema)
    .describe(
      'An array of statistics for each tick of the simulation.'
    ),
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
