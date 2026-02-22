import { describe, it, expect, beforeEach } from 'vitest';
import { useNotificationStore, notify } from '../notification-store';

describe('useNotificationStore', () => {
  beforeEach(() => {
    // Reset store state between tests
    useNotificationStore.setState({ notifications: [] });
  });

  describe('initial state', () => {
    it('should start with empty notifications array', () => {
      const { notifications } = useNotificationStore.getState();
      expect(notifications).toEqual([]);
    });
  });

  describe('addNotification', () => {
    it('should add a notification with generated id', () => {
      const { addNotification } = useNotificationStore.getState();

      addNotification({
        message: 'Driver connected',
        severity: 'success',
      });

      const { notifications } = useNotificationStore.getState();
      expect(notifications).toHaveLength(1);
      expect(notifications[0].message).toBe('Driver connected');
      expect(notifications[0].severity).toBe('success');
      expect(notifications[0].id).toBeDefined();
      expect(typeof notifications[0].id).toBe('string');
    });

    it('should generate unique ids for each notification', () => {
      const { addNotification } = useNotificationStore.getState();

      addNotification({ message: 'First', severity: 'info' });
      addNotification({ message: 'Second', severity: 'info' });

      const { notifications } = useNotificationStore.getState();
      expect(notifications[0].id).not.toBe(notifications[1].id);
    });

    it('should support all severity levels', () => {
      const { addNotification } = useNotificationStore.getState();

      addNotification({ message: 'Success', severity: 'success' });
      addNotification({ message: 'Info', severity: 'info' });
      addNotification({ message: 'Warning', severity: 'warning' });
      addNotification({ message: 'Error', severity: 'error' });

      const { notifications } = useNotificationStore.getState();
      expect(notifications).toHaveLength(4);
      expect(notifications.map((n) => n.severity)).toEqual(['success', 'info', 'warning', 'error']);
    });

    it('should append notifications in order', () => {
      const { addNotification } = useNotificationStore.getState();

      addNotification({ message: 'First', severity: 'info' });
      addNotification({ message: 'Second', severity: 'info' });
      addNotification({ message: 'Third', severity: 'info' });

      const { notifications } = useNotificationStore.getState();
      expect(notifications.map((n) => n.message)).toEqual(['First', 'Second', 'Third']);
    });
  });

  describe('removeNotification', () => {
    it('should remove notification by id', () => {
      const { addNotification } = useNotificationStore.getState();
      addNotification({ message: 'Test', severity: 'info' });

      const { notifications, removeNotification } = useNotificationStore.getState();
      const { id } = notifications[0];

      removeNotification(id);

      expect(useNotificationStore.getState().notifications).toHaveLength(0);
    });

    it('should only remove the specified notification', () => {
      const { addNotification } = useNotificationStore.getState();
      addNotification({ message: 'Keep me', severity: 'info' });
      addNotification({ message: 'Remove me', severity: 'info' });
      addNotification({ message: 'Keep me too', severity: 'info' });

      const { notifications, removeNotification } = useNotificationStore.getState();
      const idToRemove = notifications[1].id;

      removeNotification(idToRemove);

      const remaining = useNotificationStore.getState().notifications;
      expect(remaining).toHaveLength(2);
      expect(remaining.map((n) => n.message)).toEqual(['Keep me', 'Keep me too']);
    });

    it('should do nothing if id not found', () => {
      const { addNotification } = useNotificationStore.getState();
      addNotification({ message: 'Test', severity: 'info' });

      const { removeNotification } = useNotificationStore.getState();
      removeNotification('non-existent-id');

      expect(useNotificationStore.getState().notifications).toHaveLength(1);
    });
  });

  describe('notify', () => {
    it('should add a notification to the store', () => {
      notify('Test message', 'success');

      const { notifications } = useNotificationStore.getState();
      expect(notifications).toHaveLength(1);
      expect(notifications[0].message).toBe('Test message');
      expect(notifications[0].severity).toBe('success');
    });

    it('should work with all severity levels', () => {
      notify('Success', 'success');
      notify('Info', 'info');
      notify('Warning', 'warning');
      notify('Error', 'error');

      const { notifications } = useNotificationStore.getState();
      expect(notifications).toHaveLength(4);
      expect(notifications.map((n) => n.severity)).toEqual(['success', 'info', 'warning', 'error']);
    });
  });
});
