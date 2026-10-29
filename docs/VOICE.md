# VOICE.md — sound like a person, look like a crafted product

Every word on screen, in guides, in errors, and in emails follows this. `copy-editor` enforces it; `pnpm check:copy` fails the build on banned phrases.

## Voice
- Talk like a helpful friend who knows payroll: plain, direct, a little warm. Never salesy.
- Lead with the answer. "You take home £1,946 a month." not "Here's your comprehensive breakdown!"
- Short sentences. One idea each. Most under 15 words.
- Use "you". Use contractions (you'll, it's, don't).
- Be specific. Numbers, names of real things, real steps. If a sentence would fit on any website, rewrite it.
- Local spelling and terms: en-GB on UK pages (CV, take-home pay, National Insurance), en-US on US pages (résumé, paycheck), en-IN on India pages (CTC, in-hand, LPA, lakh).
- Honest about limits: "This is an estimate. Your payslip may differ if you have other income."

## Banned (any page, any guide, any error)
Words: delve, elevate, unlock, unleash, empower, seamless(ly), leverage, robust, cutting-edge, game-changer, revolutionize, supercharge, harness, embark, journey (as metaphor), tapestry, realm, landscape (as metaphor), navigate (as metaphor), in today's fast-paced world, look no further, whether you're … or …, it's important to note, rest assured, we've got you covered, take your career to the next level, stand out from the crowd, dream job, crafted with care, effortlessly, all-in-one, next-gen, AI-powered (as a headline).
Patterns:
- "It's not just X, it's Y."
- Three-adjective lists ("fast, simple, and powerful").
- Questions as headlines ("Ready to land your dream job?").
- Dashes of any kind as punctuation: no em dash (—), no en dash (–), no spaced hyphen ( - ). Use a full stop, a comma, or "to" for ranges ("£20,000 to £30,000"). Hyphens inside words are fine (take-home, part-time).
- Slashes in prose: no "and/or", "CV/résumé", "month/week", "24/7". Pick one word, write "or", or use a segmented control. URLs and route paths are fine.
- Emoji in UI copy. Exclamation marks (max one per page, ideally zero).
- Fake urgency, fake numbers, fake testimonials, "Join thousands of…".
- Title Case Headings. Use sentence case.

## UI copy patterns
| Place | Do | Don't |
|---|---|---|
| Button | "Download CV", "Check my pay" | "Get started", "Submit", "Click here" |
| Empty state | "No jobs saved yet. Paste a job link to add one." | "Nothing to see here! 🚀" |
| Error | "Enter a salary between £1 and £10,000,000." | "Oops! Something went wrong." |
| Success | "Saved on this device." | "Awesome! Your changes have been successfully saved!" |
| Loading | (skeleton, no text) or "Working out your tax…" | "Hang tight! Magic is happening ✨" |
| Pro upsell | "Tailor this CV to the job ad. £6 for 30 days, no auto-renew." | "Unlock premium features!" |

## Design: avoid the AI-generated look
- No purple-to-blue gradients, no glassmorphism, no glowing blobs, no floating 3D shapes.
- No generic hero with "headline + subhead + two buttons + mockup" on a tool page. The homepage may introduce the toolkit once, with a real product view, working links and an honest status for each tool. Tool pages still open with the tool: the calculator page starts with the salary input.
- No stock illustrations of smiling people with laptops. Use real UI, real numbers, simple diagrams.
- No sparkle ✨ icons for AI features. Call the feature what it does: "Match to job ad".
- No identical three-card "features" rows. Show the product working.
- Alignment and type do the work: a strict grid, tabular figures, generous whitespace, one accent colour.
- Every screen has one obvious next action.

## Guides (content/)
- Start from a real problem ("Your UK CV shouldn't have a photo. Here's why."), not a definition.
- Use real examples written by a person; mark anything AI-drafted for human rewrite before publish.
- Cite official sources inline. No invented statistics.
- End with one concrete action that links to a tool.
