// Central export for modular prompt system
export { buildSystemPrompt, getPhaseTools, getTokensSaved } from './builder.ts'
export { CORE_IDENTITY } from './core.ts'
export { CONTEXT_PHASE_INSTRUCTIONS, CONTEXT_PHASE_TOOLS } from './context-phase.ts'
export { EXPLORATION_PHASE_INSTRUCTIONS, EXPLORATION_PHASE_TOOLS } from './exploration-phase.ts'
export { DIAGNOSIS_PHASE_INSTRUCTIONS, DIAGNOSIS_PHASE_TOOLS } from './diagnosis-phase.ts'
export { READINESS_PHASE_INSTRUCTIONS, READINESS_PHASE_TOOLS } from './readiness-phase.ts'
export { ROUTING_PHASE_INSTRUCTIONS, ROUTING_PHASE_TOOLS } from './routing-phase.ts'
