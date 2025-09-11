import express from 'express';
import cors from 'cors';
import { Handler } from '@netlify/functions';

const app = express();
const PORT = 8888;

// Middleware
app.use(cors());
app.use(express.json());

// Environment variables
process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_iof5LtlVy7eY@ep-shiny-breeze-ae06mvuz-pooler.c-2.us-east-2.aws.neon.tech/neondb?channel_binding=require&sslmode=require";
process.env.JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
process.env.NETLIFY_DATABASE_URL = process.env.DATABASE_URL;

// Function wrapper to convert Netlify function to Express endpoint
const wrapNetlifyFunction = (functionPath: string) => {
  return async (req: express.Request, res: express.Response) => {
    try {
      // Use dynamic import for ESM modules
      const func = await import(functionPath);
      const handler: Handler = func.handler || func.default;
      
      if (!handler) {
        throw new Error(`No handler found in ${functionPath}`);
      }
      
      const event = {
        httpMethod: req.method,
        headers: req.headers as any,
        body: req.body ? JSON.stringify(req.body) : null,
        queryStringParameters: req.query as any,
        path: req.path,
        isBase64Encoded: false
      };
      
      console.log(`📥 ${req.method} ${req.path}`, req.body || req.query);
      
      const result = await handler(event, {} as any);
      
      // Set headers
      if (result.headers) {
        Object.entries(result.headers).forEach(([key, value]) => {
          res.setHeader(key, value as string);
        });
      }
      
      // Send response
      const statusCode = result.statusCode || 200;
      const body = result.body ? JSON.parse(result.body) : '';
      
      console.log(`📤 ${statusCode} response`);
      res.status(statusCode).send(body);
    } catch (error: any) {
      console.error('❌ Function error:', error.message);
      console.error(error.stack);
      res.status(500).json({ 
        error: 'Internal server error', 
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  };
};

// Auth endpoints
app.post('/.netlify/functions/auth-login', wrapNetlifyFunction('./netlify/functions/auth-login'));
app.post('/.netlify/functions/auth-register', wrapNetlifyFunction('./netlify/functions/auth-register'));
app.post('/.netlify/functions/auth-logout', wrapNetlifyFunction('./netlify/functions/auth-logout'));
app.get('/.netlify/functions/auth-verify', wrapNetlifyFunction('./netlify/functions/auth-verify'));
app.post('/.netlify/functions/auth-refresh', wrapNetlifyFunction('./netlify/functions/auth-refresh'));

// Company endpoints
app.get('/.netlify/functions/get-companies', wrapNetlifyFunction('./netlify/functions/get-companies'));

// Favorites endpoints
app.post('/.netlify/functions/favorites-save', wrapNetlifyFunction('./netlify/functions/favorites-save'));
app.get('/.netlify/functions/favorites-get', wrapNetlifyFunction('./netlify/functions/favorites-get'));
app.delete('/.netlify/functions/favorites-remove', wrapNetlifyFunction('./netlify/functions/favorites-remove'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`
🚀 Development API Server running on http://localhost:${PORT}
📍 Health check: http://localhost:${PORT}/health

📍 Auth endpoints:
   - POST /.netlify/functions/auth-login
   - POST /.netlify/functions/auth-register
   - GET  /.netlify/functions/auth-verify
   
📊 Data endpoints:
   - GET  /.netlify/functions/get-companies
   
⭐ Favorites endpoints:
   - POST   /.netlify/functions/favorites-save
   - GET    /.netlify/functions/favorites-get
   - DELETE /.netlify/functions/favorites-remove
   
🔧 Environment:
   - DATABASE_URL: ${process.env.DATABASE_URL?.substring(0, 50)}...
   - JWT_SECRET: [SET]
  `);
});
