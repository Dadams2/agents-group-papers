#!/usr/bin/env python3
"""
Utility script for managing papers in the reading group system.
Provides command-line tools for common operations.
"""

import json
import os
import sys
import argparse
from datetime import datetime, timedelta
import urllib.request
import hashlib

def load_schedule():
    """Load the current schedule data."""
    with open('schedule/schedule.json', 'r') as f:
        return json.load(f)

def save_schedule(schedule_data):
    """Save the schedule data."""
    schedule_data['lastUpdated'] = datetime.now().strftime('%Y-%m-%d')
    with open('schedule/schedule.json', 'w') as f:
        json.dump(schedule_data, f, indent=2)

def load_config():
    """Load the tracks configuration."""
    with open('tracks/config.json', 'r') as f:
        return json.load(f)

def add_paper(args):
    """Add a paper to the system."""
    schedule_data = load_schedule()
    
    # Generate paper ID
    paper_id = datetime.now().strftime('%Y%m%d_%H%M%S')
    
    # Generate filename from title
    safe_title = ''.join(c for c in args.title if c.isalnum() or c in (' ', '-', '_')).rstrip()
    filename = safe_title.lower().replace(' ', '_') + '.pdf'
    
    new_paper = {
        "id": paper_id,
        "date": args.date or datetime.now().strftime('%Y-%m-%d'),
        "title": args.title,
        "authors": args.authors,
        "track": args.track,
        "presenter": args.presenter or "TBD",
        "filename": filename,
        "status": "upcoming" if args.track == "discussion" else "reference",
        "description": args.description or "",
        "uploadedBy": "cli-tool",
        "uploadedAt": datetime.now().isoformat()
    }
    
    schedule_data['schedule'].append(new_paper)
    save_schedule(schedule_data)
    
    print(f"✅ Added paper: {args.title}")
    print(f"   ID: {paper_id}")
    print(f"   Track: {args.track}")
    print(f"   Filename: {filename}")
    
    if args.track == "discussion" and not args.date:
        print("⚠️  No discussion date set. Remember to schedule it!")

def list_papers(args):
    """List papers in the system."""
    schedule_data = load_schedule()
    papers = schedule_data['schedule']
    
    if args.track:
        papers = [p for p in papers if p['track'] == args.track]
    
    if not papers:
        print("No papers found.")
        return
    
    print(f"{'ID':<15} {'Title':<40} {'Authors':<30} {'Track':<12} {'Date':<12}")
    print("-" * 110)
    
    for paper in sorted(papers, key=lambda x: x['date']):
        title = paper['title'][:37] + "..." if len(paper['title']) > 40 else paper['title']
        authors = paper['authors'][:27] + "..." if len(paper['authors']) > 30 else paper['authors']
        
        print(f"{paper['id']:<15} {title:<40} {authors:<30} {paper['track']:<12} {paper['date']:<12}")

def schedule_paper(args):
    """Schedule a paper for discussion."""
    schedule_data = load_schedule()
    
    # Find the paper
    paper = None
    for p in schedule_data['schedule']:
        if p['id'] == args.paper_id:
            paper = p
            break
    
    if not paper:
        print(f"❌ Paper with ID {args.paper_id} not found")
        return
    
    paper['date'] = args.date
    paper['presenter'] = args.presenter or "TBD"
    paper['track'] = "discussion"
    paper['status'] = "upcoming"
    
    save_schedule(schedule_data)
    print(f"✅ Scheduled paper: {paper['title']}")
    print(f"   Date: {args.date}")
    print(f"   Presenter: {paper['presenter']}")

def archive_paper(args):
    """Archive a paper."""
    schedule_data = load_schedule()
    
    # Find the paper
    paper = None
    for p in schedule_data['schedule']:
        if p['id'] == args.paper_id:
            paper = p
            break
    
    if not paper:
        print(f"❌ Paper with ID {args.paper_id} not found")
        return
    
    # Move the file
    old_path = f"papers/{paper['track']}/{paper['filename']}"
    new_path = f"papers/archived/{paper['filename']}"
    
    if os.path.exists(old_path):
        os.makedirs('papers/archived', exist_ok=True)
        os.rename(old_path, new_path)
        print(f"📁 Moved file: {old_path} -> {new_path}")
    
    paper['track'] = "archived"
    paper['status'] = "completed"
    
    save_schedule(schedule_data)
    print(f"✅ Archived paper: {paper['title']}")

def upcoming_papers(args):
    """Show upcoming papers."""
    schedule_data = load_schedule()
    today = datetime.now().date()
    
    upcoming = []
    for paper in schedule_data['schedule']:
        if paper['track'] == 'discussion':
            paper_date = datetime.strptime(paper['date'], '%Y-%m-%d').date()
            if paper_date >= today:
                days_until = (paper_date - today).days
                upcoming.append((paper, days_until))
    
    upcoming.sort(key=lambda x: x[1])
    
    if not upcoming:
        print("No upcoming papers scheduled.")
        return
    
    print("📅 Upcoming Papers:")
    print()
    
    for paper, days_until in upcoming[:5]:  # Show next 5
        if days_until == 0:
            time_str = "Today"
        elif days_until == 1:
            time_str = "Tomorrow"
        else:
            time_str = f"In {days_until} days"
        
        print(f"   {paper['date']} ({time_str})")
        print(f"   📄 {paper['title']}")
        print(f"   👤 {paper['presenter']}")
        print(f"   ✍️  {paper['authors']}")
        print()

def stats(args):
    """Show system statistics."""
    schedule_data = load_schedule()
    papers = schedule_data['schedule']
    
    total = len(papers)
    by_track = {}
    
    for paper in papers:
        track = paper['track']
        by_track[track] = by_track.get(track, 0) + 1
    
    print("📊 Paper Statistics:")
    print(f"   Total papers: {total}")
    
    for track, count in by_track.items():
        print(f"   {track.capitalize()}: {count}")
    
    # Recent activity
    recent = [p for p in papers if 'uploadedAt' in p]
    recent.sort(key=lambda x: x['uploadedAt'], reverse=True)
    
    print(f"\n📈 Recent Activity:")
    for paper in recent[:3]:
        upload_date = datetime.fromisoformat(paper['uploadedAt'].replace('Z', '')).strftime('%Y-%m-%d')
        print(f"   {upload_date}: {paper['title']} ({paper['track']})")

def main():
    parser = argparse.ArgumentParser(description='AI Agents Reading Group Paper Management')
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # Add paper
    add_parser = subparsers.add_parser('add', help='Add a new paper')
    add_parser.add_argument('title', help='Paper title')
    add_parser.add_argument('authors', help='Paper authors')
    add_parser.add_argument('track', choices=['discussion', 'reference'], help='Paper track')
    add_parser.add_argument('--date', help='Discussion date (YYYY-MM-DD)')
    add_parser.add_argument('--presenter', help='Presenter name')
    add_parser.add_argument('--description', help='Paper description')
    
    # List papers
    list_parser = subparsers.add_parser('list', help='List papers')
    list_parser.add_argument('--track', choices=['discussion', 'reference', 'archived'], help='Filter by track')
    
    # Schedule paper
    schedule_parser = subparsers.add_parser('schedule', help='Schedule a paper for discussion')
    schedule_parser.add_argument('paper_id', help='Paper ID')
    schedule_parser.add_argument('date', help='Discussion date (YYYY-MM-DD)')
    schedule_parser.add_argument('--presenter', help='Presenter name')
    
    # Archive paper
    archive_parser = subparsers.add_parser('archive', help='Archive a paper')
    archive_parser.add_argument('paper_id', help='Paper ID')
    
    # Upcoming papers
    subparsers.add_parser('upcoming', help='Show upcoming papers')
    
    # Statistics
    subparsers.add_parser('stats', help='Show system statistics')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    # Check if we're in the right directory
    if not os.path.exists('schedule/schedule.json'):
        print("❌ Error: schedule/schedule.json not found")
        print("Please run this script from the project root directory")
        sys.exit(1)
    
    # Execute command
    if args.command == 'add':
        add_paper(args)
    elif args.command == 'list':
        list_papers(args)
    elif args.command == 'schedule':
        schedule_paper(args)
    elif args.command == 'archive':
        archive_paper(args)
    elif args.command == 'upcoming':
        upcoming_papers(args)
    elif args.command == 'stats':
        stats(args)

if __name__ == '__main__':
    main()
