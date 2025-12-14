import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api/apiFetch";

const MyProfile = () => {
  const navigate = useNavigate();

  useEffect(() => {
    async function go() {
      const res = await apiFetch("/api/me");

      if (!res.ok) {
        navigate("/login"); // oppure dove hai il login
        return;
      }

      const data = await res.json();
      navigate(`/user/${data.user.id}`);
    }

    go();
  }, [navigate]);

  return null;
};

export default MyProfile;
