#!/usr/bin/env python3
"""
Script to update hero JSON files with recommended relic levels
based on the Motto Immortal Relic Guide Google Sheet
"""

import json
import os
from pathlib import Path

# Mapping from Google Sheet - Hero name to recommended relic level
RELIC_LEVELS = {
    # Level 30 - Highest Priority
    "zeus": 30,
    "nyx": 30,
    "nuwa": 30,
    "dionysus": 30,
    "amunra": 30,
    "amun ra": 30,
    "nezha": 30,
    "hecate": 30,
    "hladgnnr": 30,
    "hela": 30,
    
    # Level 20 - High Priority
    "tefnut": 20,
    "caishen": 20,
    "anubis": 20,
    "bastet": 20,
    "phoenix": 20,
    "isis": 20,
    
    # Level 10 - Medium Priority
    "yuelao": 10,
    "poseidon": 10,
    "momus": 10,
    "set": 10,
    "nemesis": 10,
    "fengyi": 10,
    "jingwei": 10,
    
    # Level 1 - Low Priority
    "jormungandr": 1,
    "prometheus": 1,
    "khepri": 1,
    "d-cancer": 1,
    "d-aries": 1,
    "d-aquarius": 1,
    
    # Unactivated - Level 0
    "medusa": 0,
    "sekhmet": 0,
    "ares": 0,
    "pan": 0,
    "diana": 0,
    "iris": 0,
    "yanlou": 0,
    "athena": 0,
    "artemis": 0,
    "ullr": 0,
    "demeter": 0,
    "freya": 0,
    "geb": 0,
    "horus": 0,
    "surtr": 0,
}


def normalize_hero_name(name):
    """
    Normalize hero name for comparison
    Converts to lowercase and removes spaces/special characters
    """
    return name.lower().replace(" ", "").replace("-", "").replace("_", "")


def get_relic_level(hero_name):
    """
    Get recommended relic level for a hero
    Returns None if hero not found in mapping
    """
    normalized = normalize_hero_name(hero_name)
    
    # Direct match
    if normalized in RELIC_LEVELS:
        return RELIC_LEVELS[normalized]
    
    # Try with spaces (for names like "Amun Ra")
    spaced_name = hero_name.lower()
    if spaced_name in RELIC_LEVELS:
        return RELIC_LEVELS[spaced_name]
    
    return None


def update_hero_json(file_path, dry_run=False):
    """
    Update a single hero JSON file with recommended relic level
    
    Args:
        file_path: Path to the JSON file
        dry_run: If True, only show what would be changed without actually modifying
    
    Returns:
        Tuple of (success, message)
    """
    try:
        # Read JSON file
        with open(file_path, 'r', encoding='utf-8') as f:
            hero_data = json.load(f)
        
        # Get hero name
        hero_name = hero_data.get('name') or hero_data.get('id', '')
        
        if not hero_name:
            return False, f"❌ {file_path.name}: No 'name' or 'id' field found"
        
        # Get recommended relic level
        relic_level = get_relic_level(hero_name)
        
        # If not found in guide, default to 0
        if relic_level is None:
            relic_level = 0
            was_found = False
        else:
            was_found = True
        
        # Check if already has the field
        current_level = hero_data.get('recommendedRelicLevel')
        
        if current_level == relic_level:
            return True, f"✓  {file_path.name} ({hero_name}): Already up to date (Level {relic_level})"
        
        # Create new ordered dict with recommendedRelicLevel after ratings
        new_hero_data = {}
        for key, value in hero_data.items():
            new_hero_data[key] = value
            # Insert recommendedRelicLevel after ratings field
            if key == 'ratings' and 'recommendedRelicLevel' not in hero_data:
                new_hero_data['recommendedRelicLevel'] = relic_level
        
        # If ratings field doesn't exist, add recommendedRelicLevel after description
        if 'recommendedRelicLevel' not in new_hero_data:
            temp_data = {}
            for key, value in new_hero_data.items():
                temp_data[key] = value
                if key == 'description':
                    temp_data['recommendedRelicLevel'] = relic_level
            if 'recommendedRelicLevel' in temp_data:
                new_hero_data = temp_data
            else:
                # Fallback: add at the end
                new_hero_data['recommendedRelicLevel'] = relic_level
        
        # Update existing field if it exists
        if 'recommendedRelicLevel' in hero_data:
            new_hero_data['recommendedRelicLevel'] = relic_level
        
        hero_data = new_hero_data
        
        if dry_run:
            change_msg = f"would be set to {relic_level}" if current_level is None else f"would be updated from {current_level} to {relic_level}"
            status = "🔍" if was_found else "🔍⚠️"
            note = "" if was_found else " (not in guide, defaulting to 0)"
            return True, f"{status} {file_path.name} ({hero_name}): {change_msg}{note}"
        
        # Write back to file with nice formatting
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(hero_data, f, indent=2, ensure_ascii=False)
        
        change_msg = f"set to {relic_level}" if current_level is None else f"updated from {current_level} to {relic_level}"
        status = "✅" if was_found else "✅⚠️"
        note = "" if was_found else " (not in guide, defaulting to 0)"
        return True, f"{status} {file_path.name} ({hero_name}): {change_msg}{note}"
        
    except json.JSONDecodeError as e:
        return False, f"❌ {file_path.name}: Invalid JSON - {str(e)}"
    except Exception as e:
        return False, f"❌ {file_path.name}: Error - {str(e)}"


def process_directory(directory_path, dry_run=False):
    """
    Process all JSON files in a directory
    
    Args:
        directory_path: Path to directory containing hero JSON files
        dry_run: If True, only show what would be changed
    """
    directory = Path(directory_path)
    
    if not directory.exists():
        print(f"❌ Directory not found: {directory_path}")
        return
    
    if not directory.is_dir():
        print(f"❌ Not a directory: {directory_path}")
        return
    
    # Find all JSON files
    json_files = list(directory.glob("*.json"))
    
    if not json_files:
        print(f"❌ No JSON files found in: {directory_path}")
        return
    
    print(f"\n{'=' * 70}")
    print(f"{'DRY RUN MODE - No files will be modified' if dry_run else 'UPDATING FILES'}")
    print(f"{'=' * 70}")
    print(f"Found {len(json_files)} JSON files in: {directory_path}\n")
    
    # Process each file
    success_count = 0
    error_count = 0
    defaulted_count = 0
    
    for json_file in sorted(json_files):
        success, message = update_hero_json(json_file, dry_run)
        print(message)
        
        if success:
            if "not in guide" in message:
                defaulted_count += 1
            else:
                success_count += 1
        else:
            error_count += 1
    
    # Summary
    print(f"\n{'=' * 70}")
    print(f"SUMMARY:")
    print(f"  ✅ Successfully processed: {success_count}")
    print(f"  ⚠️  Defaulted to 0 (not in guide): {defaulted_count}")
    print(f"  ❌ Errors: {error_count}")
    print(f"  📊 Total files: {len(json_files)}")
    print(f"{'=' * 70}\n")


def process_single_file(file_path, dry_run=False):
    """Process a single JSON file"""
    file = Path(file_path)
    
    if not file.exists():
        print(f"❌ File not found: {file_path}")
        return
    
    if not file.is_file():
        print(f"❌ Not a file: {file_path}")
        return
    
    print(f"\n{'=' * 70}")
    print(f"{'DRY RUN MODE' if dry_run else 'UPDATING FILE'}")
    print(f"{'=' * 70}\n")
    
    success, message = update_hero_json(file, dry_run)
    print(message)
    print()


def main():
    """Main function with CLI interface"""
    import argparse
    
    parser = argparse.ArgumentParser(
        description='Update hero JSON files with recommended relic levels',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Dry run on a directory (shows what would change)
  python update_relic_levels.py --dir ./heroes --dry-run
  
  # Actually update all files in a directory
  python update_relic_levels.py --dir ./heroes
  
  # Update a single file
  python update_relic_levels.py --file ./heroes/amunra.json
  
  # Dry run on a single file
  python update_relic_levels.py --file ./heroes/zeus.json --dry-run
        """
    )
    
    parser.add_argument(
        '--dir',
        type=str,
        help='Directory containing hero JSON files'
    )
    
    parser.add_argument(
        '--file',
        type=str,
        help='Single JSON file to update'
    )
    
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Show what would be changed without modifying files'
    )
    
    args = parser.parse_args()
    
    # Validate arguments
    if not args.dir and not args.file:
        parser.print_help()
        print("\n❌ Error: You must specify either --dir or --file")
        return
    
    if args.dir and args.file:
        print("❌ Error: Specify either --dir or --file, not both")
        return
    
    # Process
    if args.dir:
        process_directory(args.dir, args.dry_run)
    else:
        process_single_file(args.file, args.dry_run)


if __name__ == "__main__":
    main()
