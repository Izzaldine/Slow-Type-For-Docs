SLOW TYPE FOR DOCS — version 0.4.0
Free, open-source Chrome extension. No subscription or API key.

UPDATE FROM AN EARLIER VERSION
1. Stop any typing session. Copy unsaved text somewhere safe before reloading.
2. Extract the new Slow-Type-for-Docs.zip.
3. Copy the contents of its slow-type folder into the EXISTING slow-type folder
   you previously loaded in Chrome. Replace files when asked.
4. Open chrome://extensions and click Reload on Slow Type for Docs.
5. Refresh your Google Docs tab to remove any old floating controls.
Keep the same installed folder path. Removing/reinstalling the extension or
loading a different folder can lose saved drafts and settings.

FIRST INSTALL
1. Extract the ZIP and keep its slow-type folder on your computer.
2. In Chrome, open chrome://extensions and turn on Developer mode.
3. Click Load unpacked and select slow-type (the folder with manifest.json).
4. Pin Slow Type in Chrome's puzzle-piece Extensions menu.

START TYPING
1. Open a Google Docs document you can edit. Test with a short sample first.
2. Open the extension, paste plain text, and choose your speed and pauses.
3. Click Start typing. Click inside your document within the 5-second countdown.
4. Leave Docs selected in its own Chrome window. You can use another window.

NEW IN 0.4: WORD PACING AND PANEL CLOSE FIX
- The X button now removes the floating panel from the page. It does not stop
  typing. Background progress updates will not bring the closed panel back.
- Show floating controls can reopen it even after typing finishes. The panel
  target is remembered for this browser session, including worker restarts.
- Word pacing is ON by default. Letters use 1.6 times the selected base speed;
  after the last space before the next word, an extra 0.4-second pause is added.
  Adjust Between-word pause from 0 to 3 seconds in either control panel.
- Turn Word pacing off to restore the earlier even-gap timing. Both controls
  can change during typing; word pauses already underway respond to changes.
- If Speed variation is enabled, most letter-speed variation is held across
  each word, with a smaller change between letters. Word gaps vary too.
- Repeated spaces get one word pause at the end. Leading spaces do not add a
  word pause. Line breaks use the Paragraph pause setting instead.
- Base WPM is a timing setting, not a guarantee of the final average rate.
  ETA includes word pauses and the faster character rate.

TYPING VARIATION
Speed variation and temporary typos are off by default. Open "Typing variation" in the popup or
floating panel to enable them. They can be adjusted during a session.
- Speed variation: 0–80%. In even-gap mode, each character gap varies independently. For example,
  40% variation makes a 200 ms base delay range from 120 to 280 ms. In word
  pacing mode, most letter variation is shared within a word and word pauses
  vary around their selected delay. Paragraph pauses keep their set duration.
- Temporary typo frequency: 0–5% chance per eligible letter. Only A–Z letters
  with an A–Z letter on both sides qualify. It types a nearby-key letter,
  waits about 200–400 ms, backspaces once, then types the correct letter.
  Word starts/ends, numbers, punctuation, non-ASCII letters and emoji are
  excluded. Progress counts corrected source characters, not extra keystrokes.
  A count of completed corrections appears in the popup and floating panel.
- Turning typo frequency off stops future typos. A correction already in
  progress is finished when possible, including after you press Pause/Stop.
- If the editor loses its typing target or a pointer/navigation action moves
  the document cursor during a correction, the session stops with a message
  to check the last letter. It does not attempt a delayed deletion after you
  resume at a different position. An interrupted correction can leave a wrong
  or missing letter; inspect it before starting a new session.
- Do not edit or move the caret in the target document during typing. The
  interaction guard catches pointer/navigation actions but cannot detect every
  possible edit, including all edits by collaborators or editor extensions.
- Automatic substitutions in Docs can change the result. Check the finished
  document. Keep typo frequency at 0 for code, formulas, or exact transcription.
- ETA includes expected correction delays, so it is approximate with randomness.

CONTROLS AND FEATURES
- Live speed: 10–200 approximate WPM, using five characters per word.
  Adjust the popup slider or the floating panel's minus/plus buttons.
- Paragraph pauses: 0–30 seconds, adjustable live. A delay is applied after a
  line break before more text; consecutive newlines have one pause at the end.
  Changing the value also changes a paragraph pause currently in progress.
- Progress: percentage, characters sent/total, estimated time left, and section
  number. Estimates include automatic pauses/countdowns but exclude manual
  waiting and do not account exactly for browser/Docs processing time.
- Sections: enable "Type one section at a time". A blank line separates sections
  (a line containing only spaces also counts). All supplied text and separators
  are retained. At a boundary it waits for Continue. If there are no blank
  lines, the entire text is one section. Continue includes a 5-second countdown.
  Disabling section mode applies to future boundaries; if already waiting,
  press Continue once to resume. Section waiting replaces the paragraph pause.
- Named drafts: enter a name and click Save. Select a saved draft and click
  Load to use it. Save updates the selected draft, including its name. Choose
  "New / unsaved draft" first to save another. Up to 30 drafts, each up to
  100,000 characters. Delete removes the saved copy, not text in the input box.
- Floating controls: added when you start in Docs. Drag the header to move it,
  collapse it with minus, or hide it with X. Hiding does NOT stop typing. Use
  "Show floating controls" in the popup to bring it back.
- Other windows: typing continues while you work in another window or switch
  its tabs. Switching away from Docs within the Docs window still pauses.
  Moving the Docs tab to another window pauses at the next character check;
  stop and start a new session after moving it.

CONTROLS
Pause/resume/continue: Ctrl+Shift+Space (Mac: Command+Shift+Space).
Stop: Ctrl+Shift+. (Mac: Command+Shift+.).
These shortcuts work while Chrome has keyboard focus. In another application,
return to Chrome to use them, or use the floating controls.
Opening the popup NO LONGER pauses typing. Use its Pause or Stop button.
Every Start/Resume/Continue gives you five seconds to place your cursor.
Selecting a title/search field/comment instead of the editor pauses input.
Reloading, navigating, or closing the document stops the session.
Stop keeps text already inserted. Starting again begins the supplied text at
its beginning; Resume continues a paused session.
Set shortcuts at chrome://extensions/shortcuts if Chrome did not assign them.

LIMITS
Plain text only: fonts, bold, images, and tables are not transferred.
Unicode graphemes are preserved. Tabs become four spaces.
Google Docs autocorrect, automatic lists, and formatting can change output.
The first character replaces selected text, just like ordinary typing.
Do not move the document caret or edit the document during a run.
Pause/Stop may allow an already-dispatched character to finish.
Progress counts sent commands; it cannot verify what Docs actually saved.
Chrome 118+ on desktop. Not a mobile extension.
Browser restart, extension reload, or debugger disconnect resets progress.
No automatic restart or checkpoint replay.

PRIVACY & PERMISSIONS
No account, payment, analytics, external scripts, or external servers.
Named drafts and preferences use Chrome's local extension storage. They
persist across browser restarts until deleted or the extension is uninstalled.
They are not cloud-synced. Unsaved input uses session storage and is cleared
when Chrome closes or the extension reloads. Clear text does not delete named
saved drafts. Text typed into Docs is handled by Google Docs as usual.
The debugger permission allows browser-level text input and an editor focus
check. Chrome shows a debugging banner while connected. The extension only
attaches to a Google Docs editing URL selected when you start. It keeps that
page logically focused while another window is in use, and removes the focus
override on completion or Stop. It never activates another OS window.
It stays attached while paused or waiting for Continue. Stop disconnects it.
The scripting + activeTab permissions add the floating control panel only to
the document you start. The panel receives progress/settings, not draft text.
No document text, network traffic, cookies, browsing history, or clipboard
contents are read automatically.

TROUBLESHOOTING
If it pauses: keep the Docs tab selected in its window, click the actual page
body, and resume. Close DevTools if another debugger is reported.
Canceling Chrome's debugging banner ends the session.
If progress advances but text does not appear, stop and report the symptom
and Chrome version. Managed school/work Chrome may block unpacked extensions.

VALIDATION
The user confirmed v0.1 worked in Google Docs. Version 0.4 passed local automated engine, integration and panel-control
regression tests. The prior code fails the Close regression test; the updated
code passes. Word tests cover faster letters, whitespace, pauses, ETA, live
settings, section mode and word-level variation. Panel tests use a lightweight
DOM test double, not browser layout. A browser binary download was unavailable,
so this update has not been verified in a live Google Docs browser here.
Tests cover Unicode, live timing, paragraph delays, section boundaries, ETA,
pause/resume, cancellation, input limits, background-window behavior, target
routing, focus-override cleanup, panel message isolation, and named drafts.
Run with Node.js 20+: node test-engine.mjs; node test-background.mjs;
node test-drafts.mjs; node test-variation.mjs; node test-word-pacing.mjs;
node test-panel.mjs (from the folder above slow-type).
The variation tests include deterministic delay limits, repair/cancellation,
cursor changes, old preferences, and eight seeded mixed-text runs.

DEVELOPER REFERENCES
https://developer.chrome.com/docs/extensions/reference/api/debugger
https://developer.chrome.com/docs/extensions/reference/api/scripting
https://developer.chrome.com/docs/extensions/reference/api/storage
https://chromedevtools.github.io/devtools-protocol/tot/Emulation/

LICENSE
MIT License
Copyright (c) 2026 Izzaldine
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
of the Software, and to permit persons to whom the Software is furnished to do
so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
