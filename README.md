# Will I Die Soon? — Health Risk Explorer

This is a private, local-only research prototype for exploring health signals
and modifiable factors. It is not a diagnosis, a clinical prediction, or a
medical device.

## Privacy boundary

The prototype has no account, application backend, database, analytics,
cookies, or answer persistence. Assessment state is designed to remain in the
browser's memory and is cleared when the session ends. Any future lab-file
parsing and report export are local, explicit user actions.

## Current scope

Task 1 establishes the landing shell, three exploration-depth choices, and a
code-native living canopy. The questionnaire, assessment, evidence rules, and
report are added in later implementation tasks.

## Development

Node.js `>=22.13.0` is required.

```bash
npm install
npm test -- landing.test.tsx
npm run build
```

`npm run dev` starts local development when interactive work is needed. The
project uses the Sites vinext hosting structure but does not declare or use
application data bindings.
