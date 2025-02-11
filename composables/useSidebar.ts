import {
  computed,
  nextTick,
  ref,
  useContext,
  useRouter,
  watch
} from "@nuxtjs/composition-api";

import { useDSA } from "./useDSA";
import { useWeb3 } from "./useWeb3";
import SidebarAaveV2Supply from "~/components/sidebar/context/aaveV2/SidebarAaveV2Supply.vue";
import SidebarAaveV2Withdraw from '~/components/sidebar/context/aaveV2/SidebarAaveV2Withdraw.vue'
import SidebarAaveV2Borrow from '~/components/sidebar/context/aaveV2/SidebarAaveV2Borrow.vue'
import SidebarAaveV2Payback from '~/components/sidebar/context/aaveV2/SidebarAaveV2Payback.vue'

import SidebarOverview from '~/components/sidebar/context/overview/SidebarOverview.vue'
import SidebarDepositOverview from '~/components/sidebar/context/SidebarDepositOverview.vue'
import SidebarWithdraw from '~/components/sidebar/context/SidebarWithdraw.vue'

import SidebarCompoundWithdraw from '~/components/sidebar/context/compound/SidebarCompoundWithdraw.vue'
import SidebarCompoundSupply from '~/components/sidebar/context/compound/SidebarCompoundSupply.vue'
import SidebarCompoundBorrow from '~/components/sidebar/context/compound/SidebarCompoundBorrow.vue'
import SidebarCompoundPayback from '~/components/sidebar/context/compound/SidebarCompoundPayback.vue'

import SidebarMakerdaoCollateral from '~/components/sidebar/context/makerdao/SidebarMakerdaoCollateral.vue'
import SidebarMakerdaoSupply from '~/components/sidebar/context/makerdao/SidebarMakerdaoSupply.vue'
import SidebarMakerdaoWithdraw from '~/components/sidebar/context/makerdao/SidebarMakerdaoWithdraw.vue'
import SidebarMakerdaoBorrow from '~/components/sidebar/context/makerdao/SidebarMakerdaoBorrow.vue'
import SidebarMakerdaoPayback from '~/components/sidebar/context/makerdao/SidebarMakerdaoPayback.vue'

import SidebarLiquityTroveOpenNew from '~/components/sidebar/context/liquity/SidebarLiquityTroveOpenNew.vue'
import SidebarLiquityTroveSupply from '~/components/sidebar/context/liquity/SidebarLiquityTroveSupply.vue'
import SidebarLiquityTroveWithdraw from '~/components/sidebar/context/liquity/SidebarLiquityTroveWithdraw.vue'
import SidebarLiquityTroveBorrow from '~/components/sidebar/context/liquity/SidebarLiquityTroveBorrow.vue'
import SidebarLiquityTrovePayback from '~/components/sidebar/context/liquity/SidebarLiquityTrovePayback.vue'


const sidebars = {
  "#overview" :  {component: SidebarOverview, back : false, close : true },
  "#deposit-overview": {component: SidebarDepositOverview, back: { hash: 'overview' }  },
  '#withdraw-token': { component: SidebarWithdraw, back: { hash: 'overview' } },
  "/aave-v2": { component: null },
  "/aave-v2#supply": { component: SidebarAaveV2Supply },
  "/aave-v2#borrow": { component: SidebarAaveV2Borrow },
  "/aave-v2#payback": { component: SidebarAaveV2Payback },
  "/aave-v2#withdraw": { component: SidebarAaveV2Withdraw },

  "/mainnet/compound": { component: null },
  "/mainnet/compound#withdraw": { component: SidebarCompoundWithdraw },
  "/mainnet/compound#supply": { component: SidebarCompoundSupply },
  "/mainnet/compound#borrow": { component: SidebarCompoundBorrow },
  "/mainnet/compound#payback": { component: SidebarCompoundPayback },

  "/mainnet/maker": { component: null },
  '/mainnet/maker#collateral': { component: SidebarMakerdaoCollateral },
  "/mainnet/maker#supply": { component: SidebarMakerdaoSupply },
  "/mainnet/maker#withdraw": { component: SidebarMakerdaoWithdraw },
  "/mainnet/maker#borrow": { component: SidebarMakerdaoBorrow },
  "/mainnet/maker#payback": { component: SidebarMakerdaoPayback },

  '/mainnet/liquity#trove-new': { component: SidebarLiquityTroveOpenNew },
  '/mainnet/liquity#trove-supply': { component: SidebarLiquityTroveSupply },
  '/mainnet/liquity#trove-withdraw': { component: SidebarLiquityTroveWithdraw },
  '/mainnet/liquity#trove-borrow': { component: SidebarLiquityTroveBorrow },
  '/mainnet/liquity#trove-payback': { component: SidebarLiquityTrovePayback },
};

const sidebar = ref(null);
const props = ref(null);

export function init() {
  const { route } = useContext();
  const router = useRouter()
  const { active } = useWeb3();
  const { dsa } = useDSA();

  watch(
    [route, active, dsa],
    async ([route, active, dsa], [oldRoute, oldActive, oldDsa]) => {
      await nextTick();

      //@ts-ignore
      const hasPathChanged = !oldRoute || route.path !== oldRoute.path;
      const hasIsLoggedInChanged = active !== oldActive;
      const hasDsaChanged = dsa !== oldDsa;

      //@ts-ignore
      const [hash, params] = route.hash.split("?");
      
      if (hasPathChanged){
        router.push({ hash: null })
        return
      }

       //@ts-ignore
      sidebar.value = sidebars[route.path + hash] || sidebars[hash];
        
      if (!sidebar.value) {
        props.value = {};
        return;
      }

      if (!params) {
        props.value = {};
        return;
      }

      // parse url params (example: `prop1=value1&prop2=value2`)
      props.value = params.split("&").reduce((props, entry) => {
        const [key, value] = entry.split("=");
        props[key] = value;
        return props;
      }, {});
    },
    { immediate: true }
  );
}

export function useSidebar() {
  const { route } = useContext();
  const router = useRouter();

  function close() {
    router.push({ hash: null });
  }

  function back() {
    const location = sidebar.value?.back || { hash: null };

    router.push(location);
  }

  const component = computed(() => sidebar.value?.component);

  const isOpen = computed(() => {
    if (!route.value.hash) return false;

    return !!component.value;
  });

  const showSidebarBalances = () => {
    router.push({ hash: 'overview' });
  }

  return {
    close,
    back,
    component,
    props,
    isOpen,
    showSidebarBalances
  };
}
