import { Request, Response, Router } from 'express';
import { ebpfInterceptor } from '../services/ebpfMock';
import { generateAllowList } from '../services/policyAI';
import { emitAllowList } from '../socket/events';

const router = Router();

// GET /api/policy/current
router.get('/current', (req: Request, res: Response) => {
  const agentId = req.query.agentId as string | undefined;
  const allowList = ebpfInterceptor.getAllowList(agentId);
  return res.status(200).json({
    success: true,
    allowList: allowList || null
  });
});

// POST /api/policy/generate
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { prompt, agentId } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const assignedAgentId = agentId || 'agent-alpha';
    const allowList = await generateAllowList(prompt, assignedAgentId);
    ebpfInterceptor.loadAllowList(allowList);
    emitAllowList(allowList);

    return res.status(200).json({
      success: true,
      allowList
    });
  } catch (err: any) {
    console.error('[API] Error in policy generation:', err);
    return res.status(500).json({ error: err.message || 'Error generating policy' });
  }
});

export default router;
