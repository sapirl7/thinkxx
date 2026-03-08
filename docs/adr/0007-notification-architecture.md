# ADR-0007: Notification Architecture

## Status
Accepted

## Date
2026-03-08

## Context
Users need timely reminders for heartbeats and alerts for claims. Missing a heartbeat can trigger unintended claims. However, notification delivery is inherently unreliable.

## Decision
Build a modular notification layer with multiple adapters (local push, optional email/Telegram/SMS). Notifications are UX redundancy — protocol correctness never depends on notification delivery.

## Alternatives Considered
- **Local notifications only**: Simpler but insufficient — users may disable notifications, lose their device, or not open the app.
- **Mandatory backend notification service**: Rejected. Creates a centralized dependency and trust point.
- **On-chain event monitoring**: Considered as supplementary. Programs can emit events but someone must monitor them.

## Consequences
- Adapter interface allows adding new channels without changing core logic
- Provider failure degrades gracefully
- No single vendor dependency at architectural level
- See `docs/NOTIFICATIONS.md` for adapter interface and event types
