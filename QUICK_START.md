# Quick Start: Tag Manager

## In 30 Seconds

```bash
# Start the tag manager
npm run tag-manager

# Open browser to http://localhost:3000
# Click "🏷️ Edit Tags" button in the header
# You're ready to manage tags!
```

## What You Can Do Right Now

### ✅ Add a Custom Tag
1. In the modal, scroll to "Add New Tag" section
2. Type: `ELEMENTAL_DAMAGE`
3. Click "Add Tag"
4. Tag now available for hero assignment

### ✅ Rename an Existing Tag
1. Find tag in the list (e.g., "BUFF_TEAM")
2. Click "📝 Rename"
3. Type new name: `TEAM_BUFF`
4. Click checkmark
5. All heroes with this tag automatically updated

### ✅ Delete a Tag
1. Find tag in the list
2. Click "🗑️ Delete"
3. Confirm deletion
4. Tag removed from system and all heroes

## Current Tags (33 Total)

### Team Support (9)
- ATK_SPD_UP
- BUFF_TEAM
- CC_IMMUNITY_TEAM
- CDR_TEAM
- DAMAGE_REDUCTION_TEAM
- DEBUFF_CLEANSE_TEAM
- ENERGY_RESTORE_TEAM
- HEAL_TEAM
- SHIELD_TEAM

### Enemy Debuff (9)
- ATK_DOWN
- ATK_SPD_DOWN
- BUFF_DISPEL
- CROWD_CONTROL
- ENEMY_VULNERABILITY
- ENERGY_DRAIN
- REDUCES_ATTRIBUTES
- REMOVES_ARMOR
- TAUNT

### Playstyle (2)
- AREA_DAMAGE_DEALER
- BASIC_ATTACK_SCALER

### Self Buffs (13)
- ATK_SPEED
- ATK_UP
- CC_RESISTANCE
- DMG_RED
- DODGE_BUFF
- ENERGY_RESTORE
- GAIN_ARMOR
- HEAL
- HEAL_EFFECT_UP
- HIT_AVOID
- HP_UP
- LIFE_STEAL_UP
- SHIELD

## Common Tasks

### I want to rename a category of tags
Example: Rename all "TEAM" tags to "GLOBAL"

1. Edit Tags → Rename "BUFF_TEAM" → "GLOBAL_BUFF"
2. Rename "SHIELD_TEAM" → "GLOBAL_SHIELD"
3. etc.
4. All heroes automatically updated

### I want to see which heroes have a tag
Currently: Not in the UI, but you can:
- Click a tag name in the modal
- See all heroes with it in console/DevTools
- Or manually check `src/data/heroes/*.json`

### I want to backup tags
```bash
cp src/data/tags.json src/data/tags.json.backup
```

### I want to restore tags
```bash
cp src/data/tags.json.backup src/data/tags.json
npm run tag-manager  # Restart server to reload
```

## Common Errors

### "Tag already exists"
- The name you entered is already in the list
- Use a different name or rename existing tag instead

### "Only uppercase and underscores"
- Tags must be: `LIKE_THIS`
- Not: like-this, likeThis, like this, etc.

### Tags not showing up for heroes
- Make sure server is running: `npm run tag-manager`
- Refresh the page (Ctrl+R)
- Check browser console (F12) for errors

### Changes not persisting after restart
- Check `src/data/tags.json` exists and is valid JSON
- Check file permissions (should be readable/writable)
- Look at server output for file I/O errors

## Next Steps

1. **Customize tags for your game**
   - Add tags specific to game mechanics
   - Reorganize existing categories
   - Remove unused tags

2. **Assign tags to heroes**
   - Select a hero from the list
   - Check/uncheck tags
   - Click "Save Tags"

3. **Regenerate compositions**
   - Run `npm run generator`
   - Uses updated tags for team suggestions

4. **Verify integration**
   - Run `npm run build`
   - Check rankings page loaded
   - Verify tag changes propagated

## API Commands (Advanced)

### Add tag via curl
```bash
curl -X POST http://localhost:3000/api/tags \
  -H "Content-Type: application/json" \
  -d '{"tag": "MY_TAG"}'
```

### Rename tag via curl
```bash
curl -X PUT http://localhost:3000/api/tags/OLD_NAME \
  -H "Content-Type: application/json" \
  -d '{"newTag": "NEW_NAME"}'
```

### Delete tag via curl
```bash
curl -X DELETE http://localhost:3000/api/tags/TAG_TO_DELETE
```

### Get all tags
```bash
curl http://localhost:3000/api/tags
```

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Add tag | Type name + Enter |
| Close modal | Esc or click X |
| Search heroes | Ctrl+F in sidebar |

## Status Messages

| Message | Meaning | Action |
|---------|---------|--------|
| ✅ Tag created | Success | N/A |
| ✅ Heroes updated | Success | May take a moment |
| ❌ Tag exists | Already in system | Use different name |
| ❌ Invalid format | Wrong naming | Use UPPERCASE_UNDERSCORES |
| ❌ Network error | Server down | Check: npm run tag-manager |

## Need More Help?

See detailed documentation:
- `TAG_MANAGER_GUIDE.md` - Full documentation
- `TAG_MANAGER_IMPLEMENTATION.md` - What was built
- `ARCHITECTURE.md` - Technical details
