import express from "express"
import cors from "cors"
import helmet from "helmet"
import rateLimit from "express-rate-limit"
import dotenv from "dotenv"

// Import routes
import authRoutes from "./routes/auth"
import userRoutes from "./routes/users"
import taskRoutes from "./routes/tasks"
import organizationRoutes from "./routes/organizations"
import analyticsRoutes from "./routes/analytics"
import auditRoutes from "./routes/audit"
import notificationRoutes from "./routes/notifications"

// Load environment variables
dotenv.config()

const app = express()

// Security middleware
app.use(helmet())
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}))

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later."
})
app.use(limiter)

// Body parsing
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

const API_PREFIX = "/api"

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() })
})

// API routes
app.use(`${API_PREFIX}/auth`, authRoutes)
app.use(`${API_PREFIX}/users`, userRoutes)
app.use(`${API_PREFIX}/tasks`, taskRoutes)
app.use(`${API_PREFIX}/organizations`, organizationRoutes)
app.use(`${API_PREFIX}/analytics`, analyticsRoutes)
app.use(`${API_PREFIX}/audit`, auditRoutes)
app.use(`${API_PREFIX}/notifications`, notificationRoutes)

// 404 handler
app.use(`${API_PREFIX}/*`, (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' })
})

// Global error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Global error:', err)
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  })
})

const port = process.env.PORT || 4000
app.listen(port, () => {
  console.log(`🚀 Backend API listening on http://localhost:${port}${API_PREFIX}`)
  console.log(`📊 Health check: http://localhost:${port}/health`)
})
