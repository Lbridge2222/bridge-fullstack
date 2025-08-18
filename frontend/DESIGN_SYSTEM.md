# Bridge Dashboard Design System

## Professional Color System Architecture

### **Brand Colors**
- **Brand Primary**: `hsl(220 25% 15%)` - Slate foundation for main actions
- **Brand Accent**: `hsl(0 85% 55%)` - Candy apple red for highlights and CTAs
- **Brand Secondary**: `hsl(120 45% 25%)` - Forest green for secondary accents

### **Semantic Colors**
- **Success**: `hsl(160 45% 25%)` - Deep green for positive states
- **Warning**: `hsl(35 45% 35%)` - Amber for caution states
- **Error**: `hsl(0 55% 40%)` - Sophisticated red for errors
- **Info**: `hsl(210 45% 35%)` - Professional blue for informational states

### **Interactive States**
- **Interactive Primary**: `hsl(220 25% 15%)` - Main interactive elements
- **Interactive Secondary**: `hsl(120 45% 25%)` - Secondary interactive elements
- **Interactive Accent**: `hsl(0 85% 55%)` - High-impact interactive elements
- **Interactive Muted**: `hsl(215 25% 90%)` - Subtle interactive elements

### **Surface Colors**
- **Surface Primary**: `hsl(0 0% 100%)` - Main content surfaces
- **Surface Secondary**: `hsl(210 25% 98%)` - Secondary surfaces
- **Surface Tertiary**: `hsl(210 25% 96%)` - Background variations
- **Surface Overlay**: `hsl(220 25% 8%)` - Overlay surfaces

### **Text Hierarchy**
- **Text Primary**: `hsl(220 25% 12%)` - Main text content
- **Text Secondary**: `hsl(215 20% 45%)` - Secondary text
- **Text Tertiary**: `hsl(215 20% 65%)` - Muted text
- **Text Inverse**: `hsl(210 40% 98%)` - Text on dark backgrounds

### **Color Scales**
#### **Slate Scale (Professional Foundation)**
- **Slate 50**: `hsl(210 25% 98%)` - Lightest background
- **Slate 100**: `hsl(210 25% 96%)` - Very light
- **Slate 200**: `hsl(215 25% 90%)` - Light borders
- **Slate 300**: `hsl(215 25% 80%)` - Medium light
- **Slate 400**: `hsl(215 25% 70%)` - Medium
- **Slate 500**: `hsl(220 25% 50%)` - Base slate
- **Slate 600**: `hsl(220 25% 40%)` - Medium dark
- **Slate 700**: `hsl(220 25% 30%)` - Dark
- **Slate 800**: `hsl(220 25% 20%)` - Very dark
- **Slate 900**: `hsl(220 25% 15%)` - Darkest slate

#### **Red Scale (Candy Apple)**
- **Red 50**: `hsl(0 85% 95%)` - Lightest red
- **Red 100**: `hsl(0 85% 90%)` - Very light
- **Red 200**: `hsl(0 85% 80%)` - Light
- **Red 300**: `hsl(0 85% 70%)` - Medium light
- **Red 400**: `hsl(0 85% 60%)` - Medium
- **Red 500**: `hsl(0 85% 55%)` - **Candy Apple Red**
- **Red 600**: `hsl(0 85% 45%)` - Medium dark
- **Red 700**: `hsl(0 85% 35%)` - Dark
- **Red 800**: `hsl(0 85% 25%)` - Very dark
- **Red 900**: `hsl(0 85% 15%)` - Darkest red

#### **Green Scale (Forest)**
- **Green 50**: `hsl(120 45% 95%)` - Lightest green
- **Green 100**: `hsl(120 45% 90%)` - Very light
- **Green 200**: `hsl(120 45% 80%)` - Light
- **Green 300**: `hsl(120 45% 70%)` - Medium light
- **Green 400**: `hsl(120 45% 60%)` - Medium
- **Green 500**: `hsl(120 45% 50%)` - Base green
- **Green 600**: `hsl(120 45% 40%)` - Medium dark
- **Green 700**: `hsl(120 45% 30%)` - Dark
- **Green 800**: `hsl(120 45% 25%)` - **Forest Green**
- **Green 900**: `hsl(120 45% 20%)` - Darkest green

### **Component Tokens**
#### **Button Colors**
- **Primary Button**: `bg-button-primary-bg text-button-primary-text`
- **Accent Button**: `bg-button-accent-bg text-button-accent-text`
- **Forest Button**: `bg-button-forest-bg text-button-forest-text`

#### **Status Colors**
- **Success Status**: `bg-status-success-bg text-status-success-text border-status-success-border`
- **Warning Status**: `bg-status-warning-bg text-status-warning-text border-status-warning-border`
- **Error Status**: `bg-status-error-bg text-status-error-text border-status-error-border`
- **Info Status**: `bg-status-info-bg text-status-info-text border-status-info-border`

### **Legacy Support**
For backward compatibility, all existing color variables are maintained:
- `--background`, `--foreground`, `--card`, `--primary`, etc.
- These map to the new semantic system internally

## Typography

### Font Family
- **Primary**: Satoshi (Variable font with weights 100-900)
- **Fallback**: System sans-serif

### Font Weights
- **Light**: 300 - Subtle text, captions
- **Regular**: 400 - Body text
- **Medium**: 500 - Emphasis, labels
- **Bold**: 700 - Headings, important text
- **Black**: 900 - Strong emphasis

## Spacing & Layout

### Border Radius
- **Base**: `0.75rem` (12px) - Primary radius for cards and components
- **Medium**: `calc(var(--radius) - 2px)` - Secondary radius
- **Small**: `calc(var(--radius) - 4px)` - Tertiary radius

### Shadows
- **Small**: `shadow-sm` - Subtle elevation for cards
- **Medium**: `shadow-md` - Enhanced elevation for interactive elements
- **Large**: `shadow-lg` - Strong elevation for modals/overlays

## Component Guidelines

### Cards
- Use `.card-base` for standard cards
- Use `.card-elevated` for interactive cards
- Use `.card-premium` for premium/highlighted cards
- Always include subtle borders with `border-border`
- Apply consistent padding (p-4, p-6)

### Buttons
- **Primary actions**: `bg-primary text-primary-foreground`
- **Secondary actions**: `bg-secondary text-secondary-foreground`
- **Accent actions**: `bg-accent text-accent-foreground` (candy apple red)
- **Forest actions**: `bg-forest-green text-forest-green-foreground` (forest green)
- **Success actions**: `bg-success text-success-foreground` (deep green)
- **Destructive actions**: `bg-destructive text-destructive-foreground`
- **Premium buttons**: Use `.btn-premium` for sophisticated styling
- **Forest buttons**: Use `.btn-forest` for secondary accent styling
- Include hover states and focus rings

### Interactive Elements
- Use `.interactive-hover` for standard hover effects
- Use `.interactive-premium` for premium hover effects with subtle scaling
- Apply `.focus-ring` for accessibility
- Include smooth transitions (`transition-all duration-200`)

## Usage Examples

### Brand Colors
```tsx
<div className="bg-brand-primary text-text-inverse">
  Primary Brand Element
</div>

<button className="bg-brand-accent text-text-inverse">
  Accent Action
</button>

<div className="bg-brand-secondary text-text-inverse">
  Secondary Brand Element
</div>
```

### Semantic Colors
```tsx
<div className="bg-semantic-success text-text-inverse">
  Success Message
</div>

<div className="bg-semantic-warning text-text-inverse">
  Warning Message
</div>

<div className="bg-semantic-error text-text-inverse">
  Error Message
</div>
```

### Color Scales
```tsx
<div className="bg-slate-100 border-slate-200 text-slate-800">
  Light Slate Card
</div>

<div className="bg-red-100 border-red-200 text-red-800">
  Light Red Card
</div>

<div className="bg-green-100 border-green-200 text-green-800">
  Light Green Card
</div>
```

### Status Elements
```tsx
<div className="status-success-bg p-4 rounded-lg">
  <span className="text-semantic-success font-semibold">Success!</span>
</div>

<div className="status-error-bg p-4 rounded-lg">
  <span className="text-semantic-error font-semibold">Error!</span>
</div>
```

## Dark Mode

The design system automatically adapts to dark mode with:
- Inverted background/foreground relationships
- Maintained contrast ratios
- Consistent slate-based color scheme
- Professional appearance in both themes
- Sophisticated color variations for dark environments

## Accessibility Features

### High Contrast Support
```css
@media (prefers-contrast: high) {
  :root {
    --brand-accent: 0 85% 40%;      /* Darker for better contrast */
    --brand-secondary: 120 45% 20%;  /* Darker forest green */
    --semantic-error: 0 55% 30%;     /* Darker error red */
  }
}
```

### Reduced Motion Support
```css
@media (prefers-reduced-motion: reduce) {
  :root {
    --color-transition: none;
  }
}
```

### Smooth Transitions
- All color changes use `var(--color-transition)`
- Consistent 200ms easing for professional feel
- Hover states include subtle scaling and shadows

## Best Practices

1. **Always use semantic color variables** instead of hardcoded values
2. **Leverage the color scale system** for consistent variations
3. **Use component tokens** for standardized styling
4. **Maintain accessibility** with proper contrast ratios
5. **Apply consistent spacing** using Tailwind's spacing scale
6. **Include hover and focus states** for interactive elements
7. **Use the utility classes** for common patterns
8. **Leverage premium classes** for high-impact elements
9. **Maintain the sophisticated, grown-up aesthetic**

## Color Psychology

### Slate Tones
- **Professional**: Conveys trustworthiness and sophistication
- **Neutral**: Provides excellent readability and focus
- **Modern**: Contemporary and business-appropriate

### Candy Apple Red
- **Accent**: Draws attention to important actions
- **Professional**: Sophisticated alternative to bright reds
- **Warm**: Adds personality while maintaining professionalism

### Forest Green
- **Secondary**: Natural, calming secondary accent
- **Professional**: Business-appropriate success indicators
- **Balanced**: Complements the slate foundation perfectly

### Color Harmony
- **Slate + Red**: Professional with personality
- **Slate + Green**: Natural sophistication
- **Red + Green**: Complementary accents (used sparingly)
- **Overall**: Creates a premium, enterprise-grade appearance