import { Router } from 'express';
const router = Router();

router.get('/', async (req, res) => {
  res.json({ spaces: [], total: 0 });
});

router.post('/', async (req, res) => {
  res.json({ message: 'Space created', space: { id: '1', name: req.body.name } });
});

router.get('/:id', async (req, res) => {
  res.json({ space: { id: req.params.id, name: 'Test Space' } });
});

export default router;
