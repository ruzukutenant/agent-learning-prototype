/**
 * Component System Entry Point
 *
 * This file initializes the component system by registering
 * all component definitions with the registry.
 */

import { componentRegistry } from './registry.js'
import { viewSummaryComponent } from './definitions/view-summary.js'
import { saveProgressComponent } from './definitions/save-progress.js'
import { collectEmailComponent } from './definitions/collect-email.js'

// ============================================================================
// REGISTER COMPONENTS
// ============================================================================

// Register all component definitions
componentRegistry.register(viewSummaryComponent)
componentRegistry.register(saveProgressComponent)
componentRegistry.register(collectEmailComponent)

// Future components would be registered here:
// componentRegistry.register(bookCallComponent)

// ============================================================================
// EXPORTS
// ============================================================================

// Re-export for convenience
export { componentRegistry } from './registry.js'
export { ruleEngine } from './rule-engine.js'
export { assembleResponse, assembleSimpleResponse } from '../response/assembler.js'
export { checkPolicy } from './policies.js'

// Export types
export type {
  ComponentType,
  ComponentTrigger,
  TriggerPoint,
  RenderedComponent,
  AssembledResponse,
  RuleEvaluationResult
} from './types.js'

export type { AnalysisSignals } from './rule-engine.js'
