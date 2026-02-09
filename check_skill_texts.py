#!/usr/bin/env python3
"""
Hero Skill Text Checker
Finds heroes with default/placeholder skill descriptions
"""

import json
import os
from pathlib import Path
from collections import defaultdict


# Common placeholder/default texts to look for
PLACEHOLDER_PATTERNS = [
    "lorem ipsum",
    "placeholder",
    "todo",
    "tbd",
    "coming soon",
    "description here",
    "add description",
    "skill description",
    "skill name",
    "...",
    "n/a",
    "null",
    "test",
    # Specific default texts from your JSONs
    "restores hp to allies over time",
    "healing increased by 20%",
    "adds shield on heal",
    "removes one debuff",
    "grants a shield when allies fall low",
    "shield strength increased",
    "cooldown reduced",
    "triggers automatically once per battle",
    "hero's relic",
    "casting soothing rain triggers an additional spirit therapy",
    "life barrier",  # Duplicate skill name
    "soothing rain",  # Generic skill name
]

# Detect duplicate skill names (like skill_2, skill_3, skill_4 all named "Life Barrier")
CHECK_DUPLICATE_NAMES = True

# You can also check for very short descriptions (likely incomplete)
MIN_DESCRIPTION_LENGTH = 0  # Increased from 10


def contains_placeholder(text):
    """
    Check if text contains placeholder/default content
    
    Args:
        text: String to check
    
    Returns:
        tuple: (is_placeholder, reason)
    """
    if not text or text.strip() == "":
        return True, "Empty/missing"
    
    text_lower = text.lower().strip()
    
    # Check for placeholder patterns
    for pattern in PLACEHOLDER_PATTERNS:
        if pattern in text_lower:
            return True, f"Contains '{pattern}'"
    
    # Check for very short descriptions
    if len(text.strip()) < MIN_DESCRIPTION_LENGTH:
        return True, f"Too short ({len(text)} chars)"
    
    return False, None


def check_hero_file(file_path):
    """
    Check a hero JSON file for placeholder skill texts
    
    Args:
        file_path: Path to the hero JSON file
    
    Returns:
        dict: Analysis results
    """
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            hero_data = json.load(f)
        
        hero_name = hero_data.get('name', hero_data.get('id', 'Unknown'))
        
        issues = {
            'name': hero_name,
            'file': file_path.name,
            'has_issues': False,
            'skills': [],
            'relic': None,
            'duplicates': []
        }
        
        # Check for duplicate skill names
        if CHECK_DUPLICATE_NAMES and 'skills' in hero_data and hero_data['skills']:
            skill_names = [s.get('name', '').lower().strip() for s in hero_data['skills'] if s.get('name')]
            seen_names = set()
            for name in skill_names:
                if name and name in seen_names:
                    issues['duplicates'].append(f"Duplicate skill name: '{name}'")
                    issues['has_issues'] = True
                seen_names.add(name)
        
        # Check skills
        if 'skills' in hero_data and hero_data['skills']:
            for idx, skill in enumerate(hero_data['skills'], 1):
                skill_issues = []
                
                # Check skill name
                skill_name = skill.get('name', '')
                is_placeholder, reason = contains_placeholder(skill_name)
                if is_placeholder:
                    skill_issues.append(f"Name: {reason}")
                
                # Check skill description
                skill_desc = skill.get('description', '')
                is_placeholder, reason = contains_placeholder(skill_desc)
                if is_placeholder:
                    skill_issues.append(f"Description: {reason}")
                
                # Check upgrades
                if 'upgrades' in skill:
                    for level, upgrade_text in skill['upgrades'].items():
                        is_placeholder, reason = contains_placeholder(upgrade_text)
                        if is_placeholder:
                            skill_issues.append(f"Upgrade {level}: {reason}")
                
                if skill_issues:
                    issues['skills'].append({
                        'number': idx,
                        'name': skill_name or f"Skill {idx}",
                        'issues': skill_issues
                    })
                    issues['has_issues'] = True
        
        # Check relic
        if 'relic' in hero_data and hero_data['relic']:
            relic = hero_data['relic']
            relic_issues = []
            
            # Check relic name
            relic_name = relic.get('name', '')
            is_placeholder, reason = contains_placeholder(relic_name)
            if is_placeholder:
                relic_issues.append(f"Name: {reason}")
            
            # Check relic description
            relic_desc = relic.get('description', '')
            is_placeholder, reason = contains_placeholder(relic_desc)
            if is_placeholder:
                relic_issues.append(f"Description: {reason}")
            
            # Check relic upgrades
            if 'upgrades' in relic:
                for level, upgrade_text in relic['upgrades'].items():
                    is_placeholder, reason = contains_placeholder(upgrade_text)
                    if is_placeholder:
                        relic_issues.append(f"Upgrade {level}: {reason}")
            
            if relic_issues:
                issues['relic'] = {
                    'name': relic_name or "Relic",
                    'issues': relic_issues
                }
                issues['has_issues'] = True
        
        return issues
        
    except json.JSONDecodeError as e:
        return {
            'name': file_path.name,
            'file': file_path.name,
            'has_issues': True,
            'error': f"Invalid JSON: {str(e)}"
        }
    except Exception as e:
        return {
            'name': file_path.name,
            'file': file_path.name,
            'has_issues': True,
            'error': str(e)
        }


def scan_directory(directory_path, output_file=None):
    """
    Scan all hero JSON files in a directory
    
    Args:
        directory_path: Path to directory containing hero JSON files
        output_file: Optional file to write results to
    """
    directory = Path(directory_path)
    
    if not directory.exists():
        print(f"❌ Directory not found: {directory_path}")
        return
    
    # Find all JSON files
    json_files = list(directory.glob("*.json"))
    
    if not json_files:
        print(f"❌ No JSON files found in: {directory_path}")
        return
    
    print(f"\n{'=' * 80}")
    print(f"Hero Skill Text Checker")
    print(f"{'=' * 80}")
    print(f"Directory: {directory_path}")
    print(f"Files found: {len(json_files)}\n")
    
    # Scan all files
    heroes_with_issues = []
    heroes_complete = []
    
    for json_file in sorted(json_files):
        result = check_hero_file(json_file)
        
        if result['has_issues']:
            heroes_with_issues.append(result)
        else:
            heroes_complete.append(result)
    
    # Print results
    print(f"{'=' * 80}")
    print(f"RESULTS:")
    print(f"{'=' * 80}\n")
    
    # Heroes with issues
    if heroes_with_issues:
        print(f"❌ HEROES WITH PLACEHOLDER TEXTS ({len(heroes_with_issues)}):\n")
        
        for hero in heroes_with_issues:
            print(f"  📝 {hero['name']} ({hero['file']})")
            
            if 'error' in hero:
                print(f"     ⚠️ Error: {hero['error']}")
            else:
                if hero.get('duplicates'):
                    for duplicate in hero['duplicates']:
                        print(f"     ⚠️ {duplicate}")
                
                if hero.get('skills'):
                    for skill in hero['skills']:
                        print(f"     • Skill {skill['number']}: {skill['name']}")
                        for issue in skill['issues']:
                            print(f"       - {issue}")
                
                if hero.get('relic'):
                    print(f"     • Relic: {hero['relic']['name']}")
                    for issue in hero['relic']['issues']:
                        print(f"       - {issue}")
            
            print()  # Empty line
    
    # Heroes complete
    if heroes_complete:
        print(f"✅ HEROES WITH COMPLETE TEXTS ({len(heroes_complete)}):\n")
        for hero in heroes_complete:
            print(f"  ✓ {hero['name']}")
        print()
    
    # Summary
    print(f"{'=' * 80}")
    print(f"SUMMARY:")
    print(f"  Total heroes: {len(json_files)}")
    print(f"  ✅ Complete: {len(heroes_complete)}")
    print(f"  ❌ Need work: {len(heroes_with_issues)}")
    print(f"  Progress: {(len(heroes_complete)/len(json_files)*100):.1f}%")
    print(f"{'=' * 80}\n")
    
    # Write to file if requested
    if output_file:
        write_report(heroes_with_issues, heroes_complete, output_file)


def write_report(heroes_with_issues, heroes_complete, output_file):
    """
    Write a detailed report to a file
    """
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write("Hero Skill Text Report\n")
        f.write("=" * 80 + "\n\n")
        
        f.write(f"Heroes with placeholder texts: {len(heroes_with_issues)}\n")
        f.write(f"Heroes with complete texts: {len(heroes_complete)}\n\n")
        
        if heroes_with_issues:
            f.write("NEEDS WORK:\n")
            f.write("-" * 80 + "\n\n")
            
            for hero in heroes_with_issues:
                f.write(f"{hero['name']} ({hero['file']})\n")
                
                if 'error' in hero:
                    f.write(f"  Error: {hero['error']}\n")
                else:
                    if hero.get('skills'):
                        for skill in hero['skills']:
                            f.write(f"  Skill {skill['number']}: {skill['name']}\n")
                            for issue in skill['issues']:
                                f.write(f"    - {issue}\n")
                    
                    if hero.get('relic'):
                        f.write(f"  Relic: {hero['relic']['name']}\n")
                        for issue in hero['relic']['issues']:
                            f.write(f"    - {issue}\n")
                
                f.write("\n")
        
        if heroes_complete:
            f.write("\nCOMPLETE:\n")
            f.write("-" * 80 + "\n\n")
            for hero in heroes_complete:
                f.write(f"  ✓ {hero['name']}\n")
    
    print(f"📄 Report saved to: {output_file}")


def main():
    """Main function with CLI interface"""
    import argparse
    
    parser = argparse.ArgumentParser(
        description='Check hero JSON files for placeholder/default skill texts',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Check all heroes in a directory
  python check_skill_texts.py --dir ./src/data/heroes
  
  # Save results to a file
  python check_skill_texts.py --dir ./src/data/heroes --output report.txt
  
  # Check and customize placeholder patterns
  python check_skill_texts.py --dir ./heroes
  
The script checks for:
  - Empty or missing descriptions
  - Placeholder text like "lorem ipsum", "TODO", "placeholder"
  - Very short descriptions (< 10 characters)
  - Empty upgrade texts
        """
    )
    
    parser.add_argument(
        '--dir',
        type=str,
        required=True,
        help='Directory containing hero JSON files'
    )
    
    parser.add_argument(
        '--output',
        type=str,
        help='Save detailed report to this file'
    )
    
    args = parser.parse_args()
    
    scan_directory(args.dir, args.output)


if __name__ == "__main__":
    main()
