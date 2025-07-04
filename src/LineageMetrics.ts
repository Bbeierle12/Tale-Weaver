export interface LineageStats {
  tick: number
  lineageId: number
  members: number
  meanSpeed: number
  meanVision: number
  meanBasal: number
  meanEnergy: number
  births: number
  deaths: number
}

export interface LineageMetadata {
  founderGenome: Float32Array
  cumulativeLifeTicks: number
  births: number
  deaths: number
  birthsTick: number
  deathsTick: number
}
