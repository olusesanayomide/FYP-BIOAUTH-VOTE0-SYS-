import { Router, Response, NextFunction } from 'express';
import { AuthenticatedRequest, authMiddleware } from '../middleware/auth';
import {
  clearReadNotifications,
  getNotificationsForRecipient,
  markAllNotificationsRead,
  markNotificationRead
} from '../services/notificationService';

const router = Router();

router.use(authMiddleware);

router.get('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }
    const limit = parseInt(String(req.query.limit || '20'), 10);
    const role = req.user.role === 'admin' ? 'admin' : 'voter';
    const data = await getNotificationsForRecipient(role, req.user.id, limit);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/read', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }
    const role = req.user.role === 'admin' ? 'admin' : 'voter';
    await markNotificationRead(req.params.id, role, req.user.id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.post('/mark-all-read', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }
    const role = req.user.role === 'admin' ? 'admin' : 'voter';
    await markAllNotificationsRead(role, req.user.id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.post('/clear-read', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }
    const role = req.user.role === 'admin' ? 'admin' : 'voter';
    await clearReadNotifications(role, req.user.id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
