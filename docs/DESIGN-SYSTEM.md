# TaskFlow CLI Design System

**Date:** January 3, 2026  
**Version:** 1.0.0  
**Status:** ✅ COMPLETE

---

## Overview

The TaskFlow Design System provides a comprehensive set of reusable UI components for creating consistent, polished CLI experiences. All components follow established patterns for colors, spacing, and visual hierarchy.

**Location:** `packages/core/src/lib/ui/components.ts`

---

## Core Principles

### 1. Consistency
- Use design system components for all UI output
- Follow established color palette
- Maintain consistent spacing and separators

### 2. Hierarchy
- Large headings for major sections
- Section titles for subsections
- Clear visual separation between elements

### 3. Feedback
- Success/error/warning states use appropriate colors
- Icons provide visual cues
- Loading states for all async operations

### 4. Readability
- Adequate spacing between sections
- Muted text for secondary information
- Box components for important messages

---

## Components Reference

### 1. Separators

Create visual boundaries between sections.

```typescript
import { Separator } from '@/lib/ui';

// Light separator (default 60 chars)
console.log(Separator.light());

// Heavy separator
console.log(Separator.heavy());

// Dashed separator
console.log(Separator.dashed());

// Section separator with title
console.log(Separator.section('Configuration'));

// Blank line
console.log(Separator.blank());
```

**Output:**
```
────────────────────────────────────────────────────────────
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌
──────────────────────── Configuration ────────────────────────

```

---

### 2. Box Components

Highlight important messages with bordered boxes.

```typescript
import { Box } from '@/lib/ui';

// Success box
console.log(Box.success('Task completed successfully!'));

// Error box
console.log(Box.error('Failed to load configuration', 'Error'));

// Warning box
console.log(Box.warning('This action cannot be undone'));

// Info box
console.log(Box.info('Tip: Use --help for more options'));

// Plain box (no color)
console.log(Box.plain('Custom content', 'Title'));
```

**Output:**
```
┌──────────────────────────────────────────────────────────┐
│ ✓ Task completed successfully!                          │
└──────────────────────────────────────────────────────────┘

┌─ Error ──────────────────────────────────────────────────┐
│ ✗ Failed to load configuration                           │
└──────────────────────────────────────────────────────────┘
```

---

### 3. Text Formatting

Consistent text styling for headers, messages, and content.

```typescript
import { Text } from '@/lib/ui';

// Large heading (double-line)
console.log(Text.heading('PRD Generation'));

// Section title (single-line)
console.log(Text.section('Configuration'));

// Subsection title
console.log(Text.subsection('API Settings'));

// Numbered question
console.log(Text.question(1, 'What is your project name?'));

// Answer text
console.log(Text.answer('My awesome project'));

// Status messages
console.log(Text.success('Completed'));
console.log(Text.error('Failed'));
console.log(Text.warning('Deprecated'));
console.log(Text.info('Note: Check documentation'));

// Formatting
console.log(Text.muted('Secondary information'));
console.log(Text.code('npm install'));
console.log(Text.url('https://example.com'));

// List items
console.log(Text.bullet('First item'));
console.log(Text.numbered(1, 'First step'));

// Indentation
console.log(Text.indent('Nested content', 2));
```

**Output:**
```
════════════════════════════════════════════════════════════
PRD Generation
════════════════════════════════════════════════════════════

Configuration
────────────────────────────────────────

API Settings

1. What is your project name?

✓ Your Answer:
My awesome project

✓ Completed
✗ Failed
⚠ Deprecated
ℹ Note: Check documentation

Secondary information
`npm install`
https://example.com

  • First item
  1. First step

    Nested content
```

---

### 4. Lists

Create bullet, numbered, or checklist formats.

```typescript
import { List } from '@/lib/ui';

// Bullet list
const items = ['Item 1', 'Item 2', 'Item 3'];
console.log(List.bullet(items));

// With indentation
console.log(List.bullet(items, 1));

// Numbered list
console.log(List.numbered(items));

// Start at specific number
console.log(List.numbered(items, 5));

// Checklist
const tasks = [
  { text: 'Setup project', checked: true },
  { text: 'Write tests', checked: false },
  { text: 'Deploy', checked: false },
];
console.log(List.checklist(tasks));
```

**Output:**
```
  • Item 1
  • Item 2
  • Item 3

    • Item 1
    • Item 2
    • Item 3

  1. Item 1
  2. Item 2
  3. Item 3

  5. Item 1
  6. Item 2
  7. Item 3

  [✓] Setup project
  [ ] Write tests
  [ ] Deploy
```

---

### 5. Tables

Display structured data in table format.

```typescript
import { Table } from '@/lib/ui';

// Object array table
const data = [
  { name: 'John', age: 30, city: 'NYC' },
  { name: 'Jane', age: 25, city: 'LA' },
];
console.log(Table.create(data));

// Custom headers
console.log(Table.create(data, { 
  headers: ['name', 'age'] 
}));

// Key-value table
const config = {
  'Project': 'TaskFlow',
  'Version': '1.0.0',
  'Status': 'Active',
};
console.log(Table.keyValue(config));
```

**Output:**
```
│ name   │ age  │ city │
│────────│──────│──────│
│ John   │ 30   │ NYC  │
│ Jane   │ 25   │ LA   │

  Project │ TaskFlow
  Version │ 1.0.0
  Status  │ Active
```

---

### 6. Progress Bars

Visual progress indicators.

```typescript
import { ProgressBar } from '@/lib/ui';

// Progress bar (current, total, width)
console.log(ProgressBar.create(50, 100, 40));
console.log(ProgressBar.create(25, 100, 40));
console.log(ProgressBar.create(80, 100, 40));

// Percentage only
console.log(ProgressBar.percentage(75));

// Spinner frame (for animation)
for (let i = 0; i < 10; i++) {
  console.log(ProgressBar.spinner(i));
}
```

**Output:**
```
[████████████████████░░░░░░░░░░░░░░░░░░░░] 50.0%
[██████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░] 25.0%
[████████████████████████████████░░░░░░░░] 80.0%

75.0%

⠋ ⠙ ⠹ ⠸ ⠼ ⠴ ⠦ ⠧ ⠇ ⠏
```

---

### 7. Utility Functions

Helper functions for text manipulation.

```typescript
import { 
  safeString, 
  wrapText, 
  truncate, 
  centerText, 
  spacing 
} from '@/lib/ui';

// Safe string (prevents "undefined")
const value = undefined;
console.log(safeString(value, 'N/A')); // "N/A"

// Wrap text to width
const long = "This is a very long line that needs to be wrapped";
const wrapped = wrapText(long, 20);
console.log(wrapped.join('\n'));

// Truncate with ellipsis
console.log(truncate('Very long text', 10)); // "Very lon…"

// Center text
console.log(centerText('Title', 40));

// Add spacing
console.log(spacing(2)); // Two blank lines
```

---

## Constants

### Box Characters

```typescript
import { BoxChars } from '@/lib/ui';

BoxChars.topLeft      // ┌
BoxChars.topRight     // ┐
BoxChars.bottomLeft   // └
BoxChars.bottomRight  // ┘
BoxChars.horizontal   // ─
BoxChars.vertical     // │

BoxChars.doubleTopLeft      // ╔
BoxChars.doubleTopRight     // ╗
BoxChars.doubleBottomLeft   // ╚
BoxChars.doubleBottomRight  // ╝
BoxChars.doubleHorizontal   // ═
BoxChars.doubleVertical     // ║

BoxChars.light  // ─
BoxChars.heavy  // ━
BoxChars.dash   // ╌
```

### Colors

```typescript
import { Colors } from '@/lib/ui';

Colors.primary    // Cyan
Colors.secondary  // Blue
Colors.success    // Green
Colors.error      // Red
Colors.warning    // Yellow
Colors.info       // Blue
Colors.muted      // Gray
Colors.dim        // Dimmed
Colors.bold       // Bold
Colors.underline  // Underlined
```

### Icons

```typescript
import { Icons } from '@/lib/ui';

Icons.success       // ✓
Icons.error         // ✗
Icons.warning       // ⚠
Icons.info          // ℹ
Icons.bullet        // •
Icons.arrow         // →
Icons.check         // ✓
Icons.cross         // ✗
Icons.star          // ★
Icons.circle        // ●
Icons.square        // ■
Icons.triangle      // ▲
Icons.chevronRight  // ›
Icons.chevronLeft   // ‹
Icons.ellipsis      // …
```

---

## Loading States

For async operations, use the `LoadingSpinner` component.

```typescript
import { LoadingSpinner } from '@/lib/ui';

const spinner = new LoadingSpinner();

// Start spinner
spinner.start({ 
  text: 'Loading data...',
  spinner: 'dots',  // or 'line', 'arrow', etc.
  color: 'cyan'
});

// Update text
spinner.update('Still loading...');

// Stop with success
spinner.succeed('Data loaded!');

// Stop with error
spinner.fail('Failed to load data');

// Stop with warning
spinner.warn('Partial data loaded');

// Stop with info
spinner.info('Loading complete');

// Just stop
spinner.stop();
```

**Note:** Spinner automatically shows duration on succeed().

---

## Usage Examples

### PRD Generation Flow

```typescript
import { Text, Separator, Box, LoadingSpinner } from '@/lib/ui';

// Header
console.log(Text.heading('PRD Generation'));

// Section
console.log(Text.section('Project Information'));

// Question
console.log(Text.question(1, 'What is your project name?'));
console.log(Text.muted('This will be used as the PRD title'));

// User input (assume from prompt)
const name = 'TaskFlow';

// Show answer
console.log(Text.answer(name));

// Separator
console.log(Separator.light());

// Loading state
const spinner = new LoadingSpinner();
spinner.start({ text: 'Generating PRD...' });

// Simulate async work
await generatePRD();

spinner.succeed('PRD generated successfully!');

// Success box
console.log(Box.success(
  'Your PRD has been saved to /docs/prd.md',
  'Success'
));
```

### Error Handling

```typescript
import { Box, Text } from '@/lib/ui';

try {
  await riskyOperation();
} catch (error) {
  console.log(Box.error(
    error.message,
    'Operation Failed'
  ));
  
  console.log(Text.info('Try running with --debug for more details'));
}
```

### Progress Tracking

```typescript
import { Text, ProgressBar } from '@/lib/ui';

const total = 10;
for (let i = 0; i <= total; i++) {
  console.clear();
  console.log(Text.heading('Processing Tasks'));
  console.log(ProgressBar.create(i, total, 50));
  console.log(Text.muted(`Task ${i} of ${total}`));
  
  await processTask(i);
}

console.log(Text.success('All tasks completed!'));
```

### Menu/Selection UI

```typescript
import { Text, List, Separator } from '@/lib/ui';

console.log(Text.section('Select an option'));
console.log(Separator.light());

const options = [
  'Generate new PRD',
  'Update existing PRD',
  'Generate tasks',
  'Exit',
];

console.log(List.numbered(options));

// After user selection
const selected = 1;
console.log(Text.success(`You selected: ${options[selected - 1]}`));
```

---

## Migration Guide

### From Old TerminalFormatter

```typescript
// Old
import { TerminalFormatter } from './terminal-formatter';
console.log(TerminalFormatter.header('Title'));
console.log(TerminalFormatter.success('Done'));

// New
import { Text } from '@/lib/ui';
console.log(Text.heading('Title'));
console.log(Text.success('Done'));
```

### From Inline Formatting

```typescript
// Old
import pc from 'picocolors';
console.log(pc.green('✓ Success'));
console.log(pc.red('✗ Error'));
console.log(`\n${'─'.repeat(60)}\n`);

// New
import { Text, Separator } from '@/lib/ui';
console.log(Text.success('Success'));
console.log(Text.error('Error'));
console.log(Separator.light());
```

---

## Best Practices

### 1. Always Use Design System

❌ **Don't:**
```typescript
console.log('\n==================\n');
console.log('Title');
console.log('\n==================\n');
```

✅ **Do:**
```typescript
import { Text } from '@/lib/ui';
console.log(Text.heading('Title'));
```

### 2. Consistent Spacing

❌ **Don't:**
```typescript
console.log('Section 1');
console.log('');
console.log('Section 2');
console.log('\n\n');
console.log('Section 3');
```

✅ **Do:**
```typescript
import { Text, spacing } from '@/lib/ui';
console.log(Text.section('Section 1'));
console.log(spacing());
console.log(Text.section('Section 2'));
console.log(spacing());
console.log(Text.section('Section 3'));
```

### 3. Loading States

❌ **Don't:**
```typescript
console.log('Loading...');
await longOperation();
console.log('Done!');
```

✅ **Do:**
```typescript
import { LoadingSpinner } from '@/lib/ui';
const spinner = new LoadingSpinner();
spinner.start({ text: 'Loading...' });
await longOperation();
spinner.succeed('Done!');
```

### 4. Error Messages

❌ **Don't:**
```typescript
console.error('ERROR: Something went wrong');
```

✅ **Do:**
```typescript
import { Box } from '@/lib/ui';
console.log(Box.error(
  'Something went wrong. Please check your configuration.',
  'Error'
));
```

### 5. Safe String Interpolation

❌ **Don't:**
```typescript
console.log(`Name: ${user.name}`); // Could show "undefined"
```

✅ **Do:**
```typescript
import { safeString } from '@/lib/ui';
console.log(`Name: ${safeString(user.name, 'Not set')}`);
```

---

## Testing

### Unit Tests

```typescript
import { Text, Box, Separator } from '@/lib/ui';

describe('Design System', () => {
  test('Text.success includes icon', () => {
    const result = Text.success('Done');
    expect(result).toContain('✓');
    expect(result).toContain('Done');
  });
  
  test('Box.error creates bordered box', () => {
    const result = Box.error('Failed');
    expect(result).toContain('┌');
    expect(result).toContain('└');
    expect(result).toContain('Failed');
  });
  
  test('Separator.light creates line', () => {
    const result = Separator.light(10);
    expect(result).toHaveLength(10);
  });
});
```

---

## Contributing

When adding new components:

1. **Follow existing patterns** - Maintain consistency with current components
2. **Add documentation** - Update this guide with usage examples
3. **Include tests** - Write unit tests for new components
4. **Use TypeScript** - Provide proper type definitions
5. **Consider accessibility** - Ensure output works with screen readers

---

## Future Enhancements

Planned improvements for future versions:

1. **Color themes** - Light/dark mode support
2. **Custom color palettes** - User-configurable colors
3. **Animation helpers** - Smooth transitions and effects
4. **Layout components** - Grid, column layouts
5. **Interactive menus** - Enhanced selection UI with navigation
6. **Chart components** - Bar charts, line graphs

---

**Documentation Version:** 1.0.0  
**Last Updated:** January 3, 2026  
**Maintainer:** TaskFlow Team
