# Tag Manager System Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    TAG MANAGER FRONTEND                      │
│              (tag-manager-frontend/index.html)              │
├─────────────────────────────────────────────────────────────┤
│ • Hero list with synergy assignment                         │
│ • 🏷️ Edit Tags button in header                             │
│ • Tag editor modal with CRUD operations                     │
│ • Real-time status feedback                                 │
└────────────────────── ▲ HTTP ▼ ───────────────────────────┘
                         │       │
                    API calls  Responses
                         │       │
          ┌──────────────▼───────▼──────────────┐
          │  TAG MANAGER BACKEND (Express.js)   │
          │  (scripts/tag-manager-server.js)    │
          ├──────────────────────────────────────┤
          │ GET    /api/tags                     │
          │ POST   /api/tags                     │
          │ PUT    /api/tags/:oldTag             │
          │ DELETE /api/tags/:tag                │
          │ GET    /api/heroes                   │
          │ POST   /api/heroes/:id/synergies     │
          └────────────────┬─────────────────────┘
                           │ R/W
                           ▼
          ┌──────────────────────────────────────┐
          │      CENTRALIZED TAG STORAGE         │
          │      (src/data/tags.json)            │
          │                                      │
          │  [                                   │
          │    "ATK_SPD_UP",                     │
          │    "BUFF_TEAM",                      │
          │    ...                               │
          │  ]                                   │
          └──────────────────────────────────────┘
```

## Data Flow Architecture

### 1. Add New Tag

```
User Input (tag-manager-frontend)
        │
        ▼
Frontend: addNewTag()
  - Validate format (UPPERCASE_UNDERSCORE)
  - POST /api/tags { tag: "NEW_TAG" }
        │
        ▼
Backend: POST /api/tags
  - Check not duplicate
  - Add to AVAILABLE_TAGS array
  - saveTags() to tags.json
  - Return success + updated list
        │
        ▼
tags.json updated ✓
Frontend refreshes tag list ✓
Immediately available for hero assignment ✓
```

### 2. Rename Tag (Most Complex - Updates All Heroes)

```
User Input: Rename "ATK_SPD_UP" → "ATK_BOOST"
        │
        ▼
Frontend: confirmRenameTag()
  - PUT /api/tags/ATK_SPD_UP { newTag: "ATK_BOOST" }
        │
        ▼
Backend: PUT /api/tags/:oldTag
  - Validate newTag doesn't exist
  - Update AVAILABLE_TAGS array
  - FOR EACH hero in src/data/heroes/:
    │ IF hero.synergies includes "ATK_SPD_UP":
    │   │ Replace with "ATK_BOOST"
    │   │ Write updated hero.json
    │ ENDIF
  └─ End FOR
  - saveTags() to tags.json
  - Return success + affected count
        │
        ▼
Multiple files updated atomically:
  ✓ tags.json
  ✓ heroes/amunra.json (if had tag)
  ✓ heroes/anubis.json (if had tag)
  ✓ ... (all affected heroes)
        │
        ▼
Frontend: renderTagList() + renderEditor()
  ✓ Tag list refreshes
  ✓ Hero editor refreshes
  ✓ Status message shown
```

### 3. Delete Tag (Removes From All Heroes)

```
User clicks Delete → Confirms
        │
        ▼
Frontend: deleteTag("OLD_TAG")
  - DELETE /api/tags/OLD_TAG
        │
        ▼
Backend: DELETE /api/tags/:tag
  - Remove from AVAILABLE_TAGS
  - FOR EACH hero in src/data/heroes/:
    │ Remove tag if present in synergies
    │ Write updated hero.json
  └─ End FOR
  - saveTags() to tags.json
        │
        ▼
Files Updated:
  ✓ tags.json (tag removed from list)
  ✓ heroes/*.json (tag removed from arrays)
        │
        ▼
Frontend refreshes both lists ✓
```

### 4. Downstream Consumption

```
┌─────────────────────────────────────────────┐
│         src/data/tags.json                  │
│  Central source of truth for all tags       │
└──────────┬──────────────┬──────────┬────────┘
           │              │          │
           ▼              ▼          ▼

┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────────┐
│  scripts/generator.js │  │  rankings.astro      │  │  tag-manager-server  │
│                       │  │  (Astro page build)  │  │  (API validation)    │
├──────────────────────┤  ├──────────────────────┤  ├──────────────────────┤
│ await loadTags()      │  │ await Promise.all()  │  │ AVAILABLE_TAGS array │
│ - Read tags.json      │  │ for each hero:       │  │ - Validates against  │
│ - Build SYNERGY_TAGS  │  │   synergyPotential() │  │   list on PUT/DELETE │
│ - Score teams         │  │   - Get tags         │  │ - Checks for dups    │
│ - Generate comps      │  │   - Calculate score  │  │   on POST            │
│ - Output JSON         │  │ - Render template    │  │                      │
└──────────────────────┘  └──────────────────────┘  └──────────────────────┘
           │                       │                         │
           ▼                       ▼                         ▼
    teamCompsByHeroId       rankings.html            Web Interface
    (compositions)          (web page)               (React app)
```

## State Flow

### Initial Load (Server Startup)

```
Server starts
  ▼
Load tags.json → AVAILABLE_TAGS array
Load heroes/*.json → Heroes with synergies array
  ▼
Ready to:
  • Serve /api/tags (returns AVAILABLE_TAGS)
  • Validate hero synergies against AVAILABLE_TAGS
  • Accept modifications
```

### During Operation

```
User makes change → Frontend API call → Backend validates
                      │
                      ▼
              Update in-memory arrays
                      │
              ┌────────┴──────────┐
              │                   │
              ▼                   ▼
        Update files         Update AVAILABLE_TAGS
           (JSON)            (in memory)
              │                   │
              └────────┬──────────┘
                       │
                       ▼
              Send response to frontend
                       │
                       ▼
              Update UI + show status
```

## File Relationships

```
src/data/
├── tags.json ←──────────────────────────────┐
│   [central store]                           │
│                                             │
├── heroes/                                   │
│   ├── amunra.json ─────────────────────────┤─ References tags
│   ├── anubis.json ─────────────────────────┤  in synergies[]
│   └── ... (50+ files)                      │
│                                             │
└── derived/                                  │
    └── teamCompsByHeroId.json ◄─┐           │
        (generated from tags)     │           │
                                 │           │
scripts/                          │           │
├── generator.js ──┐              │           │
│  Uses tags  ────►├──── Loads ────┘           │
│                 │                           │
├── tag-manager-server.js         │           │
│  Modifies tags ─────────────────┴───────────┘
│  Reads/writes tags.json
│  Validates hero synergies
│
└── other scripts (migrate, test)

src/utils/
├── synergyTags.js ──┐
│  Async loading  ├──► getSYNERGY_TAGS()
│                    Loads tags.json
│                    Used by rankings.astro
│
└── heroTags.js
   (reads hero.synergies)

src/pages/
└── rankings.astro ──► Uses synergyTags.js
    (Build time)      Builds with current tags

tag-manager-frontend/
└── index.html ──────► Calls /api/tags
                      Shows UI for editing
```

## Consistency Guarantees

### Single Source of Truth
- Only `tags.json` defines available tags
- All code reads from this file
- No hardcoded tag lists

### Atomic Operations
- Rename: Update file + array + all heroes in one transaction
- Delete: Remove from file + array + all heroes
- Add: Add to file + array

### Validation Layers
1. Frontend: Enforces format (UPPERCASE_UNDERSCORE)
2. API: Checks for duplicates, validates existence
3. Files: JSON validated before reading

### Error Handling
```
Frontend  →  API  →  File System
   │         │           │
   └─ Catch API errors   │
       Show status    ┌─ Catch I/O errors
       msg              Return error response
                        │
                        └─ Frontend shows error
                          Retries from last known
                          good state
```

## Performance Considerations

### Optimization Points
- Tags loaded once on server startup
- Cached in memory (AVAILABLE_TAGS)
- Only written to disk on changes
- Heroes loaded only during generator/ranking build
- Tag list small enough for instant operations

### Scaling Notes
- Current: 33 tags, 50+ heroes
- Acceptable up to: 100s of tags, 1000s of heroes
- Future optimization: Database if needed

## Security & Validation

```
POST/PUT/DELETE /api/tags
  ├─ Check tag name format
  ├─ Prevent SQL injection (N/A - JSON)
  ├─ Validate against existing tags
  ├─ Check file write permissions
  └─ Log operations (if implemented)

Hero synergy updates
  ├─ Validate tag exists in AVAILABLE_TAGS
  ├─ Validate hero exists
  ├─ Validate array format
  └─ Atomic file write
```

This architecture ensures changes ripple through the system safely and predictably.
