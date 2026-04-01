/**
 * CreateShareLinkModal - Modal para crear links de compartir dashboards
 * Permite seleccionar cuentas, configurar opciones y generar el link
 */
import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  X, 
  Link as LinkIcon, 
  Copy, 
  Check, 
  Lock, 
  Eye, 
  EyeOff,
  Calendar,
  Palette,
  DollarSign
} from "lucide-react"
import { toast } from "sonner"
import type { Account } from "../../services/accounts"
import { shareLinksService, type CreateShareLinkRequest, type ShareLinkConfig } from "../../services/analytics/shareLinks.service"
import MultiAccountSelector from "./MultiAccountSelector"

interface CreateShareLinkModalProps {
  isOpen: boolean
  onClose: () => void
  accounts: Account[]
  onSuccess?: () => void
}

export default function CreateShareLinkModal({
  isOpen,
  onClose,
  accounts,
  onSuccess,
}: CreateShareLinkModalProps) {
  const [step, setStep] = useState(1) // 1: Selección, 2: Configuración, 3: Resultado
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  
  // Form state
  const [name, setName] = useState("")
  const [selectedAccountIds, setSelectedAccountIds] = useState<number[]>([])
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [expiresInDays, setExpiresInDays] = useState<number | null>(null)
  const [config, setConfig] = useState<ShareLinkConfig>({
    show_cost: true,
    show_chart_types: ["line", "bar", "pie"],
    date_range_days: 30,
    allow_date_selection: true,
  })
  
  // Result state
  const [shareUrl, setShareUrl] = useState("")

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep(1)
      setName("")
      setSelectedAccountIds([])
      setPassword("")
      setExpiresInDays(null)
      setConfig({
        show_cost: true,
        show_chart_types: ["line", "bar", "pie"],
        date_range_days: 30,
        allow_date_selection: true,
      })
      setShareUrl("")
      setCopied(false)
    }
  }, [isOpen])

  // Crear el link
  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Please enter a name for the link")
      return
    }
    if (selectedAccountIds.length === 0) {
      toast.error("Please select at least one account")
      return
    }

    setLoading(true)
    try {
      const request: CreateShareLinkRequest = {
        name: name.trim(),
        account_ids: selectedAccountIds,
        config,
        password: password || undefined,
        expires_in_days: expiresInDays || undefined,
      }

      const result = await shareLinksService.createShareLink(request)
      setShareUrl(result.share_url)
      setStep(3)
      toast.success("Share link created successfully!")
      onSuccess?.()
    } catch (error: any) {
      toast.error(error.message || "Error creating share link")
    } finally {
      setLoading(false)
    }
  }

  // Copiar link al portapapeles
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      toast.success("Link copied to clipboard!")
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Could not copy link")
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="bg-surface border border-border rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <LinkIcon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-text">Create Share Link</h2>
                <p className="text-sm text-text-secondary">
                  {step === 1 && "Select accounts to share"}
                  {step === 2 && "Configure options"}
                  {step === 3 && "Your link is ready!"}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-background transition-colors"
            >
              <X className="w-5 h-5 text-text-secondary" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[60vh]">
            {/* Step 1: Selección de cuentas */}
            {step === 1 && (
              <div className="space-y-4">
                {/* Nombre del link */}
                <div>
                  <label className="block text-sm font-medium text-text mb-1">
                    Link Name *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Monthly Report - Client X"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                {/* Selector de cuentas */}
                <div>
                  <label className="block text-sm font-medium text-text mb-1">
                    Accounts to Share *
                  </label>
                  <p className="text-xs text-text-secondary mb-2">
                    Select one or more accounts from different platforms. Data will be aggregated.
                  </p>
                  <MultiAccountSelector
                    accounts={accounts}
                    selectedAccountIds={selectedAccountIds}
                    onSelectionChange={setSelectedAccountIds}
                    placeholder="Select accounts..."
                    filterAccountTypes={["ads"]}
                  />
                </div>

                {/* Resumen de selección */}
                {selectedAccountIds.length > 0 && (
                  <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                    <p className="text-sm text-text">
                      <strong>{selectedAccountIds.length}</strong> account(s) selected from{" "}
                      <strong>
                        {new Set(
                          accounts
                            .filter((a) => selectedAccountIds.includes(a.id))
                            .map((a) => a.platform)
                        ).size}
                      </strong>{" "}
                      platform(s)
                    </p>
                    <p className="text-xs text-text-secondary mt-1">
                      All metrics will be aggregated into a single dashboard view
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Configuración */}
            {step === 2 && (
              <div className="space-y-4">
                {/* Mostrar costos */}
                <div className="flex items-center justify-between p-3 bg-background rounded-lg">
                  <div className="flex items-center gap-3">
                    <DollarSign className="w-5 h-5 text-text-secondary" />
                    <div>
                      <p className="text-sm font-medium text-text">Show Costs</p>
                      <p className="text-xs text-text-secondary">
                        Display investment and cost metrics
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setConfig({ ...config, show_cost: !config.show_cost })}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      config.show_cost ? "bg-primary" : "bg-border"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                        config.show_cost ? "translate-x-6" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>

                {/* Permitir selección de fechas */}
                <div className="flex items-center justify-between p-3 bg-background rounded-lg">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-text-secondary" />
                    <div>
                      <p className="text-sm font-medium text-text">Allow Date Selection</p>
                      <p className="text-xs text-text-secondary">
                        Let viewers change the date range
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      setConfig({ ...config, allow_date_selection: !config.allow_date_selection })
                    }
                    className={`w-12 h-6 rounded-full transition-colors ${
                      config.allow_date_selection ? "bg-primary" : "bg-border"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                        config.allow_date_selection ? "translate-x-6" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>

                {/* Rango de fechas por defecto */}
                <div>
                  <label className="block text-sm font-medium text-text mb-1">
                    Default Date Range
                  </label>
                  <select
                    value={config.date_range_days}
                    onChange={(e) =>
                      setConfig({ ...config, date_range_days: parseInt(e.target.value) })
                    }
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value={7}>Last 7 days</option>
                    <option value={14}>Last 14 days</option>
                    <option value={30}>Last 30 days</option>
                    <option value={60}>Last 60 days</option>
                    <option value={90}>Last 90 days</option>
                  </select>
                </div>

                {/* Contraseña opcional */}
                <div>
                  <label className="block text-sm font-medium text-text mb-1">
                    <Lock className="w-4 h-4 inline mr-1" />
                    Password Protection (optional)
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Leave empty for no password"
                      className="w-full px-3 py-2 pr-10 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expiración */}
                <div>
                  <label className="block text-sm font-medium text-text mb-1">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Expiration (optional)
                  </label>
                  <select
                    value={expiresInDays || ""}
                    onChange={(e) =>
                      setExpiresInDays(e.target.value ? parseInt(e.target.value) : null)
                    }
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">Never expires</option>
                    <option value={7}>7 days</option>
                    <option value={30}>30 days</option>
                    <option value={90}>90 days</option>
                    <option value={180}>6 months</option>
                    <option value={365}>1 year</option>
                  </select>
                </div>

                {/* Branding opcional */}
                <div>
                  <label className="block text-sm font-medium text-text mb-1">
                    <Palette className="w-4 h-4 inline mr-1" />
                    Brand Name (optional)
                  </label>
                  <input
                    type="text"
                    value={config.brand_name || ""}
                    onChange={(e) => setConfig({ ...config, brand_name: e.target.value || undefined })}
                    placeholder="Your agency or company name"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>
            )}

            {/* Step 3: Resultado */}
            {step === 3 && (
              <div className="space-y-4 text-center">
                <div className="w-16 h-16 mx-auto rounded-full bg-green-500/10 flex items-center justify-center">
                  <Check className="w-8 h-8 text-green-500" />
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-text">Link Created!</h3>
                  <p className="text-sm text-text-secondary mt-1">
                    Share this link with your client to give them access to the dashboard
                  </p>
                </div>

                {/* URL del link */}
                <div className="p-3 bg-background rounded-lg border border-border">
                  <p className="text-xs text-text-secondary mb-2">Share URL:</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={shareUrl}
                      readOnly
                      className="flex-1 px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text font-mono"
                    />
                    <button
                      onClick={copyToClipboard}
                      className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-1 ${
                        copied
                          ? "bg-green-500 text-white"
                          : "bg-primary text-white hover:bg-primary/90"
                      }`}
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copied ? "Copied!" : "Copy"}
                    </button>
                  </div>
                </div>

                {/* Info adicional */}
                <div className="text-left p-3 bg-primary/5 border border-primary/20 rounded-lg text-sm">
                  <p className="font-medium text-text mb-1">What your client will see:</p>
                  <ul className="text-text-secondary space-y-1 text-xs">
                    <li>• Aggregated metrics from {selectedAccountIds.length} account(s)</li>
                    <li>• {config.show_cost ? "Including" : "Excluding"} cost information</li>
                    {password && <li>• Protected with password</li>}
                    {expiresInDays && <li>• Expires in {expiresInDays} days</li>}
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-background/50">
            {step === 1 && (
              <>
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm text-text-secondary hover:text-text transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setStep(2)}
                  disabled={!name.trim() || selectedAccountIds.length === 0}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next: Configure
                </button>
              </>
            )}
            
            {step === 2 && (
              <>
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-2 text-sm text-text-secondary hover:text-text transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleCreate}
                  disabled={loading}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <LinkIcon className="w-4 h-4" />
                      Create Link
                    </>
                  )}
                </button>
              </>
            )}
            
            {step === 3 && (
              <button
                onClick={onClose}
                className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                Done
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
