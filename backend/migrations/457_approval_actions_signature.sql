-- Migration 457: Add signature_id to approval_actions for digital signature integration
-- Links approval actions (approve, post, reject, void) to the actor's digital signature

-- Add signature_id column (nullable — not all actions require signatures)
ALTER TABLE approval_actions
ADD COLUMN IF NOT EXISTS signature_id INTEGER REFERENCES digital_signatures(id);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_approval_actions_signature
ON approval_actions(signature_id) WHERE signature_id IS NOT NULL;
