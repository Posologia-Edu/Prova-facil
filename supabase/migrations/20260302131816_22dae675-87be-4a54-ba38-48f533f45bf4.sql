-- Remove the trigger that auto-assigns "student" role to ALL new users
-- Teachers should get their role via assign_role_on_signup RPC called from Auth.tsx
DROP TRIGGER IF EXISTS on_auth_user_created_assign_role ON auth.users;
