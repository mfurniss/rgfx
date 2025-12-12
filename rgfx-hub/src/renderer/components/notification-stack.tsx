import React from 'react';
import { Snackbar, Alert, Box } from '@mui/material';
import { useNotificationStore, type Notification } from '../store/notification-store';
import { TOAST_AUTO_HIDE_DURATION_MS } from '@/config/constants';

interface NotificationToastProps {
  notification: Notification;
  index: number;
  onClose: (id: string) => void;
}

const NotificationToast: React.FC<NotificationToastProps> = ({ notification, index, onClose }) => {
  const handleClose = (_event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    onClose(notification.id);
  };

  return (
    <Snackbar
      open={true}
      autoHideDuration={TOAST_AUTO_HIDE_DURATION_MS}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      sx={{ bottom: `${24 + index * 60}px !important` }}
    >
      <Alert onClose={handleClose} severity={notification.severity} variant="filled">
        {notification.message}
      </Alert>
    </Snackbar>
  );
};

export const NotificationStack: React.FC = () => {
  const notifications = useNotificationStore((state) => state.notifications);
  const removeNotification = useNotificationStore((state) => state.removeNotification);

  return (
    <Box>
      {notifications.map((notification, index) => (
        <NotificationToast
          key={notification.id}
          notification={notification}
          index={index}
          onClose={removeNotification}
        />
      ))}
    </Box>
  );
};
