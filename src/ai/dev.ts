import { config } from 'dotenv';
config();

import '@/ai/flows/generate-world-narration.ts';
import '@/ai/flows/adapt-narration-to-game-state.ts';