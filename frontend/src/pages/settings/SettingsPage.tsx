"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Link2, Settings, Users, CreditCard } from "lucide-react"
import OAuthConfigPage from "./OAuthConfigPage"
import { Card } from "../../components/common"

type SettingsTab = "oauth" | "general" | "team" | "billing"

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("oauth")

  const tabs = [
    { id: "oauth" as const, label: "Integrations", icon: Link2 },
    { id: "general" as const, label: "General", icon: Settings },
    { id: "team" as const, label: "Team", icon: Users },
    { id: "billing" as const, label: "Billing", icon: CreditCard },
  ]

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-text mb-2">Settings</h1>
            <p className="text-text-secondary">Manage your workspace configuration and integrations</p>
          </div>
        </div>

        <Card className="p-2 border-2 border-border">
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all duration-200 whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-primary text-white shadow-lg shadow-primary/30"
                    : "text-text-secondary hover:text-text hover:bg-surface"
                }`}
              >
                <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? "text-white" : ""}`} />
                {tab.label}
              </button>
            ))}
          </div>
        </Card>
      </motion.div>

      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {activeTab === "oauth" && <OAuthConfigPage />}
        {activeTab === "general" && (
          <Card className="p-8 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-gray-500/20 to-gray-600/20 flex items-center justify-center">
                <Settings className="w-8 h-8 text-gray-600" />
              </div>
              <h3 className="text-xl font-bold text-text mb-2">General Settings</h3>
              <p className="text-text-secondary">Coming soon...</p>
            </div>
          </Card>
        )}
        {activeTab === "team" && (
          <Card className="p-8 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-600/20 flex items-center justify-center">
                <Users className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-text mb-2">Team Settings</h3>
              <p className="text-text-secondary">Coming soon...</p>
            </div>
          </Card>
        )}
        {activeTab === "billing" && (
          <Card className="p-8 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-green-500/20 to-green-600/20 flex items-center justify-center">
                <CreditCard className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-text mb-2">Billing Settings</h3>
              <p className="text-text-secondary">Coming soon...</p>
            </div>
          </Card>
        )}
      </motion.div>
    </div>
  )
}
