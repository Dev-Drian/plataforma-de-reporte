"use client"

import { useState, useEffect, type MouseEvent } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { motion } from "framer-motion"
import { Plus, Edit, Globe, Key, Link as LinkIcon, FileText, Lock, AlertTriangle } from "lucide-react"
import { Card, Button, FormField, Select, Modal } from "../../components/common"
import { useApi } from "../../hooks/useApi"
import { oauthService, type OAuthConfig, type OAuthConfigCreate, type OAuthProvider } from "../../services/auth"

// platformLabels will be loaded dynamically from providers
const platformLabels: Record<string, string> = {}

type OAuthConfigFormData = Record<string, string>

function OAuthConfigPage() {
  const [configs, setConfigs] = useState<OAuthConfig[]>([])
  const [providers, setProviders] = useState<OAuthProvider[]>([])
  const [loadingProviders, setLoadingProviders] = useState(false)
  const [editingConfig, setEditingConfig] = useState<OAuthConfig | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loadingConfigs, setLoadingConfigs] = useState(false)
  const [duplicatePlatform, setDuplicatePlatform] = useState<string | null>(null)
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false)
  const [pendingFormData, setPendingFormData] = useState<OAuthConfigFormData | null>(null)
  const { execute: createConfig, loading } = useApi(oauthService.createConfig)
  const { execute: updateConfigWrapper, loading: updating } = useApi(
    async (params: { platform: string; data: Partial<OAuthConfigCreate> }) => {
      return await oauthService.updateConfig(params.platform, params.data)
    },
  )

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<OAuthConfigFormData>({
    mode: "onChange",
    defaultValues: {
      platform: "",
    },
  })

  const selectedPlatform = watch("platform")
  const selectedProvider = providers.find((p) => p.name === selectedPlatform)

  // Validación manual en onSubmit

  // Get register props for platform
  const platformRegister = register("platform")

  // Update default values when provider changes
  useEffect(() => {
    if (selectedProvider && !editingConfig) {
      const newDefaultValues: Record<string, string> = {
        platform: selectedPlatform || "",
        ...Object.keys(selectedProvider.required_fields || {}).reduce(
          (acc, key) => {
            const fieldConfig = selectedProvider.required_fields[key]
            // Usar default_value si existe, sino dejar vacío
            if (fieldConfig.default_value) {
              // Para redirect_uri, construir la URL completa
              if (key === "redirect_uri") {
                acc[key] = window.location.origin + fieldConfig.default_value
              } else {
                acc[key] = fieldConfig.default_value
              }
            } else {
              acc[key] = ""
            }
            return acc
          },
          {} as Record<string, string>,
        ),
      }
      reset(newDefaultValues)
    }
  }, [selectedPlatform, selectedProvider, reset, editingConfig])

  // Load providers and existing configurations
  useEffect(() => {
    loadProviders()
    loadConfigs()
  }, [])

  const loadProviders = async () => {
    setLoadingProviders(true)
    try {
      const providersData = await oauthService.getProviders()
      setProviders(providersData)

      // Update platformLabels dynamically
      providersData.forEach((provider) => {
        platformLabels[provider.name] = provider.display_name
      })
    } catch (error: any) {
      console.error("Error loading providers:", error)
      toast.error("Error loading available OAuth providers")
    } finally {
      setLoadingProviders(false)
    }
  }

  // Debug: verificar cambios en showDuplicateDialog
  useEffect(() => {
    if (showDuplicateDialog) {
      console.log("Duplicate modal is open")
      console.log("Duplicate platform:", duplicatePlatform)
    }
  }, [showDuplicateDialog, duplicatePlatform])

  const loadConfigs = async () => {
    setLoadingConfigs(true)
    try {
      const existingConfigs = await oauthService.getConfigs()
      setConfigs(existingConfigs || [])
    } catch (error: any) {
      setConfigs([])
    } finally {
      setLoadingConfigs(false)
    }
  }

  const handleNewConfig = () => {
    setEditingConfig(null)
    reset({
      platform: "",
    })
    setIsModalOpen(true)
  }

  const handleEdit = (config: OAuthConfig) => {
    setEditingConfig(config)
    const provider = providers.find((p) => p.name === config.platform)
    const formData: Record<string, string> = {
      platform: config.platform,
    }

    if (provider) {
      Object.keys(provider.required_fields || {}).forEach((key) => {
        if (key === "client_id") {
          formData[key] = config.client_id
        } else if (key === "client_secret") {
          formData[key] = config.client_secret || ""
        } else if (key === "redirect_uri") {
          formData[key] = config.redirect_uri || window.location.origin + "/settings/oauth"
        } else if (key === "scopes") {
          formData[key] = config.scopes?.join(", ") || ""
        } else {
          formData[key] = ""
        }
      })
    }

    reset(formData)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingConfig(null)
    reset({
      platform: "",
    })
  }

  const onSubmit = async (data: OAuthConfigFormData) => {
    try {
      // Manually validate that required fields are not empty
      if (!data.platform || data.platform.trim() === "") {
        toast.error("Platform is required")
        return
      }

      const provider = providers.find((p) => p.name === data.platform)
      if (!provider) {
        toast.error("Provider not found")
        return
      }

      // Validate provider required fields
      for (const [fieldName, fieldConfig] of Object.entries(provider.required_fields || {})) {
        if (fieldConfig.required && (!data[fieldName] || data[fieldName].trim() === "")) {
          toast.error(`${fieldConfig.label} is required`)
          return
        }
      }

      // Construir configData dinámicamente
      const configData: Record<string, any> = {
        platform: data.platform.trim(),
      }

      Object.entries(provider.required_fields || {}).forEach(([fieldName]) => {
        const value = data[fieldName]?.trim()
        if (fieldName === "scopes" && value) {
          const scopesArray = value
            .split(",")
            .map((s: string) => s.trim())
            .filter(Boolean)

          // Validate scopes for Google
          if (data.platform === "google") {
            const invalidScopes = scopesArray.filter((scope) => !scope.startsWith("https://www.googleapis.com/auth/"))

            if (invalidScopes.length > 0) {
              toast.error(
                `Invalid scopes for Google: ${invalidScopes.join(", ")}. Scopes must start with "https://www.googleapis.com/auth/"`,
              )
              throw new Error("Invalid scopes")
            }
          }

          configData.scopes = scopesArray
        } else if (fieldName === "redirect_uri" && value) {
          configData.redirect_uri = value
        } else if (fieldName === "client_id") {
          configData.client_id = value
        } else if (fieldName === "client_secret") {
          configData.client_secret = value
        } else if (value) {
          configData[fieldName] = value
        }
      })

      if (editingConfig) {
        // Use PUT to update
        await updateConfigWrapper({ platform: editingConfig.platform, data: configData })
        toast.success("OAuth configuration updated successfully")
        await loadConfigs()
        handleCloseModal()
      } else {
        // Use POST to create
        try {
          await createConfig(configData as OAuthConfigCreate)
          toast.success("OAuth configuration saved successfully")
          await loadConfigs()
          handleCloseModal()
        } catch (error: any) {
          // If it's a 409 error (duplicate platform), show dialog
          // Check multiple places where status might be
          const status =
            error?.response?.status ||
            error?.statusCode ||
            error?.status ||
            error?.response?.data?.statusCode ||
            (error?.response?.data && error.response.data.statusCode)

          // Also check message if it contains duplicate information
          const isDuplicateError =
            status === 409 ||
            error?.response?.status === 409 ||
            error?.message?.toLowerCase().includes("already exists") ||
            error?.message?.toLowerCase().includes("duplicate") ||
            error?.response?.data?.message?.toLowerCase().includes("already exists") ||
            error?.response?.data?.message?.toLowerCase().includes("duplicate")

          if (isDuplicateError) {
            // Update state directly (without setTimeout for better performance)
            setDuplicatePlatform(data.platform.trim())
            setPendingFormData(data)
            setShowDuplicateDialog(true)
            return
          }

          // For other errors, show toast
          const errorMessage = error?.message || error?.response?.data?.message || "Error saving configuration"
          toast.error(errorMessage)
        }
      }
    } catch (error: any) {
      // Check if it's a 409 error that wasn't caught before
      const is409 =
        error.statusCode === 409 ||
        error.status === 409 ||
        error.response?.status === 409 ||
        error.response?.data?.statusCode === 409

      if (is409 && !showDuplicateDialog) {
        // Only if we're not in edit mode and dialog hasn't been shown
        const platform = editingConfig?.platform || error.platform || ""
        if (platform) {
          setDuplicatePlatform(platform)
          setPendingFormData(null)
          setShowDuplicateDialog(true)
          return
        }
      }

      toast.error(error.message || "Error saving configuration")
    }
  }

  const handleEditExisting = async () => {
    if (!duplicatePlatform || !pendingFormData) return

    try {
      // Prepare data for update
      const scopesArray = pendingFormData.scopes
        ? pendingFormData.scopes
            .split(",")
            .map((s: string) => s.trim())
            .filter(Boolean)
        : []

      const configData = {
        platform: pendingFormData.platform.trim(),
        client_id: pendingFormData.client_id.trim(),
        client_secret: pendingFormData.client_secret.trim(),
        redirect_uri: pendingFormData.redirect_uri?.trim() || undefined,
        scopes: scopesArray.length > 0 ? scopesArray : undefined,
      }

      // Update the existing configuration
      await updateConfigWrapper({ platform: duplicatePlatform, data: configData })

      // Cerrar el diálogo de duplicado
      setShowDuplicateDialog(false)
      setDuplicatePlatform(null)

      // Close the creation modal
      setIsModalOpen(false)

      // Reload configurations to get updated data
      await loadConfigs()

      // Load the updated configuration
      const updatedConfig = await oauthService.getConfig(duplicatePlatform)

      // Open the edit modal with the updated configuration
      setEditingConfig(updatedConfig)
      reset({
        platform: updatedConfig.platform,
        client_id: updatedConfig.client_id,
        client_secret: updatedConfig.client_secret || "",
        redirect_uri: updatedConfig.redirect_uri || window.location.origin + "/settings/oauth",
        scopes: updatedConfig.scopes?.join(", ") || "",
      })

      setIsModalOpen(true)
      toast.success("OAuth configuration updated successfully")
    } catch (error: any) {
      toast.error(error.message || "Error updating configuration")
    } finally {
      setPendingFormData(null)
    }
  }

  const handleCancelDuplicate = () => {
    setShowDuplicateDialog(false)
    setDuplicatePlatform(null)
    setPendingFormData(null)
  }

  // Get required fields from selected provider
  const getProviderFields = () => {
    if (!selectedProvider) return []
    return Object.entries(selectedProvider.required_fields || {})
  }

  // Platform options for the select
  const platformOptions = providers.map((p) => ({
    value: p.name,
    label: p.display_name,
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h2 className="text-2xl font-bold text-text mb-1">OAuth Configurations</h2>
          <p className="text-text-secondary">Manage authentication credentials for platform integrations</p>
        </div>
        <motion.button
          onClick={handleNewConfig}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
        >
          <Plus className="w-5 h-5" />
          New Configuration
        </motion.button>
      </motion.div>

      {/* Grid de configuraciones OAuth */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        {loadingConfigs ? (
          <Card className="p-12">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </Card>
        ) : configs.length === 0 ? (
          <Card className="p-16 border-2 border-dashed border-border">
            <div className="text-center max-w-md mx-auto">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                <Lock className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-text mb-2">No OAuth configurations</h3>
              <p className="text-text-secondary mb-6">
                Create your first OAuth configuration to start connecting platform accounts
              </p>
              <motion.button
                onClick={handleNewConfig}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all mx-auto"
              >
                <Plus className="w-5 h-5" />
                Create First Configuration
              </motion.button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {configs.map((config, index) => (
              <motion.div
                key={config.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <motion.div
                  onClick={() => handleEdit(config)}
                  className="cursor-pointer"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                <Card
                  className="p-6 hover:shadow-xl hover:border-primary/40 transition-all duration-200 h-full flex flex-col group border-2 border-border"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                        <Globe className="w-6 h-6 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-text text-lg mb-1 capitalize truncate group-hover:text-primary transition-colors">
                          {platformLabels[config.platform] || config.platform}
                        </h3>
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-2 h-2 rounded-full ${config.is_active ? "bg-green-500" : "bg-gray-400"}`}
                          />
                          <span className="text-xs font-medium text-text-secondary">
                            {config.is_active ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e: MouseEvent) => {
                        e.stopPropagation()
                        handleEdit(config)
                      }}
                      className="p-2 hover:bg-primary/10 rounded-lg transition-colors flex-shrink-0"
                    >
                      <Edit className="w-5 h-5 text-text-secondary group-hover:text-primary" />
                    </Button>
                  </div>

                  <div className="space-y-3 flex-1">
                    <div className="p-3 bg-surface rounded-lg border border-border">
                      <p className="text-xs text-text-secondary uppercase font-semibold mb-1">Client ID</p>
                      <p className="text-sm text-text font-mono truncate">{config.client_id}</p>
                    </div>

                    {config.redirect_uri && (
                      <div className="p-3 bg-surface rounded-lg border border-border">
                        <p className="text-xs text-text-secondary uppercase font-semibold mb-1">Redirect URI</p>
                        <p className="text-sm text-text truncate">{config.redirect_uri}</p>
                      </div>
                    )}

                    {config.scopes && config.scopes.length > 0 && (
                      <div className="p-3 bg-surface rounded-lg border border-border">
                        <p className="text-xs text-text-secondary uppercase font-semibold mb-2">Scopes</p>
                        <div className="flex flex-wrap gap-1">
                          {config.scopes.slice(0, 2).map((scope, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary"
                            >
                              {scope.split("/").pop()}
                            </span>
                          ))}
                          {config.scopes.length > 2 && (
                            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-500/10 text-text-secondary">
                              +{config.scopes.length - 2} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t border-border text-xs text-text-secondary">
                    Updated{" "}
                    {new Date(config.updated_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </div>
                </Card>
                </motion.div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Modal to create/edit configuration */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingConfig ? "Edit OAuth Configuration" : "New OAuth Configuration"}
        size="lg"
        footer={
          <div className="flex gap-4 justify-end">
            <Button type="button" variant="outline" onClick={handleCloseModal} disabled={loading || updating}>
              Cancel
            </Button>
            <Button type="submit" form="oauth-config-form" loading={loading || updating}>
              {editingConfig ? "Update" : "Save"}
            </Button>
          </div>
        }
      >
        <form id="oauth-config-form" onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          >
            <Select
              label="Platform"
              options={platformOptions}
              placeholder="Select a platform"
              error={errors.platform?.message}
              helperText="Platform for which you are configuring OAuth"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                  />
                </svg>
              }
              {...platformRegister}
              required
              disabled={!!editingConfig || loadingProviders}
            />
          </motion.div>

          {/* Campos dinámicos basados en el provider seleccionado */}
          {selectedProvider &&
            (() => {
              const fields = getProviderFields()
              // Filter only visible fields (not hidden)
              const visibleFields = fields.filter(([_, config]) => config.type !== "hidden")
              // Separate fields by type for better organization
              const textFields = visibleFields.filter(
                ([_, config]) => config.type === "text" || config.type === "password",
              )
              const urlFields = visibleFields.filter(([_, config]) => config.type === "url")
              const textareaFields = visibleFields.filter(([_, config]) => config.type === "textarea")

              return (
                <>
                  {/* Campos de texto (Client ID, Client Secret, etc.) - en grid de 2 columnas */}
                  {textFields.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {textFields.map(([fieldName, fieldConfig], index) => {
                        const fieldRegister = register(fieldName as keyof OAuthConfigFormData)
                        const fieldError = errors[fieldName as keyof typeof errors]

                        const getFieldIcon = () => {
                          if (fieldConfig.type === "password") {
                            return <Lock className="w-5 h-5" />
                          }
                          return <Key className="w-5 h-5" />
                        }

                        return (
                          <motion.div
                            key={fieldName}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.1 }}
                          >
                            <FormField
                              label={fieldConfig.label}
                              type={fieldConfig.type}
                              placeholder={fieldConfig.placeholder}
                              error={fieldError?.message}
                              helperText={fieldConfig.helper_text}
                              icon={getFieldIcon()}
                              {...fieldRegister}
                              required={fieldConfig.required}
                            />
                          </motion.div>
                        )
                      })}
                    </div>
                  )}

                  {/* Campos URL - ancho completo */}
                  {urlFields.map(([fieldName, fieldConfig], index) => {
                    const fieldRegister = register(fieldName as keyof OAuthConfigFormData)
                    const fieldError = errors[fieldName as keyof typeof errors]

                    return (
                      <motion.div
                        key={fieldName}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: (textFields.length + index) * 0.1 }}
                      >
                        <FormField
                          label={fieldConfig.label}
                          type={fieldConfig.type}
                          placeholder={fieldConfig.placeholder}
                          error={fieldError?.message}
                          helperText={fieldConfig.helper_text}
                          icon={<LinkIcon className="w-5 h-5" />}
                          {...fieldRegister}
                          required={fieldConfig.required}
                        />
                      </motion.div>
                    )
                  })}

                  {/* Campos textarea (Scopes) - ancho completo */}
                  {textareaFields.map(([fieldName, fieldConfig], index) => {
                    const fieldRegister = register(fieldName as keyof OAuthConfigFormData)
                    const fieldError = errors[fieldName as keyof typeof errors]

                    return (
                      <motion.div
                        key={fieldName}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: (textFields.length + urlFields.length + index) * 0.1 }}
                      >
                        <FormField
                          label={fieldConfig.label}
                          as="textarea"
                          rows={4}
                          placeholder={fieldConfig.placeholder}
                          error={fieldError?.message}
                          helperText={fieldConfig.helper_text}
                          icon={<FileText className="w-5 h-5" />}
                          {...fieldRegister}
                          required={fieldConfig.required}
                        />
                      </motion.div>
                    )
                  })}
                </>
              )
            })()}

          {!selectedProvider && selectedPlatform && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-text-secondary">
                Loading fields for {platformLabels[selectedPlatform] || selectedPlatform}...
              </p>
            </div>
          )}

          {!selectedPlatform && (
            <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
              <svg
                className="w-12 h-12 mx-auto mb-4 text-text-secondary/50"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className="text-text-secondary font-medium">
                Select a platform to see required fields
              </p>
              <p className="text-text-secondary/70 text-sm mt-2">
                Fields will be generated automatically based on the selected provider
              </p>
            </div>
          )}
        </form>
      </Modal>

      {/* Confirmation modal for duplicate platform */}
      <Modal
        isOpen={showDuplicateDialog}
        onClose={handleCancelDuplicate}
        title="Configuration Already Exists"
        size="md"
        footer={
          <div className="flex gap-4 justify-end">
            <Button type="button" variant="outline" onClick={handleCancelDuplicate}>
              Cancel
            </Button>
            <Button type="button" onClick={handleEditExisting} disabled={updating}>
              {updating ? (
                <span className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Updating...
                </span>
              ) : (
                "Update Existing"
              )}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="p-4 bg-yellow-500/10 border-2 border-yellow-500/20 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-text mb-1">Platform Already Configured</h4>
                <p className="text-sm text-text-secondary">
                  An OAuth configuration for <span className="font-semibold capitalize">{duplicatePlatform}</span>{" "}
                  already exists. Would you like to update it with the new credentials?
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button onClick={handleCancelDuplicate} variant="outline" className="flex-1 bg-transparent">
              Cancel
            </Button>
            <Button onClick={handleEditExisting} className="flex-1" disabled={updating}>
              {updating ? (
                <span className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Updating...
                </span>
              ) : (
                "Update Existing"
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default OAuthConfigPage
