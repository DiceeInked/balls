# Spike Ball Physics Notes

## Shape progression
- Spike balls start as regular 16-gons.
- A collision with a wall or another spike ball causes the colliding spike ball to split into two smaller spike balls.
- Each split halves the vertex count: 16 -> 8 -> 4 -> 2.
- A 2-vertex spike ball is rendered as a rotating line.
- When a 2-vertex spike ball collides again, it disappears and emits a small particle burst.

## Collision rules
- Spike balls collide with world walls.
- Spike balls collide with other spike balls.
- Spike balls never physically collide with metaballs.
- Metaballs keep their original wall-only collision behavior.
- Spike collisions use the spike's circumscribed radius for fast, stable collision checks. Rotation changes the rendered shape but not the collision radius.
- A short collision cooldown prevents a newly spawned child from immediately splitting again on the same boundary or overlap.

## Motion
- Spike balls have linear velocity and angular velocity.
- Wall impacts reflect the appropriate velocity component and reverse some angular momentum.
- Spike-to-spike impacts resolve the separating velocity along the collision normal and add a small rotational impulse.
- Split children inherit the parent's post-bounce direction with a small angular spread so the pair separates naturally.
- Dragging a spike ball also gives it a small spin based on pointer movement.

## Rendering architecture
- Metaballs remain in the existing WebGL fragment shader.
- Spike balls and their particles are drawn on a transparent 2D canvas layered above the WebGL canvas.
- This avoids a large WebGL uniform array and keeps the mobile/iPad renderer lightweight.
- The spike overlay uses the same camera position and zoom as the metaball world.

## Limits and safety
- The simulation caps the spike-ball count at 64.
- If the cap would be exceeded, a colliding spike stays intact after bouncing instead of spawning more children.
