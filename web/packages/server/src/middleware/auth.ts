import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';
import { sessions } from '../database/redis';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    username: string;
  };
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'No authorization header provided',
      });
      return;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid authorization header format. Use: Bearer <token>',
      });
      return;
    }

    const token = parts[1];

    // Verify JWT token
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Token has expired',
        });
        return;
      }
      
      if (error.name === 'JsonWebTokenError') {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid token',
        });
        return;
      }

      throw error;
    }

    // Check session in Redis (optional extra security)
    const sessionKey = `session:${decoded.id}:${token.substring(0, 10)}`;
    const session = await sessions.get(sessionKey);
    
    // If Redis is available and session doesn't exist, it might be invalidated
    if (session === null && process.env.STRICT_SESSION_VALIDATION === 'true') {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Session has been invalidated',
      });
      return;
    }

    // Attach user to request
    (req as AuthRequest).user = {
      id: decoded.id,
      email: decoded.email,
      username: decoded.username,
    };

    // Extend session TTL if using Redis
    if (session) {
      await sessions.extend(sessionKey, 86400); // Extend for 24 hours
    }

    next();
  } catch (error) {
    logger.error('Auth middleware error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Authentication failed',
    });
  }
}

// Optional middleware for public routes that can work with or without auth
export async function optionalAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      // No auth header, continue without user
      next();
      return;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      // Invalid format, continue without user
      next();
      return;
    }

    const token = parts[1];

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      (req as AuthRequest).user = {
        id: decoded.id,
        email: decoded.email,
        username: decoded.username,
      };
    } catch {
      // Token invalid, continue without user
    }

    next();
  } catch (error) {
    logger.error('Optional auth middleware error:', error);
    next();
  }
}

// Role-based access control middleware
export function requireRole(roles: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = (req as AuthRequest).user;
    if (!user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    // Check user role in database
    const { getPool } = await import('../database/postgres');
    const result = await getPool().query(
      'SELECT role FROM users WHERE id = $1',
      [user.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        error: 'Not Found',
        message: 'User not found',
      });
      return;
    }

    const userRole = result.rows[0].role;
    if (!roles.includes(userRole)) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Insufficient permissions',
      });
      return;
    }

    next();
  };
}

// Space access middleware
export function requireSpaceAccess(accessLevel: 'read' | 'write' | 'admin' = 'read') {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = (req as AuthRequest).user;
    if (!user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    const spaceId = req.params.spaceId || req.params.id;
    if (!spaceId) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Space ID required',
      });
      return;
    }

    const { getPool } = await import('../database/postgres');
    const result = await getPool().query(
      `SELECT 
        s.owner_id = $2 as is_owner,
        s.is_public,
        sc.role as collaborator_role
      FROM spaces s
      LEFT JOIN space_collaborators sc ON s.id = sc.space_id AND sc.user_id = $2
      WHERE s.id = $1`,
      [spaceId, user.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Space not found',
      });
      return;
    }

    const space = result.rows[0];

    // Check access based on level required
    let hasAccess = false;

    if (accessLevel === 'read') {
      hasAccess = space.is_public || space.is_owner || space.collaborator_role !== null;
    } else if (accessLevel === 'write') {
      hasAccess = space.is_owner || 
        ['editor', 'admin'].includes(space.collaborator_role);
    } else if (accessLevel === 'admin') {
      hasAccess = space.is_owner || space.collaborator_role === 'admin';
    }

    if (!hasAccess) {
      res.status(403).json({
        error: 'Forbidden',
        message: `Insufficient permissions for ${accessLevel} access`,
      });
      return;
    }

    next();
  };
}