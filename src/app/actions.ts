'use server';

import {
  generateWorldNarration,
  GenerateWorldNarrationInput,
} from '@/ai/flows/generate-world-narration';
import {
  adaptNarrationToGameState,
  AdaptNarrationToGameStateInput,
} from '@/ai/flows/adapt-narration-to-game-state';

export async function generateInitialNarrationAction(
  input: GenerateWorldNarrationInput
) {
  try {
    const { narration } = await generateWorldNarration(input);
    return narration;
  } catch (error) {
    console.error('Error generating initial narration:', error);
    return 'The ether is clouded. The narrator is silent for now...';
  }
}

export async function adaptNarrationAction(
  input: AdaptNarrationToGameStateInput
) {
  try {
    const { narration } = await adaptNarrationToGameState(input);
    return narration;
  } catch (error) {
    console.error('Error adapting narration:', error);
    return 'A strange interference disrupts the narrative flow...';
  }
}
