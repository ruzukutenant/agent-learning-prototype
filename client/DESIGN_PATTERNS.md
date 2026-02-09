# Design Patterns - CoachMira Advisor

Reusable visual patterns and component styles for consistency across the application.

## Card Patterns

### Subtle Gradient Card
A refined card style with depth and subtle gradient background.

**Base Pattern:**
```tsx
className="backdrop-blur-md rounded-3xl p-7 md:p-9 border
  shadow-[0_2px_8px_-2px_rgba(0,0,0,0.08),0_6px_20px_-3px_rgba(0,0,0,0.06)]
  border-gray-200/60 bg-gradient-to-br from-gray-100/70 to-white
  hover:border-gray-300/70
  hover:shadow-[0_4px_16px_-3px_rgba(0,0,0,0.1),0_8px_24px_-4px_rgba(0,0,0,0.08)]
  transition-all duration-300"
```

**Color Variants:**
- **Neutral (default):** `from-gray-100/70 to-white` + `border-gray-200/60`
- **Success:** `from-green-50/70 to-white` + `border-green-200/80`
- **Brand:** `from-brand-teal/8 to-white` + `border-brand-teal/20`
- **Info:** `from-blue-50/70 to-white` + `border-blue-200/60`
- **Subtle (inner boxes):** `from-white/80 to-white/95` + `border-white/50`

**Where to Use:**
- Email collection cards
- Summary cards
- Important call-to-action sections
- CTA cards (continue buttons, etc.)
- Inner content boxes within colored cards

**Current Usage:**
- `EmailCollector.tsx` - Email collection card (default + success states)
- `ContinueToAssessmentCard.tsx` - Assessment CTA card
- `ConstraintCard.tsx` - Inner summary text box

---

## Button Patterns

### Primary Gradient Button
Premium button with brand gradient, shine effect, and layered shadows.

**Pattern:**
```tsx
className="group px-6 py-4 relative overflow-hidden
  bg-gradient-to-r from-brand-teal via-[#0ea4a4] to-brand-purple
  text-white font-semibold rounded-2xl
  shadow-[0_4px_14px_-2px_rgba(13,148,136,0.25),0_2px_8px_-1px_rgba(139,92,246,0.15)]
  hover:shadow-[0_8px_24px_-4px_rgba(13,148,136,0.35),0_4px_16px_-2px_rgba(139,92,246,0.25)]
  hover:scale-[1.02] hover:brightness-110
  active:scale-[0.98]
  transition-all duration-200
  before:absolute before:inset-0 before:bg-gradient-to-r
  before:from-white/0 before:via-white/10 before:to-white/0
  before:translate-x-[-100%] hover:before:translate-x-[100%]
  before:transition-transform before:duration-700"
```

**Where to Use:**
- Primary CTAs (email submit, book call, etc.)
- Form submissions
- Main action buttons

**Current Usage:**
- `EmailCollector.tsx` - "Send My Summary" button

---

## Input Field Patterns

### Refined Input with Icon
Modern input field with subtle background transition and icon.

**Pattern:**
```tsx
<div className="relative">
  <input
    className="w-full px-5 py-4 pr-12 bg-gray-50/50
      rounded-2xl border border-gray-300/80
      focus:border-brand-purple focus:ring-4 focus:ring-brand-purple/10 focus:bg-white
      text-gray-900 placeholder:text-gray-400/80
      hover:border-gray-400/90 hover:bg-white
      focus:shadow-[0_0_0_4px_rgba(139,92,246,0.08),0_2px_8px_-2px_rgba(0,0,0,0.1)]
      transition-all duration-200
      text-base md:text-lg tracking-wide"
  />
  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400/70">
    {/* Icon here */}
  </div>
</div>
```

**Where to Use:**
- Email inputs
- Text inputs
- Search fields

**Current Usage:**
- `EmailCollector.tsx` - Email input field

---

## Shadow Patterns

### Layered Depth Shadows
Multi-layer shadows for premium depth perception.

**Default State:**
```
shadow-[0_2px_8px_-2px_rgba(0,0,0,0.08),0_6px_20px_-3px_rgba(0,0,0,0.06)]
```

**Hover State (cards):**
```
shadow-[0_4px_16px_-3px_rgba(0,0,0,0.1),0_8px_24px_-4px_rgba(0,0,0,0.08)]
```

**Button Hover (brand colors):**
```
shadow-[0_8px_24px_-4px_rgba(13,148,136,0.35),0_4px_16px_-2px_rgba(139,92,246,0.25)]
```

**Focus State (inputs):**
```
shadow-[0_0_0_4px_rgba(139,92,246,0.08),0_2px_8px_-2px_rgba(0,0,0,0.1)]
```

---

## Typography Patterns

### Heading Hierarchy
- **H1 (Page titles):** `text-3xl md:text-4xl font-bold text-gray-900 tracking-tight`
- **H2 (Section headings):** `text-2xl md:text-3xl font-bold text-gray-900 leading-tight tracking-tight`
- **H3 (Card headings):** `text-xl md:text-2xl font-semibold text-gray-800`
- **Body (descriptions):** `text-base md:text-lg text-gray-600 leading-relaxed tracking-wide`

---

## Animation Patterns

### Fade In + Slide
```
animate-in fade-in slide-in-from-bottom-2 duration-300
```

### Smooth Transitions
```
transition-all duration-200
```

### Shine Effect (buttons)
```
before:absolute before:inset-0 before:bg-gradient-to-r
before:from-white/0 before:via-white/10 before:to-white/0
before:translate-x-[-100%] hover:before:translate-x-[100%]
before:transition-transform before:duration-700
```

---

## Spacing Patterns

### Card Padding
- **Mobile:** `p-6` or `p-7`
- **Desktop:** `md:p-8` or `md:p-9`

### Section Gaps
- **Tight:** `gap-3`
- **Normal:** `gap-4` or `gap-5`
- **Loose:** `gap-6` or `gap-7`

### Margin Bottom (vertical rhythm)
- **Heading → Description:** `mb-4`
- **Description → Form:** `mb-6` or `mb-7`
- **Input → Button:** `space-y-5`

---

## Usage Guidelines

1. **Consistency:** Use these patterns consistently across similar components
2. **Customization:** Adapt color variants as needed but maintain structure
3. **Documentation:** Update this file when creating new reusable patterns
4. **Performance:** These patterns are optimized for Tailwind CSS compilation
