# Where to Find the "Compare Proteins" Button

## Location: Proteins by Network Page

The "Compare Proteins" button is located in the **Proteins panel** on the right side of the page.

```
┌─────────────────────────────────────────────────────────────────┐
│                    Proteins by Network                          │
├─────────────────┬───────────────────────────────────────────────┤
│                 │                                               │
│   Networks      │              Proteins - [Network Name]        │
│   (Left Panel)  │              ┌─────────────────────────────┐ │
│                 │              │ Search: [_______________]    │ │
│   ☐ Network 1   │              │ [Search] [Clear] [Update]   │ │
│   ☑ Network 2   │              └─────────────────────────────┘ │
│   ☐ Network 3   │                                               │
│                 │              ┌─────────────────────────────┐ │
│                 │              │ ☑ YPL273W    [Domain]       │ │
│                 │              │ ☑ YBR160W    [Domain]       │ │
│                 │              │ ☐ YDL123C    [Region]       │ │
│                 │              │ ☐ YER456A    [Motif]        │ │
│                 │              │ ...                          │ │
│                 │              └─────────────────────────────┘ │
│                 │                                               │
│                 │              Selected: 2                      │
│                 │              ┌──────────────┐ ┌────────────┐ │
│                 │              │   Compare    │ │    Get     │ │
│                 │              │   Proteins   │ │ components │ │
│                 │              └──────────────┘ └────────────┘ │
│                 │                   ↑                           │
│                 │              THIS BUTTON!                     │
│                 │                                               │
│                 │              [Previous] Page 1/5 [Next]       │
└─────────────────┴───────────────────────────────────────────────┘
```

## Button States

### Enabled (Blue, Clickable)
- **Condition**: 2 or more proteins are selected
- **Appearance**: Blue solid button
- **Action**: Opens the protein comparison modal

### Disabled (Grayed Out)
- **Condition**: Less than 2 proteins selected
- **Appearance**: Grayed out, not clickable
- **Tooltip**: "Select at least 2 proteins to compare"

## How to Use

1. **Select a network** from the left panel
2. **Check the boxes** next to 2 or more proteins
3. **Click "Compare Proteins"** button (blue button on the left)
4. **View the comparison** in the modal that opens

## Alternative Access Point

You can also access protein comparison from the **Network Visualization** page:
- Open any network in Cytoscape view
- Use the sidebar "Info" panel
- Select 2+ proteins
- Click "View Comparison" at the bottom of the Info panel

## Visual Cues

- **Selection Counter**: Shows "Selected: X" to indicate how many proteins are selected
- **Button Color**: Blue when enabled, gray when disabled
- **Button Position**: Left button in the button group (Compare Proteins | Get components)

## What Happens When You Click

1. A modal dialog opens
2. Loading spinner appears while fetching protein data from UniProt
3. Protein features are displayed as horizontal bars with colored annotations
4. A legend shows what each color represents
5. You can interact with the visualization or close the modal

## Troubleshooting

**Q: I don't see the button**
- Make sure you're on the "Proteins by Network" page
- Check that you have selected a network from the left panel
- Scroll down in the Proteins panel if needed

**Q: The button is grayed out**
- You need to select at least 2 proteins
- Check the boxes next to protein names
- Look for "Selected: X" counter - it should show 2 or more

**Q: Nothing happens when I click**
- Check your browser console for errors
- Make sure the backend server is running
- Try refreshing the page

**Q: The modal opens but shows an error**
- Check your internet connection
- Verify the protein identifiers are valid
- Try clicking the "Retry" button in the error message
