import { AccountsRepository, WalletsRepository } from "@services/mongoose"

export const addWallet = async ({
  accountId,
  type,
}: {
  accountId: AccountId
  type: WalletType
}) => {
  const account = await AccountsRepository().findById(accountId)
  if (account instanceof Error) return account

  const wallet = await WalletsRepository().persistNew({
    accountId,
    type,
  })
  if (wallet instanceof Error) return wallet

  if (!account.defaultWalletId) {
    account.defaultWalletId = wallet.id
  }

  account.walletIds.push(wallet.id)
  const result = await AccountsRepository().update(account)
  if (result instanceof Error) return result

  return wallet
}