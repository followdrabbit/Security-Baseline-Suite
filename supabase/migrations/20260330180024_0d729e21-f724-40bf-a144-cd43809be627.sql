CREATE POLICY "Users can update their own template versions"
ON public.rule_template_versions
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());