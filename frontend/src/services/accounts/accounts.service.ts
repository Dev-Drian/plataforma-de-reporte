import api from '../config/api'
import { ApiResponse } from '../config/types'

export interface Account {
  id: number
  organization_id: number
  platform: string
  account_type: string
  account_id: string
  account_name: string | null
  is_active: boolean
  parent_account_id: number | null
  last_sync: string | null
  deleted_at: string | null
  created_at: string
  updated_at: string
}


class AccountsService {
  async getAccounts(includeDeleted: boolean = false): Promise<Account[]> {
    const url = includeDeleted ? '/accounts?include_deleted=true' : '/accounts'
    const response = await api.get<ApiResponse<Account[]>>(url)
    
    if (response.data.success && response.data.data) {
      return response.data.data
    }
    
    throw new Error(response.data.message || 'Error getting accounts')
  }

  async getAccount(id: number): Promise<Account> {
    const response = await api.get<ApiResponse<Account>>(`/accounts/${id}`)
    
    if (response.data.success && response.data.data) {
      return response.data.data
    }
    
    throw new Error(response.data.message || 'Error getting account')
  }

  async createAccount(data: Partial<Account>): Promise<Account> {
    const response = await api.post<ApiResponse<Account>>('/accounts', data)
    
    if (response.data.success && response.data.data) {
      return response.data.data
    }
    
    throw new Error(response.data.message || 'Error creating account')
  }

  async updateAccount(id: number, data: Partial<Account>): Promise<Account> {
    const response = await api.put<ApiResponse<Account>>(`/accounts/${id}`, data)
    
    if (response.data.success && response.data.data) {
      return response.data.data
    }
    
    throw new Error(response.data.message || 'Error updating account')
  }

  async deleteAccount(id: number, hardDelete: boolean = false): Promise<Account> {
    const response = await api.delete<ApiResponse<Account>>(`/accounts/${id}?hard_delete=${hardDelete}`)
    
    if (response.data.success && response.data.data) {
      return response.data.data
    }
    
    throw new Error(response.data.message || 'Error deleting account')
  }

  async toggleAccountStatus(id: number): Promise<Account> {
    const response = await api.patch<ApiResponse<Account>>(`/accounts/${id}/toggle-status`)
    
    if (response.data.success && response.data.data) {
      return response.data.data
    }
    
    throw new Error(response.data.message || 'Error changing account status')
  }

  async restoreAccount(id: number): Promise<Account> {
    const response = await api.post<ApiResponse<Account>>(`/accounts/${id}/restore`)
    
    if (response.data.success && response.data.data) {
      return response.data.data
    }
    
    throw new Error(response.data.message || 'Error restoring account')
  }

  async batchToggleStatus(accountIds: number[], isActive: boolean): Promise<Account[]> {
    const response = await api.post<ApiResponse<Account[]>>('/accounts/batch/toggle-status', {
      account_ids: accountIds,
      is_active: isActive
    })
    
    if (response.data.success && response.data.data) {
      return response.data.data
    }
    
    throw new Error(response.data.message || 'Error changing accounts status')
  }
}

export const accountsService = new AccountsService()



