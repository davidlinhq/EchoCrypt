import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedEcho = await deploy("Echo", {
    from: deployer,
    log: true,
  });

  console.log(`Echo contract: `, deployedEcho.address);
};
export default func;
func.id = "deploy_echo"; // id required to prevent reexecution
func.tags = ["Echo"];
