# Randomness

Randomness is used for gameplay variety, not as a replacement for authoritative state.

When a new Glitch is created from Spike consumption:
- Its direction is random.
- Its other initial state follows the applicable entity defaults.

When a new Metaball reproduces:
- Its position is the parent's position.
- Its XP is exactly 16.
- Its direction is exactly opposite the parent.

Randomness should be generated through centralized helper functions where practical so ranges and behavior can be tuned consistently.

Random choices must never make an entity invalid, place it outside required world boundaries, or bypass explicit transformation rules.
