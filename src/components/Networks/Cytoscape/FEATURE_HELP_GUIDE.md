# Feature Help Tooltips - User Guide

## Overview

The protein comparison visualization now includes helpful tooltips that explain what each feature type means in simple, non-technical language. These are designed to help users without a biology background understand what they're looking at.

## Where to Find Help

### 1. Feature Type Headers (ℹ️ Icon)

Each feature type section has a small info icon (ℹ️) next to its name:

```
┌─────────────────────────────────────────┐
│ Domain ℹ️                                │
│ ↑                                       │
│ Hover here for explanation              │
└─────────────────────────────────────────┘
```

**How to use:**
- Hover over the ℹ️ icon
- A tooltip appears with:
  - Simple explanation of what the feature is
  - Real-world example to make it relatable

### 2. Protein Length (aa)

The amino acid count is also explained:

```
┌─────────────────────────────────────────┐
│ YPL273W (325 aa)                        │
│          ↑                              │
│          Hover here                     │
└─────────────────────────────────────────┘
```

**Tooltip shows:**
- What "aa" means (amino acids)
- Simple analogy (building blocks like letters in a word)

## Feature Type Explanations

### Domain ℹ️

**Simple Explanation:**
> A functional unit of the protein - like a specialized tool or module that performs a specific job.

**Example:**
> A 'kinase domain' is like an enzyme's workshop where it adds chemical tags to other molecules.

**Real-world analogy:**
Think of a protein as a Swiss Army knife. Each domain is like one of the tools - the knife blade, the scissors, the screwdriver. Each has its own specific function.

---

### Region ℹ️

**Simple Explanation:**
> A meaningful section of the protein with a specific characteristic or role.

**Example:**
> A 'disordered region' is a flexible part that can change shape, or a 'binding region' where the protein connects to other molecules.

**Real-world analogy:**
Like zones in a building - the lobby (where people enter), the conference room (where meetings happen), the storage area (where things are kept).

---

### Repeat ℹ️

**Simple Explanation:**
> A pattern that repeats multiple times in the protein sequence - like a recurring motif in music.

**Example:**
> 'WD repeats' are like building blocks that stack together to form a platform for protein interactions.

**Real-world analogy:**
Like LEGO bricks that repeat to build a structure, or a brick wall where the same pattern repeats to create strength.

---

### Transit Peptide ℹ️

**Simple Explanation:**
> An address label that tells the cell where to deliver this protein (like a shipping label).

**Example:**
> A 'mitochondrial transit peptide' directs the protein to the cell's power plants (mitochondria), then gets removed.

**Real-world analogy:**
Like a mailing address on a package. Once the package arrives at the right location, the label is torn off and discarded.

---

### Chain ℹ️

**Simple Explanation:**
> The mature, functional form of the protein after processing - like the final product after assembly.

**Example:**
> Many proteins start as longer chains and get trimmed down to their active 'Chain' form.

**Real-world analogy:**
Like a sculpture that starts as a large block of marble and gets carved down to the final masterpiece. The Chain is the finished sculpture.

---

### Amino Acids (aa) ℹ️

**Simple Explanation:**
> Amino acids are the building blocks of proteins - like letters in a word.

**Example:**
> A protein with 325 aa is like a word with 325 letters. Longer proteins have more amino acids.

**Real-world analogy:**
- **Short protein (50-100 aa)**: Like a short word or name
- **Medium protein (200-500 aa)**: Like a sentence or paragraph
- **Long protein (1000+ aa)**: Like a full page of text

## Visual Examples

### Tooltip Appearance

```
┌─────────────────────────────────────────────────┐
│ Domain ℹ️                                        │
│   ↓                                             │
│   ┌───────────────────────────────────────┐    │
│   │ What is a Domain?                     │    │
│   │                                       │    │
│   │ A functional unit of the protein -    │    │
│   │ like a specialized tool or module     │    │
│   │ that performs a specific job.         │    │
│   │                                       │    │
│   │ Example: A 'kinase domain' is like    │    │
│   │ an enzyme's workshop where it adds    │    │
│   │ chemical tags to other molecules.     │    │
│   └───────────────────────────────────────┘    │
│                                                 │
│ YPL273W  ████████████░░░░░░░░░░░░░░░░░░░       │
│ YBR160W  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       │
└─────────────────────────────────────────────────┘
```

## Benefits for Non-Biologists

### 1. **No Prior Knowledge Required**
- Explanations use everyday language
- Analogies relate to familiar concepts
- No jargon or technical terms

### 2. **Learn While Exploring**
- Hover to learn on-demand
- No need to read documentation first
- Context-sensitive help

### 3. **Progressive Learning**
- Start with simple explanations
- Examples provide deeper understanding
- Can explore at your own pace

## Tips for Using the Help System

### For Complete Beginners
1. **Start with the basics**: Hover over "aa" to understand protein length
2. **Learn feature types**: Hover over each ℹ️ icon to understand what you're looking at
3. **Read the examples**: The italic examples help make concepts concrete

### For Quick Reference
- Hover over any ℹ️ icon for a quick reminder
- Tooltips appear quickly (200ms delay)
- No need to click - just hover

### For Teaching
- Use the tooltips to explain concepts to others
- The analogies help make abstract concepts concrete
- Examples are suitable for all audiences

## Accessibility

- **Keyboard accessible**: Tab to the ℹ️ icon, then hover or focus
- **Screen reader friendly**: ARIA labels describe the purpose
- **High contrast**: Tooltips are readable in both light and dark modes
- **Clear typography**: Easy-to-read font sizes and spacing

## Technical Details

### Tooltip Behavior
- **Delay**: 200ms before showing (prevents accidental triggers)
- **Max width**: 320px (prevents overly wide tooltips)
- **Positioning**: Automatically adjusts to stay on screen
- **Dismissal**: Move mouse away or press Escape

### Content Structure
Each tooltip contains:
1. **Title**: "What is a [Feature Type]?"
2. **Simple explanation**: One-sentence description
3. **Example**: Concrete example with context

## Future Enhancements

Possible improvements:
1. **More examples**: Add multiple examples for each feature type
2. **Visual diagrams**: Include simple illustrations
3. **Links to learn more**: Connect to external resources
4. **Interactive tutorials**: Step-by-step guides
5. **Glossary page**: Comprehensive reference

## Feedback

The explanations are designed to be:
- **Clear**: Easy to understand
- **Concise**: Not overwhelming
- **Helpful**: Actually useful for understanding

If you find any explanation confusing or have suggestions for improvement, please provide feedback!

## Quick Reference Card

| Feature Type | Think of it as... | Key Point |
|--------------|-------------------|-----------|
| **Domain** | A tool in a toolbox | Does a specific job |
| **Region** | A zone in a building | Has a specific characteristic |
| **Repeat** | LEGO bricks | Same pattern repeating |
| **Transit peptide** | Shipping label | Tells where to go |
| **Chain** | Final product | Mature, functional form |
| **aa (amino acids)** | Letters in a word | Building blocks |

## Common Questions

**Q: Do I need to understand biology to use this?**
A: No! The tooltips are specifically designed for non-biologists. Just hover over the ℹ️ icons to learn.

**Q: What if I want more detailed information?**
A: The tooltips provide a good starting point. For deeper understanding, you can:
- Search for the feature type on UniProt
- Read the full feature description in the hover tooltip on the feature itself
- Consult biology textbooks or online resources

**Q: Can I turn off the tooltips?**
A: The tooltips only appear when you hover, so they won't get in your way during normal use.

**Q: Are the explanations scientifically accurate?**
A: Yes! The explanations are simplified but accurate. They use analogies to make concepts accessible without sacrificing correctness.
