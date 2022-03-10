import { defaultTimeToExpiryInSeconds } from "@domain/bitcoin/lightning/invoice-expiration"
import { DealerPriceServiceError } from "@domain/dealer-price"
import { NotImplementedError, NotReachableError } from "@domain/errors"
import { WalletCurrency } from "@domain/shared"

export const AmountConverter = ({
  dealerFns,
}: AmountConverterConfig): AmountConverter => {
  const addAmountsForFutureBuy = <S extends WalletCurrency>(
    builder: LightningPaymentFlowBuilder<S>,
  ) => {
    const btcAmount = builder.btcPaymentAmount()
    if (btcAmount === undefined) {
      const usdAmount = builder.usdPaymentAmount()
      if (usdAmount === undefined) {
        throw Error("No amount specified")
      }
      dealerFns.getBtcFromUsdForFutureBuy(usdAmount)
    }

    return builder as LightningPaymentFlowBuilderWithAmounts<S>
  }
  return {
    addAmountsForFutureBuy,
  }
}
