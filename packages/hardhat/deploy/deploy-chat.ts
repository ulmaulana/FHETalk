import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  console.log("Deploying FHETalk contract...");
  console.log(`Deployer: ${deployer}`);

  const deployedFHETalk = await deploy("FHETalk", {
    from: deployer,
    log: true,
    waitConfirmations: 1,
  });

  console.log(`FHETalk contract deployed at: ${deployedFHETalk.address}`);
  console.log("FHETalk deployed successfully!");
  console.log("Note: Verification will be handled manually later");
};

export default func;
func.id = "deploy_fhetalk";
func.tags = ["FHETalk"];
