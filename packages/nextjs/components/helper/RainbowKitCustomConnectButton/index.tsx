"use client";

// @refresh reset
import { Balance } from "../Balance";
import { AddressInfoDropdown } from "./AddressInfoDropdown";
import { WrongNetworkDropdown } from "./WrongNetworkDropdown";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Address } from "viem";
import { useTargetNetwork } from "~~/hooks/helper/useTargetNetwork";
import { getBlockExplorerAddressLink } from "~~/utils/helper";

/**
 * Custom Wagmi Connect Button (watch balance + custom design)
 */
export const RainbowKitCustomConnectButton = () => {
  const { targetNetwork } = useTargetNetwork();

  return (
    <ConnectButton.Custom>
      {({ account, chain, openConnectModal, mounted }) => {
        const connected = mounted && account && chain;
        const blockExplorerAddressLink = account
          ? getBlockExplorerAddressLink(targetNetwork, account.address)
          : undefined;

        return (
          <>
            {(() => {
              if (!connected) {
                return (
                  <button 
                    className="px-3 py-1.5 text-xs font-medium bg-amber-500 hover:bg-amber-400 text-white rounded-lg transition-colors" 
                    onClick={openConnectModal} 
                    type="button"
                  >
                    Connect
                  </button>
                );
              }

              if (chain.unsupported || chain.id !== targetNetwork.id) {
                return <WrongNetworkDropdown />;
              }

              return (
                <div className="flex items-center gap-1.5 bg-white/10 rounded-lg px-2 py-1">
                  <Balance address={account.address as Address} className="min-h-0 h-auto text-xs font-medium text-white whitespace-nowrap" />
                  <AddressInfoDropdown
                    address={account.address as Address}
                    displayName={account.displayName}
                    ensAvatar={account.ensAvatar}
                    blockExplorerAddressLink={blockExplorerAddressLink}
                  />
                </div>
              );
            })()}
          </>
        );
      }}
    </ConnectButton.Custom>
  );
};
