'use server';

import { analyzeSimulation } from '@/ai/flows/generate-world-narration';
import type {
  SimulationAnalysisInput,
  SimulationAnalysisOutput,
} from '@/ai/schemas';

export async function analyzeSimulationAction(
  input: SimulationAnalysisInput
): Promise<SimulationAnalysisOutput> {
  try {
    const result = await analyzeSimulation(input);
    if (!result?.analysis) {
      return {
        analysis: '## Analysis Failed\n\nThe AI returned an empty analysis. Please try again.',
      };
    }
    return result;
  } catch (error) {
    console.error('Error running simulation analysis:', error);
    return {
      analysis: `## Analysis Failed\n\nAn error occurred while generating the analysis: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}
