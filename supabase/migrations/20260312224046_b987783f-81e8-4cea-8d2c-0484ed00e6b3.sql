
-- Allow authenticated users to insert their own roles
CREATE POLICY "Users can insert own roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to delete their own roles (to remove collector role if needed)
CREATE POLICY "Users can delete own roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
