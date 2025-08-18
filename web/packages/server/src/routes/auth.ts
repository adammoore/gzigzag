import { Router } from 'express';
const router = Router();

router.post('/register', async (req, res) => {
  res.json({ message: 'Registration endpoint', user: { email: req.body.email } });
});

router.post('/login', async (req, res) => {
  res.json({ message: 'Login endpoint', token: 'mock-token' });
});

router.get('/me', async (req, res) => {
  res.json({ message: 'User info endpoint' });
});

export default router;
