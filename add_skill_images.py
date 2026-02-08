#!/usr/bin/env python3
"""
Script to add image paths for skills and relics to hero JSON files
Follows the naming convention: {hero_name}_skill_{number}.webp and {hero_name}_relic.webp
"""

import json
import os
from pathlib import Path


def add_skill_and_relic_images(file_path, dry_run=False):
    """
    Add image paths to skills and relic in a hero JSON file
    
    Args:
        file_path: Path to the JSON file
        dry_run: If True, only show what would be changed
    
    Returns:
        Tuple of (success, message)
    """
    try:
        # Read JSON file
        with open(file_path, 'r', encoding='utf-8') as f:
            hero_data = json.load(f)
        
        # Get hero name/id for image paths
        hero_name = hero_data.get('name') or hero_data.get('id', '')
        hero_id = hero_data.get('id', '')
        
        if not hero_name:
            return False, f"❌ {file_path.name}: No 'name' or 'id' field found"
        
        # Use lowercase id for filenames (more consistent)
        base_name = hero_id.lower()
        
        changes = []
        
        # Add images to skills
        if 'skills' in hero_data:
            for i, skill in enumerate(hero_data['skills'], start=1):
                skill_id = skill.get('id', f'skill_{i}')
                
                # Check if image already exists
                if 'image' not in skill:
                    image_path = f"/skills/{base_name}_skill_{i}.webp"
                    skill['image'] = image_path
                    changes.append(f"Added image to skill {i}: {image_path}")
        
        # Add image to relic
        if 'relic' in hero_data and hero_data['relic']:
            if 'image' not in hero_data['relic']:
                relic_image = f"/skills/{base_name}_relic.webp"
                hero_data['relic']['image'] = relic_image
                changes.append(f"Added image to relic: {relic_image}")
        
        if not changes:
            return True, f"✓  {file_path.name} ({hero_name}): Already has all images"
        
        if dry_run:
            change_list = "\n      • " + "\n      • ".join(changes)
            return True, f"🔍 {file_path.name} ({hero_name}): Would add:{change_list}"
        
        # Write back to file with nice formatting
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(hero_data, f, indent=2, ensure_ascii=False)
        
        change_list = "\n      • " + "\n      • ".join(changes)
        return True, f"✅ {file_path.name} ({hero_name}): Added:{change_list}"
        
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
    unchanged_count = 0
    error_count = 0
    
    for json_file in sorted(json_files):
        success, message = add_skill_and_relic_images(json_file, dry_run)
        print(message)
        
        if success:
            if "Already has" in message:
                unchanged_count += 1
            else:
                success_count += 1
        else:
            error_count += 1
    
    # Summary
    print(f"\n{'=' * 70}")
    print(f"SUMMARY:")
    print(f"  ✅ Successfully updated: {success_count}")
    print(f"  ✓  Already up to date: {unchanged_count}")
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
    
    success, message = add_skill_and_relic_images(file, dry_run)
    print(message)
    print()


def main():
    """Main function with CLI interface"""
    import argparse
    
    parser = argparse.ArgumentParser(
        description='Add image paths for skills and relics to hero JSON files',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Image Naming Convention:
  Skills & Relics: /skills/{hero_id}_skill_{number}.webp
                   /skills/{hero_id}_relic.webp

Examples:
  # Dry run on a directory (shows what would change)
  python add_skill_images.py --dir ./heroes --dry-run
  
  # Actually update all files in a directory
  python add_skill_images.py --dir ./heroes
  
  # Update a single file
  python add_skill_images.py --file ./heroes/amunra.json
  
  # Dry run on a single file
  python add_skill_images.py --file ./heroes/zeus.json --dry-run
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
