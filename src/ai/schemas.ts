/**
 * @fileOverview This file contains the Zod schemas and TypeScript types for AI-related flows.
 */

import {z} from 'zod';

// Schemas for Simulation Analysis
export const TickStatsSchema = z.object({
  tick: z.number().describe('The simulation tick number.'),
  population: z.number().describe('The number of agents alive at this tick.'),
  births: z.number().describe('The number of new agents born this tick.'),
  deaths: z.number().describe('The number of agents that died this tick.'),
  totalBasalCost: z
    .number()
    .describe(
      'Total energy spent by all agents on basal metabolism this tick.'
    )
    .optional(), // Now obsolete
  totalMoveCost: z
    .number()
    .describe('Total energy spent by all agents on movement this tick.')
    .optional(), // Now obsolete
  avgEnergy: z.number().describe('The average energy of agents at this tick.'),
  energySD: z
    .number()
    .describe('The standard deviation of agent energy at this tick.'),
  minEnergy: z.number().describe('The minimum energy of any agent this tick.'),
  maxEnergy: z.number().describe('The maximum energy of any agent this tick.'),
  energyHistogram: z
    .array(z.number())
    .optional()
    .describe(
      'A 10-bin histogram of agent energy levels, captured periodically. Index 0 is the count for the lowest 10% of the energy range, etc.'
    ),
  avgTileFood: z.number().describe('The average food per tile at this tick.'),
  avgTileFoodSD: z
    .number()
    .describe('The standard deviation of food per tile at this tick.'),
  minTileFood: z
    .number()
    .describe('The minimum food on any tile this tick.'),
  maxTileFood: z
    .number()
    .describe('The maximum food on any tile this tick.'),
  foodGini: z
    .number()
    .describe(
      'The Gini coefficient of food distribution inequality (0=perfect equality, 1=max inequality).'
    ),
});
export type TickStats = z.infer<typeof TickStatsSchema>;

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
    .array(TickStatsSchema)
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

// Schemas for Species Name Generation
export const SpeciesNameInputSchema = z.object({
  color: z.string().describe('The RGB color of the species, e.g., "rgb(123, 45, 67)".'),
});
export type SpeciesNameInput = z.infer<typeof SpeciesNameInputSchema>;

export const SpeciesNameOutputSchema = z.object({
  genus: z.string().describe('The generated Genus name for the species.'),
  species: z.string().describe('The generated species name (epithet).'),
});
export type SpeciesNameOutput = z.infer<typeof SpeciesNameOutputSchema>;


// Schemas for Simulation Chat
export const MessageSchema = z.object({
  role: z.enum(['user', 'model']),
  content: z.string(),
});
export type Message = z.infer<typeof MessageSchema>;

export const SimulationChatInputSchema = SimulationAnalysisInputSchema.extend({
  messages: z.array(MessageSchema).describe('The history of the conversation so far.'),
});
export type SimulationChatInput = z.infer<typeof SimulationChatInputSchema>;


export const SimulationChatOutputSchema = z.object({
  response: z
    .string()
    .describe(
      "The AI assistant's response to the user."
    ),
});
export type SimulationChatOutput = z.infer<typeof SimulationChatOutputSchema>;
