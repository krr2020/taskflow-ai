---
name: mobile
description: Create production-grade mobile applications. Use when building React Native components, screens, navigation, or native integrations. Generates performant, cross-platform code that follows mobile-first principles and platform conventions.
---

## Design Thinking

Before implementing any mobile feature, understand the context and commit to a PLATFORM-AWARE direction:

- **Purpose**: What user action does this enable on a mobile device? Not "show a list" but "let users browse products with one thumb while commuting." Mobile context shapes every decision.
- **Platform**: What conventions does iOS expect? What does Android expect? Navigation patterns, gestures, system UI integration. Users unconsciously expect platform-native behavior.
- **Performance**: Mobile devices have constrained memory, battery, and intermittent connectivity. Every feature must consider: does this drain battery? Does it work offline? Does it load fast on 3G?
- **Touch**: Fingers are imprecise. Touch targets need 44pt minimum. Gestures must be discoverable. Haptic feedback confirms actions. Design for thumbs, not cursors.

**CRITICAL**: Choose a clear interaction pattern and execute it with platform awareness. iOS navigation and Android navigation both work—the key is consistency with platform expectations. Your screens should feel native to the platform. Match existing patterns. Use existing components.

## Execution Guidelines

Implement production-grade, functional mobile code that is performant and platform-appropriate.

**Component Reuse**: Before building custom components, check React Native's built-in components, then the design system, then Expo libraries. Custom native bridges are expensive to maintain.

**Performance Reality**: JavaScript runs on a single thread. Heavy computation blocks the UI. Use `useMemo`, `useCallback`, `FlatList` virtualization. Profile with Flipper. 60 FPS is the minimum bar.

**Offline First**: Networks fail. Design for airplane mode. Cache critical data. Queue actions for sync. Show stale data while fetching fresh. Users don't care about your network layer—they care that the app works.

**Platform Adaptation**: Use `Platform.select()` for platform-specific code. Respect safe areas. Handle notches, home indicators, and status bars. Test on both iOS and Android simulators.

## What NOT To Do

Avoid patterns that undermine mobile user experience:

- Ignoring platform conventions (iOS back gesture, Android hardware back button)
- Touch targets smaller than 44pt that frustrate users
- ScrollView with many items instead of FlatList (performance killer)
- Blocking the JS thread with synchronous operations
- Assuming constant network connectivity
- Missing loading, error, or empty states for async operations
- Hardcoded dimensions instead of responsive layouts
