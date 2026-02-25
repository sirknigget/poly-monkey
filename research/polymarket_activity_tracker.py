#!/usr/bin/env python3
"""
Polymarket User Activity Tracker

This script polls the Polymarket Data API for a user's trading activity,
processes the data into readable format, and tracks what has been seen.

Features:
- Fetches user trading activity from Data API
- Aggregates multiple fills for same transaction
- Constructs readable event links
- Filters for new activities only
- Saves state between runs for incremental polling

Author: Generated for backend development
Date: 2026-02-25
"""

import requests
import json
import os
from datetime import datetime
from collections import defaultdict
from typing import List, Dict, Optional

# Configuration
STATE_FILE = "polymarket_activity_state.json"
BASE_URL = "https://data-api.polymarket.com"

class PolymarketActivityTracker:
    """Tracks and processes Polymarket user activity"""

    def __init__(self, user_address: str, state_file: str = STATE_FILE):
        """
        Initialize tracker

        Args:
            user_address: Ethereum address (0x-prefixed)
            state_file: Path to JSON file storing seen transaction hashes
        """
        self.user_address = user_address.lower()
        self.state_file = state_file
        self.seen_transactions = self.load_state()

    def load_state(self) -> set:
        """Load previously seen transaction hashes from state file"""
        if os.path.exists(self.state_file):
            try:
                with open(self.state_file, 'r') as f:
                    data = json.load(f)
                    return set(data.get('seen_transactions', []))
            except Exception as e:
                print(f"Warning: Could not load state file: {e}")
                return set()
        return set()

    def save_state(self):
        """Save seen transaction hashes to state file"""
        try:
            with open(self.state_file, 'w') as f:
                json.dump({
                    'user_address': self.user_address,
                    'last_updated': datetime.now().isoformat(),
                    'seen_transactions': list(self.seen_transactions)
                }, f, indent=2)
        except Exception as e:
            print(f"Warning: Could not save state file: {e}")

    def fetch_activity(self, limit: int = 100, activity_type: str = "TRADE") -> List[Dict]:
        """
        Fetch user activity from Polymarket Data API

        Args:
            limit: Maximum number of activities to fetch (max 500)
            activity_type: Type of activity (TRADE, SPLIT, MERGE, REDEEM, etc.)

        Returns:
            List of activity records
        """
        url = f"{BASE_URL}/activity"
        params = {
            "user": self.user_address,
            "limit": min(limit, 500),
            "type": activity_type,
            "sortBy": "TIMESTAMP",
            "sortDirection": "DESC"
        }

        try:
            response = requests.get(url, params=params, timeout=30)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"Error fetching activity: {e}")
            return []

    def aggregate_activities(self, activities: List[Dict]) -> List[Dict]:
        """
        Aggregate multiple activity records for same transaction

        When Polymarket fills an order across multiple price levels or makers,
        it creates separate activity records with the same transactionHash.
        This function aggregates them into single trade records.

        Args:
            activities: Raw activity list from API

        Returns:
            List of aggregated trade records
        """
        # Group by transaction hash
        tx_groups = defaultdict(list)
        for activity in activities:
            tx_hash = activity.get('transactionHash', f"unknown_{activity.get('timestamp', 0)}")
            tx_groups[tx_hash].append(activity)

        aggregated = []

        for tx_hash, tx_activities in tx_groups.items():
            if len(tx_activities) == 1:
                # Single activity - use as-is
                act = tx_activities[0]
                aggregated.append(self._format_activity(act, tx_hash, activity_count=1))
            else:
                # Multiple activities - aggregate them
                first_act = tx_activities[0]

                # Sum USDC sizes and token amounts
                total_usdc = sum(act.get('usdcSize', 0) for act in tx_activities)
                total_tokens = sum(act.get('size', 0) for act in tx_activities)

                # Collect unique outcomes (in case buying multiple outcomes in same tx)
                outcomes = list(set(act.get('outcome', 'Unknown') for act in tx_activities))

                # Calculate average price
                avg_price = total_usdc / total_tokens if total_tokens > 0 else 0

                aggregated.append({
                    'transaction_hash': tx_hash,
                    'timestamp': first_act.get('timestamp'),
                    'date': self._format_timestamp(first_act.get('timestamp')),
                    'event_title': first_act.get('title', 'Unknown Event'),
                    'event_link': self._construct_event_link(first_act.get('eventSlug')),
                    'market_slug': first_act.get('slug', ''),
                    'outcome_purchased': ', '.join(outcomes),
                    'side': first_act.get('side', 'N/A'),
                    'total_price_usd': round(total_usdc, 2),
                    'num_tokens': round(total_tokens, 2),
                    'avg_price_per_token': round(avg_price, 4),
                    'activity_count': len(tx_activities),
                    'fills': [
                        {
                            'outcome': act.get('outcome'),
                            'price': act.get('price'),
                            'size': act.get('size'),
                            'usdcSize': act.get('usdcSize')
                        }
                        for act in tx_activities
                    ]
                })

        # Sort by timestamp descending (most recent first)
        aggregated.sort(key=lambda x: x['timestamp'], reverse=True)

        return aggregated

    def _format_activity(self, activity: Dict, tx_hash: str, activity_count: int = 1) -> Dict:
        """Format single activity into standard structure"""
        return {
            'transaction_hash': tx_hash,
            'timestamp': activity.get('timestamp'),
            'date': self._format_timestamp(activity.get('timestamp')),
            'event_title': activity.get('title', 'Unknown Event'),
            'event_link': self._construct_event_link(activity.get('eventSlug')),
            'market_slug': activity.get('slug', ''),
            'outcome_purchased': activity.get('outcome', 'Unknown'),
            'side': activity.get('side', 'N/A'),
            'total_price_usd': round(activity.get('usdcSize', 0), 2),
            'num_tokens': round(activity.get('size', 0), 2),
            'avg_price_per_token': round(activity.get('price', 0), 4),
            'activity_count': activity_count
        }

    def _format_timestamp(self, timestamp: Optional[int]) -> str:
        """Convert Unix timestamp to readable date string"""
        if timestamp:
            return datetime.fromtimestamp(timestamp).strftime('%Y-%m-%d %H:%M:%S')
        return 'N/A'

    def _construct_event_link(self, event_slug: Optional[str]) -> str:
        """Construct Polymarket event URL from slug"""
        if event_slug:
            return f"https://polymarket.com/event/{event_slug}"
        return 'N/A'

    def filter_new_activities(self, activities: List[Dict]) -> List[Dict]:
        """
        Filter activities to only new ones (not seen before)

        Args:
            activities: List of aggregated activities

        Returns:
            List of new activities only
        """
        new_activities = []
        for activity in activities:
            tx_hash = activity['transaction_hash']
            if tx_hash not in self.seen_transactions:
                new_activities.append(activity)
                self.seen_transactions.add(tx_hash)

        return new_activities

    def poll_and_process(self, limit: int = 100) -> List[Dict]:
        """
        Main method: Poll API, process activities, return new ones

        Args:
            limit: Number of recent activities to fetch

        Returns:
            List of new activities in readable format
        """
        print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Polling activities for {self.user_address[:10]}...")

        # Fetch raw activities
        raw_activities = self.fetch_activity(limit=limit)
        print(f"  Fetched {len(raw_activities)} raw activity records")

        if not raw_activities:
            print("  No activities found")
            return []

        # Aggregate activities by transaction
        aggregated = self.aggregate_activities(raw_activities)
        print(f"  Aggregated into {len(aggregated)} unique trades")

        # Filter for new activities
        new_activities = self.filter_new_activities(aggregated)
        print(f"  Found {len(new_activities)} new activities")

        # Save state
        if new_activities:
            self.save_state()
            print(f"  State saved to {self.state_file}")

        return new_activities

    def format_for_display(self, activities: List[Dict]) -> str:
        """
        Format activities as human-readable text

        Args:
            activities: List of activity dictionaries

        Returns:
            Formatted string for display
        """
        if not activities:
            return "No new activities"

        lines = []
        lines.append("=" * 80)
        lines.append(f"NEW ACTIVITIES FOR {self.user_address}")
        lines.append("=" * 80)

        for i, act in enumerate(activities, 1):
            lines.append(f"\nTrade #{i}")
            lines.append(f"  Date: {act['date']}")
            lines.append(f"  Event: {act['event_title']}")
            lines.append(f"  Link: {act['event_link']}")
            lines.append(f"  Outcome: {act['outcome_purchased']}")
            lines.append(f"  Side: {act['side']}")
            lines.append(f"  Total Spent: ${act['total_price_usd']:.2f}")
            lines.append(f"  Tokens: {act['num_tokens']:.2f}")
            lines.append(f"  Avg Price/Token: ${act['avg_price_per_token']:.4f}")

            if act['activity_count'] > 1:
                lines.append(f"  Note: Aggregated from {act['activity_count']} fills")

            lines.append(f"  Transaction: {act['transaction_hash'][:20]}...")

        lines.append("\n" + "=" * 80)

        return "\n".join(lines)


def main():
    """Example usage"""
    # Example user address
    user_address = "0x2005d16a84ceefa912d4e380cd32e7ff827875ea"

    # Initialize tracker
    tracker = PolymarketActivityTracker(user_address)

    # Poll for new activities
    new_activities = tracker.poll_and_process(limit=50)

    # Display results
    if new_activities:
        print("\n" + tracker.format_for_display(new_activities))

        # Also save to JSON file
        output_file = f"new_activities_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(output_file, 'w') as f:
            json.dump(new_activities, f, indent=2)
        print(f"\n📄 Saved to: {output_file}")
    else:
        print("\n✅ No new activities since last poll")


if __name__ == "__main__":
    main()
