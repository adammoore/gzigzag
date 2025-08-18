import { Router } from 'express';
const router = Router();

router.get('/:id', async (req, res) => {
  res.json({ cell: { id: req.params.id, content: 'Test cell' } });
});

router.post('/', async (req, res) => {
  res.json({ message: 'Cell created', cell: { id: '1', content: req.body.content } });
});

export default router;
