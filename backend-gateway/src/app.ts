import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import dotenv from 'dotenv'
import authRoutes from './routes/auth.routes'
import accountsRoutes from './routes/accounts.routes'
import settingsRoutes from './routes/settings.routes'
import seoRoutes from './routes/seo.routes'
import analyticsRoutes from './routes/analytics.routes'
import adsRoutes from './routes/ads.routes'
import oauthRoutes from './routes/oauth.routes'
import dashboardRoutes from './routes/dashboard.routes'
import gbpRoutes from './routes/gbp.routes'
import shareLinksRoutes from './routes/shareLinks.routes'
import publicDashboardRoutes from './routes/publicDashboard.routes'
import { errorHandler } from './middlewares/error.middleware'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 4000

// Middlewares
app.use(helmet())
app.use(cors())
app.use(morgan('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/accounts', accountsRoutes)
app.use('/api/settings', settingsRoutes)
app.use('/api/seo', seoRoutes)
app.use('/api/analytics', analyticsRoutes)
app.use('/api/ads', adsRoutes)
app.use('/api/oauth', oauthRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/gbp', gbpRoutes)
app.use('/api/share-links', shareLinksRoutes)
app.use('/api/public/dashboard', publicDashboardRoutes)

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Gateway API is running' })
})

// Error handler (debe ir al final)
app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`🚀 Gateway API running on port ${PORT}`)
})

export default app

