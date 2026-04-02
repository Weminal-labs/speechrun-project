import type { DialogueOutlineTopic } from '../do/session'

export interface ScheduledTurn {
  turnOrder: number
  speaker: 'Nova' | 'Aero'
  topicIndex: number
}

const TARGET_TURNS = 24
const HISTORY_WINDOW = 4

/**
 * Produces an ordered schedule of turns distributed across topics.
 * Nova always goes first. Speakers alternate strictly.
 * Each topic gets ~2-3 turns per speaker (roughly 2 turns total per topic minimum).
 */
export function createTurnSchedule(topics: DialogueOutlineTopic[]): ScheduledTurn[] {
  const topicCount = topics.length
  // Distribute turns across topics — at least 2 per topic, allocate extras to early topics
  const baseTurnsPerTopic = Math.floor(TARGET_TURNS / topicCount)
  let remainder = TARGET_TURNS - baseTurnsPerTopic * topicCount

  const schedule: ScheduledTurn[] = []
  let turnOrder = 1

  for (const topic of topics) {
    const turnsForTopic = baseTurnsPerTopic + (remainder > 0 ? 1 : 0)
    if (remainder > 0) remainder--

    for (let i = 0; i < turnsForTopic; i++) {
      const speaker: 'Nova' | 'Aero' = turnOrder % 2 === 1 ? 'Nova' : 'Aero'
      schedule.push({
        turnOrder,
        speaker,
        topicIndex: topic.topicIndex,
      })
      turnOrder++
    }
  }

  return schedule
}

export { HISTORY_WINDOW }
