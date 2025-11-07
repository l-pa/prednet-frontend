# Protein Comparison Layout Guide

## New Stacked Layout (Feature-Type Grouped)

The protein comparison visualization now uses a **feature-type grouped layout** where each feature type is shown in its own section, making it much easier to compare the same feature type across different proteins.

### Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│  Protein Feature Comparison                                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Protein Headers                                     │   │
│  │ • YPL273W (325 aa)                            [X]   │   │
│  │ • YBR160W (298 aa)                            [X]   │   │
│  │ • YDL123C (450 aa)                            [X]   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Domain                                              │   │
│  │ YPL273W  ████████████████░░░░░░░░░░░░░░░░░░░░░░░   │   │
│  │ YBR160W  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   │   │
│  │ YDL123C  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Repeat                                              │   │
│  │ YPL273W  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   │   │
│  │ YBR160W  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   │   │
│  │ YDL123C  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Region                                              │   │
│  │ YPL273W  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   │   │
│  │ YBR160W  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   │   │
│  │ YDL123C  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Transit peptide                                     │   │
│  │ YPL273W  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   │   │
│  │ YBR160W  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   │   │
│  │ YDL123C  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Chain                                               │   │
│  │ YPL273W  ████████████████████████████████████████   │   │
│  │ YBR160W  ████████████████████████████████████████   │   │
│  │ YDL123C  ████████████████████████████████████████   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘

Legend: ████ = Feature present    ░░░░ = No feature / Background
```

## Key Features

### 1. Feature-Type Grouping
- Each feature type (Domain, Repeat, Region, etc.) has its own section
- All proteins are shown within each section
- Easy to compare the same feature type across proteins

### 2. Aligned Visualization
- All protein bars are aligned to the same scale
- Scale is based on the longest protein in the comparison
- Shorter proteins show proportionally shorter bars

### 3. Visual Indicators
- **Colored bars**: Feature present at that position
- **Gray background**: Full sequence length (no feature)
- **"No X features" text**: Protein doesn't have that feature type

### 4. Interactive Elements
- **Hover**: Shows feature details (description, position, length)
- **Remove buttons**: Click [X] to remove a protein from comparison
- **Tooltips**: Detailed information on hover

## Benefits of This Layout

### Easy Comparison
- **Same feature type**: All Domain features are together, all Repeat features are together, etc.
- **Visual alignment**: Features at similar positions are visually aligned
- **Quick scanning**: Easy to see which proteins have which feature types

### Clear Organization
- **Grouped by type**: Related features are grouped together
- **Consistent ordering**: Feature types are sorted alphabetically
- **Clean separation**: Each feature type has its own card

### Better for Analysis
- **Pattern recognition**: Easy to spot conserved features across proteins
- **Position comparison**: See if features occur at similar positions
- **Presence/absence**: Quickly identify which proteins lack certain features

## Old Layout vs New Layout

### Old Layout (Protein-Centric)
```
Protein 1: [Domain][Repeat][Region]
Protein 2: [Domain][Region]
Protein 3: [Domain][Repeat]
```
**Problem**: Hard to compare Domain features across proteins

### New Layout (Feature-Centric)
```
Domain:
  Protein 1: [Domain]
  Protein 2: [Domain]
  Protein 3: [Domain]

Repeat:
  Protein 1: [Repeat]
  Protein 2: (none)
  Protein 3: [Repeat]

Region:
  Protein 1: [Region]
  Protein 2: [Region]
  Protein 3: (none)
```
**Solution**: Easy to compare each feature type across all proteins

## Scaling Behavior

### Sequence Length Scaling
- All bars are scaled to the **longest protein** in the comparison
- Example:
  - Protein A: 300 aa → 60% width
  - Protein B: 500 aa → 100% width (longest)
  - Protein C: 200 aa → 40% width

### Feature Position Scaling
- Feature positions are scaled relative to the maximum length
- Example (max length = 500 aa):
  - Feature at position 100-200 → 20%-40% of bar width
  - Feature at position 250-300 → 50%-60% of bar width

## Empty States

### No Features of This Type
```
┌─────────────────────────────────────┐
│ Domain                              │
│ YPL273W  [No Domain features]       │
│ YBR160W  ████████████░░░░░░░░░░░░   │
└─────────────────────────────────────┘
```

### No Features at All
```
┌─────────────────────────────────────┐
│ YPL273W (325 aa)              [X]   │
│ No features annotated               │
│ This protein has no domain or       │
│ region annotations                  │
└─────────────────────────────────────┘
```

## Accessibility

- **Keyboard navigation**: Tab through proteins and features
- **Screen reader support**: ARIA labels describe each section
- **Tooltips**: Detailed information available on hover/focus
- **Color contrast**: All colors meet WCAG AA standards

## Performance

- **Efficient rendering**: SVG-based visualization
- **Smooth scrolling**: Optimized for many proteins/features
- **Responsive**: Adapts to different screen sizes
- **Cached data**: Features are cached for 1 hour

## Use Cases

### 1. Domain Conservation Analysis
Compare Domain features across homologous proteins to identify conserved functional regions.

### 2. Feature Position Analysis
See if features occur at similar positions across proteins, indicating functional importance.

### 3. Feature Presence/Absence
Quickly identify which proteins have specific feature types and which don't.

### 4. Structural Comparison
Compare Chain features to see processed protein boundaries.

### 5. Targeting Sequence Analysis
Compare Transit peptide features to understand protein localization.

## Tips for Best Results

1. **Compare similar proteins**: Works best with proteins of similar length
2. **Limit to 5-10 proteins**: Too many proteins make the view cluttered
3. **Use feature filtering**: Only relevant feature types are shown
4. **Hover for details**: Tooltips provide complete feature information
5. **Remove outliers**: Use [X] buttons to remove proteins that don't fit the comparison
