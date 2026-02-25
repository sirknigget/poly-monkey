#!/usr/bin/env python3
"""
Example: How to use the Polymarket Activity Tracker

This script demonstrates different usage patterns for the tracker.
"""

from polymarket_activity_tracker import PolymarketActivityTracker
import json
from datetime import datetime
import time

# Your target user address
USER_ADDRESS = "0x2005d16a84ceefa912d4e380cd32e7ff827875ea"

def example_1_simple_poll():
    """Example 1: Simple one-time poll"""
    print("\n" + "="*80)
    print("EXAMPLE 1: Simple One-Time Poll")
    print("="*80)

    tracker = PolymarketActivityTracker(USER_ADDRESS)
    new_activities = tracker.poll_and_process(limit=50)

    if new_activities:
        print(tracker.format_for_display(new_activities))
    else:
        print("No new activities found")


def example_2_periodic_polling():
    """Example 2: Periodic polling with notification"""
    print("\n" + "="*80)
    print("EXAMPLE 2: Periodic Polling (runs 3 times with 10s interval)")
    print("="*80)

    tracker = PolymarketActivityTracker(USER_ADDRESS)

    for i in range(3):
        print(f"\n--- Poll #{i+1} ---")
        new_activities = tracker.poll_and_process(limit=50)

        if new_activities:
            print(f"🔔 Found {len(new_activities)} new activities!")
            for act in new_activities:
                print(f"  • {act['side']} {act['outcome_purchased']} on {act['event_title'][:50]}")
        else:
            print("✅ No new activities")

        if i < 2:  # Don't sleep after last iteration
            print("  Waiting 10 seconds...")
            time.sleep(10)


def example_3_custom_filtering():
    """Example 3: Custom filtering and analysis"""
    print("\n" + "="*80)
    print("EXAMPLE 3: Custom Filtering and Analysis")
    print("="*80)

    tracker = PolymarketActivityTracker(USER_ADDRESS)

    # Fetch activities but don't filter by seen state
    raw_activities = tracker.fetch_activity(limit=100)
    aggregated = tracker.aggregate_activities(raw_activities)

    # Analyze buy vs sell
    buys = [a for a in aggregated if a['side'] == 'BUY']
    sells = [a for a in aggregated if a['side'] == 'SELL']

    total_spent = sum(a['total_price_usd'] for a in buys)
    total_received = sum(a['total_price_usd'] for a in sells)

    print(f"\nTrading Statistics:")
    print(f"  Total Trades: {len(aggregated)}")
    print(f"  Buy Orders: {len(buys)} (${total_spent:.2f})")
    print(f"  Sell Orders: {len(sells)} (${total_received:.2f})")
    print(f"  Net Position: ${total_spent - total_received:.2f}")

    # Group by event
    events = {}
    for act in aggregated:
        title = act['event_title']
        if title not in events:
            events[title] = []
        events[title].append(act)

    print(f"\nMost Active Markets:")
    sorted_events = sorted(events.items(), key=lambda x: len(x[1]), reverse=True)
    for title, acts in sorted_events[:5]:
        print(f"  • {title[:60]}: {len(acts)} trades")


def example_4_export_to_csv():
    """Example 4: Export to CSV for analysis"""
    print("\n" + "="*80)
    print("EXAMPLE 4: Export to CSV")
    print("="*80)

    tracker = PolymarketActivityTracker(USER_ADDRESS)
    raw_activities = tracker.fetch_activity(limit=100)
    aggregated = tracker.aggregate_activities(raw_activities)

    # Export to CSV
    import csv
    csv_file = f"polymarket_trades_{datetime.now().strftime('%Y%m%d')}.csv"

    with open(csv_file, 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=[
            'date', 'event_title', 'outcome_purchased', 'side',
            'total_price_usd', 'num_tokens', 'avg_price_per_token',
            'event_link', 'transaction_hash'
        ])
        writer.writeheader()

        for act in aggregated:
            writer.writerow({
                'date': act['date'],
                'event_title': act['event_title'],
                'outcome_purchased': act['outcome_purchased'],
                'side': act['side'],
                'total_price_usd': act['total_price_usd'],
                'num_tokens': act['num_tokens'],
                'avg_price_per_token': act['avg_price_per_token'],
                'event_link': act['event_link'],
                'transaction_hash': act['transaction_hash']
            })

    print(f"\n✅ Exported {len(aggregated)} trades to {csv_file}")


def example_5_webhook_notification():
    """Example 5: Send webhook notification for new activities"""
    print("\n" + "="*80)
    print("EXAMPLE 5: Webhook Notification (simulated)")
    print("="*80)

    tracker = PolymarketActivityTracker(USER_ADDRESS)
    new_activities = tracker.poll_and_process(limit=50)

    if new_activities:
        # Simulate sending to webhook (e.g., Discord, Slack)
        payload = {
            "user": USER_ADDRESS,
            "timestamp": datetime.now().isoformat(),
            "new_activities_count": len(new_activities),
            "activities": [
                {
                    "event": act['event_title'],
                    "outcome": act['outcome_purchased'],
                    "side": act['side'],
                    "amount": f"${act['total_price_usd']:.2f}",
                    "link": act['event_link']
                }
                for act in new_activities
            ]
        }

        print(f"\n📤 Would send webhook payload:")
        print(json.dumps(payload, indent=2))

        # In real implementation:
        # import requests
        # requests.post(WEBHOOK_URL, json=payload)
    else:
        print("\n✅ No new activities to report")


def main():
    """Run all examples"""
    print("\n" + "="*80)
    print("POLYMARKET ACTIVITY TRACKER - USAGE EXAMPLES")
    print("="*80)
    print(f"Target User: {USER_ADDRESS}")
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    # Run examples
    try:
        example_1_simple_poll()
        input("\nPress Enter to continue to next example...")

        example_2_periodic_polling()
        input("\nPress Enter to continue to next example...")

        example_3_custom_filtering()
        input("\nPress Enter to continue to next example...")

        example_4_export_to_csv()
        input("\nPress Enter to continue to next example...")

        example_5_webhook_notification()

    except KeyboardInterrupt:
        print("\n\n⚠️  Examples interrupted by user")
    except Exception as e:
        print(f"\n\n❌ Error: {e}")
        import traceback
        traceback.print_exc()

    print("\n" + "="*80)
    print("Examples complete!")
    print("="*80)


if __name__ == "__main__":
    main()
