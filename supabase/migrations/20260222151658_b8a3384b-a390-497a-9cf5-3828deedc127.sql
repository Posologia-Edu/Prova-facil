-- Create trigger to assign student role to new users (if no role exists yet)
CREATE TRIGGER on_auth_user_created_assign_student
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_student_role();

-- Also create trigger for handle_new_user to create profile
CREATE TRIGGER on_auth_user_created_profile
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();