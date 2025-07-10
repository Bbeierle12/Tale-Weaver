/**
 * @fileoverview This file defines the data-driven species system for the simulation.
 */

import type { Agent } from './Agent';
import { rng } from './utils/random';
import type { Tile, World } from './world';

/** A unique identifier for a species type. */
export enum SpeciesType {
  OMNIVORE = 'omnivore',
  PREDATOR = 'predator',
  PREY = 'prey',
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
 * A type guard to check if a target is an Agent.
 */
function isAgent(target: Tile | Agent): target is Agent {
  return (target as Agent).speciesDef !== undefined;
}

/**
 * A type guard to check if a target is a Tile with food.
 */
function isFood(target: Tile | Agent): target is Tile {
  return 'food' in target;
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
  huntingRadius?: number; // Optional radius for hunting
  // --- Behavior hooks ---
  behavior: AgentBehavior;
  mutationFn: MutationFn;
}

const defaultMutation: MutationFn = (genome: Float32Array): Float32Array => {
  const childGenome = new Float32Array(genome);
  // Simple point mutation on a random gene
  if (rng() < 0.1) {
    // 10% mutation chance per birth
    const geneIndex = Math.floor(rng() * childGenome.length);
    const mutationAmount = (rng() * 2 - 1) * 0.1; // Small change
    childGenome[geneIndex] = Math.min(
      1,
      Math.max(0, childGenome[geneIndex] + mutationAmount),
    );
  }
  return childGenome;
};

// -----------------------------------------------------------------------------
// --- Behavior Definitions ----------------------------------------------------
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
    // This omnivore only eats from the ground.
    if (isFood(target)) {
      const foodUnits = agent.speciesDef.biteEnergy / world.config.foodValue;
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

const PREDATOR_BEHAVIOR: AgentBehavior = {
  move(agent, world) {
    const prey = world.findNearestAgent(
      agent,
      (a) => a.speciesDef.key === SpeciesType.PREY,
      agent.speciesDef.huntingRadius!,
    );
    if (prey) {
      agent.moveToward(prey, world);
    } else {
      agent.moveToward(world.randomAdjacent(agent), world); // wander
    }
  },
  eat(agent, target, world) {
    // Predator only eats other agents, specifically Prey
    if (isAgent(target) && target.speciesDef.key === SpeciesType.PREY) {
      world.killAgent(target);
      agent.energy += target.energy; // full energy transfer
      agent.foundFood = true;
    }
  },
  reproduce(agent, world) {
    if (agent.energy >= agent.speciesDef.birthThreshold) {
      agent.energy -= agent.speciesDef.birthCost; // Use defined birth cost
      world.getBus().emit({ type: 'birth', payload: { parent: agent } });
    }
  },
};

const PREY_BEHAVIOR: AgentBehavior = {
  move(agent, world) {
    const threat = world.findNearestAgent(
      agent,
      (a) => a.speciesDef.key === SpeciesType.PREDATOR,
      3,
    );
    if (threat) {
      agent.moveAway(threat, world);
    } else {
      agent.moveToward(world.randomAdjacent(agent), world); // wander
    }
  },
  eat(agent, target, world) {
    // Prey only eats from the ground
    if (isFood(target)) {
      const foodUnits = agent.speciesDef.biteEnergy / world.config.foodValue;
      const eaten = world.consumeFood(agent.x, agent.y, foodUnits, agent);
      if (eaten > 0) {
        const gained = eaten * world.config.foodValue;
        agent.energy += gained;
        agent.foodConsumed += gained;
        agent.foundFood = true;
      }
    }
  },
  reproduce(agent, world) {
    if (agent.energy >= agent.speciesDef.birthThreshold) {
      agent.energy -= agent.speciesDef.birthCost;
      world.getBus().emit({ type: 'birth', payload: { parent: agent } });
    }
  },
};

// -----------------------------------------------------------------------------
// --- Species Definitions -----------------------------------------------------
// -----------------------------------------------------------------------------

const OMNIVORE_DEFINITION: SpeciesDefinition = {
  key: SpeciesType.OMNIVORE,
  genomeLength: 3,
  color: 'rgb(200, 200, 200)',
  basalMetabolicRate: 0.01,
  movementCost: 0.02,
  birthThreshold: 20,
  birthCost: 9,
  deathThreshold: 1e-3,
  biteEnergy: 1,
  behavior: OMNIVORE_BEHAVIOR,
  mutationFn: defaultMutation,
};

const PREDATOR_DEFINITION: SpeciesDefinition = {
  key: SpeciesType.PREDATOR,
  genomeLength: 3,
  color: 'rgb(255, 100, 100)',
  basalMetabolicRate: 0.02,
  movementCost: 0.04,
  birthThreshold: 30,
  birthCost: 15,
  deathThreshold: 1e-3,
  biteEnergy: 0, // Gets energy from eating prey
  huntingRadius: 15,
  behavior: PREDATOR_BEHAVIOR,
  mutationFn: defaultMutation,
};

const PREY_DEFINITION: SpeciesDefinition = {
  key: SpeciesType.PREY,
  genomeLength: 3,
  color: 'rgb(100, 255, 100)',
  basalMetabolicRate: 0.008,
  movementCost: 0.015,
  birthThreshold: 15,
  birthCost: 7,
  deathThreshold: 1e-3,
  biteEnergy: 1.2,
  behavior: PREY_BEHAVIOR,
  mutationFn: defaultMutation,
};

// -----------------------------------------------------------------------------
// --- Species Registry --------------------------------------------------------
// -----------------------------------------------------------------------------

/** A central registry to store and retrieve species definitions by their key. */
export const SPECIES_REGISTRY = new Map<SpeciesType, SpeciesDefinition>([
  [SpeciesType.OMNIVORE, OMNIVORE_DEFINITION],
  [SpeciesType.PREDATOR, PREDATOR_DEFINITION],
  [SpeciesType.PREY, PREY_DEFINITION],
]);
