import express, { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// --- Configuration ---
const SERVICE_ENDPOINTS = {
  USER_SERVICE: process.env.USER_SERVICE_URL || 'http://localhost:3001',
  BANKING_SERVICE: process.env.BANKING_SERVICE_URL || 'http://localhost:3002',
  AUTH_SERVICE: process.env.AUTH_SERVICE_URL || 'http://localhost:3003',
};

// --- Authentication Middleware ---
const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Authentication token missing' });
  }

  try {
    // Forward the token to the Auth Service for validation
    const authResponse = await axios.post(`${SERVICE_ENDPOINTS.AUTH_SERVICE}/verify`, { token });

    if (authResponse.status === 200 && authResponse.data.isValid) {
      // Attach user context to the request for downstream services
      req.user = authResponse.data.user;
      next();
    } else {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
  } catch (error) {
    console.error('Authentication failed:', error.message);
    return res.status(500).json({ message: 'Authentication service unavailable or error' });
  }
};

// --- Routing Logic ---

// Health Check Endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'UP', services: Object.keys(SERVICE_ENDPOINTS) });
});

// --- User Service Routes (Requires Authentication) ---
app.use('/users', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const url = `${SERVICE_ENDPOINTS.USER_SERVICE}${req.path}`;
    const method = req.method;
    const data = req.body;
    const headers = { Authorization: req.headers.authorization };

    const response = await axios({
      method,
      url,
      data,
      headers,
    });

    res.status(response.status).json(response.data);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      console.error('User service routing error:', error.message);
      res.status(500).json({ message: 'Error routing to User Service' });
    }
  }
});

// --- Banking Service Routes (Requires Authentication) ---
app.use('/banking', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const url = `${SERVICE_ENDPOINTS.BANKING_SERVICE}${req.path}`;
    const method = req.method;
    const data = req.body;
    const headers = { Authorization: req.headers.authorization };

    const response = await axios({
      method,
      url,
      data,
      headers,
    });

    res.status(response.status).json(response.data);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      console.error('Banking service routing error:', error.message);
      res.status(500).json({ message: 'Error routing to Banking Service' });
    }
  }
});

// --- Public Routes (e.g., Login, Registration - bypasses full auth middleware) ---
app.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const response = await axios.post(`${SERVICE_ENDPOINTS.AUTH_SERVICE}/login`, req.body);
    res.status(response.status).json(response.data);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      console.error('Login routing error:', error.message);
      res.status(500).json({ message: 'Error routing to Auth Service for login' });
    }
  }
});

app.post('/auth/register', async (req: Request, res: Response) => {
  try {
    const response = await axios.post(`${SERVICE_ENDPOINTS.AUTH_SERVICE}/register`, req.body);
    res.status(response.status).json(response.data);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      console.error('Registration routing error:', error.message);
      res.status(500).json({ message: 'Error routing to Auth Service for registration' });
    }
  }
});

// --- Error Handling for Unmatched Routes ---
app.use((req: Request, res: Response, next: NextFunction) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
});

// --- Server Start ---
app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
});

// Extend Request interface to include user context after authentication
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}