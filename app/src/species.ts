/**
 * @fileoverview This file defines the data-driven species system for the simulation.
 */

import type { Agent } from './Agent';
import { rng } from './utils/random';
import type { Tile, World } from './world';

/** A unique identifier for a species type. */
export enum SpeciesType {
  OMNIVORE = 'omnivore',
}

/** Defines the signature for a function that mutates an agent's genome. */
export type MutationFn = (genome: Float32Array) => Float32Array;

/**
 * Defines the signature for agent behavior functions.
 */
export type AgentBehaviorFunction<T = Tile | Agent> = (
  agent: Agent,
  target: T,
  world: World,
) => void;

/**
 * An interface that encapsulates the specific behaviors of a species.
 * This allows for modular and composable agent logic.
 */
export interface AgentBehavior {
  move(agent: Agent, world: World): void;
  eat(agent: Agent, target: Tile | Agent, world: World): void;
  reproduce(agent: Agent, world: World): void;
}


/**
 * The data contract that every species must fulfill. This allows for a
 * data-driven approach where new species can be added without changing
 * the core simulation engine.
 */
export interface SpeciesDefinition {
  key: SpeciesType;
  genomeLength: number;
  color: string; // CSS color string for the renderer
  // --- Behavior-related properties ---
  basalMetabolicRate: number;
  movementCost: number;
  birthThreshold: number;
  birthCost: number;
  deathThreshold: number;
  biteEnergy: number; // Energy gained per bite (before food value multiplier)
  // --- Behavior hooks ---
  behavior: AgentBehavior;
  mutationFn: MutationFn;
}

// -----------------------------------------------------------------------------
// --- Default Omnivore Species Definition -------------------------------------
// -----------------------------------------------------------------------------

const OMNIVORE_BEHAVIOR: AgentBehavior = {
  move: (agent, world) => {
    // Random walk (von Neumann)
    const dir = Math.floor(rng() * 4);
    switch (dir) {
      case 0:
        agent.x = (agent.x + 1) % world.width;
        break;
      case 1:
        agent.x = (agent.x + world.width - 1) % world.width;
        break;
      case 2:
        agent.y = (agent.y + 1) % world.height;
        break;
      case 3:
        agent.y = (agent.y + world.height - 1) % world.height;
        break;
    }
    agent.stepsTaken += 1;
    agent.distanceTravelled += 1; // Cardinal moves have distance of 1
    agent.energy -= agent.speciesDef.movementCost;
    world.moveDebit += agent.speciesDef.movementCost;
  },

  eat: (agent, target, world) => {
    // This omnivore only eats from the ground, so it ignores Agent targets.
    if ('food' in target) { // It's a Tile
      const foodUnits =
        agent.speciesDef.biteEnergy / world.config.foodValue;
      const eaten = world.consumeFood(agent.x, agent.y, foodUnits, agent);
      if (eaten > 0) {
        const gained = eaten * world.config.foodValue;
        agent.energy += gained;
        agent.foodConsumed += gained;
        agent.foundFood = true;
      }
    }
  },

  reproduce: (agent, world) => {
    if (agent.energy >= agent.speciesDef.birthThreshold) {
      agent.energy -= agent.speciesDef.birthCost;
      world.getBus().emit({ type: 'birth', payload: { parent: agent } });
    }
  },
};


const OMNIVORE_MUTATION: MutationFn = (genome: Float32Array): Float32Array => {
  const childGenome = new Float32Array(genome);
  // Simple point mutation on a random gene
  if (rng() < 0.1) { // 10% mutation chance per birth
    const geneIndex = Math.floor(rng() * childGenome.length);
    const mutationAmount = (rng() * 2 - 1) * 0.1; // Small change
    childGenome[geneIndex] = Math.min(1, Math.max(0, childGenome[geneIndex] + mutationAmount));
  }
  return childGenome;
};

const OMNIVORE_DEFINITION: SpeciesDefinition = {
  key: SpeciesType.OMNIVORE,
  genomeLength: 3, // Corresponds to RGB color for now
  color: 'rgb(200, 200, 200)',
  basalMetabolicRate: 0.01,
  movementCost: 0.02,
  birthThreshold: 20,
  birthCost: 9,
  deathThreshold: 1e-3,
  biteEnergy: 1,
  behavior: OMNIVORE_BEHAVIOR,
  mutationFn: OMNIVORE_MUTATION,
};

// -----------------------------------------------------------------------------
// --- Species Registry --------------------------------------------------------
// -----------------------------------------------------------------------------

/** A central registry to store and retrieve species definitions by their key. */
export const SPECIES_REGISTRY = new Map<SpeciesType, SpeciesDefinition>([
  [SpeciesType.OMNIVORE, OMNIVORE_DEFINITION],
]);
