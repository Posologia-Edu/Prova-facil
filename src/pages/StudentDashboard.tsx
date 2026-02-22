import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

// StudentDashboard is no longer needed - students access exams directly via email + PIN
export default function StudentDashboard() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/student/auth", { replace: true });
  }, [navigate]);

  return null;
}
