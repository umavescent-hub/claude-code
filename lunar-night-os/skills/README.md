# Lunar Night OS skills

Skills teach Claude a method once, so every chat can use it on your phone or your computer. A skill is a folder holding a `SKILL.md`, which Claude reads when your request matches its description, plus any reference files.

| Skill | What it does |
|---|---|
| `multilayer-music-edit/` | Plans and runs music-cut, multi-layer edits that mix VHS / Hi8, 4K Lunar Night and Dreamcore in CapCut Mobile or Desktop. It gives you a beat-marker list, a cut sheet, and tap-by-tap steps for Mobile and Desktop. |

## Install in claude.ai (web, then it works in the apps too)

1. **Zip the folder, not its contents.** The zip must hold `multilayer-music-edit/SKILL.md`.
   - On a Mac: right-click the `multilayer-music-edit` folder › Compress.
   - On Windows: right-click the folder › Send to › Compressed (zipped) folder.
   - From a terminal, in this `skills` folder:

     ```
     zip -r multilayer-music-edit.zip multilayer-music-edit
     ```

2. In claude.ai, open `Settings › Capabilities › Skills › Upload`.
3. Pick `multilayer-music-edit.zip`.
   You should see: **multilayer-music-edit** in the skills list, switched on.
4. Start a new chat and type: `plan a 30 s edit to a 92 bpm song, VHS into 4K on the drop`.
   You should see: Claude asks at most three questions (the song, your clips with style tags, the format and length) and then gives a beat-marker list.

> [!VERIFY] The upload path
> `Settings › Capabilities › Skills › Upload` is where the upload lived when this was written, but claude.ai moves its settings. Check these:
>
> - **Where the button is.** If it isn't there, look for Skills under Settings and for an Upload or + button.
> - **Code execution.** Skills may need "Code execution and file creation" switched on in the same Capabilities page.
> - **Phone.** Whether the phone app has its own upload button. If it doesn't, upload once from a browser; the skill then follows your account into the phone app.

## Install in Claude Code (desktop or terminal)

Copy the folder to `~/.claude/skills/multilayer-music-edit/`, or to `.claude/skills/` inside a project. Claude Code picks it up the next time it starts.

## No skills where you are?

Paste the whole of `SKILL.md` into the chat, or into a Project's instructions, then attach `reference.md`. Claude follows it the same way.

## Updating

Edit the files, zip the folder again and upload it again. In claude.ai, remove the old copy first if the upload complains about the name.

The beat tables are generated and checked by a script, not typed. If you change a BPM table or a template, recompute the numbers. Don't edit them by hand.
