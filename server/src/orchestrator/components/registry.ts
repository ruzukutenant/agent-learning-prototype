/**
 * Component Registry
 *
 * Central registry for all component definitions.
 * Components register themselves here and can be looked up by type.
 */

import type {
  Component,
  ComponentType,
  ComponentContext,
  RenderedComponent
} from './types.js'

class ComponentRegistry {
  private components = new Map<ComponentType, Component>()

  /**
   * Register a component definition
   */
  register(component: Component): void {
    if (this.components.has(component.type)) {
      console.warn(`[ComponentRegistry] Overwriting existing component: ${component.type}`)
    }
    this.components.set(component.type, component)
    console.log(`[ComponentRegistry] Registered component: ${component.type}`)
  }

  /**
   * Get a component definition by type
   */
  get(type: ComponentType): Component | undefined {
    return this.components.get(type)
  }

  /**
   * Check if a component type is registered
   */
  has(type: ComponentType): boolean {
    return this.components.has(type)
  }

  /**
   * Render a single component
   */
  render(type: ComponentType, context: ComponentContext): RenderedComponent | null {
    const component = this.components.get(type)

    if (!component) {
      console.warn(`[ComponentRegistry] Unknown component type: ${type}`)
      return null
    }

    try {
      return component.render(context)
    } catch (error) {
      console.error(`[ComponentRegistry] Error rendering component ${type}:`, error)
      return null
    }
  }

  /**
   * Get all registered component types
   */
  getRegisteredTypes(): ComponentType[] {
    return Array.from(this.components.keys())
  }
}

// Singleton instance
export const componentRegistry = new ComponentRegistry()
