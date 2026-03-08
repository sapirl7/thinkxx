# ADR-0002: Android-First and Seeker-Optimized Scope

## Status
Accepted

## Date
2026-03-08

## Context
The Solana Mobile ecosystem is Android-first. The Seeker device runs Android. MWA has mature Android support. iOS MWA support is nascent.

## Decision
Target Android as the primary platform. Optimize UX for Seeker devices. Design the architecture to allow future iOS port without restructuring.

## Alternatives Considered
- **Cross-platform from day one**: Rejected. Splitting focus before validating on the primary platform increases risk without proportional user reach.
- **Native Android (Kotlin/Compose)**: Considered. While Solarma uses native Kotlin, React Native + Expo provides faster iteration and shared code with the SDK. MWA has React Native bindings.
- **iOS-first**: Not viable. The Solana Mobile ecosystem is Android-centric.

## Consequences
- Primary testing on Seeker and Android emulators
- React Native ensures future iOS portability
- Seeker-specific optimizations (badges, onboarding) are UX-only, never security
- App structure must not depend on Seeker-specific APIs for core functionality
