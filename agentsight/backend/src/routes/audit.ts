import { Request, Response, Router } from 'express';
import { auditLog } from '../services/auditLog';

const router = Router();

// GET /api/audit/logs
router.get('/logs', (_req: Request, res: Response) => {
  const logs = auditLog.getAll();
  return res.status(200).json({
    success: true,
    total: logs.length,
    logs
  });
});

// DELETE /api/audit/logs
router.delete('/logs', (_req: Request, res: Response) => {
  auditLog.clear();
  return res.status(200).json({
    success: true,
    message: 'Audit logs successfully cleared'
  });
});

export default router;
