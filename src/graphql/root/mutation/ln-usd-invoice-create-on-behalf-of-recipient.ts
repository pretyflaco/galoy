import { Wallets } from "@app"
import { mapError } from "@graphql/error-map"
import { GT } from "@graphql/index"

import LnInvoicePayload from "@graphql/types/payload/ln-invoice"
import Memo from "@graphql/types/scalar/memo"
import Hex32Bytes from "@graphql/types/scalar/hex32bytes"
import CentAmount from "@graphql/types/scalar/cent-amount"
import WalletId from "@graphql/types/scalar/wallet-id"
import { WalletsRepository } from "@services/mongoose"
import { WalletCurrency } from "@domain/shared"
import dedent from "dedent"

const LnUsdInvoiceCreateOnBehalfOfRecipientInput = GT.Input({
  name: "LnUsdInvoiceCreateOnBehalfOfRecipientInput",
  fields: () => ({
    recipientWalletId: {
      type: GT.NonNull(WalletId),
      description: "Wallet ID for a USD wallet which belongs to the account of any user.",
    },
    amount: { type: GT.NonNull(CentAmount), description: "Amount in USD cents." },
    memo: {
      type: Memo,
      description:
        "Optional memo for the lightning invoice. Acts as a note to the recipient.",
    },
    descriptionHash: { type: Hex32Bytes },
  }),
})

const LnUsdInvoiceCreateOnBehalfOfRecipientMutation = GT.Field({
  type: GT.NonNull(LnInvoicePayload),
  description: dedent`Returns a lightning invoice denominated in satoshis for an associated wallet.
  When invoice is paid the equivalent value at invoice creation will be credited to a USD wallet.
  Expires after 2 minutes (short expiry time because there is a USD/BTC exchange rate
    associated with the amount).`,
  args: {
    input: { type: GT.NonNull(LnUsdInvoiceCreateOnBehalfOfRecipientInput) },
  },
  resolve: async (_, args) => {
    const { recipientWalletId, amount, memo, descriptionHash } = args.input
    for (const input of [recipientWalletId, amount, memo, descriptionHash]) {
      if (input instanceof Error) {
        return { errors: [{ message: input.message }] }
      }
    }

    const wallet = await WalletsRepository().findById(recipientWalletId)
    if (wallet instanceof Error)
      return { errors: [{ message: mapError(wallet).message }] }

    const MutationDoesNotMatchWalletCurrencyError =
      "MutationDoesNotMatchWalletCurrencyError"
    if (wallet.currency === WalletCurrency.Btc) {
      return { errors: [{ message: MutationDoesNotMatchWalletCurrencyError }] }
    }

    const invoice = await Wallets.addInvoiceForRecipient({
      recipientWalletId,
      amount,
      memo,
      descriptionHash,
    })

    if (invoice instanceof Error) {
      const appErr = mapError(invoice)
      return { errors: [{ message: appErr.message || appErr.name }] } // TODO: refine error
    }

    return {
      errors: [],
      invoice,
    }
  },
})

export default LnUsdInvoiceCreateOnBehalfOfRecipientMutation
