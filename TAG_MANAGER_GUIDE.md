# Tag Manager Guide

## Overview
The tag manager system now supports full CRUD operations (Create, Read, Update, Delete) for synergy tags with automatic propagation to all downstream systems.

## Starting the Tag Manager

```bash
npm run tag-manager
```

This starts the backend server on `http://localhost:3000` and serves the frontend UI.

## Features

### 1. **Edit Tags Button** 🏷️
Located in the header of the tag manager interface, clicking "Edit Tags" opens a modal with full tag management capabilities.

### 2. **Tag Management Operations**

#### Add New Tag ➕
- Enter a tag name in uppercase with underscores (e.g., `CUSTOM_TAG`)
- Click "Add Tag" or press Enter
- New tag is immediately available for hero assignment

#### Rename Tag 📝
- Click "Rename" next to any tag
- Enter the new tag name
- Confirm with the checkmark button
- All heroes with the old tag automatically get the new tag name

#### Delete Tag 🗑️
- Click "Delete" next to any tag
- Confirm the deletion prompt
- Tag is removed from the tag list and from all heroes that had it

### 3. **Technical Architecture**

#### Backend (`scripts/tag-manager-server.js`)
- **GET /api/tags** - Returns all available tags
- **POST /api/tags** - Create a new tag
- **PUT /api/tags/:oldTag** - Rename a tag (updates all heroes)
- **DELETE /api/tags/:tag** - Delete a tag (removes from all heroes)
- **GET /api/heroes** - Returns all heroes with their synergies
- **POST /api/heroes/:id/synergies** - Save hero's synergy tags

#### Frontend (`tag-manager-frontend/index.html`)
- Tag editor modal with rename, delete, and add functionality
- Real-time UI updates after tag operations
- Status messages for confirmation/error feedback

#### Data Storage (`src/data/tags.json`)
- Server persists tags to JSON file
- Automatically loads on server startup
- Falls back to default tags if file is missing

### 4. **Downstream Integration**

Tags automatically cascade through these systems:

#### Generator (`scripts/generator.js`)
- Loads tags from `src/data/tags.json` at runtime
- Uses tags for synergy scoring in team compositions
- No manual changes needed - fully dynamic

#### Utilities (`src/utils/synergyTags.js`)
- Async function `synergyPotentialForHero()` loads tags dynamically
- Used in rankings.astro for hero synergy scoring
- Rankings page updated to use async/await pattern

#### Hero Data (`src/data/heroes/*.json`)
- Each hero has a `synergies` array field
- Tags in this array are automatically validated against available tags
- Invalid tags are rejected by the server

## Workflow Example

1. **Current State**
   - Tags.json has 33 default tags
   - 50 heroes assigned various tags

2. **Rename a Tag**
   - Click "Edit Tags"
   - Find "ENEMY_VULNERABILITY" and click "Rename"
   - Change to "ENEMY_WEAK"
   - Confirm → All 8 heroes with this tag are updated instantly

3. **Add Custom Tag**
   - Enter "BURST_DAMAGE" in the input field
   - Click "Add Tag"
   - Now available for assignment to heroes

4. **Delete tag**
   - Click "Delete" next to a tag
   - Confirm → Tag removed from system and all heroes
   - Affected heroes lose that synergy

5. **Run Generator**
   ```bash
   npm run generator
   ```
   - Automatically uses current tags from `tags.json`
   - Generates team compositions with updated synergy logic

## File Changes Summary

### New Files
- `src/data/tags.json` - Centralized tag storage

### Modified Files
- `scripts/tag-manager-server.js` - Added CRUD endpoints
- `tag-manager-frontend/index.html` - Added tag editor modal and controls
- `scripts/generator.js` - Made tags dynamic, loads from JSON
- `src/utils/synergyTags.js` - Made function async to load tags
- `src/pages/rankings.astro` - Updated to use async synergy functions

## API Endpoints

### Create Tag
```bash
curl -X POST http://localhost:3000/api/tags \
  -H "Content-Type: application/json" \
  -d '{"tag": "NEW_TAG"}'
```

### Rename Tag
```bash
curl -X PUT http://localhost:3000/api/tags/OLD_TAG \
  -H "Content-Type: application/json" \
  -d '{"newTag": "NEW_TAG"}'
```

### Delete Tag
```bash
curl -X DELETE http://localhost:3000/api/tags/TAG_TO_DELETE
```

## Troubleshooting

### Tags not updating?
- Check `src/data/tags.json` exists
- Restart the tag manager: `npm run tag-manager`
- Check browser console for API errors (F12)

### Hero synergies not loading?
- Ensure hero JSON files have `synergies` array field
- Verify tag-manager server is running on port 3000
- Check network tab in DevTools for API responses

### Generator using old tags?
- Kill and restart the generator process
- Tags are loaded on script startup
- `src/data/tags.json` must exist and be valid JSON

## Best Practices

1. **Use consistent naming** - Keep tags in UPPERCASE_WITH_UNDERSCORES format
2. **Backup before bulk changes** - Rename operations are instant and global
3. **Run regeneration** - After major tag changes, run `npm run generator` to rebuild compositions
4. **Test in staging** - Verify tag changes work as expected before deploying

## Future Enhancements

- [ ] Tag categories/grouping in the manager
- [ ] Batch tag operations (multi-select)
- [ ] Tag usage analytics (how many heroes per tag)
- [ ] Tag import/export functionality
- [ ] Undo/redo for tag operations
