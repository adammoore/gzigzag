import { WebSocketServer, WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';
import { queries, getPool } from '../database/postgres';
import { graph } from '../database/neo4j';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

interface WSClient {
  ws: WebSocket;
  userId: string;
  username: string;
  spaceId?: string;
  isAlive: boolean;
}

interface WSMessage {
  type: 'join_space' | 'leave_space' | 'cell_update' | 'cell_create' | 
        'cell_delete' | 'cell_connect' | 'cell_disconnect' | 'cursor_move' | 
        'selection_change' | 'user_typing';
  spaceId?: string;
  data?: any;
  timestamp?: string;
}

const clients = new Map<string, WSClient>();
const spaces = new Map<string, Set<string>>(); // spaceId -> Set of client IDs

export function setupWebSocket(wss: WebSocketServer) {
  // Heartbeat to detect broken connections
  const interval = setInterval(() => {
    clients.forEach((client, id) => {
      if (!client.isAlive) {
        client.ws.terminate();
        handleDisconnect(id);
        return;
      }
      client.isAlive = false;
      client.ws.ping();
    });
  }, 30000);

  wss.on('connection', async (ws, req) => {
    const clientId = generateClientId();
    let authenticated = false;

    // Authentication timeout
    const authTimeout = setTimeout(() => {
      if (!authenticated) {
        ws.close(1008, 'Authentication timeout');
      }
    }, 5000);

    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());

        // First message must be authentication
        if (!authenticated) {
          if (data.type === 'auth' && data.token) {
            try {
              const decoded = jwt.verify(data.token, JWT_SECRET) as any;
              const user = await queries.getUserById(decoded.id);

              if (!user) {
                ws.close(1008, 'Invalid user');
                return;
              }

              authenticated = true;
              clearTimeout(authTimeout);

              // Register client
              const client: WSClient = {
                ws,
                userId: user.id,
                username: user.username,
                isAlive: true,
              };
              clients.set(clientId, client);

              // Send success response
              ws.send(JSON.stringify({
                type: 'auth_success',
                userId: user.id,
                username: user.username,
              }));

              logger.info(`WebSocket client connected: ${clientId} (${user.username})`);
            } catch (error) {
              ws.close(1008, 'Authentication failed');
            }
          } else {
            ws.close(1008, 'Authentication required');
          }
          return;
        }

        // Handle authenticated messages
        const client = clients.get(clientId);
        if (!client) return;

        await handleMessage(clientId, data as WSMessage);
      } catch (error) {
        logger.error('WebSocket message error:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format',
        }));
      }
    });

    ws.on('pong', () => {
      const client = clients.get(clientId);
      if (client) {
        client.isAlive = true;
      }
    });

    ws.on('close', () => {
      clearTimeout(authTimeout);
      handleDisconnect(clientId);
    });

    ws.on('error', (error) => {
      logger.error(`WebSocket error for client ${clientId}:`, error);
      handleDisconnect(clientId);
    });
  });

  wss.on('close', () => {
    clearInterval(interval);
  });
}

async function handleMessage(clientId: string, message: WSMessage) {
  const client = clients.get(clientId);
  if (!client) return;

  switch (message.type) {
    case 'join_space':
      await handleJoinSpace(clientId, message.spaceId!);
      break;

    case 'leave_space':
      handleLeaveSpace(clientId);
      break;

    case 'cell_update':
      await handleCellUpdate(clientId, message.data);
      break;

    case 'cell_create':
      await handleCellCreate(clientId, message.data);
      break;

    case 'cell_delete':
      await handleCellDelete(clientId, message.data);
      break;

    case 'cell_connect':
      await handleCellConnect(clientId, message.data);
      break;

    case 'cell_disconnect':
      await handleCellDisconnect(clientId, message.data);
      break;

    case 'cursor_move':
      handleCursorMove(clientId, message.data);
      break;

    case 'selection_change':
      handleSelectionChange(clientId, message.data);
      break;

    case 'user_typing':
      handleUserTyping(clientId, message.data);
      break;

    default:
      logger.warn(`Unknown message type: ${message.type}`);
  }
}

async function handleJoinSpace(clientId: string, spaceId: string) {
  const client = clients.get(clientId);
  if (!client) return;

  // Check access permission
  const accessCheck = await getPool().query(
    `SELECT 1 FROM spaces s
     WHERE s.id = $1 AND (
       s.is_public = true OR
       s.owner_id = $2 OR
       EXISTS(SELECT 1 FROM space_collaborators WHERE space_id = s.id AND user_id = $2)
     )`,
    [spaceId, client.userId]
  );

  if (accessCheck.rows.length === 0) {
    client.ws.send(JSON.stringify({
      type: 'error',
      message: 'Access denied to space',
    }));
    return;
  }

  // Leave previous space if any
  if (client.spaceId) {
    handleLeaveSpace(clientId);
  }

  // Join new space
  client.spaceId = spaceId;
  if (!spaces.has(spaceId)) {
    spaces.set(spaceId, new Set());
  }
  spaces.get(spaceId)!.add(clientId);

  // Notify other users in space
  broadcastToSpace(spaceId, {
    type: 'user_joined',
    userId: client.userId,
    username: client.username,
    timestamp: new Date().toISOString(),
  }, clientId);

  // Send current users list to new client
  const spaceClients = spaces.get(spaceId)!;
  const users = Array.from(spaceClients)
    .map(id => clients.get(id))
    .filter(c => c)
    .map(c => ({
      userId: c!.userId,
      username: c!.username,
    }));

  client.ws.send(JSON.stringify({
    type: 'space_joined',
    spaceId,
    users,
  }));

  logger.info(`Client ${clientId} joined space ${spaceId}`);
}

function handleLeaveSpace(clientId: string) {
  const client = clients.get(clientId);
  if (!client || !client.spaceId) return;

  const spaceId = client.spaceId;
  const spaceClients = spaces.get(spaceId);
  
  if (spaceClients) {
    spaceClients.delete(clientId);
    if (spaceClients.size === 0) {
      spaces.delete(spaceId);
    }
  }

  // Notify other users
  broadcastToSpace(spaceId, {
    type: 'user_left',
    userId: client.userId,
    username: client.username,
    timestamp: new Date().toISOString(),
  }, clientId);

  client.spaceId = undefined;
  logger.info(`Client ${clientId} left space ${spaceId}`);
}

async function handleCellUpdate(clientId: string, data: any) {
  const client = clients.get(clientId);
  if (!client || !client.spaceId) return;

  const { cellId, content } = data;

  try {
    // Update in database
    const updatedCell = await queries.updateCell(cellId, content, client.userId);

    // Broadcast to other users in space
    broadcastToSpace(client.spaceId, {
      type: 'cell_updated',
      cellId,
      content,
      version: updatedCell.version,
      updatedBy: client.username,
      timestamp: new Date().toISOString(),
    }, clientId);
  } catch (error) {
    logger.error('Error updating cell:', error);
    client.ws.send(JSON.stringify({
      type: 'error',
      message: 'Failed to update cell',
    }));
  }
}

async function handleCellCreate(clientId: string, data: any) {
  const client = clients.get(clientId);
  if (!client || !client.spaceId) return;

  const { content = '', metadata = {} } = data;

  try {
    // Create in PostgreSQL
    const cell = await queries.createCell(client.spaceId, content, client.userId);
    
    // Create in Neo4j
    await graph.createCellNode(cell.id, client.spaceId);

    // Broadcast to all users in space
    broadcastToSpace(client.spaceId, {
      type: 'cell_created',
      cell: {
        id: cell.id,
        content: cell.text_content,
        metadata: cell.metadata,
        version: cell.version,
        createdBy: client.username,
        createdAt: cell.created_at,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error creating cell:', error);
    client.ws.send(JSON.stringify({
      type: 'error',
      message: 'Failed to create cell',
    }));
  }
}

async function handleCellDelete(clientId: string, data: any) {
  const client = clients.get(clientId);
  if (!client || !client.spaceId) return;

  const { cellId } = data;

  try {
    // Delete from Neo4j first (removes connections)
    await graph.deleteCellNode(cellId);
    
    // Delete from PostgreSQL
    await getPool().query('DELETE FROM cells WHERE id = $1', [cellId]);

    // Broadcast to all users in space
    broadcastToSpace(client.spaceId, {
      type: 'cell_deleted',
      cellId,
      deletedBy: client.username,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error deleting cell:', error);
    client.ws.send(JSON.stringify({
      type: 'error',
      message: 'Failed to delete cell',
    }));
  }
}

async function handleCellConnect(clientId: string, data: any) {
  const client = clients.get(clientId);
  if (!client || !client.spaceId) return;

  const { fromCellId, toCellId, dimension, direction = 'positive' } = data;

  try {
    // Create connection in Neo4j
    await graph.connectCells(fromCellId, toCellId, dimension, direction);

    // Broadcast to all users in space
    broadcastToSpace(client.spaceId, {
      type: 'cells_connected',
      fromCellId,
      toCellId,
      dimension,
      direction,
      connectedBy: client.username,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error connecting cells:', error);
    client.ws.send(JSON.stringify({
      type: 'error',
      message: 'Failed to connect cells',
    }));
  }
}

async function handleCellDisconnect(clientId: string, data: any) {
  const client = clients.get(clientId);
  if (!client || !client.spaceId) return;

  const { fromCellId, toCellId, dimension } = data;

  try {
    // Remove connection in Neo4j
    await graph.disconnectCells(fromCellId, toCellId, dimension);

    // Broadcast to all users in space
    broadcastToSpace(client.spaceId, {
      type: 'cells_disconnected',
      fromCellId,
      toCellId,
      dimension,
      disconnectedBy: client.username,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error disconnecting cells:', error);
    client.ws.send(JSON.stringify({
      type: 'error',
      message: 'Failed to disconnect cells',
    }));
  }
}

function handleCursorMove(clientId: string, data: any) {
  const client = clients.get(clientId);
  if (!client || !client.spaceId) return;

  // Broadcast cursor position to other users
  broadcastToSpace(client.spaceId, {
    type: 'cursor_moved',
    userId: client.userId,
    username: client.username,
    cellId: data.cellId,
    position: data.position,
    timestamp: new Date().toISOString(),
  }, clientId);
}

function handleSelectionChange(clientId: string, data: any) {
  const client = clients.get(clientId);
  if (!client || !client.spaceId) return;

  // Broadcast selection to other users
  broadcastToSpace(client.spaceId, {
    type: 'selection_changed',
    userId: client.userId,
    username: client.username,
    selectedCells: data.selectedCells,
    timestamp: new Date().toISOString(),
  }, clientId);
}

function handleUserTyping(clientId: string, data: any) {
  const client = clients.get(clientId);
  if (!client || !client.spaceId) return;

  // Broadcast typing indicator to other users
  broadcastToSpace(client.spaceId, {
    type: 'user_typing',
    userId: client.userId,
    username: client.username,
    cellId: data.cellId,
    isTyping: data.isTyping,
    timestamp: new Date().toISOString(),
  }, clientId);
}

function handleDisconnect(clientId: string) {
  const client = clients.get(clientId);
  if (!client) return;

  // Leave space if in one
  if (client.spaceId) {
    handleLeaveSpace(clientId);
  }

  // Remove client
  clients.delete(clientId);
  logger.info(`WebSocket client disconnected: ${clientId}`);
}

function broadcastToSpace(spaceId: string, message: any, excludeClientId?: string) {
  const spaceClients = spaces.get(spaceId);
  if (!spaceClients) return;

  const messageStr = JSON.stringify(message);
  spaceClients.forEach(clientId => {
    if (clientId === excludeClientId) return;
    
    const client = clients.get(clientId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(messageStr);
    }
  });
}

function generateClientId(): string {
  return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}