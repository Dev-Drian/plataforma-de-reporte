import { Router } from 'express'
import { getAccounts, getAccount, createAccount, updateAccount, deleteAccount, toggleAccountStatus, restoreAccount, batchToggleAccountStatus } from '../controllers/accounts.controller'
import { authMiddleware } from '../middlewares/auth.middleware'

const router = Router()

router.use(authMiddleware)

router.get('', getAccounts)
router.get('/:id', getAccount)
router.post('', createAccount)
router.put('/:id', updateAccount)
router.delete('/:id', deleteAccount)
router.patch('/:id/toggle-status', toggleAccountStatus)
router.post('/:id/restore', restoreAccount)
router.post('/batch/toggle-status', batchToggleAccountStatus)

export default router




