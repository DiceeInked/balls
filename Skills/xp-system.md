# XP System

XP is an integer gameplay resource. Fractional XP is not used.

Fresh ordinary entities start with 16 XP unless a more specific transformation rule explicitly determines their XP.

Different entities use XP for different purposes:
- Metaball: stored resource, reproduction, and pickup generation
- Spike: stored resource and polygon vertex count
- Glitch: steering strength
- Player: survival resource

The player's baseline lifespan is based on the rule:
16 XP = 1600 seconds = 26 minutes 40 seconds before other drains or losses.

XP transfers are explicit transactions. A transfer must subtract from the source and add to the destination without accidentally creating or destroying XP except where a rule explicitly calls for it.

The project should keep XP-related constants centralized so balancing changes do not require hunting through unrelated rendering code.
