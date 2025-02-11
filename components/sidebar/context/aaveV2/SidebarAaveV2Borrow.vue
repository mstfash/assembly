<template>
  <SidebarContextRootContainer>
    <template #title>Borrow {{ symbol }}</template>

    <SidebarRateTypeSelect
      class="flex flex-col items-center"
      v-model="rateType"
      :items="annualPercentageRateTypes"
      :borrow-stable-rate="borrowStableRate"
      :stable-borrow-enabled="stableBorrowEnabled"
    />

    <SidebarSectionValueWithIcon class="mt-6" label="Borrowed" center>
      <template #icon
        ><IconCurrency :currency="rootTokenKey" class="w-20 h-20" noHeight
      /></template>
      <template #value>{{ formatNumber(balance) }} {{ symbol }}</template>
    </SidebarSectionValueWithIcon>

    <div class="bg-[#C5CCE1] bg-opacity-[0.15] mt-10 p-8">
      <h3 class="text-primary-gray text-xs font-semibold mb-2.5">
        Amount to borrow
      </h3>

      <input-numeric
        v-model="amount"
        placeholder="Amount to borrow"
        :error="errors.amount.message"
      >
      </input-numeric>

      <SidebarContextHeading class="mt-5">
        Projected Debt Position
      </SidebarContextHeading>

      <SidebarSectionStatus
        class="mt-8"
        :liquidation="maxLiquidation"
        :status="status"
      />

      <SidebarSectionValueWithIcon class="mt-8" label="Liquidation Price (ETH)">
        <template #value>
          {{ formatUsdMax(liquidationPrice, liquidationMaxPrice) }}
          <span class="text-primary-gray"
            >/ {{ formatUsd(liquidationMaxPrice) }}</span
          >
        </template>
      </SidebarSectionValueWithIcon>

      <div class="flex flex-shrink-0 mt-10">
        <ButtonCTA
          class="w-full"
          :disabled="!isValid || pending"
          :loading="pending"
          @click="cast"
        >
          Borrow
        </ButtonCTA>
      </div>

      <ValidationErrors :error-messages="errorMessages" class="mt-6" />
    </div>
  </SidebarContextRootContainer>
</template>

<script>
import { computed, defineComponent, ref } from '@nuxtjs/composition-api'
import InputNumeric from '~/components/common/input/InputNumeric.vue'
import { useAaveV2Position } from '~/composables/protocols/useAaveV2Position'
import { useBalances } from '~/composables/useBalances'
import { useBigNumber } from '~/composables/useBigNumber'
import { useFormatting } from '~/composables/useFormatting'
import { useValidators } from '~/composables/useValidators'
import { useValidation } from '~/composables/useValidation'
import { useToken } from '~/composables/useToken'
import { useParsing } from '~/composables/useParsing'
import { useMaxAmountActive } from '~/composables/useMaxAmountActive'
import { useWeb3 } from '~/composables/useWeb3'
import atokens from '~/constant/atokens'
import ToggleButton from '~/components/common/input/ToggleButton.vue'
import { useDSA } from '~/composables/useDSA'
import ButtonCTA from '~/components/common/input/ButtonCTA.vue'
import { useNotification } from '~/composables/useNotification'
import Button from '~/components/Button.vue'
import { useSidebar } from '~/composables/useSidebar'

export default defineComponent({
  components: { InputNumeric, ToggleButton, ButtonCTA, Button },
  props: {
    tokenKey: { type: String, required: true },
  },
  setup(props) {
    const { close } = useSidebar()
    const { networkName, account } = useWeb3()
    const { dsa } = useDSA()
    const { getTokenByKey, valInt } = useToken()
    const { formatNumber, formatUsdMax, formatUsd } = useFormatting()
    const { isZero, gt, plus } = useBigNumber()
    const { parseSafeFloat } = useParsing()
    const { showPendingTransaction, showWarning, showConfirmedTransaction } = useNotification()
    const { fetchBalances } = useBalances();

    const { status, displayPositions, liquidation, maxLiquidation, liquidationPrice, liquidationMaxPrice, annualPercentageRateTypes, refreshPosition } = useAaveV2Position({
      overridePosition: (position) => {
        if (rootTokenKey.value !== position.key) return position

        return {
          ...position,
          borrow: plus(position.borrow, amountParsed.value).toFixed(),
        }
      },
    })

    const rateType = ref(null)

    const amount = ref('')
    const amountParsed = computed(() => parseSafeFloat(amount.value))

    const rootTokenKey = computed(() => atokens[networkName.value].rootTokens.includes(props.tokenKey) ? props.tokenKey : 'eth')

    const currentPosition = computed(() =>
      displayPositions.value.find((position) => position.key === rootTokenKey.value)
    )

    const token = computed(() => getTokenByKey(rootTokenKey.value))
    const symbol = computed(() => token.value?.symbol)
    const decimals = computed(() => token.value?.decimals)
    const balance = computed(() => {
      if (rateType.value?.value === 'stable') {
        return currentPosition.value?.borrowStable || '0'
      }
      return currentPosition.value?.borrow || '0'
    })

    const availableLiquidity = computed(() => currentPosition.value?.availableLiquidity || '0')
    const borrowStableRate = computed(() => currentPosition.value?.borrowStableRate || '0')
    const stableBorrowEnabled = computed(
      () => currentPosition.value?.stableBorrowEnabled && isZero(currentPosition.value?.supply)
    )

    const address = computed(() => token.value?.address)

    const { validateAmount, validateLiquidation, validateLiquidity, validateIsLoggedIn } = useValidators()
    const errors = computed(() => {
      const hasAmountValue = !isZero(amount.value)

      return {
        amount: { message: validateAmount(amountParsed.value), show: hasAmountValue },
        liquidation: { message: validateLiquidation(status.value, liquidation.value), show: hasAmountValue },
        auth: { message: validateIsLoggedIn(!!account.value), show: true },
        liquidity: {
          message: validateLiquidity(amountParsed.value, availableLiquidity.value, symbol.value),
          show: hasAmountValue,
        },
      }
    })
    const { errorMessages, isValid } = useValidation(errors)

    const pending = ref(false)

    async function cast() {
      pending.value = true

      const amount = valInt(amountParsed.value, decimals.value)

      const spells = dsa.value.Spell()

      const rateMode = rateType.value?.rateMode

      spells.add({
        connector: 'aave_v2',
        method: 'borrow',
        args: [address.value, amount, rateMode, 0, 0],
      })

      try {
        const txHash = await dsa.value.cast({
          spells,
          from: account.value,
          onReceipt: async receipt => {
            showConfirmedTransaction(receipt.transactionHash);

            await fetchBalances(true);
            await refreshPosition();
          }
        })

        showPendingTransaction(txHash)
      } catch (error) {
        showWarning(error.message)
      }

      pending.value = false

      close()
    }

    return {
      pending,
      cast,
      errors,
      amount,
      status,
      rootTokenKey,
      token,
      symbol,
      balance,
      formatNumber,
      formatUsdMax,
      formatUsd,
      maxLiquidation,
      liquidationPrice,
      liquidationMaxPrice,
      errorMessages,
      isValid,
      annualPercentageRateTypes,
      availableLiquidity,
      borrowStableRate,
      stableBorrowEnabled,
      rateType,
    }
  },
})
</script>
