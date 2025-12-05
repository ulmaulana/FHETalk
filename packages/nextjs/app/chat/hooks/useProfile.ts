// ============================================================================
// useProfile Hook - Profile management logic
// ============================================================================

import { useState, useCallback } from "react";
import { ethers } from "ethers";
import { UserProfile } from "../types";

interface UseProfileProps {
  address?: string;
  getContract: (mode: "read" | "write") => ethers.Contract | undefined;
  setStatusMessage: (msg: string) => void;
  setIsProcessing: (val: boolean) => void;
}

export function useProfile({
  address,
  getContract,
  setStatusMessage,
  setIsProcessing,
}: UseProfileProps) {
  const [myProfile, setMyProfile] = useState<UserProfile | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profileAvatar, setProfileAvatar] = useState("");

  const loadMyProfile = useCallback(async () => {
    if (!address) return;
    try {
      const contract = getContract("read");
      if (!contract) return;
      const profile = await contract.getProfile(address);
      if (profile.exists) {
        setMyProfile({
          displayName: profile.displayName,
          avatarCid: profile.avatarCid,
          updatedAt: profile.updatedAt,
          exists: true,
        });
        setProfileName(profile.displayName);
        setProfileAvatar(profile.avatarCid);
      }
    } catch (error) {
      console.error("Failed to load profile:", error);
    }
  }, [address, getContract]);

  const saveProfile = async () => {
    if (!profileName.trim()) {
      setStatusMessage("Please enter a display name");
      return;
    }
    setIsProcessing(true);
    setStatusMessage("Saving profile...");
    try {
      const contract = getContract("write");
      if (!contract) throw new Error("Contract not available");
      const tx = await contract.setProfile(profileName.trim(), profileAvatar.trim());
      await tx.wait();
      setStatusMessage("Profile saved!");
      setShowProfileModal(false);
      await loadMyProfile();
    } catch (error) {
      setStatusMessage(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    myProfile,
    showProfileModal,
    setShowProfileModal,
    profileName,
    setProfileName,
    profileAvatar,
    setProfileAvatar,
    loadMyProfile,
    saveProfile,
  };
}
