# Tag Manager - UI Flow Guide

## Main Interface

```
┌─────────────────────────────────────────────────────────────────────┐
│ 🎯 Hero Synergy Tag Manager     [0 Heroes] [0 Tagged] [🏷️ Edit Tags]│  ← Header with new button
├──────────────┬──────────────────────────────────────────────────────┤
│              │                                                       │
│  Search      │  Hero Name:        ← Select hero from left           │
│  [     ]     │  Class: Warrior    ← Shows hero info                 │
│              │                                                       │
│ ┌─────────┐  │  [TEAM SUPPORT]    ← Tag sections expand            │
│ │Amunra   │  │  ☐ ATK_SPD_UP      ✓ BUFF_TEAM                     │
│ │8 tags   │  │  ☐ CC_IMMUNITY     ✓ DAMAGE_REDUCTION              │
│ │(active) │  │  ...                                                 │
│ └─────────┘  │                                                       │
│              │  [ENEMY DEBUFF]                                       │
│ ┌─────────┐  │  ☐ CROWD_CONTROL   ✓ ENEMY_VULNERABILITY           │
│ │Anubis   │  │  ...                                                 │
│ │5 tags   │  │                                                       │
│ └─────────┘  │  [💾 Save] [✖️ Clear]  ← Action buttons              │
│              │                                                       │
│              │  ✅ Saved successfully                                │
│              │                                                       │
└──────────────┴──────────────────────────────────────────────────────┘

NEW: 🏷️ Edit Tags button appears in top right of header
```

## Tag Editor Modal (When "Edit Tags" Clicked)

### Full Modal View

```
┌─────────────────────────────────────────────────────────┐
│  🏷️ Manage Tags                                    [×]   │  ← Header
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ➕ ADD NEW TAG                                          │
│  ┌─────────────────────────────────────┐ ┌──────────┐  │
│  │ Enter new tag name (e.g., NEW_TAG)  │ │ Add Tag  │  │  ← Input + Button
│  └─────────────────────────────────────┘ └──────────┘  │
│                                                          │
│  ────────────────────────────────────────────────────   │
│                                                          │
│  📋 EXISTING TAGS (33 Tags)          ← Count badge      │
│                                                          │
│  ┌──────────────────────────────────────┐               │
│  │ ATK_SPD_UP                           │               │
│  │         [📝 Rename] [🗑️ Delete]     │  ← Actions  │
│  └──────────────────────────────────────┘               │
│                                                          │
│  ┌──────────────────────────────────────┐               │
│  │ BUFF_TEAM                            │               │
│  │         [📝 Rename] [🗑️ Delete]     │               │
│  └──────────────────────────────────────┘               │
│                                                          │
│  ┌──────────────────────────────────────┐               │
│  │ CC_IMMUNITY_TEAM                     │               │
│  │         [📝 Rename] [🗑️ Delete]     │               │
│  └──────────────────────────────────────┘               │
│                                                          │
│  ... (more tags, scrollable)                            │
│                                                          │
├─────────────────────────────────────────────────────────┤
│  [Close]                                        [Close] │  ← Footer
└─────────────────────────────────────────────────────────┘
```

## Interaction Flows

### Flow 1: Add New Tag

```
User looks at modal
        │
        ▼
Finds "Add New Tag" section
        │
        ▼
Types: ELEMENTAL_DAMAGE
        │
        ▼
Clicks "Add Tag"  OR  Presses Enter
        │
        ├─ Frontend validates format
        │  (UPPERCASE_UNDERSCORE) ✓
        │
        ▼
Sends: POST /api/tags {tag: "ELEMENTAL_DAMAGE"}
        │
        ├─ Server checks not duplicate ✓
        ├─ Server adds to array
        ├─ Server writes to tags.json
        │
        ▼
Server returns: {success: true, message: "..."}
        │
        ▼
Frontend:
        │
        ├─ Clears input field
        ├─ Refreshes tag list
        ├─ Shows ✅ "Tag 'ELEMENTAL_DAMAGE' created"
        │
        ▼
User sees tag in list
✓ Tag ready for hero assignment
```

### Flow 2: Rename Tag

```
User in modal, looking at tag list
        │
        ▼
Finds "BUFF_TEAM"
        │
        ▼
Clicks [📝 Rename]
        │
        ▼
Tag item transforms:
        │
        ├─ Hide action buttons
        ├─ Show inline input field with old value
        │
        ▼
Input shows: [BUFF_TEAM] with buttons [✓] [✕]
        │
        ▼
User changes to: TEAM_BUFF
        │
        ▼
Clicks [✓] checkmark
        │
        ├─ Frontend validates format ✓
        │
        ▼
Sends: PUT /api/tags/BUFF_TEAM {newTag: "TEAM_BUFF"}
        │
        ├─ Server checks TEAM_BUFF doesn't exist ✓
        ├─ Server updates array
        ├─ Server finds 8 heroes with BUFF_TEAM
        │  ├─ amunra.json: BUFF_TEAM → TEAM_BUFF
        │  ├─ ashanti.json: BUFF_TEAM → TEAM_BUFF
        │  └─ ...
        ├─ Server writes all files
        ├─ Server updates tags.json
        │
        ▼
Server returns: {
  success: true,
  message: "Tag renamed to TEAM_BUFF (8 heroes updated)",
  tags: [...]
}
        │
        ▼
Frontend:
        ├─ Updates tag list
        ├─ If hero editor open: refreshes checkboxes
        ├─ Shows ✅ "Updated 8 heroes"
        │
        ▼
User sees:
        ├─ BUFF_TEAM gone from list
        ├─ TEAM_BUFF appears
        ├─ All their heroes updated automatically
```

### Flow 3: Delete Tag

```
User in modal
        │
        ▼
Finds tag: "ENERGY_DRAIN"
        │
        ▼
Clicks [🗑️ Delete]
        │
        ▼
Browser confirmation: "Delete tag 'ENERGY_DRAIN' from all heroes?"
        │
        ├─ User clicks Cancel → Nothing happens
        │
        ├─ User clicks OK
        │    │
        │    ▼
        │    Sends: DELETE /api/tags/ENERGY_DRAIN
        │    │
        │    ├─ Server checks tag exists ✓
        │    ├─ Server removes from array
        │    ├─ Server finds 3 heroes with ENERGY_DRAIN
        │    │  ├─ kraken.json: Remove ENERGY_DRAIN
        │    │  ├─ zeus.json: Remove ENERGY_DRAIN
        │    │  └─ jormungandr.json: Remove ENERGY_DRAIN
        │    ├─ Server writes all files
        │    ├─ Server updates tags.json
        │    │
        │    ▼
        │    Server returns: {
        │      success: true,
        │      message: "Tag deleted (3 heroes updated)",
        │      tags: [...]
        │    }
        │
        ▼
Frontend:
        ├─ Updates tag list
        ├─ If hero editor open: refreshes
        ├─ Shows ✅ "Deleted from 3 heroes"
        │
        ▼
User sees:
        ├─ ENERGY_DRAIN gone from list
        ├─ Those 3 heroes no longer have tag
```

## Visual States

### Normal Tag Item
```
┌──────────────────────────────────────┐
│ ATK_SPD_UP                           │
│              [📝 Rename] [🗑️ Delete] │
└──────────────────────────────────────┘
```

### Renaming Tag Item
```
┌──────────────────────────────────────┐
│ [ATK_BOOST         ] [✓] [✕]        │  ← Input with confirm/cancel
└──────────────────────────────────────┘
```

### Error State
```
┌────────────────────────┐
│ ❌ Tag already exists  │  ← Error message
└────────────────────────┘
```

### Success State
```
┌──────────────────────────────────────────┐
│ ✅ Tag 'TEAM_BUFF' created (8 updated)   │  ← Success message
└──────────────────────────────────────────┘
```

## Keyboard Interactions

| Key | Action |
|-----|--------|
| Enter | Add tag (focus on input) |
| Escape | Close modal |
| Tab | Navigate between inputs |
| Click outside modal | Close modal |

## Responsive Behavior

### Desktop (1400px+)
```
Sidebar [300px] | Main [1100px]
- Full tag editor visible
- Two column layout
- All tags visible
```

### Tablet (900px)
```
Full width main area
- Sidebar hidden on scroll
- Hero search hidden
- Tag editor takes full space
```

### Mobile (< 600px)
```
Stacked layout
- Single column
- Modal takes 90vw width
- Touch-friendly button sizes
```

## Color Coding

### Status Messages
- ✅ Green (#d4edda) - Success
- ❌ Red (#f8d7da) - Error
- ℹ️ Blue (#d1ecf1) - Info

### Button Colors
- Purple gradient (#667eea → #764ba2) - Primary (Add)
- Light purple (#f0f3f7) - Secondary (Close)
- Yellow (#fff3cd) - Warning (Rename)
- Red (#f8d7da) - Danger (Delete)

## Accessibility

- ✓ Keyboard navigation fully supported
- ✓ Focus states clearly visible
- ✓ Error messages explicit
- ✓ Button labels descriptive
- ✓ Modal has proper aria attributes
- ✓ Form inputs properly labeled
