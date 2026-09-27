# Skill Governance

The Skills folder is the project's living specification.

Before making any project change:
1. Read every current skill.
2. Identify which rules the change touches.
3. Check the proposed change against all skills, not only the apparently relevant one.
4. Implement the change.
5. Update every affected skill in the same change.
6. Recheck the complete skill set for contradictions.
7. Verify the implementation against the updated skills.

A new explicit user rule overrides older skill text.

Do not resurrect mechanics that were intentionally removed.

Do not treat old code, old commits, old documentation, or old skill files as authoritative when they conflict with the current skills and explicit project decisions.

If a new mechanic affects multiple systems, document it in each relevant skill rather than hiding the rule in only one file.

Every future code change in this project must be evaluated against the complete Skills folder.
