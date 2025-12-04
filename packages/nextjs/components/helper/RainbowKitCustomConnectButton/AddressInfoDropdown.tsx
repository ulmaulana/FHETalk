import { useRef, useState } from "react";
import { NetworkOptions } from "./NetworkOptions";
import { Address, getAddress } from "viem";
import { useDisconnect } from "wagmi";
import { ArrowLeftIcon } from "@heroicons/react/20/solid";
import { ArrowsRightLeftIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import { BlockieAvatar } from "~~/components/helper";
import { useOutsideClick } from "~~/hooks/helper";
import { getTargetNetworks } from "~~/utils/helper";

const allowedNetworks = getTargetNetworks();

type AddressInfoDropdownProps = {
  address: Address;
  displayName: string;
  ensAvatar?: string;
  blockExplorerAddressLink?: string;
};

export const AddressInfoDropdown = ({ address, ensAvatar, displayName }: AddressInfoDropdownProps) => {
  const { disconnect } = useDisconnect();
  const checkSumAddress = getAddress(address);

  const [selectingNetwork, setSelectingNetwork] = useState(false);
  const dropdownRef = useRef<HTMLDetailsElement>(null);

  const closeDropdown = () => {
    setSelectingNetwork(false);
    dropdownRef.current?.removeAttribute("open");
  };

  useOutsideClick(dropdownRef, closeDropdown);

  return (
    <>
      <details ref={dropdownRef} className="dropdown dropdown-end leading-3">
        <summary className="flex items-center gap-1.5 cursor-pointer transition-all list-none">
          <BlockieAvatar address={checkSumAddress} size={20} ensImage={ensAvatar} />
          <span className="text-xs font-medium text-white/80">{displayName}</span>
          <ChevronDownIcon className="h-3 w-3 text-white/50" />
        </summary>
        <ul className="dropdown-content z-50 mt-2 p-2 bg-white rounded-2xl shadow-xl border border-gray-100 min-w-[200px]">
          <NetworkOptions hidden={!selectingNetwork} />
          {allowedNetworks.length > 1 ? (
            <li className={selectingNetwork ? "hidden" : ""}>
              <button
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-xl transition-colors"
                type="button"
                onClick={() => {
                  setSelectingNetwork(true);
                }}
              >
                <ArrowsRightLeftIcon className="h-5 w-5 text-gray-500" />
                <span>Switch Network</span>
              </button>
            </li>
          ) : null}
          <li className={selectingNetwork ? "hidden" : ""}>
            <button
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors"
              type="button"
              onClick={() => disconnect()}
            >
              <ArrowLeftIcon className="h-5 w-5" />
              <span>Disconnect</span>
            </button>
          </li>
        </ul>
      </details>
    </>
  );
};
