/**
 * Represents a single entity in the world, like a creature or a plant.
 */
export class Agent {
  x: number;
  y: number;
  energy: number;
  readonly type: 'rabbit' | 'fox';
  readonly color: string;
  readonly speed: number;
  readonly vision: number;
  readonly energyToReproduce: number;

  constructor(type: 'rabbit' | 'fox', x: number, y: number, energy: number) {
    this.type = type;
    this.x = x;
    this.y = y;
    this.energy = energy;

    if (type === 'rabbit') {
      this.color = '#FFFFFF'; // White
      this.speed = 1.5;
      this.vision = 15;
      this.energyToReproduce = 15;
    } else {
      // fox
      this.color = '#FFA500'; // Orange
      this.speed = 2;
      this.vision = 30;
      this.energyToReproduce = 40;
    }
  }
}
