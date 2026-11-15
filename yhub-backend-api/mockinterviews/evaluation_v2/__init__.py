"""Post-interview evaluation engine (version 2).

Runs only AFTER an interview has finished, in shadow mode beside the existing learner report.
Nothing in this package is called by the live scorer or by Alex, and it never changes what they
receive. The only code that runs during an interview is `recording.py`, which writes extra evidence
into the interview state (under its own key) at points where that state is already being saved.
"""

ENGINE_VERSION = "2.0"
