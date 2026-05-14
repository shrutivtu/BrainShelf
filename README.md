# BrainShelf

**A calm notebook for your thoughts.**

BrainShelf is a personal productivity app built for people whose brains don't come with a built-in filing system — especially those with ADHD.

If your mind constantly juggles thoughts, tasks, ideas, and reminders all at once, BrainShelf gives you a quiet place to offload everything without the pressure of a rigid task manager. No due dates screaming at you. No complex project hierarchies. Just shelves, a brain dump, and one thing to focus on right now.

## Why it helps with ADHD

- **Brain dump first, organize later.** Drop whatever's on your mind into the inbox. Don't worry about where it goes — just get it out of your head.
- **"One Thing" focus.** Pick a single note to surface as your current focus. When everything feels urgent, one thing cuts through the noise.
- **Today pins.** Choose up to three things for today — not twenty. Enough to feel productive, not enough to feel overwhelmed.
- **Soft categories, not rigid systems.** Shelves like Inbox, Work, Personal, Health, and People are gentle suggestions, not rules. Move things around when it feels right.
- **Health nudges.** Quick-tap buttons for water, breathing, stretching, and walking — the basics that ADHD brains forget when they're in hyperfocus.
- **Archive instead of delete.** Nothing disappears permanently unless you choose it. Less anxiety about losing something important.
- **Dark mode.** A charcoal interface that's easier on the eyes during late-night brain dumps.
- **Works on your phone.** Install it as a mobile app and capture thoughts on the go — on the train, in a waiting room, wherever your brain decides to be productive.

## Features

- Notes with labels, colors, subtasks, and comments
- Sections: Inbox, Work, Personal, Health, People, Random, Brainshelf, Archive, Done
- "One Thing" focus card
- Today pins (max 3)
- Health action shortcuts
- Full-text search across all shelves
- Drag-and-drop reorder
- Dark mode (charcoal + warm white)
- Archive with restore and permanent delete
- Cloud sync via Supabase with email/password auth
- Works offline as a PWA — installable on mobile and desktop
- Falls back to localStorage when used without an account

## Tech stack

- **Frontend:** React 18, Vite
- **Backend:** Supabase (Postgres + Auth + Row Level Security)
- **Styling:** Custom CSS design system with warm, paper-inspired tokens
- **Hosting:** Vercel

## Getting started

```bash
git clone https://github.com/YOUR_USERNAME/brainshelf.git
cd brainshelf
npm install
cp .env.example .env
# Fill in your Supabase project URL and anon key in .env
npm run dev
```

To set up the database, run the contents of `supabase-setup.sql` in your Supabase project's SQL Editor.

## License

Personal project. Use it, fork it, make it yours.
