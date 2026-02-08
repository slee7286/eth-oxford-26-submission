export const COSTON2_CHAIN_ID = parseInt(
  process.env.NEXT_PUBLIC_CHAIN_ID || "114"
);

export const COSTON2_RPC =
  process.env.NEXT_PUBLIC_COSTON2_RPC ||
  "https://coston2-api.flare.network/ext/C/rpc";

export const EXPLORER_URL =
  process.env.NEXT_PUBLIC_EXPLORER_URL ||
  "https://coston2-explorer.flare.network";

export const COSTON2_NETWORK = {
  chainId: `0x${COSTON2_CHAIN_ID.toString(16)}`,
  chainName: "Flare Testnet Coston2",
  nativeCurrency: { name: "Coston2 FLR", symbol: "C2FLR", decimals: 18 },
  rpcUrls: [COSTON2_RPC],
  blockExplorerUrls: [EXPLORER_URL],
};

export async function switchToCoston2() {
  if (typeof window === "undefined" || !window.ethereum) return;

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: COSTON2_NETWORK.chainId }],
    });
  } catch (e: unknown) {
    const err = e as { code?: number };
    if (err.code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [COSTON2_NETWORK],
      });
    }
  }
}
