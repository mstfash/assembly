<template>
  <SidebarContextRootContainer>
    <template #title>Supply {{ symbol }}</template>

    <SidebarSectionValueWithIcon label="Token Balance" center>
      <template #icon
        ><IconCurrency :currency="tokenKey" class="w-20 h-20" noHeight
      /></template>
      <template #value>{{ formatDecimal(balance) }} {{ symbol }}</template>
    </SidebarSectionValueWithIcon>

    <div class="bg-[#C5CCE1] bg-opacity-[0.15] mt-10 p-8">
      <h3 class="text-primary-gray text-xs font-semibold mb-2.5">
        Amount to supply
      </h3>

      <input-numeric
        v-model="amount"
        placeholder="Amount to supply"
        :error="errors.amount.message"
      >
        <template v-if="!isMaxAmount" #suffix>
          <div class="absolute mt-2 top-0 right-0 mr-4">
            <button
              type="button"
              class="text-primary-blue-dark font-semibold text-sm hover:text-primary-blue-hover"
              @click="toggle"
            >
              Max
            </button>
          </div>
        </template>
      </input-numeric>

      <SidebarContextHeading class="mt-5">
        Projected Debt Position
      </SidebarContextHeading>

      <SidebarSectionStatus
        class="mt-8"
        :liquidation="liquidation"
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
          Supply
        </ButtonCTA>
      </div>

      <ValidationErrors :error-messages="errorMessages" class="mt-6" />
    </div>
  </SidebarContextRootContainer>
</template>

<script>
import { computed, defineComponent, ref } from '@nuxtjs/composition-api'
import InputNumeric from '~/components/common/input/InputNumeric.vue'
import { useBalances } from '~/composables/useBalances'
import { useNotification } from '~/composables/useNotification'
import { useBigNumber } from '~/composables/useBigNumber'
import { useFormatting } from '~/composables/useFormatting'
import { useValidators } from '~/composables/useValidators'
import { useValidation } from '~/composables/useValidation'
import { useToken } from '~/composables/useToken'
import { useParsing } from '~/composables/useParsing'
import { useMaxAmountActive } from '~/composables/useMaxAmountActive'
import { useWeb3 } from '~/composables/useWeb3'
import ToggleButton from '~/components/common/input/ToggleButton.vue'
import { useDSA } from '~/composables/useDSA'
import ButtonCTA from '~/components/common/input/ButtonCTA.vue'
import Button from '~/components/Button.vue'
import { useSidebar } from '~/composables/useSidebar'
import { useMakerdaoPosition } from '~/composables/protocols/useMakerdaoPosition'

export default defineComponent({
  components: { InputNumeric, ToggleButton, ButtonCTA, Button },
  setup(props) {
    const { close } = useSidebar()
    const { account } = useWeb3()
    const { dsa } = useDSA()
    const { valInt } = useToken()
    const { getBalanceByKey, fetchBalances } = useBalances()
    const { formatUsdMax, formatUsd, formatDecimal } = useFormatting()
    const { plus, isZero } = useBigNumber()
    const { parseSafeFloat } = useParsing()
    const { showPendingTransaction, showConfirmedTransaction, showWarning } = useNotification()


    const amount = ref('')
    const amountParsed = computed(() => parseSafeFloat(amount.value))

    const { tokenKey, token, debt, collateral, liquidation, liquidationMaxPrice, isNewVault, vaultId, vaultType, fetchPosition} = useMakerdaoPosition()

    const symbol = computed(() => token.value?.symbol)
    const decimals = computed(() => token.value?.decimals)
    const balance = computed(() => getBalanceByKey(tokenKey.value))

    const changedCollateral = computed(() => plus(collateral.value, amountParsed.value).toFixed())
    const { liquidationPrice, status } = useMakerdaoPosition(changedCollateral, debt)

    const { toggle, isMaxAmount } = useMaxAmountActive(amount, balance)

    const { validateAmount, validateLiquidation, validateIsLoggedIn } = useValidators()
    const errors = computed(() => {
      const hasAmountValue = !isZero(amount.value)

      return {
        amount: { message: validateAmount(amountParsed.value, balance.value), show: hasAmountValue },
        liquidation: { message: validateLiquidation(status.value, liquidation.value), show: hasAmountValue },
        auth: { message: validateIsLoggedIn(!!account.value), show: true },
      }
    })
    const { errorMessages, isValid } = useValidation(errors)

    const pending = ref(false)

    async function cast() {
      pending.value = true

      const amount = isMaxAmount.value ? dsa.value.maxValue : valInt(amountParsed.value, decimals.value)

      const spells = dsa.value.Spell()

      if (isNewVault.value) {
        spells.add({
          connector: 'maker',
          method: 'open',
          args: [vaultType.value],
        })

        spells.add({
          connector: 'maker',
          method: 'deposit',
          args: [0, amount, 0, 0],
        })
      } else {

        spells.add({
          connector: 'maker',
          method: 'deposit',
          args: [vaultId.value, amount, 0, 0],
        })
      }

      try {
        const txHash = await dsa.value.cast({
          spells,
          from: account.value,
          onReceipt: async receipt => {
            showConfirmedTransaction(receipt.transactionHash);

            await fetchBalances(true);
            await fetchPosition();
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
      tokenKey,
      symbol,
      balance,
      amount,
      status,
      liquidation,
      liquidationPrice,
      liquidationMaxPrice,
      formatUsd,
      formatUsdMax,
      formatDecimal,
      errors,
      errorMessages,
      isMaxAmount,
      isValid,
      cast,
      pending,
      toggle,
    }
  },
})
</script>
