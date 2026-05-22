/**
 * ShareLinksPage - Página para gestionar los links de compartir dashboards
 */
import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { 
  Link as LinkIcon, 
  Plus, 
  Copy, 
  Check, 
  Trash2, 
  ExternalLink,
  RefreshCw,
  Lock,
  Calendar,
  Eye,
  AlertCircle
} from "lucide-react"
import { toast } from "sonner"
import Card from "../../components/common/Card"
import LoadingSpinner from "../../components/common/LoadingSpinner"
import { accountsService, type Account } from "../../services/accounts"
import { 
  shareLinksService, 
  type ShareLink 
} from "../../services/analytics/shareLinks.service"
import CreateShareLinkModal from "../../components/dashboard/CreateShareLinkModal"

const PLATFORM_COLORS: Record<string, string> = {
  google: "#4285F4",
  meta: "#0084FF",
  linkedin: "#0077B5",
  tiktok: "#000000",
}

const PLATFORM_ICONS: Record<string, string> = {
  google: "🔍",
  meta: "📘",
  linkedin: "💼",
  tiktok: "🎵",
}

export default function ShareLinksPage() {
  const [loading, setLoading] = useState(true)
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  // Cargar datos
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [linksData, accountsData] = await Promise.all([
        shareLinksService.getShareLinks(),
        accountsService.getAccounts()
      ])
      setShareLinks(linksData)
      setAccounts(accountsData.filter(a => a.is_active && a.account_type === "ads"))
    } catch (error: any) {
      toast.error("Error loading share links")
    } finally {
      setLoading(false)
    }
  }

  // Copiar link
  const copyLink = async (link: ShareLink) => {
    try {
      await navigator.clipboard.writeText(link.share_url)
      setCopiedId(link.id)
      toast.success("Link copied to clipboard!")
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      toast.error("Could not copy link")
    }
  }

  // Eliminar link
  const deleteLink = async (id: number) => {
    if (!confirm("Are you sure you want to delete this share link? This action cannot be undone.")) {
      return
    }

    setDeletingId(id)
    try {
      await shareLinksService.deleteShareLink(id)
      setShareLinks(prev => prev.filter(l => l.id !== id))
      toast.success("Share link deleted")
    } catch (error: any) {
      toast.error("Error deleting share link")
    } finally {
      setDeletingId(null)
    }
  }

  // Regenerar token
  const regenerateToken = async (id: number) => {
    if (!confirm("Regenerating the token will invalidate the current link. Continue?")) {
      return
    }

    try {
      const result = await shareLinksService.regenerateToken(id)
      setShareLinks(prev => prev.map(l => 
        l.id === id ? { ...l, token: result.token, share_url: result.share_url } : l
      ))
      toast.success("Token regenerated successfully")
    } catch (error: any) {
      toast.error("Error regenerating token")
    }
  }

  // Toggle estado activo
  const toggleActive = async (link: ShareLink) => {
    try {
      await shareLinksService.updateShareLink(link.id, { is_active: !link.is_active })
      setShareLinks(prev => prev.map(l => 
        l.id === link.id ? { ...l, is_active: !l.is_active } : l
      ))
      toast.success(link.is_active ? "Link deactivated" : "Link activated")
    } catch (error: any) {
      toast.error("Error updating share link")
    }
  }

  // Formatear fecha
  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "N/A"
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Share Links</h1>
          <p className="text-sm text-text-secondary">
            Create and manage dashboard links for your clients
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="px-3 py-2 text-sm bg-background border border-border rounded-lg text-text hover:bg-background-secondary transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Link
          </button>
        </div>
      </div>

      {/* Empty State */}
      {shareLinks.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
            <LinkIcon className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-text mb-2">No Share Links Yet</h3>
          <p className="text-text-secondary mb-6 max-w-md mx-auto">
            Create share links to give your clients access to specific dashboard data without requiring them to log in.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors inline-flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create Your First Link
          </button>
        </Card>
      ) : (
        /* Lista de links */
        <div className="grid gap-4">
          {shareLinks.map((link) => (
            <motion.div
              key={link.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Card className={`p-4 ${!link.is_active ? "opacity-60" : ""}`}>
                <div className="flex items-start justify-between gap-4">
                  {/* Info principal */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-text truncate">{link.name}</h3>
                      {link.has_password && (
                        <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded-full flex items-center gap-1">
                          <Lock className="w-3 h-3" />
                          Protected
                        </span>
                      )}
                      {!link.is_active && (
                        <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded-full">
                          Inactive
                        </span>
                      )}
                      {link.expires_at && new Date(link.expires_at) < new Date() && (
                        <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded-full flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Expired
                        </span>
                      )}
                    </div>

                    {/* Cuentas incluidas */}
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      {link.accounts.slice(0, 5).map((acc, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs text-white"
                          style={{ backgroundColor: PLATFORM_COLORS[acc.platform] || "#666" }}
                        >
                          {PLATFORM_ICONS[acc.platform]} {acc.account_name}
                        </span>
                      ))}
                      {link.accounts.length > 5 && (
                        <span className="text-xs text-text-secondary">
                          +{link.accounts.length - 5} more
                        </span>
                      )}
                    </div>

                    {/* URL */}
                    <div className="flex items-center gap-2 mb-3">
                      <input
                        type="text"
                        value={link.share_url}
                        readOnly
                        className="flex-1 px-3 py-1.5 text-sm bg-background border border-border rounded-lg text-text-secondary font-mono truncate"
                      />
                      <button
                        onClick={() => copyLink(link)}
                        className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 text-sm ${
                          copiedId === link.id
                            ? "bg-green-500 text-white"
                            : "bg-primary text-white hover:bg-primary/90"
                        }`}
                      >
                        {copiedId === link.id ? (
                          <>
                            <Check className="w-4 h-4" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            Copy
                          </>
                        )}
                      </button>
                      <a
                        href={link.share_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-text-secondary hover:text-text transition-colors"
                        title="Open in new tab"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-4 text-xs text-text-secondary">
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {link.access_count} views
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Created {formatDate(link.created_at)}
                      </span>
                      {link.last_accessed && (
                        <span>Last viewed {formatDate(link.last_accessed)}</span>
                      )}
                      {link.expires_at && (
                        <span className={new Date(link.expires_at) < new Date() ? "text-red-500" : ""}>
                          Expires {formatDate(link.expires_at)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => toggleActive(link)}
                      className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                        link.is_active
                          ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                          : "bg-green-100 text-green-700 hover:bg-green-200"
                      }`}
                    >
                      {link.is_active ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      onClick={() => regenerateToken(link.id)}
                      className="p-2 text-text-secondary hover:text-text hover:bg-background-secondary rounded-lg transition-colors"
                      title="Regenerate token"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteLink(link.id)}
                      disabled={deletingId === link.id}
                      className="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Delete link"
                    >
                      {deletingId === link.id ? (
                        <div className="w-4 h-4 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal crear link */}
      <CreateShareLinkModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        accounts={accounts}
        onSuccess={() => {
          loadData()
        }}
      />
    </div>
  )
}
