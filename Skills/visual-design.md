# Visual Design Specification

This document is the authoritative visual specification for the immersive VR presentation. It describes how the world should look and behave visually, not how those visuals must be implemented. The renderer may choose any technically appropriate 3D technique as long as the observable result matches this specification.

## General rule

The immersive version is a genuine 3D world. Visual implementation choices are up to the renderer. The authoritative simulation remains separate from presentation.

The latest explicit visual description in this skill overrides older visual placeholder descriptions.

## Player

The Player head is a 3D diamond-like shape and the current head appearance is considered correct.

The Player's two arm/hand visuals are derived from the same diamond-like family of shapes, but they are not simple diamonds. Each arm/hand form is stretched vertically to roughly three times the original diamond height and compressed along its local X axis. The shape is then divided through the middle so the lower half becomes the visible hand/control piece. The hand portion begins narrow near the wrist and widens toward the front/palm end.

The two hand forms should read as elongated, angular control structures rather than ordinary spherical or controller-shaped hands. They should be suitable for later visual effects such as thrust/rocket effects emerging from them.

Looking at the palm side of the left hand continues to be the condition used for the left-hand menu behavior. No wrist-to-hand XP meter line is required; that previously suggested visual is explicitly discarded.

## Metaballs

Metaballs are extremely large relative to the Player. Their target physical scale is approximately a small one-story building in diameter, large enough that the Player can be inside one and perceive it as an environment or room.

The external Metaball silhouette is not a perfect sphere. It should be a soft organic blob, similar to a squished blob of slime. Its form should have gentle bulges and flattening rather than a mathematically perfect ball.

From outside, a Metaball should read as one large yellow blob. It should not look like a separate glowing shell or force-field bubble.

From inside a Metaball, its surface should become a translucent yellow enclosure. The Player must still be able to see the outside world through it, approximately at 50% transparency, while retaining a clearly yellow surface presence.

The center contains the existing bright white glowing element. When the Metaball has generated stored XP, a small black orb remains visible in the middle of that glowing center.

## Spikes

Spikes are floating 3D polygonal objects, not flat shapes lying on the floor.

A Spike should read as a solid three-dimensional polygonal/polyhedral object, with visible depth from every viewing angle. Its exact polygon/polyhedron construction is an implementation choice, but it must clearly be a floating 3D object rather than a flat extruded decal.

The approximate physical radius is 1 foot, using the ordinary geometric definition of radius as the distance from its center to its outer edge.

The existing XP-linked geometry rule remains authoritative for its changing number of polygonal vertices.

## Glitches

The Glitch has an invisible spherical collision volume. The collision volume itself should not be visible.

The visible Glitch presentation is made from many small 2D rectangular fragments or panels. These fragments are red and blue, around 50% transparent, and continuously change by appearing, disappearing, teleporting to new positions around the invisible spherical volume, and resizing.

The fragments face the Player/viewer so that they behave visually like 2D panels rather than solid 3D faces. Their distribution should feel chaotic and organic, like a drifting cloud or smoke-like blob of broken visual pieces, without forming a clean sphere outline.

The fragments must collectively communicate the approximate location and extent of the invisible Glitch hitbox without drawing an obvious circular boundary.

The visible glitch fragments do not define or replace the authoritative collision volume.

## Player Trap / Reality Crack

When a Spike captures the Player, the world becomes dark/black and a red three-dimensional crack in reality appears floating in front of the Player.

The crack is an irregular, branching, angular 3D fissure rather than a radial spiderweb or solar-system-like object.

Each crack path ends in a tiny red ball. These endpoint balls are the things the Player manipulates during repair.

The Player moves/grabs an endpoint ball and brings it toward the central repair point. The endpoint and its crack branch visually follow the authoritative crack state.

As endpoints are repaired, the corresponding crack branches should visibly collapse into the center rather than remaining as permanent spokes.

After the final endpoint is repaired, the remaining crack should briefly perform an inward restructuring/healing animation and then disappear.

The trap's repair state is authoritative simulation state. Its visual appearance and healing animation are presentation only.

## Floor

The physical floor must be invisible. Do not render a solid floor surface for the Player.

The visible floor reference is a field of gray dots arranged in a regular grid at the floor height. The dots are approximately the same gray family as the surrounding sky.

The dot field should make the floor's location legible without showing a solid plane.

## Sky / environment

The Player should feel enclosed in a giant spherical environment.

At the top of the view, the sky is very light gray, close to white but not pure white.

Moving toward the horizon, the color fades continuously into dark gray.

Below the horizon, the environment keeps becoming darker as the Player looks farther downward, eventually approaching black near the lower region. The transition should occupy a broad curved region rather than converging into a single perfect point.

The previous idea of a distinct circular black void disk at the exact bottom is discarded. The darkness should instead be a smooth continuation of the lower sky/environment gradient.

The sky should therefore read as a large continuous shell or atmospheric sphere with vertical gradient coloring.

## Scale relationships

The intended relative scale is:
- Player head: baseline human-sized body element.
- Spike radius: approximately 1 foot.
- Glitch: larger than a Spike but much smaller than a Metaball.
- Metaball: extremely large, approximately small-one-story-building scale, and large enough to contain the Player.

## Deferred behavior

When the Player enters a Metaball, a future gameplay rule may make the Player inherit the Metaball's motion/inertia and travel with it until the Player leaves the Metaball's radius. This is a planned mechanic, not yet implemented by this visual pass. Do not silently implement it unless the project explicitly moves this rule from planned to active gameplay.

## Rejected visual ideas

Do not reintroduce:
- The old solar-system/radial Player Trap appearance.
- A solid visible floor plane.
- A force-field shell as the primary external Metaball appearance.
- A visible spherical Glitch hitbox.
- A wrist-to-hand visual line intended to represent Player XP.
