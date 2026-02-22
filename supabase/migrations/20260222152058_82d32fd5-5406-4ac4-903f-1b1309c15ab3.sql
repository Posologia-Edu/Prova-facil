-- Drop the auto-student trigger since role should be determined by signup portal
DROP TRIGGER IF EXISTS on_auth_user_created_assign_student ON auth.users;

-- Update handle_student_role to not be needed
-- Instead, we'll handle role assignment in the application code