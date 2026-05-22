import { useEffect, useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle, AlertCircle, Info, Building2, Link2, ArrowLeft, Loader2 } from 'lucide-react'
import { Button, Modal } from '../../components/common'
import { useTheme } from '../../contexts/ThemeContext'
import ParticlesBackground from '../../components/common/ParticlesBackground'
import AnimatedContainer from '../../components/common/AnimatedContainer'
import { oauthService } from '../../services/auth'
import { toast } from 'sonner'

interface AvailableAccount {
  customer_id: string
  customer_id_raw: string
  descriptive_name: string
  is_mcc: boolean
  is_subaccount?: boolean
  parent_customer_id?: string
}

function translateError(errorMessage: string): string {
  const translations: { [key: string]: string } = {
    'error al obtener tokens oauth': 'Error obtaining OAuth tokens',
    'error al intercambiar código por tokens': 'Error exchanging code for tokens',
    'error al conectar con tiktok': 'Error connecting with TikTok',
    'error inesperado al obtener tokens': 'Unexpected error obtaining tokens',
    'el código de autorización es inválido o ya fue usado': 'The authorization code is invalid or has already been used. Please try connecting the account again.',
    'el redirect_uri no coincide': 'The redirect_uri does not match. Please verify that the redirect_uri in Google Cloud Console is configured correctly.',
    'client id o client secret inválidos': 'Invalid Client ID or Client Secret. Please verify the OAuth configuration in Settings.',
    'error al obtener ubicaciones': 'Error obtaining locations',
    'no gbp account configured': 'No GBP account configured',
    'missing required parameters': 'Missing required parameters',
    'las credenciales son requeridas': 'Credentials are required',
    'error al construir el servicio': 'Error building the service',
    'error al listar ubicaciones': 'Error listing locations',
    'error al obtener métricas': 'Error obtaining metrics',
    'error al obtener cuentas': 'Error obtaining accounts',
    'verifica que el redirect uri': 'Please verify that the Redirect URI',
    'error en callback': 'Error in callback',
    'error procesando': 'Error processing',
    'no se pudo': 'Could not',
    'falló': 'Failed',
    'inválido': 'Invalid',
    'no autorizado': 'Unauthorized',
    'no encontrado': 'Not found',
    'servidor': 'Server',
    'error del servidor': 'Server error',
  }

  if (!errorMessage) {
    return 'An unknown error occurred'
  }

  const lowerError = errorMessage.toLowerCase().trim()
  
  for (const [spanish, english] of Object.entries(translations)) {
    if (lowerError.includes(spanish)) {
      if (errorMessage.includes(':')) {
        const parts = errorMessage.split(':')
        if (parts.length > 1) {
          const context = parts.slice(1).join(':').trim()
          const translatedContext = translateError(context)
          return `${english}: ${translatedContext}`
        }
      }
      return english
    }
  }

  return errorMessage
}

export default function OAuthCallbackPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { colors } = useTheme()
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<'processing' | 'success' | 'error' | 'selecting'>('processing')
  const [availableAccounts, setAvailableAccounts] = useState<AvailableAccount[]>([])
  const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(new Set())
  const [isSelecting, setIsSelecting] = useState(false)
  const hasProcessed = useRef(false)

  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const platform = searchParams.get('platform') || localStorage.getItem('oauth_platform')
  const accountType = searchParams.get('account_type') || localStorage.getItem('oauth_account_type')

  useEffect(() => {
    if (hasProcessed.current) {
      return
    }

    const success = searchParams.get('success')
    if (success === 'true') {
      hasProcessed.current = true
      setStatus('success')
      toast.success('Account connected successfully')
      
      localStorage.removeItem('oauth_platform')
      localStorage.removeItem('oauth_account_type')
      localStorage.removeItem('oauth_state')
      
      setTimeout(() => {
        navigate('/accounts', { state: { fromOAuth: true } })
      }, 1500)
      return
    }

    if (!code || !state) {
      setError('Missing parameters in callback URL')
      setStatus('error')
      return
    }

    if (!platform || !accountType) {
      setError('Platform information not found')
      setStatus('error')
      return
    }

    hasProcessed.current = true
    handleCallback()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, state, platform, accountType])

  const handleCallback = async (selectedCustomerIds?: string[]) => {
    if (!state || !platform || !accountType) {
      return
    }

    const shouldSendCode = !selectedCustomerIds && !!code

    try {
      const result = await oauthService.handleCallback({
        platform,
        code: shouldSendCode ? code : undefined,
        state,
        account_type: accountType,
        selected_customer_ids: selectedCustomerIds
      })
      
      if (result.requires_selection && result.available_accounts) {
        setAvailableAccounts(result.available_accounts as AvailableAccount[])
        setStatus('selecting')
        setIsSelecting(true)
        return
      }
      
      toast.success(result.message || 'Account connected successfully')
      setStatus('success')
      
      localStorage.removeItem('oauth_platform')
      localStorage.removeItem('oauth_account_type')
      localStorage.removeItem('oauth_state')
      
      setTimeout(() => {
        navigate('/accounts', { state: { fromOAuth: true } })
      }, 1500)
    } catch (err: any) {
      console.error('Error in OAuth callback:', err)
      const rawErrorMessage = err.response?.data?.message || 
                              err.response?.data?.error ||
                              err.message || 
                              'Error processing OAuth callback'
      
      const errorMessage = translateError(rawErrorMessage)
      
      setError(errorMessage)
      setStatus('error')
      
      if (platform === 'tiktok') {
        toast.error(`Could not connect with TikTok: ${errorMessage}`)
      } else {
        toast.error(errorMessage)
      }
    }
  }

  const handleAccountToggle = (customerId: string) => {
    const newSelected = new Set(selectedAccounts)
    if (newSelected.has(customerId)) {
      newSelected.delete(customerId)
    } else {
      newSelected.add(customerId)
    }
    setSelectedAccounts(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedAccounts.size === availableAccounts.length) {
      setSelectedAccounts(new Set())
    } else {
      setSelectedAccounts(new Set(availableAccounts.map(acc => acc.customer_id)))
    }
  }

  const handleConfirmSelection = async () => {
    if (selectedAccounts.size === 0) {
      toast.error('Please select at least one account')
      return
    }

    setIsSelecting(false)
    setStatus('processing')
    await handleCallback(Array.from(selectedAccounts))
  }

  if (status === 'selecting') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Modal
          isOpen={isSelecting}
          onClose={() => {
            setIsSelecting(false)
            navigate('/accounts')
          }}
          title="Select Accounts to Connect"
          size="lg"
        >
          <div className="space-y-6">
            <div className="bg-surface border border-border rounded-2xl p-5">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-6 h-6 text-indigo-700 dark:text-indigo-500" strokeWidth={2} />
                </div>
                <div className="flex-1">
                  <p className="text-text text-sm font-medium mb-1.5">
                    Found <strong className="font-bold text-primary">{availableAccounts.length} account{availableAccounts.length !== 1 ? 's' : ''}</strong> from Google Ads
                  </p>
                  <p className="text-text-secondary text-sm">
                    Select the accounts you want to connect
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-surface rounded-xl border border-border">
              <button
                onClick={handleSelectAll}
                className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors flex items-center gap-2 group"
              >
                <Link2 className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                {selectedAccounts.size === availableAccounts.length ? 'Deselect All' : 'Select All'}
              </button>
              <div className="flex items-center gap-2.5">
                <div className="px-3 py-1.5 bg-primary/10 rounded-lg border border-primary/20">
                  <span className="text-sm font-bold text-primary">
                    {selectedAccounts.size}
                  </span>
                </div>
                <span className="text-sm text-text-secondary">
                  of {availableAccounts.length}
                </span>
              </div>
            </div>

            <div className="max-h-[500px] overflow-y-auto space-y-3 border border-border rounded-2xl p-4 bg-background">
              {availableAccounts
                .filter(acc => !acc.is_subaccount)
                .map((account) => {
                  const subaccounts = availableAccounts.filter(
                    acc => acc.is_subaccount && acc.parent_customer_id === account.customer_id
                  )
                  const isSelected = selectedAccounts.has(account.customer_id)
                  
                  return (
                    <div key={account.customer_id} className="space-y-2">
                      <label
                        className={`group flex items-center p-5 border rounded-2xl cursor-pointer transition-all duration-200 ${
                          account.is_mcc 
                            ? 'bg-surface border-primary/30' 
                            : 'bg-surface border-border hover:bg-surface/80'
                        } ${isSelected ? 'border-primary ring-2 ring-primary/20' : 'hover:border-primary/40'}`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleAccountToggle(account.customer_id)}
                          className="mr-4 w-5 h-5 text-primary focus:ring-2 focus:ring-primary/20 rounded-md cursor-pointer border-2 border-slate-300 dark:border-slate-600"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-base text-text flex items-center gap-2.5 mb-1.5 flex-wrap">
                            <Building2 className="w-4 h-4 text-text-secondary flex-shrink-0" />
                            <span className="truncate">{account.descriptive_name}</span>
                            {account.is_mcc && (
                              <span className="px-2.5 py-1 bg-primary text-white rounded-lg text-xs font-bold flex-shrink-0">
                                MCC
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-text-secondary font-mono flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-medium">ID:</span>
                            <span className="font-semibold">{account.customer_id}</span>
                            {subaccounts.length > 0 && (
                              <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-md text-xs font-bold border border-primary/20">
                                {subaccounts.length} sub
                              </span>
                            )}
                          </div>
                        </div>
                      </label>
                      
                      {subaccounts.length > 0 && (
                        <div className="ml-8 space-y-2 border-l-2 border-primary/30 pl-4">
                          {subaccounts.map((subaccount) => {
                            const isSubSelected = selectedAccounts.has(subaccount.customer_id)
                            return (
                              <label
                                key={subaccount.customer_id}
                                className={`group flex items-center p-4 border rounded-xl cursor-pointer transition-all duration-200 ${
                                  isSubSelected 
                                    ? 'bg-surface border-primary ring-2 ring-primary/20' 
                                    : 'bg-surface/50 border-border hover:bg-surface/80 hover:border-primary/40'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSubSelected}
                                  onChange={() => handleAccountToggle(subaccount.customer_id)}
                                  className="mr-3 w-4 h-4 text-primary focus:ring-2 focus:ring-primary/20 rounded cursor-pointer border-2 border-slate-300 dark:border-slate-600"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-text text-sm mb-1">{subaccount.descriptive_name}</div>
                                  <div className="text-xs text-text-secondary font-mono flex items-center gap-2 flex-wrap">
                                    <span className="text-xs font-medium">ID:</span>
                                    <span className="font-semibold">{subaccount.customer_id}</span>
                                    <span className="px-2 py-0.5 bg-surface border border-border rounded-md text-xs font-medium text-text-secondary">
                                      Sub
                                    </span>
                                  </div>
                                </div>
                              </label>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
            </div>

            <div className="flex gap-3 pt-4 border-t border-border">
              <Button
                onClick={() => {
                  setIsSelecting(false)
                  navigate('/accounts')
                }}
                variant="outline"
                className="flex-1 group"
              >
                <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                Cancel
              </Button>
              <Button
                onClick={handleConfirmSelection}
                disabled={selectedAccounts.size === 0}
                className="flex-1 group border-0"
              >
                <Link2 className="w-4 h-4 mr-2 group-hover:rotate-12 transition-transform" />
                Connect {selectedAccounts.size > 0 ? `${selectedAccounts.size}` : 'accounts'}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    )
  }

  if (status === 'processing') {
    return (
      <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-background via-background to-surface">
        <div className="absolute inset-0 z-0">
          <ParticlesBackground intensity="low" />
        </div>

        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full blur-3xl opacity-20"
            style={{ backgroundColor: colors.primary }}
            animate={{
              x: [0, 50, 0],
              y: [0, 30, 0],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
          <motion.div
            className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl opacity-20"
            style={{ backgroundColor: colors.accent }}
            animate={{
              x: [0, -50, 0],
              y: [0, -30, 0],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 25,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        </div>

        <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
          <AnimatedContainer direction="up" delay={0.2} className="max-w-lg w-full text-center">
            <AnimatedContainer direction="up" delay={0.4}>
              <div className="mb-8 flex justify-center">
                <motion.div
                  className="relative"
                  animate={{
                    rotate: [0, 5, -5, 0],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                >
                  <div 
                    className="w-32 h-32 rounded-2xl flex items-center justify-center relative overflow-hidden"
                    style={{ 
                      backgroundColor: `${colors.primary}15`,
                      boxShadow: `0 0 40px ${colors.primary}30`,
                    }}
                  >
                    <motion.div
                      className="absolute inset-0 opacity-20"
                      style={{
                        background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                      }}
                      animate={{
                        rotate: [0, 360],
                      }}
                      transition={{
                        duration: 20,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                    />
                    <Loader2 className="w-16 h-16 relative z-10 animate-spin" style={{ color: colors.primary }} strokeWidth={1.5} />
                  </div>
                  <motion.div
                    className="absolute -top-2 -right-2 w-8 h-8 rounded-full"
                    style={{ backgroundColor: colors.accent }}
                    animate={{
                      scale: [1, 1.5, 1],
                      opacity: [0.5, 0, 0.5],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                    }}
                  />
                </motion.div>
              </div>
            </AnimatedContainer>

            <AnimatedContainer direction="up" delay={0.6}>
              <div className="mb-6">
                <h2 className="text-3xl md:text-4xl font-bold text-text mb-4">
                  Processing Authorization
                </h2>
                <p className="text-lg text-text-secondary max-w-md mx-auto leading-relaxed">
                  Connecting your account securely. This will only take a few seconds.
                </p>
              </div>
            </AnimatedContainer>

            {accountType && accountType !== 'ads' && platform === 'google' && (
              <AnimatedContainer direction="up" delay={0.8}>
                <div className="mt-8 p-5 bg-primary/10 border border-primary/20 rounded-2xl text-left max-w-md mx-auto">
                  <div className="flex items-start gap-4">
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${colors.primary}15` }}
                    >
                      <Info className="w-5 h-5" style={{ color: colors.primary }} strokeWidth={2} />
                    </div>
                    <p className="text-sm text-text leading-relaxed">
                      <strong className="font-semibold">Note:</strong> The requested permissions will allow you to access all related Google services.
                    </p>
                  </div>
                </div>
              </AnimatedContainer>
            )}
          </AnimatedContainer>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-background via-background to-surface">
        <div className="absolute inset-0 z-0">
          <ParticlesBackground intensity="low" />
        </div>

        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full blur-3xl opacity-20"
            style={{ backgroundColor: colors.error }}
            animate={{
              x: [0, 50, 0],
              y: [0, 30, 0],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
          <motion.div
            className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl opacity-20"
            style={{ backgroundColor: colors.accent }}
            animate={{
              x: [0, -50, 0],
              y: [0, -30, 0],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 25,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        </div>

        <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
          <AnimatedContainer direction="up" delay={0.2} className="max-w-2xl w-full text-center">
            <AnimatedContainer direction="up" delay={0.4}>
              <div className="mb-8 flex justify-center">
                <motion.div
                  className="relative"
                  animate={{
                    rotate: [0, 5, -5, 0],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                >
                  <div 
                    className="w-32 h-32 rounded-2xl flex items-center justify-center relative overflow-hidden"
                    style={{ 
                      backgroundColor: `${colors.error}15`,
                      boxShadow: `0 0 40px ${colors.error}30`,
                    }}
                  >
                    <motion.div
                      className="absolute inset-0 opacity-20"
                      style={{
                        background: `linear-gradient(135deg, ${colors.error}, ${colors.accent})`,
                      }}
                      animate={{
                        rotate: [0, 360],
                      }}
                      transition={{
                        duration: 20,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                    />
                    <AlertCircle className="w-16 h-16 relative z-10" style={{ color: colors.error }} strokeWidth={1.5} />
                  </div>
                  <motion.div
                    className="absolute -top-2 -right-2 w-8 h-8 rounded-full"
                    style={{ backgroundColor: colors.accent }}
                    animate={{
                      scale: [1, 1.5, 1],
                      opacity: [0.5, 0, 0.5],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                    }}
                  />
                </motion.div>
              </div>
            </AnimatedContainer>

            <AnimatedContainer direction="up" delay={0.6}>
              <div className="mb-10">
                <h2 className="text-3xl md:text-4xl font-bold text-text mb-4">
                  Connection Error
                </h2>
                <p className="text-lg text-text-secondary max-w-md mx-auto leading-relaxed">
                  Unable to complete the connection. Please try again.
                </p>
              </div>
            </AnimatedContainer>

            <AnimatedContainer direction="up" delay={0.8}>
              <div className="mb-8 max-w-lg mx-auto">
                <div className="bg-error/10 border border-error/30 rounded-2xl p-6">
                  <div className="flex items-start gap-4">
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${colors.error}20` }}
                    >
                      <Info className="w-5 h-5" style={{ color: colors.error }} strokeWidth={2} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold mb-2 uppercase tracking-wide" style={{ color: colors.error }}>
                        Error Details
                      </p>
                      <p className="text-sm text-text leading-relaxed break-words">
                        {error || 'An unknown error occurred while processing the connection'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </AnimatedContainer>

            <AnimatedContainer direction="up" delay={1}>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
                <Button
                  onClick={() => navigate('/accounts')}
                  size="lg"
                >
                  <span className="flex items-center gap-2">
                    <ArrowLeft className="w-5 h-5" />
                    Back to Accounts
                  </span>
                </Button>
              </div>
            </AnimatedContainer>
          </AnimatedContainer>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-background via-background to-surface">
      <div className="absolute inset-0 z-0">
        <ParticlesBackground intensity="low" />
      </div>

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full blur-3xl opacity-20"
          style={{ backgroundColor: colors.success }}
          animate={{
            x: [0, 50, 0],
            y: [0, 30, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl opacity-20"
          style={{ backgroundColor: colors.primary }}
          animate={{
            x: [0, -50, 0],
            y: [0, -30, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <AnimatedContainer direction="up" delay={0.2} className="max-w-2xl w-full text-center">
          <AnimatedContainer direction="up" delay={0.4}>
            <div className="mb-8 flex justify-center">
              <motion.div
                className="relative"
                animate={{
                  rotate: [0, 5, -5, 0],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                <div 
                  className="w-32 h-32 rounded-2xl flex items-center justify-center relative overflow-hidden"
                  style={{ 
                    backgroundColor: `${colors.success}15`,
                    boxShadow: `0 0 40px ${colors.success}30`,
                  }}
                >
                  <motion.div
                    className="absolute inset-0 opacity-20"
                    style={{
                      background: `linear-gradient(135deg, ${colors.success}, ${colors.primary})`,
                    }}
                    animate={{
                      rotate: [0, 360],
                    }}
                    transition={{
                      duration: 20,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                  />
                  <CheckCircle className="w-16 h-16 relative z-10" style={{ color: colors.success }} strokeWidth={1.5} />
                </div>
                <motion.div
                  className="absolute -top-2 -right-2 w-8 h-8 rounded-full"
                  style={{ backgroundColor: colors.accent }}
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.5, 0, 0.5],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                  }}
                />
              </motion.div>
            </div>
          </AnimatedContainer>

          <AnimatedContainer direction="up" delay={0.6}>
            <div className="mb-10">
              <h2 className="text-3xl md:text-4xl font-bold text-text mb-4">
                Successfully Connected!
              </h2>
              <p className="text-lg text-text-secondary max-w-md mx-auto leading-relaxed">
                Your account has been connected and is ready to use.
              </p>
            </div>
          </AnimatedContainer>

          {accountType && accountType !== 'ads' && platform === 'google' && (
            <AnimatedContainer direction="up" delay={0.8}>
              <div className="mb-8 max-w-lg mx-auto">
                <div className="bg-primary/10 border border-primary/20 rounded-2xl p-5 text-left">
                  <div className="flex items-start gap-4">
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${colors.primary}15` }}
                    >
                      <Info className="w-5 h-5" style={{ color: colors.primary }} strokeWidth={2} />
                    </div>
                    <p className="text-sm text-text leading-relaxed">
                      <strong className="font-semibold">Note:</strong> With this authorization you can access Search Console, Analytics, and Business Profile without needing to authorize again.
                    </p>
                  </div>
                </div>
              </div>
            </AnimatedContainer>
          )}

          <AnimatedContainer direction="up" delay={1}>
            <div className="flex items-center justify-center gap-3 text-sm text-text-secondary bg-surface rounded-xl py-3 px-4 max-w-md mx-auto">
              <div className="w-4 h-4 rounded-full border-2 border-text-secondary border-t-transparent animate-spin"></div>
              <span className="font-medium">Redirecting to accounts...</span>
            </div>
          </AnimatedContainer>
        </AnimatedContainer>
      </div>
    </div>
  )
}