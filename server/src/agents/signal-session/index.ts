/**
 * Signal Session Agent - Main Entry Point
 *
 * This module exports the public API for the Signal Session agent.
 */

// Core types
export type {
  Phase,
  Action,
  Signals,
  SignalSessionState,
  CreativeBrief,
  Message,
  Decision,
  OrchestratorResult,
  Module0Context,
  VarietyTracker,
  UnifiedAnalysisResult
} from './core/types.js';

export {
  PHASE_ORDER,
  DEFAULT_SIGNALS,
  DEFAULT_VARIETY_TRACKER,
  DEFAULT_MODULE0_CONTEXT,
  createInitialState
} from './core/types.js';

// Orchestrator functions
export {
  processMessage,
  processOpeningMessage,
  createSession,
  getSessionSummary
} from './conversation/orchestrator.js';

// Brief generator
export {
  generateCreativeBrief,
  parseCreativeBrief,
  exportBriefAsMarkdown,
  exportBriefAsJson
} from './output/brief-generator.js';

// Decision engine (for testing/debugging)
export {
  makeDecision,
  evaluatePhaseTransition,
  selectAction,
  applyDecisionToState
} from './core/decision-engine.js';

// Unified analysis (for testing/debugging)
export { runUnifiedAnalysis } from './core/unified-analysis.js';
