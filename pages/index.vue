<template>
  <div>
    <h1 class="font-semibold text-2xl text-center">Assembly Apps</h1>

    <div class="mt-10 grid w-full grid-cols-1 gap-4 sm:grid-cols-3 xl:gap-6">
      <nuxt-link
        v-for="app in apps"
        :key="app.id"
        :to="app.url"
        class="relative flex flex-col items-center px-4 py-12 text-center rounded-[6px] cursor-pointer bg-white border border-transparent hover:border-[#1874FF] shadow"
      >
        <div
          style="background: radial-gradient(42.15% 42.15% at 48.94% 48.94%, #D6DAE0 75.67%, #F0F3F9 100%), #C4C4C4;"
          class="w-20 h-20 rounded-full flex items-center justify-center border border-[#CCDCF3]"
        >
          <div
            class="w-16 h-16 rounded-full flex items-center justify-center bg-[#1874FF]"
          >
            <component :is="app.icon" class="w-10 h-10 text-white" />
          </div>
        </div>

        <h2 class="mt-4 font-semibold text-19">{{ app.name }}</h2>
        <p class="mt-2 text-14 font-regular text-grey-dark opacity-90">
          {{ app.description }}
        </p>
      </nuxt-link>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent } from "@nuxtjs/composition-api";
import { useNetwork } from "~/composables/useNetwork";
import AaveIcon from "~/assets/icons/aave.svg?inline";
import CompoundIcon from "~/assets/icons/compound.svg?inline";
import MakerIcon from "~/assets/icons/makerdao.svg?inline";
import OneInchIcon from "~/assets/icons/1inch.svg?inline";
import LiquityIcon from "~/assets/icons/liquity.svg?inline";

const appsPerNetwork = {
  mainnet: [
    {
      id: "aave-v2",
      icon: AaveIcon,
      name: "Aave v2",
      url: "/aave-v2",
      description: "Money Market"
    },
    {
      id: "compound",
      icon: CompoundIcon,
      name: "Compound",
      url: "/mainnet/compound",
      description: "Money Market"
    },
    {
      id: "maker",
      icon: MakerIcon,
      name: "MakerDAO",
      url: "/mainnet/maker",
      description: "Collateralized DAI Debt"
    },
    {
      id: "1inch",
      icon: OneInchIcon,
      name: "1inch",
      url: "/1inch",
      description: "DEX Aggregator"
    },
      {
      id: "liquity",
      icon: LiquityIcon,
      name: "Liquity",
      url: "/mainnet/liquity",
      description: "Collateralized LUSD Debt"
    }
  ],
  polygon: [
    {
      id: "aave-v2",
      icon: AaveIcon,
      name: "Aave v2",
      url: "/aave-v2",
      description: "Lend and borrow straight from your Gnosis Safe"
    },
    {
      id: "1inch",
      icon: OneInchIcon,
      name: "1inch",
      url: "/1inch",
      description: "DEX Aggregator"
    }
  ]
};

export default defineComponent({
  setup() {
    const { activeNetworkId } = useNetwork();

    const apps = computed(() => appsPerNetwork[activeNetworkId.value]);

    return {
      apps
    };
  }
});
</script>
