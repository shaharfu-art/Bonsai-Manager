-- Allow authenticated users to add their own species
-- System species (is_system=true) remain read-only for users

CREATE POLICY "Users can add species"
  ON species FOR INSERT TO authenticated
  WITH CHECK (is_system = false);

-- Users can update non-system species they might have created
CREATE POLICY "Users can update non-system species"
  ON species FOR UPDATE TO authenticated
  USING (is_system = false);
