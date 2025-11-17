import React from "react";
import { Box } from "@mui/material";
import SystemStatus from "../components/system-status";
import { useDriverStore } from "../store/driver-store";

const SystemStatusPage: React.FC = () => {
  const systemStatus = useDriverStore((state) => state.systemStatus);

  return (
    <Box>
      <SystemStatus status={systemStatus} />
    </Box>
  );
};

export default SystemStatusPage;
